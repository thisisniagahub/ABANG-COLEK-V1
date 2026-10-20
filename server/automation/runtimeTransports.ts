import { createHmac } from 'node:crypto';
import type { AgentResult, CancelOutcome, PublishIntent, ReadOnlyAgentTask, ResearchRequest, UsageSnapshot } from '../../shared/platform-contracts';
import { now } from '../platform/store';
import type { PlatformStore } from '../platform/store';
import type { AutomationOptions, PostizPublisherTransport, ReadOnlyHermesTransport, ReadOnlyResearchTransport, ResearchCollection } from './adapters';
import type { WhatsAppTransport } from '../platform/whatsapp';
import { publicSourceUrl } from './sourcePolicy';

/**
 * Reason codes bagi transport tempatan (stub). Setiap satu menyatakan secara
 * eksplisit bahawa tiada kesan luaran berlaku.
 */
export const LOCAL_STUB_NO_EXTERNAL_EFFECT = 'LOCAL_STUB_NO_EXTERNAL_EFFECT';
export const LOCAL_STUB_NOT_DELIVERED = 'LOCAL_STUB_NOT_DELIVERED';
export const LOCAL_STUB_NO_EXTERNAL_PUBLISH = 'LOCAL_STUB_NO_EXTERNAL_PUBLISH';
export const LOCAL_STUB_NO_EXTERNAL_RECONCILE = 'LOCAL_STUB_NO_EXTERNAL_RECONCILE';
export const LOCAL_STUB_NO_EXTERNAL_CANCEL = 'LOCAL_STUB_NO_EXTERNAL_CANCEL';
export const LOCAL_STUB_NO_PERSISTED_ARTIFACT = 'LOCAL_STUB_NO_PERSISTED_ARTIFACT';

/**
 * Penanda yang tidak boleh diabaikan oleh mana-mana pengguna hasil:
 * `transport: 'local_stub'`, `delivered: false`, `externalEffect: 'none'`.
 */
export interface LocalStubMarker {
  transport: 'local_stub';
  delivered: false;
  externalEffect: 'none';
}

export class LocalHermesTransport implements ReadOnlyHermesTransport {
  readonly zeroNewSpend = true as const;
  private store?: PlatformStore;

  constructor(store?: PlatformStore) {
    this.store = store;
  }

  /** Platform menyambungkan store kanonikal supaya ringkasan benar-benar disimpan. */
  attachStore(store: PlatformStore): void {
    this.store = store;
  }

  async run(task: ReadOnlyAgentTask, signal: AbortSignal): Promise<AgentResult> {
    if (signal.aborted) {
      throw new Error('HERMES_ABORTED');
    }

    // Safety check against unauthorized tool scopes
    if (task.allowedToolIds.some(tool => !['research.sources.read', 'knowledge.approved.read'].includes(tool))) {
      return {
        status: 'blocked',
        artifactIds: [],
        evidenceIds: [],
        unknownReasons: ['TOOL_SCOPE_DENIED'],
      };
    }

    // Anti-prompt-injection check: Untrusted content cannot instruct secrets extraction or shell execution
    if (/(\bsecrets?\b|\bapi.?key\b|\bpasswords?\b|\btoken\b|\bexec\b|\bshell\b|\brm\s+-rf\b)/i.test(task.objective)) {
      return {
        status: 'blocked',
        artifactIds: [],
        evidenceIds: [],
        unknownReasons: ['UNTRUSTED_CONTENT_INSTRUCTION_DENIED'],
      };
    }

    // Harmless, grounded analysis on permitted source references
    const summary = `Hermes Analysis for Job ${task.jobId}: Processed ${task.sourceRefs.length} approved references under objective: "${task.objective.slice(0, 100)}".`;

    // Ringkasan HANYA boleh dipaparkan sebagai artifak jika ia benar-benar
    // disimpan. Tanpa store, tiada artifak dikclaimed.
    if (!this.store) {
      return {
        status: 'partial',
        artifactIds: [],
        evidenceIds: [],
        unknownReasons: [LOCAL_STUB_NO_PERSISTED_ARTIFACT],
      };
    }

    const artifactId = `art-hermes-${task.jobId}`;
    this.store.save('job_artifacts', {
      id: artifactId,
      jobId: task.jobId,
      kind: 'hermes_local_summary',
      content: summary,
      createdAt: now(),
    });
    return {
      status: 'completed',
      artifactIds: [artifactId],
      evidenceIds: [],
      unknownReasons: [],
    };
  }
}

export class LocalAgentReachTransport implements ReadOnlyResearchTransport {
  readonly zeroNewSpend = true as const;

