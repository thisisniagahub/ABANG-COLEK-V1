/**
 * AbangColek Sovereign GrowthOS — EXT-04 Channel adapters (surface + synthetic transport)
 *
 * This module implements the *adapter surface* and a synthetic transport that
 * satisfies the same contract. The live Slack/Teams activation is externally
 * gated (provider account, provider app, event signature, channel permission
 * and a real send instruction). No live send is ever performed or claimed.
 *
 * Persistence mode: `in_memory`. Locality: `local`.
 */

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { failIntelligence } from './errors';
import type { ChannelMessage, ChannelResult } from '../../../shared/founder-intelligence-contracts';

export type ChannelProvider = 'slack' | 'teams' | 'synthetic';

export interface OutboundChannelMessage {
  conversationId: string;
  /** The platform thread this message belongs to. */
  threadId: string;
  authorId: string;
  text: string;
}

export interface InboundChannelEnvelope {
  conversationId: string;
  authorId: string;
  text: string;
  /** The provider's event signature over the payload. */
  signature: string;
  /** ISO instant the provider claims the event happened. */
  sentAt: string;
}

export interface ChannelAdapter {
  readonly provider: ChannelProvider;
  /** Sends one message. Never performs a live external send in this repo. */
  send(message: OutboundChannelMessage): Promise<ChannelResult<ChannelMessage>>;
  /** The provider conversation -> platform thread mapping. */
  threadFor(conversationId: string): string | null;
  /** Verifies an inbound envelope (signature + timestamp window). */
  verify(envelope: InboundChannelEnvelope): ChannelResult<{ ok: true }>;
}

/**
 * The synthetic transport: an in-memory channel that behaves like a provider
 * would — signed inbound events, a conversation -> thread mapping and a
 * permission check on who may post into a conversation.
 */
export class SyntheticChannelTransport implements ChannelAdapter {
  readonly provider: ChannelProvider = 'synthetic';
  private readonly conversations = new Map<string, { threadId: string; allowedAuthors: string[] }>();
  private readonly outbox: ChannelMessage[] = [];
  private readonly inbox: ChannelMessage[] = [];

