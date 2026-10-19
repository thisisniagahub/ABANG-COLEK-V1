import type { FlowIntent } from '../../shared/platform-contracts';
import { Auth, hash, type Principal } from './auth';
import type { PlatformStore } from './store';
import { DomainError, fail, fields, id, list, now, object, oneOf, text } from './store';
import type { Flows } from './flows';

export interface WhatsAppTransport {
  readonly zeroNewSpend: true;
  readonly phoneNumberId: string;
  readonly webhookSecret: string;
  sendTemplate(
    to: string,
    templateName: string,
    parameters: Record<string, string>,
    signal: AbortSignal,
  ): Promise<{ messageId: string; status: 'accepted' | 'sent' | 'failed' | 'unknown'; reasonCode?: string }>;
  verifyWebhookSignature(signature: string, rawPayload: string): boolean;
}

export interface WhatsAppMessageReceipt {
  id: string;
  recipientHash: string;
  maskedRecipient: string;
  templateName: string;
  status: 'requested' | 'accepted' | 'sent' | 'delivered' | 'failed' | 'unknown';
  providerMessageId?: string;
  reasonCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppFlowMapping {
  flowIntent: FlowIntent;
  whatsappFlowId: string;
  version: number;
}

export class WhatsAppService {
  constructor(
    readonly store: PlatformStore,
    readonly flows: Flows,
    readonly transport?: WhatsAppTransport,
  ) {}

  status(): { configured: boolean; status: 'ready' | 'unavailable' | 'disabled'; reasonCode: string } {
    if (!this.transport || this.transport.zeroNewSpend !== true) {
      return { configured: false, status: 'unavailable', reasonCode: 'FEATURE_DISABLED' };
    }
    return { configured: true, status: 'ready', reasonCode: 'WHATSAPP_TRANSPORT_ACTIVE' };
  }

  verifyWebhook(hubMode: string | null, verifyToken: string | null, challenge: string | null, expectedToken: string): string {
    if (hubMode !== 'subscribe' || !verifyToken || !challenge) {
      fail('WEBHOOK_VERIFICATION_FAILED', 403, 'Parameter pengesahan webhook Meta tidak sah.');
    }
    if (verifyToken !== expectedToken) {
      fail('WEBHOOK_TOKEN_MISMATCH', 403, 'Token pengesahan webhook Meta tidak sepadan.');
    }
    return challenge;
  }

  processWebhook(signature: string | null, rawPayload: string): { processed: number; duplicate: number; unknownReasons: string[] } {
    if (!this.transport || this.transport.zeroNewSpend !== true) {
      fail('WHATSAPP_UNAVAILABLE', 409, 'WhatsApp transport tidak tersedia.');
    }
    if (!signature) {
      fail('SIGNATURE_REQUIRED', 401, 'Tandatangan x-hub-signature-256 diperlukan.');
    }

    const isValid = this.transport.verifyWebhookSignature(signature, rawPayload);
    if (!isValid) {
      fail('SIGNATURE_INVALID', 403, 'Tandatangan webhook Meta tidak sah.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      fail('INVALID_JSON', 400);
    }

    const payloadObj = object(parsed);
    const entries = list(payloadObj.entry ?? [], 10);
    let processed = 0;
    let duplicate = 0;
    const unknownReasons: string[] = [];

    for (const entryItem of entries) {
      const entry = object(entryItem);
      const changes = list(entry.changes ?? [], 10);
      for (const changeItem of changes) {
        const change = object(changeItem);
        const value = object(change.value ?? {});

        // Process message statuses (e.g. delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusItem of value.statuses) {
            const s = object(statusItem);
            const wamid = text(s.id, 'Message ID', 120);
            const statusType = oneOf(s.status, ['sent', 'delivered', 'read', 'failed'] as const);

            // Replay protection: check dedupe
            const dedupeKey = `wa-status:${wamid}:${statusType}`;
            const existingDedupe = this.store.get<{ id: string }>('whatsapp_dedupe', dedupeKey);
            if (existingDedupe) {
              duplicate++;
              continue;
            }

            // Find existing message receipt
            const receipts = this.store.all<WhatsAppMessageReceipt>('whatsapp_receipts');
            const receipt = receipts.find(r => r.providerMessageId === wamid);
            if (receipt) {
              const updated: WhatsAppMessageReceipt = {
                ...receipt,
                status: statusType === 'read' ? 'delivered' : statusType,
                updatedAt: now(),
              };
              this.store.save('whatsapp_receipts', updated);
            }
            this.store.save('whatsapp_dedupe', { id: dedupeKey, createdAt: now() });
            processed++;
          }
        }

        // Process inbound messages / flows responses
        if (value.messages && Array.isArray(value.messages)) {
          for (const messageItem of value.messages) {
            const m = object(messageItem);
            const wamid = text(m.id, 'Message ID', 120);

            // Replay protection
            const dedupeKey = `wa-inbound:${wamid}`;
            const existingDedupe = this.store.get<{ id: string }>('whatsapp_dedupe', dedupeKey);
            if (existingDedupe) {
              duplicate++;
              continue;
            }

            this.store.save('whatsapp_dedupe', { id: dedupeKey, createdAt: now() });
            this.store.audit('system:whatsapp', 'whatsapp.inbound', wamid);
            processed++;
          }
        }
      }
    }

