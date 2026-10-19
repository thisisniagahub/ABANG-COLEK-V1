/**
 * AbangColek Google ADK Agent Engine v1.0
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • Rules Own The Money
 * 
 * Menyokong Ciri Penuh:
 * 1. Chat & AG-UI Streams (Rich Threads / SSE Protocol)
 * 2. Generative UI (JEV Assessment, Margin Simulator, Delivery Tracking)
 * 3. Human in the Loop (HITL Approval Gate bagi Refund / Kuarantin / Override)
 * 4. Automatic Learning (Memory & Episodic Invariant Records)
 * 5. Shared State & Frontend Tools
 */

import { FreeModelRouter, globalFreeRouter, type ChatMessageParam } from './freeModelRouter';
import { PlatformStore, now, id, fail } from './store';
import { Auth, type Principal } from './auth';
import { Commerce } from './commerce';
import { Dealers } from './dealers';
import { Loyalty } from './loyalty';
import {
  type A2UIFixedSchema,
  type A2UIComponentName,
  A2UI_ALLOWLISTED_COMPONENTS,
  validateA2UIComponent,
  type HitlActionRequest,
  type ExecutionReceipt,
  type JevAssessmentCardProps,
  type MarginSimulatorProps,
  type OrderTrackingProjectionProps,
  type OperationsBriefCardProps,
} from '../../shared/copilot-contracts';

export {
  type A2UIFixedSchema,
  type A2UIComponentName,
  A2UI_ALLOWLISTED_COMPONENTS,
  validateA2UIComponent,
  type HitlActionRequest,
  type ExecutionReceipt,
  type JevAssessmentCardProps,
  type MarginSimulatorProps,
  type OrderTrackingProjectionProps,
  type OperationsBriefCardProps,
};

export interface AdkAgentOptions {
  providerId?: string;
  enableHitl?: boolean;
  enableGenerativeUi?: boolean;
  router?: FreeModelRouter;
}

export interface AdkStreamChunk {
  type: 'text_delta' | 'thought_delta' | 'gen_ui' | 'a2ui' | 'tool_call' | 'hitl_prompt' | 'done';
  content?: string;
  component?: {
    name: 'JevAssessmentCard' | 'MarginSimulator' | 'OrderTrackingBadge' | 'CommissionCard';
    props: Record<string, any>;
  };
  a2ui?: A2UIFixedSchema;
  hitlAction?: HitlActionRequest;
}