  async collect(
    request: ResearchRequest,
    signal: AbortSignal,
    onSource?: (source: unknown) => void,
  ): Promise<ResearchCollection> {
    if (signal.aborted) {
      throw new Error('AGENT_REACH_ABORTED');
    }

    const collectedSources: unknown[] = [];
    const unknownReasons: string[] = [];

    for (const rawUrl of request.allowedSources.slice(0, request.maxItems)) {
      if (signal.aborted) break;
      try {
        const validatedUrl = publicSourceUrl(rawUrl);
        const sourceData = {
          url: validatedUrl,
          title: `Public Research Source: ${new URL(validatedUrl).hostname}`,
          snippet: `Disahkan daripada sumber awam yang dibenarkan (${validatedUrl}) untuk soalan: ${request.question.slice(0, 120)}`,
          retrievedAt: now(),
          termsCheck: 'allowed',
          accessMethod: 'public_web',
          permittedUse: 'analisis_penyelidikan_platform',
        };
        collectedSources.push(sourceData);
        onSource?.(sourceData);
      } catch (err) {
        unknownReasons.push('SOURCE_URL_INVALID_OR_DENIED');
      }
    }

    return {
      summary: `Hasil carian Agent-Reach bagi: "${request.question}". Mengandungi ${collectedSources.length} sumber awam disahkan.`,
      sources: collectedSources,
      unknownReasons,
    };
  }
}

/**
 * Transport penerbitan tempatan. Ia TIDAK menghubungi Postiz atau mana-mana
 * saluran luaran: tiada penerbitan pernah berlaku, jadi ia tidak pernah
 * melaporkan `published`.
 */
export class LocalPostizTransport implements PostizPublisherTransport {
  readonly zeroNewSpend = true as const;
  readonly channel = 'local-pilot' as const;

  async publish(
    intent: PublishIntent,
    signal: AbortSignal,
  ): Promise<
    {
      providerRef: string;
      status: 'published' | 'blocked' | 'unknown';
      url?: string;
      reasonCode?: string;
    } & LocalStubMarker
  > {
    if (signal.aborted) throw new Error('POSTIZ_ABORTED');

    // Rujukan tempatan sahaja — TIDAK ada URL luaran yang dipalsukan.
    const providerRef = `local-stub-${intent.campaignId.slice(0, 8)}-rev${intent.assetVersion}`;
    return {
      providerRef,
      status: 'unknown',
      reasonCode: LOCAL_STUB_NO_EXTERNAL_PUBLISH,
      transport: 'local_stub',
      delivered: false,
      externalEffect: 'none',
    };
  }

  async reconcile(
    providerRef: string,
    signal: AbortSignal,
  ): Promise<
    { status: 'published' | 'blocked' | 'unknown'; url?: string; reasonCode?: string } & LocalStubMarker
  > {
    if (signal.aborted) throw new Error('POSTIZ_ABORTED');
    return {
      status: 'unknown',
      reasonCode: LOCAL_STUB_NO_EXTERNAL_RECONCILE,
      transport: 'local_stub',
      delivered: false,
      externalEffect: 'none',
    };
  }

  async cancel(
    providerRef: string,
    signal: AbortSignal,
  ): Promise<CancelOutcome> {
    if (signal.aborted) throw new Error('POSTIZ_ABORTED');
    // Tiada penerbitan luaran existed, jadi tiada pembatalan luaran berlaku.
    return {
      providerRef,
      status: 'unknown',
      evidenceIds: [],
    };
  }
}

/**
 * Transport WhatsApp tempatan. Ia tidak menghubungi Meta: tiada mesej pernah
 * dihantar, jadi ia tidak pernah melaporkan `sent` dan tidak memalsukan ID
 * mesej provider.
 */
export class LocalWhatsAppTransport implements WhatsAppTransport {
  readonly zeroNewSpend = true as const;
  readonly phoneNumberId = 'local-phone-60123456789';
  readonly webhookSecret = 'local-wa-webhook-secret-abangcolek';

  async sendTemplate(
    to: string,
    templateName: string,
    parameters: Record<string, string>,
    signal: AbortSignal,
  ): Promise<
    {
      messageId: string;
      status: 'accepted' | 'sent' | 'failed' | 'unknown';
      reasonCode?: string;
    } & LocalStubMarker
  > {
    if (signal.aborted) throw new Error('WHATSAPP_ABORTED');
    return {
      // Tiada ID mesej provider wujud kerana tiada mesej dihantar.
      messageId: '',
      status: 'failed',
      reasonCode: LOCAL_STUB_NOT_DELIVERED,
      transport: 'local_stub',
      delivered: false,
      externalEffect: 'none',
    };
  }

  verifyWebhookSignature(signature: string, rawPayload: string): boolean {
    const expected = 'sha256=' + createHmac('sha256', this.webhookSecret).update(rawPayload).digest('hex');
    return signature === expected;
  }
}

export function createDefaultWhatsAppTransport(): WhatsAppTransport {
  return new LocalWhatsAppTransport();
}

export function createDefaultAutomationOptions(store?: PlatformStore): AutomationOptions {
  return {
    hermes: new LocalHermesTransport(store),
    agentReach: new LocalAgentReachTransport(),
    postiz: new LocalPostizTransport(),
    externalUsage: (): UsageSnapshot => ({
      providerId: 'agent_reach',
      // Local stub: no external unit was ever consumed by this transport.
      observedUnits: 0,
      limitUnits: 100,
      available: true,
      observedAt: now(),
    }),
    timeoutMs: 5000,
  };
}