    return { processed, duplicate, unknownReasons };
  }

  async sendTemplateMessage(
    actor: Principal,
    raw: unknown,
    idemKey: unknown,
  ): Promise<WhatsAppMessageReceipt> {
    if (!this.transport || this.transport.zeroNewSpend !== true) {
      fail('WHATSAPP_UNAVAILABLE', 409, 'Perkhidmatan WhatsApp tidak aktif.');
    }

    const input = object(raw);
    fields(input, ['to', 'templateName', 'parameters']);
    const rawTo = text(input.to, 'Nombor telefon', 30);
    // Enforce international E.164 phone format (+601...)
    if (!/^\+601[0-9]{8,9}$/.test(rawTo) && !/^\+[1-9][0-9]{7,14}$/.test(rawTo)) {
      fail('INVALID_PHONE_NUMBER', 400, 'Nombor telefon mesti mengikut format antarabangsa E.164 (cth: +60123456789).');
    }

    const templateName = text(input.templateName, 'Nama template', 100);
    const allowedTemplates = ['order_confirmation', 'restock_notification', 'complaint_acknowledgement'];
    if (!allowedTemplates.includes(templateName)) {
      fail('TEMPLATE_NOT_APPROVED', 400, 'Templat WhatsApp belum diluluskan oleh Meta.');
    }

    const safeKey = text(idemKey, 'Idempotency key', 120, 8);
    const recipientHash = hash(rawTo);
    const maskedRecipient = rawTo.length > 7 ? rawTo.slice(0, 4) + '*****' + rawTo.slice(-3) : '***';

    // Idempotency check
    const auth = new Auth(this.store);
    auth.founder(auth.revalidate(actor));
    const parameterInput = object(input.parameters ?? {});
    if (Object.keys(parameterInput).length > 30) fail('TOO_MANY_PARAMETERS', 400);
    const parameters = Object.fromEntries(Object.keys(parameterInput).sort().map(key => [text(key, 'Parameter', 100), text(parameterInput[key], 'Parameter value', 2000, 0)]));
    const inputHash = hash(JSON.stringify({ to: rawTo, templateName, parameters }));
    const attemptId = hash(`${actor.user.id}:${safeKey}`);
    const existing = this.store.get<WhatsAppMessageReceipt & { inputHash: string }>('whatsapp_receipts', attemptId);
    if (existing) {
      if (existing.inputHash !== inputHash) fail('IDEMPOTENCY_CONFLICT', 409);
      return existing;
    }

    const controller = new AbortController();
    const reserved = { id: attemptId, recipientHash, maskedRecipient, templateName, inputHash, status: 'requested' as const, createdAt: now(), updatedAt: now() };
    const claimed = this.store.atomic(() => {
      const concurrent = this.store.get<WhatsAppMessageReceipt & { inputHash: string }>('whatsapp_receipts', attemptId);
      if (concurrent) {
        if (concurrent.inputHash !== inputHash) fail('IDEMPOTENCY_CONFLICT', 409);
        return concurrent;
      }
      this.store.save('whatsapp_receipts', reserved);
      this.store.audit(actor.user.id, 'whatsapp.send.request', attemptId);
      return null;
    });
    if (claimed) return claimed;
    let outcome: { messageId: string; status: 'accepted' | 'sent' | 'failed' | 'unknown'; reasonCode?: string };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      auth.founder(auth.revalidate(actor));
      outcome = await Promise.race([
        this.transport.sendTemplate(rawTo, templateName, parameters, controller.signal),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('WHATSAPP_TIMEOUT')); }, 10_000); }),
      ]);
      try { auth.founder(auth.revalidate(actor)); }
      catch { outcome = { ...outcome, status: 'unknown', reasonCode: 'AUTHORITY_REVOKED_AFTER_SEND' }; }
    } catch {
      outcome = { messageId: '', status: 'unknown', reasonCode: controller.signal.aborted ? 'WHATSAPP_TIMEOUT' : 'WHATSAPP_RESULT_UNVERIFIED' };
    } finally { controller.abort(); if (timer) clearTimeout(timer); }

    const receipt: WhatsAppMessageReceipt = {
      ...reserved,
      recipientHash,
      maskedRecipient,
      templateName,
      status: outcome.status,
      providerMessageId: outcome.messageId,
      reasonCode: outcome.reasonCode ?? 'SENT_OK',
      createdAt: now(),
      updatedAt: now(),
    };

    this.store.save('whatsapp_receipts', receipt);
    this.store.audit(actor.user.id, 'whatsapp.send', attemptId);

    return receipt;
  }
}