  constructor(
    private readonly secret: string,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  /** Registers a conversation and the platform thread it maps to. */
  registerConversation(conversationId: string, threadId: string, allowedAuthors: string[] = []): void {
    this.conversations.set(conversationId, { threadId, allowedAuthors });
  }

  /** The signature a provider would send for this payload. */
  sign(envelope: Omit<InboundChannelEnvelope, 'signature'>): string {
    const payload = `${envelope.conversationId}:${envelope.authorId}:${envelope.text}:${envelope.sentAt}`;
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  threadFor(conversationId: string): string | null {
    return this.conversations.get(conversationId)?.threadId ?? null;
  }

  async send(message: OutboundChannelMessage): Promise<ChannelResult<ChannelMessage>> {
    const conversation = this.conversations.get(message.conversationId);
    if (!conversation) {
      return {
        ok: false,
        code: 'CHANNEL_CONVERSATION_UNKNOWN',
        reason: `Perbualan '${message.conversationId}' tidak didaftarkan.`,
      };
    }
    if (conversation.allowedAuthors.length && !conversation.allowedAuthors.includes(message.authorId)) {
      return {
        ok: false,
        code: 'CHANNEL_PERMISSION_DENIED',
        reason: `Pengguna '${message.authorId}' tiada kebenaran menghantar ke perbualan ini.`,
      };
    }
    const record: ChannelMessage = {
      id: randomUUID(),
      channel: this.provider,
      conversationId: message.conversationId,
      threadId: conversation.threadId,
      authorId: message.authorId,
      text: message.text,
      direction: 'outbound',
      sentAt: this.clock(),
    };
    this.outbox.push(record);
    return { ok: true, value: { ...record } };
  }

  verify(envelope: InboundChannelEnvelope): ChannelResult<{ ok: true }> {
    const expected = this.sign({
      conversationId: envelope.conversationId,
      authorId: envelope.authorId,
      text: envelope.text,
      sentAt: envelope.sentAt,
    });
    const provided = Buffer.from(envelope.signature);
    const computed = Buffer.from(expected);
    if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) {
      return {
        ok: false,
        code: 'CHANNEL_SIGNATURE_INVALID',
        reason: 'Tandatangan peristiwa channel tidak sah.',
      };
    }
    const age = Date.parse(this.clock()) - Date.parse(envelope.sentAt);
    if (!Number.isFinite(age) || age < 0 || age > 5 * 60_000) {
      return {
        ok: false,
        code: 'CHANNEL_EVENT_STALE',
        reason: 'Peristiwa channel di luar tampo masa yang dibenarkan (±5 minit).',
      };
    }
    return { ok: true, value: { ok: true } };
  }

  /**
   * Accepts an inbound message after verifying its signature and the
   * conversation permission. Returns the mapped platform thread.
   */
  receive(envelope: InboundChannelEnvelope): ChannelResult<ChannelMessage> {
    const verified = this.verify(envelope);
    if (!verified.ok) return verified;
    const conversation = this.conversations.get(envelope.conversationId);
    if (!conversation) {
      return {
        ok: false,
        code: 'CHANNEL_CONVERSATION_UNKNOWN',
        reason: `Perbualan '${envelope.conversationId}' tidak didaftarkan.`,
      };
    }
    if (conversation.allowedAuthors.length && !conversation.allowedAuthors.includes(envelope.authorId)) {
      return {
        ok: false,
        code: 'CHANNEL_PERMISSION_DENIED',
        reason: `Pengguna '${envelope.authorId}' tiada kebenaran dalam perbualan ini.`,
      };
    }
    const record: ChannelMessage = {
      id: randomUUID(),
      channel: this.provider,
      conversationId: envelope.conversationId,
      threadId: conversation.threadId,
      authorId: envelope.authorId,
      text: envelope.text,
      direction: 'inbound',
      sentAt: envelope.sentAt,
    };
    this.inbox.push(record);
    return { ok: true, value: { ...record } };
  }

  /** The messages the adapter sent. */
  sentMessages(): ChannelMessage[] {
    return this.outbox.map((message) => ({ ...message }));
  }

  /** The messages the adapter received. */
  receivedMessages(): ChannelMessage[] {
    return this.inbox.map((message) => ({ ...message }));
  }
}

/**
 * A live provider adapter. It always refuses with the exact reason the live
 * activation is blocked, because no provider account/app is configured.
 */
export class UnavailableLiveChannelAdapter implements ChannelAdapter {
  constructor(
    readonly provider: Exclude<ChannelProvider, 'synthetic'>,
    private readonly reasonCode: string,
    private readonly reason: string,
  ) {}

  async send(): Promise<ChannelResult<ChannelMessage>> {
    return { ok: false, code: this.reasonCode, reason: this.reason };
  }

  threadFor(): string | null {
    return null;
  }

  verify(): ChannelResult<{ ok: true }> {
    return { ok: false, code: this.reasonCode, reason: this.reason };
  }
}

/** Builds the live adapter for a provider, always in the blocked state. */
export function createLiveChannelAdapter(provider: 'slack' | 'teams'): ChannelAdapter {
  return new UnavailableLiveChannelAdapter(
    provider,
    'CHANNEL_PROVIDER_ACCOUNT_REQUIRED',
    `Penghantaran langsung ke ${provider} memerlukan akaun provider, aplikasi provider, pengesahan tandatangan peristiwa, kebenaran channel dan arahan penghantaran sebenar; tiada provider dikonfigurasi dalam repositori ini.`,
  );
}

/** Throws when a caller tries to use a live adapter as if it were live. */
export function assertSyntheticOnly(adapter: ChannelAdapter): void {
  if (adapter.provider !== 'synthetic') {
    failIntelligence(
      'CHANNEL_LIVE_ACTIVATION_BLOCKED',
      'RAdapter langsung tidak diaktifkan; hanya pengangkutan sintetik digunakan dalam ujian kontrak.',
    );
  }
}
