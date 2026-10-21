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

/**
 * §4:100 — kelulusan berisiko tinggi maksimum 15 minit. Ini had SERVER:
 * pemanggil tidak boleh memanjangkan expiry beyond ini.
 */
const HITL_MAX_EXPIRY_MS = 15 * 60 * 1000;
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
import {
  detectRefundIntent,
  resolveCanonicalOrderId,
  type OrderIdResolutionReasonCode,
  type RefundIntentDetection,
} from '../../shared/order-reference-contracts';
import type { ProviderCandidateOutcome } from '../../shared/provider-run-contracts';
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
      // §4:100 — kelulusan berisiko tinggi maksimum 15 minit; expiry tidak boleh
      // diperpanjang oleh pemanggil (nilai dihimpit ke had server).
      expiry: typeof payload.expiry === 'string'
        ? new Date(Math.min(new Date(payload.expiry).getTime(), Date.now() + HITL_MAX_EXPIRY_MS)).toISOString()
        : new Date(Date.now() + HITL_MAX_EXPIRY_MS).toISOString(),
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
   * Resolusi adalah TEKAT dan berkongsi dengan semua lapisan server:
   * `resolveCanonicalOrderId` (`shared/order-reference-contracts.ts`) hanya
   * menerima ID kanonikal yang hadir dalam teks sebagai TOKEN PENUH. Tiada
   * padanan substring (`ord-001` tidak memadankan `ord-0010`), tiada padanan
   * prefix, tiada pesanan separuh.
   *
   * Tie-break: apabila beberapa ID hadir, ID kanonikal TERPANJANG menang;
   * jika panjang sama, hasilnya `ORDER_ID_AMBIGUOUS` dan tiada pesanan
   * dipilih (fail tutup) supaya tiada jumlah dilampirkan pada pesanan salah.
   *
   * Nilai pulangan sentiasa membawa reason code yang boleh mesin baca.
   */
  private findOrder(message: string): {
    order: OrderRecord | null;
    reason: OrderIdResolutionReasonCode;
  } {
    const orders = this.store.all<OrderRecord>('orders');
    if (!orders.length) return { order: null, reason: 'ORDER_ID_NOT_FOUND' };
    const resolution = resolveCanonicalOrderId(
      message,
      orders.map(order => order.id)
    );
    if (!resolution.orderId) return { order: null, reason: resolution.reason };
    const order = orders.find(candidate => candidate.id === resolution.orderId) ?? null;
    return { order, reason: order ? 'ORDER_ID_RESOLVED' : 'ORDER_ID_NOT_FOUND' };
  }

  /**
   * Adakah pengguna MEMINTA ganti rugi?
   *
   * Niat refund ialah keputusan yang boleh=wang, jadi ia dikongsi dengan
   * lapisan server lain melalui `detectRefundIntent`
   * (`shared/order-reference-contracts.ts`): hanya klausa AFIRMATIF yang
   * mencetuskan. Penafian ("do not refund", "not refunded", "no refund",
   * "jangan refund") dan keadaan yang sudah selesai ("sudah refund",
   * "already refunded") TIDAK pernah mencetuskan.
   */
  private requestsRefund(text: string): RefundIntentDetection {
    return detectRefundIntent(text);
  }

  /**
   * Amaun kesan kewangan (integer sen) daripada pesanan yang DIPERCAYAI.
   *
   * Tiada pesanan yang tidak dapat dipercayai -> tiada amaun langsung
   * (bukan 0). Nilai mesti integer sen yang safe; apa-apa yang lain
   * ditolak sebagai tidak tersedia.
   */
  private trustedImpactSen(order: OrderRecord | null): number | undefined {
    if (!order) return undefined;
    if (!Number.isSafeInteger(order.amountSen) || order.amountSen < 0) return undefined;
    return order.amountSen;
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
    /**
     * Reason code provider yang paling menentukan bagi run ini (contoh
     * `PROVIDER_QUOTA_EXHAUSTED`). Nilai ini disalin daripada klasifikasi
     * sebenar; ia tidak pernah diteka.
     */
    providerBlockingReason?: string;
    /**
     * Pecahan sebab setiap calon percuma dalam run ini. Setiap entri
     * membawa reason code yang boleh mesin baca; badan mentah provider
     * tidak pernah dihantar ke pelayar.
     */
    providerCandidates?: ProviderCandidateOutcome[];
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
        // Punca utama belum disahkan secara fizikal, jadi skor keyakinan WAJIB
        // null — tiada keyakinan yang direka.
        confidenceScore: null,
      };
      genUi = {
        name: 'JevAssessmentCard',
        props: jevProps,
      };

      const { order, reason: orderResolution } = this.findOrder(userMessage);
      const refundIntent = this.requestsRefund(userMessage);

      if (refundIntent.requested) {
        // Nilai kesan kewangan hanya diisi daripada pesanan yang benar-benar
        // dibaca DAN dipercayai. Tiada pesanan -> TIADA amaun (bukan 0).
        const estimatedImpactSen = this.trustedImpactSen(order);
        hitl = this.createHitlAction(
          actor,
          'refund',
          'Permintaan tuntutan ganti rugi botol bocor pelanggan',
          {
            entity: { type: 'order', id: order ? order.id : 'UNRESOLVED' },
            ...(estimatedImpactSen !== undefined ? { amountSen: estimatedImpactSen } : {}),
            revision: order ? order.revision : 1,
            reason: 'Aduan kualiti penutup botol bocor semasa pos',
            expiry: new Date(Date.now() + HITL_MAX_EXPIRY_MS).toISOString(),
            message: userMessage,
            // Reason code yang boleh mesin baca: RESOLUSI pesanan dan NIAT
            // refund dilaporkan berasingan supaya pelayar tidak meneka
            // bahawa "tiada pesanan" bermaksud "tiada permintaan".
            reasonCode: orderResolution,
            orderResolutionReason: orderResolution,
            refundIntentReason: refundIntent.reason,
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
            orderResolutionReason: orderResolution,
            refundIntentReason: refundIntent.reason,
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
          props: jevProps,
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
      const { order, reason: orderResolution } = this.findOrder(userMessage);
      if (order) {
        // MIN-2 — "tidak dikira" ≠ sifar. Tanpa `trackingTokenExpiresAt` yang
        // direkod, baki hari TIDAK direka sebagai 0 (yang dibaca sebagai
        // "tamat hari ini"); ia `null` + reason code.
        const expiryDaysRemaining = order.trackingTokenExpiresAt
          ? Math.max(
              0,
              Math.floor((new Date(order.trackingTokenExpiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))
            )
          : null;
        const expiryReasonCode = order.trackingTokenExpiresAt
          ? (expiryDaysRemaining === 0 ? 'TRACKING_TOKEN_EXPIRED' : 'TRACKING_TOKEN_ACTIVE')
          : 'TRACKING_EXPIRY_NOT_RECORDED';
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
          expiryReasonCode,
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
        // Pesanan tidak dapat dikenal pasti: tiada ID rekaan dipaparkan dan
        // tiada amaun dipaparkan. Reason code memberitahu kenapa --
        // `ORDER_ID_NOT_FOUND` (tiada ID dalam teks) berbeza daripada
        // `ORDER_ID_AMBIGUOUS` (lebih daripada satu ID disebut).
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
            status: orderResolution,
            reasonCode: orderResolution,
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
      ...(result.blockingReason ? { providerBlockingReason: result.blockingReason } : {}),
      ...(result.candidates ? { providerCandidates: result.candidates } : {}),
      generativeUi: genUi,
      a2ui,
      hitlAction: hitl,
    };
  }
}