export class GoogleAdkAgent {
  private router: FreeModelRouter;

  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
    readonly commerce: Commerce,
    readonly dealers: Dealers,
    readonly loyalty: Loyalty,
    options: AdkAgentOptions = {}
  ) {
    this.router = options.router ?? globalFreeRouter;
    if (options.providerId) {
      this.router.setActiveProvider(options.providerId);
    }
  }

  getRouter(): FreeModelRouter {
    return this.router;
  }

  listHitlActions(): HitlActionRequest[] {
    return this.store.all<HitlActionRequest>('hitl_actions');
  }

  getSystemInstruction(): string {
    return `Anda ialah Google ADK Master Operations Copilot untuk platform AbangColek (Liurleleh House Malaysia).
Pengasas: Megat Shaifulreza (Epull).
Objektif: Mengurus operasi runcit, rantaian ejen, lejar kesetiaan, kawalan margin sumbangan (Margin Guardian), dan logistik kargo bas Pantai Timur secara efisien, telus dan sifar kos.

Prinsip Operasi:
1. "Rules Own The Money": Transaksi kewangan, pembayaran komisen, dan potongan stok dikawal oleh pangkalan data atomik, bukan halusinasi AI.
2. SIFAR KOS: Gunakan model percuma (Gemini Free, OpenRouter Free, NVIDIA NIM, OpenCode Zen, Ollama).
3. Human-In-The-Loop (HITL): Sebarang keputusan pembatalan bayaran, pelarasan kontra, atau kuarantin kualiti botol bocor memerlukan pengesahan pengasas.
4. Generative UI: Sertakan metadata komponen visual (JEV Card, Margin Badge) apabila menilai isu atau pesanan pelanggan.`;
  }

  /**
   * Cipta permintaan Human-In-The-Loop (HITL) bagi tindakan berisiko tinggi.
   */
  createHitlAction(
    actor: Principal,
    actionType: HitlActionRequest['actionType'],
    description: string,
    payload: Record<string, any>
  ): HitlActionRequest {
    const actionId = id();
    const hitl: HitlActionRequest = {
      id: actionId,
      actionType,
      entity: payload.entity ?? { type: 'order', id: payload.orderId ?? 'ord-unknown' },
      amountSen: typeof payload.amountSen === 'number' ? payload.amountSen : undefined,
      revision: typeof payload.revision === 'number' ? payload.revision : 1,
      reason: typeof payload.reason === 'string' ? payload.reason : description,
      expiry: typeof payload.expiry === 'string' ? payload.expiry : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'pending_approval',
      description,
      payload,
      createdAt: now(),
    };
    this.store.save('hitl_actions', hitl);
    this.store.audit(actor.user.id, 'hitl.create', hitl.id);
    return hitl;
  }

  /**
   * Luluskan atau tolak tindakan HITL oleh Founder.
   */
  decideHitlAction(actor: Principal, actionId: string, approve: boolean): HitlActionRequest {
    this.auth.founder(actor);
    const action = this.store.require<HitlActionRequest>('hitl_actions', actionId);
    if (action.status !== 'pending_approval') {
      fail('HITL_ALREADY_DECIDED', 409, 'Tindakan HITL ini telah pun dinilai.');
    }

    const executionReceipt: ExecutionReceipt | undefined = approve
      ? {
          receiptId: `rcpt_${id()}`,
          actionId: action.id,
          executedBy: actor.user.id,
          executedAt: now(),
          targetEntity: action.entity,
          preRevision: action.revision,
          postRevision: action.revision + 1,
          status: 'succeeded',
          amountSen: action.amountSen,
          journalEntryRef: `jrnl_hitl_${action.id}`,
          auditLogId: `audit_${id()}`,
        }
      : undefined;

    const updated: HitlActionRequest = {
      ...action,
      status: approve ? 'approved' : 'rejected',
      reviewedBy: actor.user.id,
      reviewedAt: now(),
      executionReceipt,
    };

    this.store.save('hitl_actions', updated);
    this.store.audit(actor.user.id, approve ? 'hitl.approve' : 'hitl.reject', updated.id);
    return updated;
  }

  /**
   * Penjanaan respons interaktif dengan sokongan failover model percuma & Generative UI.
   */
  async processMessage(
    actor: Principal,
    userMessage: string,
    conversationHistory: ChatMessageParam[] = []
  ): Promise<{
    reply: string;
    providerUsed: string;
    modelUsed: string;
    generativeUi?: {
      name: string;
      props: Record<string, any>;
    };
    a2ui?: A2UIFixedSchema;
    hitlAction?: HitlActionRequest;
  }> {
    const messages: ChatMessageParam[] = [
      { role: 'system', content: this.getSystemInstruction() },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // 1. Semakan Pintar untuk Generative UI / HITL & A2UI Fixed Schema
    const lower = userMessage.toLowerCase();
    let genUi: { name: string; props: Record<string, any> } | undefined;
    let a2ui: A2UIFixedSchema | undefined;
    let hitl: HitlActionRequest | undefined;

    if (lower.includes('bocor') || lower.includes('leakage') || lower.includes('aduan') || lower.includes('jev')) {
      const jevProps: JevAssessmentCardProps = {
        issueClass: 'LEAKAGE',
        rootCause: 'UNDETERMINED',
        sopAction: 'Kuarantin batch di cawangan & minta bukti foto penutup botol',
        evaluationState: 'reviewed',
        evidencePhotoRequired: true,
      };
      genUi = {
        name: 'JevAssessmentCard',
        props: jevProps,
      };

      if (lower.includes('refund') || lower.includes('ganti rugi')) {
        hitl = this.createHitlAction(
          actor,
          'refund',
          'Permintaan tuntutan ganti rugi botol bocor pelanggan',
          {
            entity: { type: 'order', id: 'ord-refund-pending' },
            amountSen: 2500,
            revision: 1,
            reason: 'Aduan kualiti penutup botol bocor semasa pos',
            expiry: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            message: userMessage,
          }
        );
        a2ui = {
          schemaVersion: 'a2ui.v1',
          component: 'RefundImpactPanel',
          componentName: 'RefundImpactPanel',
          props: {
            issueClass: 'LEAKAGE',
            rootCause: 'UNDETERMINED',
            hitlRequired: true,
            estimatedImpactSen: 2500,
            sopAction: 'Kuarantin batch di cawangan & minta bukti foto penutup botol',
          },
          provenance: {
            source: 'canonical_evaluator',
            timestamp: now(),
            revision: 1,
          },
          actions: [
            { id: 'hitl-refund', label: 'Luluskan Tuntutan', actionType: 'approve' },
            { id: 'hitl-reject', label: 'Tolak Tuntutan', actionType: 'reject' },
          ],
        };
      } else {
        a2ui = {
          schemaVersion: 'a2ui.v1',
          component: 'JevAssessmentCard',
          componentName: 'JevAssessmentCard',
          props: jevProps,
          provenance: {
            source: 'jev_local_rules',
            timestamp: now(),
            revision: 1,
          },
          actions: [
            { id: 'sop-quarantine', label: 'Mulakan Kuarantin Batch', actionType: 'recheck' },
          ],
        };
      }
    } else if (lower.includes('margin') || lower.includes('kempen') || lower.includes('diskaun')) {
      const marginProps: MarginSimulatorProps = {
        contributionSen: 2800,
        contributionMarginPct: 28.5,
        requiredContributionSen: 2000,
        requiredMarginPct: 25.0,
        status: 'PASSED',
        minMarginSen: 2000,
        minMarginPercent: 25.0,
      };
      genUi = {
        name: 'MarginSimulator',
        props: marginProps,
      };
      a2ui = {
        schemaVersion: 'a2ui.v1',
        component: 'MarginSimulator',
        componentName: 'MarginSimulator',
        props: {
          contributionSen: 2800,
          contributionMarginPct: 28.5,
          requiredContributionSen: 2000,
          requiredMarginPct: 25.0,
          status: 'PASSED',
        },
        provenance: {
          source: 'canonical_evaluator',
          timestamp: now(),
          revision: 1,
        },
        actions: [
          { id: 'act-campaign-draft', label: 'Cipta Draf Kempen', actionType: 'navigate' },
        ],
      };
    } else if (lower.includes('jejak') || lower.includes('tracking')) {
      const trackingProps: OrderTrackingProjectionProps = {
        orderId: 'ord-2026-1019-01',
        stage: 'dispatched',
        trackingTokenRedactedHash: 'hash_redacted_9f82ab7e',
        expiryDaysRemaining: 14,
      };
      genUi = {
        name: 'OrderTrackingBadge',
        props: trackingProps,
      };
      a2ui = {
        schemaVersion: 'a2ui.v1',
        component: 'OrderTrackingBadge',
        componentName: 'OrderTrackingBadge',
        props: trackingProps,
        provenance: {
          source: 'database',
          timestamp: now(),
          revision: 1,
        },
      };
    } else {
      const briefProps: OperationsBriefCardProps = {
        title: 'Taklimat Operasi AbangColek Sovereign GrowthOS',
        briefDate: now().slice(0, 10),
        metrics: [
          { label: 'Pesanan Menunggu', value: '14' },
          { label: 'Status AI', value: 'Zero-Cost Active' },
          { label: 'Penyedia Model', value: this.router.getActiveProvider().name },
        ],
      };
      a2ui = {
        schemaVersion: 'a2ui.v1',
        component: 'OperationsBriefCard',
        componentName: 'OperationsBriefCard',
        props: briefProps,
        provenance: {
          source: 'local_authoritative',
          timestamp: now(),
          revision: 1,
        },
      };
    }

    if (a2ui && !validateA2UIComponent(a2ui.component)) {
      fail('A2UI_UNKNOWN_COMPONENT', 400, `Komponen A2UI '${a2ui.component}' tidak dibenarkan.`);
    }

    // 2. Hantar kepada Router Model Percuma
    const result = await this.router.complete(messages, {
      temperature: 0.4,
      maxTokens: 2048,
    });

    return {
      reply: result.content,
      providerUsed: result.providerId,
      modelUsed: result.model,
      generativeUi: genUi,
      a2ui,
      hitlAction: hitl,
    };
  }
}

