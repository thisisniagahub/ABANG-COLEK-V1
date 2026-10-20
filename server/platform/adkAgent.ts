/**
 * AbangColek Google ADK Agent Engine v1.1
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • Rules Own The Money
 *
 * Menyokong Ciri Penuh:
 * 1. Chat & AG-UI Streams (Rich Threads / SSE Protocol)
 * 2. Generative UI (JEV Assessment, Margin Simulator, Delivery Tracking)
 * 3. Human in the Loop (HITL Approval Gate bagi Refund / Kuarantin / Override)
 * 4. Automatic Learning (Memory & Episodic Invariant Records)
 * 5. Shared State & Frontend Tools
 *
 * KEBENARAN PROVENANCE (v1.1): Tiada kad kewangan, pesanan atau metrik boleh
 * dipaparkan sebagai hasil tanpa sumber sebenar.
 * - Margin: hanya selepas `evaluateMarginContribution` (shared/growth-contracts)
 *   benar-benar dijalankan. Tanpa input komersial, kad menyatakan "simulasi tidak
 *   dijalankan" — TIDAK pernah memancarkan margin lulus.
 * - Jejak pesanan: hanya daripada rekod pesanan yang dibaca daripada store.
 *   Tiada ID pesanan rekaan.
 * - `provenance.source` hanya menyatakan `canonical_evaluator` atau `database`
 *   apabila objek tersebut benar-benar dijalankan/dibaca.
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
import {
  type MarginSimulationInput,
  type MarginSimulationResult,
  evaluateMarginContribution,
} from '../../shared/growth-contracts';
import type { OrderRecord } from '../../shared/platform-contracts';
import { parseMarginSimulationInput, type MarginSimulationParseResult } from './marginInputs';

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

/**
 * Ambang minimum sumbangan tunai (sen) yang digunakan sebagai nilai lalai
 * apabila permintaan tidak menyatakan `minimumContributionSen`.
 * INI ADALAH AMBANG KEPOLISIAN, BUKAN HASIL KIRAAN.
 */
export const DEFAULT_MIN_CONTRIBUTION_SEN = 2000;
/** Ambang minimum nisbah sumbangan margin (%) — polisi FIN-01, bukan hasil kiraan. */
export const DEFAULT_MIN_CONTRIBUTION_MARGIN_PCT = 25;

const MARGIN_INPUT_KEYS: ReadonlyArray<keyof MarginSimulationInput> = [
  'netSalesExTaxSen',
  'cogsSen',
  'packagingSen',
  'paymentFeesSen',
  'fulfilmentVariableCostSen',
  'deliverySubsidySen',
  'agentCommissionSen',
  'rewardCostSen',
  'expectedReturnLossSen',
  'minimumContributionSen',
  'minimumContributionMarginPct',
];

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

/** Provenance terperinci yang dipaparkan bersama payload (bukan sekadar label). */
interface ProvenanceDetail {
  evaluator: string;
  recordIds: string[];
  revision: number | 'none';
  sourceKind: 'evaluator' | 'store_read' | 'request_only';
}

function marginStatus(result: MarginSimulationResult): MarginSimulatorProps['status'] {
  if (!result.isContributionPass) return 'INSUFFICIENT_CASH_MARGIN';
  if (!result.isMarginPctPass) return 'INSUFFICIENT_PERCENT_MARGIN';
  return 'PASSED';
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
      entity: payload.entity ?? { type: 'order', id: payload.orderId ?? 'UNRESOLVED' },
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

    // Semak tamat tempoh sebelum sebarang mutasi state
    if (action.expiry && new Date(action.expiry) <= new Date()) {
      fail('HITL_EXPIRED', 409, 'Tindakan HITL ini telah tamat tempoh.');
    }

    if (action.status !== 'pending_approval') {
      fail('HITL_ALREADY_DECIDED', 409, 'Tindakan HITL ini telah pun dinilai.');
    }

    // Kelulusan BUKAN pelaksanaan. Dilarang mereka-reka executionReceipt palsu.
    const updated: HitlActionRequest = {
      ...action,
      status: approve ? 'approved' : 'rejected',
      reviewedBy: actor.user.id,
      reviewedAt: now(),
      executionReceipt: undefined,
      executionBlockedReason: approve ? 'EXECUTOR_UNAVAILABLE' : undefined,
    };

    this.store.save('hitl_actions', updated);
    this.store.audit(actor.user.id, approve ? 'hitl.approve' : 'hitl.reject', updated.id);
    return updated;
  }

  // -------------------------------------------------------------------------
  // Pembacaan sumber sebenar
  // -------------------------------------------------------------------------

  /**
   * Cari pesanan sebenar yang boleh dikenal pasti daripada mesej pengguna.
   * Tiada ID pesanan rekaan: hanya rekod yang benar-benar wujud dalam store.
   *
   * Resolusi adalah TEKAT. Token mesti sama dengan id kanonikal, atau menjadi
   * segmen akhir id kanonikal (`ord-copilot-trace-01` <-> `copilot-trace-01`).
   * Padanan substring (`includes`) dilumpuhkan sepenuhnya: `ord-001` akan
   * memadankan `ord-0010`, dan jumlah wang boleh dilampirkan pada pesanan salah.
   * Jika lebih satu pesanan sepadan untuk token yang sama, tiada pesanan dipilih
   * (fails closed) dan tiada jumlah dipaparkan.
   */
  private findOrder(message: string): {
    order: OrderRecord | null;
    reason: 'RESOLVED' | 'NOT_FOUND' | 'AMBIGUOUS';
  } {
    const orders = this.store.all<OrderRecord>('orders');
    if (!orders.length) return { order: null, reason: 'NOT_FOUND' };
    const tokens: string[] = [];
    for (const match of message.matchAll(/(?:ord|order|pesanan)[-_ ]?([a-z0-9][a-z0-9-_]{2,})/gi)) {
      tokens.push(match[1].toLowerCase());
    }
    for (const match of message.matchAll(/#(\d{3,})/g)) {
      tokens.push(match[1].toLowerCase());
    }
    for (const token of tokens) {
      const exact = orders.filter((order) => order.id.toLowerCase() === token);
      if (exact.length === 1) return { order: exact[0], reason: 'RESOLVED' };
      if (exact.length > 1) return { order: null, reason: 'AMBIGUOUS' };

      const suffix = orders.filter((order) => order.id.toLowerCase().endsWith(`-${token}`));
      if (suffix.length === 1) return { order: suffix[0], reason: 'RESOLVED' };
      if (suffix.length > 1) return { order: null, reason: 'AMBIGUOUS' };
    }
    return { order: null, reason: 'NOT_FOUND' };
  }

  /**
   * Adakah pengguna MEMINTA ganti rugi?
   *
   * Padanan kata kunci semata-mata membuka permintaan refund untuk ayat yang
   * ditolak ("tak ada refund", "bukan ganti rugi"). Kata kunci hanya diterima
   * dalam klausa yang tiada penanda negasi.
   */
  private requestsRefund(text: string): boolean {
    const refundTerm = /\brefund\b|\brebate\b|ganti\s*rugi/i;
    const negation =
      /\b(tak|tidak|bukan|jangan|belum|tanpa|tiada|no|not|never|without)\b/i;
    const clauses = text.split(/[.!?;,\n]|\b(?:tetapi|tapi|namun|however|but|although)\b/i);
    for (const clause of clauses) {
      if (!refundTerm.test(clause)) continue;
      if (negation.test(clause)) continue;
      return true;
    }
    return false;
  }

  /**
   * Penilai margin kanonikal tidak boleh melontar ralat ke lapisan HTTP.
   * Sebarang TypeError/RangeError ditapis menjadi `null` (tiada kad margin
   * dipaparkan) dan bukannya 500 atau frame ralat mentah.
   */
  private evaluateMarginSafely(simulation: MarginSimulationInput): MarginSimulationResult | null {
    try {
      return evaluateMarginContribution(simulation);
    } catch {
      return null;
    }
  }

  /**
   * Baca dan sahkan input simulasi margin daripada permintaan pengguna.
   * Sokongan: objek JSON dengan kunci kanonikal, atau pasangan `kunci=nilai`.
   * Pengesahan dilakukan oleh `parseMarginSimulationInput` (satu sumber kebenaran).
   */
  private readMarginInputs(message: string): MarginSimulationParseResult {
    const raw: Record<string, unknown> = {};

    const jsonMatch = message.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(raw, parsed as Record<string, unknown>);
        }
      } catch {
        // Bukan JSON — terus ke parsing pasangan kunci=nilai.
      }
    }

    for (const match of message.matchAll(
      /\b(netSalesExTaxSen|cogsSen|packagingSen|paymentFeesSen|fulfilmentVariableCostSen|deliverySubsidySen|agentCommissionSen|rewardCostSen|expectedReturnLossSen|minimumContributionSen|minimumContributionMarginPct)\s*[=:]\s*(-?\d+(?:\.\d+)?)/gi
    )) {
      raw[match[1]] = Number(match[2]);
    }

    return parseMarginSimulationInput(raw, { defaultMinimumContributionSen: DEFAULT_MIN_CONTRIBUTION_SEN });
  }

  private missingMarginInputs(message: string): string[] {
    const raw = new Set<string>();
    for (const match of message.matchAll(/\b([a-zA-Z]+)\s*[=:]\s*-?\d+(?:\.\d+)?/g)) {
      raw.add(match[1]);
    }
    const missing = MARGIN_INPUT_KEYS.filter(
      (key) => key !== 'minimumContributionSen' && !raw.has(key)
    );
    return missing;
  }

  // -------------------------------------------------------------------------
  // Penjanaan respons interaktif dengan sokongan failover model percuma & Generative UI.
  // -------------------------------------------------------------------------
  async processMessage(
    actor: Principal,
    userMessage: string,
    conversationHistory: ChatMessageParam[] = []
  ): Promise<{
    reply: string;
    providerUsed: string;
    modelUsed: string;
    providerStatus: 'live' | 'local_rules';
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
      // Punca utama belum disahkan secara fizikal, jadi skor keyakinan WAJIB
      // null — tiada keyakinan yang direka. (Kontrak A2UI tidak medan
      // keyakinan, jadi ia dipaparkan sebagai sifat tambahan.)
      const jevCardProps = { ...jevProps, confidenceScore: null };
      genUi = {
        name: 'JevAssessmentCard',
        props: jevCardProps,
      };

      const { order } = this.findOrder(userMessage);

      if (this.requestsRefund(userMessage)) {
        // Nilai kesan kewangan hanya diisi daripada pesanan yang benar-benar dibaca.
        const estimatedImpactSen = order ? order.amountSen : undefined;
        hitl = this.createHitlAction(
          actor,
          'refund',
          'Permintaan tuntutan ganti rugi botol bocor pelanggan',
          {
            entity: { type: 'order', id: order ? order.id : 'UNRESOLVED' },
            ...(estimatedImpactSen !== undefined ? { amountSen: estimatedImpactSen } : {}),
            revision: order ? order.revision : 1,
            reason: 'Aduan kualiti penutup botol bocor semasa pos',
            expiry: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            message: userMessage,
            reasonCode: order ? 'ORDER_RESOLVED' : 'ORDER_NOT_IDENTIFIABLE',
          }
        );
        const provenanceDetail: ProvenanceDetail = {
          evaluator: 'none',
          recordIds: order ? [order.id] : [],
          revision: order ? order.revision : 'none',
          sourceKind: order ? 'store_read' : 'request_only',
        };
        a2ui = {
          schemaVersion: 'a2ui.v1',
          component: 'RefundImpactPanel',
          componentName: 'RefundImpactPanel',
          props: {
            issueClass: 'LEAKAGE',
            rootCause: 'UNDETERMINED',
            hitlRequired: true,
            ...(estimatedImpactSen !== undefined ? { estimatedImpactSen } : {}),
            sopAction: 'Kuarantin batch di cawangan & minta bukti foto penutup botol',
            orderId: order ? order.id : 'UNRESOLVED',
            provenanceDetail,
          },
          provenance: {
            source: order ? 'database' : 'jev_local_rules',
            timestamp: now(),
            revision: order ? order.revision : 'none',
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
          props: jevCardProps,
          provenance: {
            source: 'jev_local_rules',
            timestamp: now(),
            revision: 'none',
          },
          actions: [
            { id: 'sop-quarantine', label: 'Mulakan Kuarantin Batch', actionType: 'recheck' },
          ],
        };
      }
    } else if (lower.includes('margin') || lower.includes('kempen') || lower.includes('diskaun')) {
      const marginInput = this.readMarginInputs(userMessage);
      const simulation = marginInput.ok ? marginInput.input : null;
      const evaluation = simulation ? this.evaluateMarginSafely(simulation) : null;
      if (!simulation || !evaluation) {
        // Tiada input komersial yang sah: tiada simulasi boleh dijalankan. Tidak memancarkan margin lulus.
        const reasonCode = marginInput.ok ? 'MARGIN_INPUTS_INVALID' : marginInput.reason;
        const missing = this.missingMarginInputs(userMessage);
        const provenanceDetail: ProvenanceDetail = {
          evaluator: 'none',
          recordIds: [],
          revision: 'none',
          sourceKind: 'request_only',
        };
        a2ui = {
          schemaVersion: 'a2ui.v1',
          component: 'MarginSummaryCard',
          componentName: 'MarginSummaryCard',
          props: {
            simulationPerformed: false,
            status: 'NOT_SIMULATED',
            reasonCode,
            requiredInputKeys: [...MARGIN_INPUT_KEYS],
            missingInputKeys: missing,
            requiredContributionSen: DEFAULT_MIN_CONTRIBUTION_SEN,
            requiredMarginPct: DEFAULT_MIN_CONTRIBUTION_MARGIN_PCT,
            provenanceDetail,
          },
          provenance: {
            source: 'local_authoritative',
            timestamp: now(),
            revision: 'none',
          },
          actions: [
            { id: 'act-campaign-draft', label: 'Cipta Draf Kempen', actionType: 'navigate' },
          ],
        };
      } else {
        // Penilai margin kanonikal SEBENARNYA dijalankan di sini.
        const result = evaluation;
        const status = marginStatus(result);
        const marginProps: MarginSimulatorProps = {
          contributionSen: result.contributionSen,
          contributionMarginPct: result.contributionMarginPct,
          requiredContributionSen: simulation.minimumContributionSen,
          requiredMarginPct: simulation.minimumContributionMarginPct,
          status,
          minMarginSen: simulation.minimumContributionSen,
          minMarginPercent: simulation.minimumContributionMarginPct,
        };
        const provenanceDetail: ProvenanceDetail = {
          evaluator: 'evaluateMarginContribution',
          recordIds: [],
          revision: 'none',
          sourceKind: 'evaluator',
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
            ...marginProps,
            evaluator: 'evaluateMarginContribution',
            reasonCode: result.reasonCode,
            provenanceDetail,
          },
          provenance: {
            source: 'canonical_evaluator',
            timestamp: now(),
            revision: 'evaluateMarginContribution',
          },
          actions: [
            { id: 'act-campaign-draft', label: 'Cipta Draf Kempen', actionType: 'navigate' },
          ],
        };
      }
    } else if (lower.includes('jejak') || lower.includes('tracking')) {
      const { order } = this.findOrder(userMessage);
      if (order) {
        const expiryDaysRemaining = order.trackingTokenExpiresAt
          ? Math.max(
              0,
              Math.floor((new Date(order.trackingTokenExpiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))
            )
          : 0;
        const stage =
          order.fulfilmentStatus === 'dispatched'
            ? ('dispatched' as const)
            : order.fulfilmentStatus === 'received'
              ? ('received' as const)
              : order.fulfilmentStatus === 'packed' || order.fulfilmentStatus === 'packing'
                ? ('packing' as const)
                : order.fulfilmentStatus === 'accepted'
                  ? ('accepted' as const)
                  : ('draft' as const);
        const trackingProps: OrderTrackingProjectionProps = {
          orderId: order.id,
          stage,
          trackingTokenRedactedHash: order.trackingTokenHash
            ? order.trackingTokenHash.slice(0, 16)
            : 'unavailable',
          expiryDaysRemaining,
        };
        const provenanceDetail: ProvenanceDetail = {
          evaluator: 'none',
          recordIds: [order.id],
          revision: order.revision,
          sourceKind: 'store_read',
        };
        genUi = {
          name: 'OrderTrackingBadge',
          props: { ...trackingProps, fulfilmentStatus: order.fulfilmentStatus, provenanceDetail },
        };
        a2ui = {
          schemaVersion: 'a2ui.v1',
          component: 'OrderTrackingBadge',
          componentName: 'OrderTrackingBadge',
          props: {
            ...trackingProps,
            fulfilmentStatus: order.fulfilmentStatus,
            paymentState: order.paymentState,
            provenanceDetail,
          },
          provenance: {
            source: 'database',
            timestamp: now(),
            revision: order.revision,
          },
        };
      } else {
        // Pesanan tidak dapat dikenal pasti: tiada ID rekaan dipaparkan.
        const provenanceDetail: ProvenanceDetail = {
          evaluator: 'none',
          recordIds: [],
          revision: 'none',
          sourceKind: 'request_only',
        };
        a2ui = {
          schemaVersion: 'a2ui.v1',
          component: 'OrderTrackingCard',
          componentName: 'OrderTrackingCard',
          props: {
            found: false,
            status: 'ORDER_NOT_IDENTIFIABLE',
            reasonCode: 'ORDER_NOT_IDENTIFIABLE',
            provenanceDetail,
          },
          provenance: {
            source: 'local_authoritative',
            timestamp: now(),
            revision: 'none',
          },
        };
      }
    } else {
      const orders = this.store.all<OrderRecord>('orders');
      const pendingOrders = orders.filter(
        (order) => order.fulfilmentStatus !== 'received' && order.fulfilmentStatus !== 'cancelled'
      ).length;
      const pendingHitl = this.store
        .all<HitlActionRequest>('hitl_actions')
        .filter((action) => action.status === 'pending_approval').length;
      const collectedSen = orders.reduce(
        (total, order) => total + order.paidAmountSen - order.refundAmountSen,
        0
      );
      const briefProps: OperationsBriefCardProps = {
        title: 'Taklimat Operasi AbangColek Sovereign GrowthOS',
        briefDate: now().slice(0, 10),
        readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED',
        metrics: [
          { label: 'Pesanan Menunggu', value: String(pendingOrders) },
          { label: 'Tunay Dikumpulkan (Sen)', value: String(collectedSen) },
          { label: 'Tindakan HITL Menunggu', value: String(pendingHitl) },
          { label: 'Penyedia Model', value: this.router.getActiveProvider().name },
        ],
      };
      const provenanceDetail: ProvenanceDetail = {
        evaluator: 'none',
        recordIds: [],
        revision: 'none',
        sourceKind: 'store_read',
      };
      a2ui = {
        schemaVersion: 'a2ui.v1',
        component: 'OperationsBriefCard',
        componentName: 'OperationsBriefCard',
        props: { ...briefProps, readOnly: true, provenanceDetail },
        provenance: {
          source: 'database',
          timestamp: now(),
          revision: 'store_snapshot',
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
      providerStatus: result.status ?? (result.providerId === 'local_rules' ? 'local_rules' : 'live'),
      generativeUi: genUi,
      a2ui,
      hitlAction: hitl,
    };
  }
}
