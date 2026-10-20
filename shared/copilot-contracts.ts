/**
 * AbangColek Sovereign GrowthOS — CopilotKit & ADK Contracts v1.0 / Revision 4
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • Rules Own The Money • A2UI Fixed Schema
 */

export interface FreeModelCandidate {
  providerId: 'gemini_free' | 'openrouter';
  model: string;
  name: string;
}

/**
 * Susunan calon model percuma yang dipatuhi secara ketat tanpa sebarang paid fallback:
 * 1. gemini-3.6-flash (Primary Free)
 * 2. gemini-3.5-flash-lite (Secondary Free)
 * 3. nvidia/nemotron-3-ultra-550b-a55b:free via OpenRouter Free
 *
 * Shay 3 ditukar pada 20 Oktober 2026: `nvidia/nemotron-3-super-120b-a12b:free`
 * memulangkan HTTP 404 "Function ... Not found for account" untuk akaun ini.
 * `nvidia/nemotron-3-ultra-550b-a55b:free` disahkan HTTP 200 secara live.
 * Bukti live: `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`.
 */
export const STRICT_FREE_CANDIDATE_SEQUENCE: readonly FreeModelCandidate[] = [
  {
    providerId: 'gemini_free',
    model: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (Primary Free)',
  },
  {
    providerId: 'gemini_free',
    model: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite (Fallback Free)',
  },
  {
    providerId: 'openrouter',
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA Nemotron 3 Ultra 550B Free (OpenRouter Free)',
  },
] as const;

export const A2UI_ALLOWLISTED_COMPONENTS = [
  'OperationsBriefCard',
  'RefundImpactPanel',
  'JevAssessmentCard',
  'MarginSimulator',
  'MarginSummaryCard',
  'OrderTrackingBadge',
  'OrderTrackingCard',
  'CommissionCard',
] as const;

export type A2UIComponentName = (typeof A2UI_ALLOWLISTED_COMPONENTS)[number];

export function validateA2UIComponent(name: string): name is A2UIComponentName {
  return (A2UI_ALLOWLISTED_COMPONENTS as readonly string[]).includes(name);
}

export type ProvenanceSource =
  | 'local_authoritative'
  | 'canonical_evaluator'
  | 'jev_local_rules'
  | 'database';

export type A2UIActionType = 'approve' | 'reject' | 'navigate' | 'recheck';

export interface A2UIAction {
  id: string;
  label: string;
  actionType: A2UIActionType;
  payload?: Record<string, any>;
}

export interface A2UIProvenance {
  source: ProvenanceSource;
  timestamp: string;
  revision?: number | string;
}

/**
 * Kanonikal Wire Format A2UI v1:
 * Menyokong kedua-dua `component` dan `componentName` untuk keserasian
 * renderer Copilot dan ADR-0003.
 */
export interface A2UIFixedSchema<TProps = Record<string, any>> {
  schemaVersion: 'a2ui.v1';
  component: A2UIComponentName;
  componentName?: A2UIComponentName;
  props: TProps;
  provenance: A2UIProvenance;
  actions?: A2UIAction[];
}

// ============================================================================
// Komponen 1: JevAssessmentCard (GUI-01 Display Only)
// Peraturan Mutlak: Tiada skor keyakinan / confidenceScore rekaan.
// ============================================================================
export interface JevAssessmentCardProps {
  issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
  rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
  sopAction: string;
  evaluationState: 'reviewed' | 'pending_quarantine';
  evidencePhotoRequired: boolean;
}

// ============================================================================
// Komponen 2: MarginSummaryCard & MarginSimulator (GUI-01 & GUI-02)
// Peraturan Mutlak: Ambang tunai integer Sen dan peratusan dinyatakan secara konsisten.
// ============================================================================
export interface MarginSimulatorProps {
  contributionSen: number;
  contributionMarginPct: number;
  requiredContributionSen: number; // minMarginSen (ambang tunai integer Sen)
  requiredMarginPct: number; // minMarginPercent (ambang peratusan)
  status: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
  minMarginSen?: number; // Alias kanonikal untuk requiredContributionSen
  minMarginPercent?: number; // Alias kanonikal untuk requiredMarginPct
}

// ============================================================================
// Komponen 3: OrderTrackingCard & OrderTrackingBadge (GUI-01 & GUI-04)
// Peraturan Mutlak: Unjuran pesanan selamat tanpa kebocoran medan dalaman.
// ============================================================================
export interface OrderTrackingProjectionProps {
  orderId: string;
  stage: 'draft' | 'accepted' | 'packing' | 'dispatched' | 'received';
  trackingTokenRedactedHash: string;
  expiryDaysRemaining: number;
}

// ============================================================================
// Komponen 4: OperationsBriefCard (GUI-05 Read-Only First-Party MCP App)
// Peraturan Mutlak: Menyertakan briefDate dan senarai metrics.
// ============================================================================
export interface OperationsBriefMetric {
  label: string;
  value: string;
}

export interface OperationsBriefCardProps {
  title: string;
  briefDate: string; // Format kalendar YYYY-MM-DD
  metrics: OperationsBriefMetric[];
  readOnlyNotice?: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED';
}

// ============================================================================
// Komponen 5: RefundImpactPanel (GUI-06 A2UI Fixed Schema)
// ============================================================================
export interface RefundImpactPanelProps {
  issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
  rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
  hitlRequired: true;
  estimatedImpactSen?: number;
  sopAction?: string;
}

// ============================================================================
// Human-In-The-Loop (HITL) Request & Execution Receipt Contracts
// ============================================================================
export type HitlStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'stale'
  | 'failed'
  | 'succeeded';

export interface HitlEntityRef {
  type: 'order' | 'inventory_lot' | 'dealer_commission' | 'expense' | 'user' | 'batch';
  id: string;
}

export interface ExecutionReceipt {
  receiptId: string;
  actionId: string;
  executedBy: string;
  executedAt: string;
  targetEntity: HitlEntityRef;
  preRevision: number;
  postRevision: number;
  status: 'succeeded' | 'failed';
  amountSen?: number;
  journalEntryRef?: string;
  auditLogId: string;
  sourceHash?: string;
}

export interface HitlActionRequest {
  id: string;
  actionType: 'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra';
  entity: HitlEntityRef;
  amountSen?: number; // Integer sen untuk tindakan bernilai kewangan
  revision: number; // State revision expected when action was proposed
  reason: string; // Justifikasi eksplisit keputusan
  expiry: string; // ISO 8601 timestamp tamat tempoh kelulusan
  status: HitlStatus;
  description: string;
  payload: Record<string, any>;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  executionReceipt?: ExecutionReceipt;
  executionBlockedReason?: 'EXECUTOR_UNAVAILABLE';
}

// ============================================================================
// Scoped Client-State Projection (GUI-04 Safe Allowlisted Schema)
// ============================================================================
export interface StateScope {
  workspaceId: string;
  userId: string;
  threadId: string;
}

export type SafeClientStateValue = string | number | boolean;

export interface WorkflowProgressState {
  label?: string;
  currentStep: number;
  totalSteps: number;
}

export interface ScopedStateProjection {
  scope: StateScope;
  selectedOrderId?: string;
  filters: Record<string, SafeClientStateValue>;
  draft: Record<string, SafeClientStateValue>;
  workflowProgress?: WorkflowProgressState;
  updatedAt: string;
  schemaVersion: 'scoped_state.v1';
}

export const DISALLOWED_CLIENT_STATE_TOKENS = [
  'role',
  'paid',
  'admin',
  'permission',
  'permissions',
  'capability',
  'capabilities',
  'authority',
  'authorized',
  'authorize',
  'authorization',
  'allowed',
  'permitted',
  'approve',
  'approved',
  'approver',
  'approves',
  'approval',
  'access',
  'privilege',
  'entitlement',
] as const;

export interface CopilotV2RuntimeDescriptor {
  version: '2.0.0';
  runtime: 'copilotkit-v2-agui';
  schema: 'a2ui.v1';
  activeProvider: string;
  candidateModels: readonly FreeModelCandidate[];
  allowlistedComponents: readonly A2UIComponentName[];
  paidFallbackAllowed: false;
}

// ============================================================================
// Copilot Runtime Run Budget, Transport dan Reason Codes
// Pin: 3 panggilan model bagi setiap run (termasuk failover/retry/child),
// deadline 30 saat, 8192 input / 1024 output token bagi setiap panggilan,
// 24576 input / 3072 output token kumulatif bagi setiap run.
// Tiada perbelanjaan awan berbayar: hanya model `:free` / free tier sahaja.
// ============================================================================

export interface CopilotRunBudgetPolicy {
  maxModelCalls: number;
  deadlineMs: number;
  maxToolDispatches: number;
  maxInputTokensPerCall: number;
  maxOutputTokensPerCall: number;
  maxCumulativeInputTokens: number;
  maxCumulativeOutputTokens: number;
}

export const COPILOT_RUN_BUDGET: CopilotRunBudgetPolicy = {
  maxModelCalls: 3,
  deadlineMs: 30000,
  maxToolDispatches: 6,
  maxInputTokensPerCall: 8192,
  maxOutputTokensPerCall: 1024,
  maxCumulativeInputTokens: 24576,
  maxCumulativeOutputTokens: 3072,
};

/**
 * Reason code yang ditetapkan HANYA apabila had bajet yang nyata menghalang
 * failover. Nilai ini tidak pernah diteka: ia hanya muncul apabila bajet
 * benar-benar menghalang panggilan provider seterusnya.
 */
export type CopilotRunBudgetBlockReason =
  | 'MODEL_BUDGET_EXCEEDED'
  | 'MODEL_DEADLINE_EXCEEDED'
  | 'MODEL_TOKEN_BUDGET_EXCEEDED';

/**
 * Pelacak bajet run yang dikongsi oleh SEMUA runtime yang memanggil provider
 * (runtime Copilot di `server/agents` DAN router platform di `server/platform`).
 *
 * Kontrak ini living di `shared/` secara sengaja: `server/platform` TIDAK BOLEH
 * mengimport daripada `server/agents` (module-interface cycle yang diethylene
 * oleh `scripts/maintenance/check-boundaries.ts`), jadi sumber kebenaran
 * bajet mesti berada dalam lapisan yang dikongsi.
 */
export interface CopilotRunBudgetTracker {
  policy: CopilotRunBudgetPolicy;
  /** Mula run (epoch ms) — deadline dikira terhadap nilai ini. */
  startedAt: number;
  /** Bilangan panggilan provider yang BENAR-BENAR dibuat. */
  providerCallsMade: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
}

export function createRunBudgetTracker(
  policy: CopilotRunBudgetPolicy = COPILOT_RUN_BUDGET,
  now: number = Date.now()
): CopilotRunBudgetTracker {
  return {
    policy,
    startedAt: now,
    providerCallsMade: 0,
    inputTokensUsed: 0,
    outputTokensUsed: 0,
  };
}

/** Baki masa run (ms). `0` bermaksud deadline sudah tamat. */
export function remainingRunBudgetMs(
  tracker: CopilotRunBudgetTracker,
  now: number = Date.now()
): number {
  return Math.max(0, tracker.startedAt + tracker.policy.deadlineMs - now);
}

export interface RunTokenBudgetVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * Mengesahkan penggunaan token bagi satu panggilan terhadap had per-panggilan
 * dan had kumulatif run — logik yang SAMA seperti runtime Copilot, tetapi
 * berada di lapisan `shared/` supaya router platform boleh menguatkuasakan
 * bajet yang serupa tanpa mengimport `server/agents`.
 */
export function checkRunTokenBudget(
  tracker: CopilotRunBudgetTracker,
  inputTokens: number,
  outputTokens: number
): RunTokenBudgetVerdict {
  const policy = tracker.policy;
  if (inputTokens > policy.maxInputTokensPerCall) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Input ${inputTokens} token melebihi had ${policy.maxInputTokensPerCall} token bagi satu panggilan.`,
    };
  }
  if (outputTokens > policy.maxOutputTokensPerCall) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Output ${outputTokens} token melebihi had ${policy.maxOutputTokensPerCall} token bagi satu panggilan.`,
    };
  }
  if (tracker.inputTokensUsed + inputTokens > policy.maxCumulativeInputTokens) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Input kumulatif ${tracker.inputTokensUsed + inputTokens} token melebihi had ${policy.maxCumulativeInputTokens} token bagi satu run.`,
    };
  }
  if (tracker.outputTokensUsed + outputTokens > policy.maxCumulativeOutputTokens) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Output kumulatif ${tracker.outputTokensUsed + outputTokens} token melebihi had ${policy.maxCumulativeOutputTokens} token bagi satu run.`,
    };
  }
  return { ok: true };
}

/** Direkodkan HANYA selepas verdict OK — usage tidak pernah dihitung dua kali. */
export function recordRunTokenUsage(
  tracker: CopilotRunBudgetTracker,
  inputTokens: number,
  outputTokens: number
): void {
  tracker.inputTokensUsed += inputTokens;
  tracker.outputTokensUsed += outputTokens;
}

/**
 * Had panjang badan provider yang boleh dicatatkan ke log server.
 */
export const PROVIDER_BODY_LOG_LIMIT = 400;

/**
 * Menapis badan mentah provider sebelum ia dicatatkan ke log server:
 * - alamat e-mel dihapus,
 * - token `Bearer` dan medan kunci/secret/credential dihapus,
 * - UUID dan token panjang (identifier akaun) disamar,
 * - output dipangkas.
 *
 * Fungsi ini TIDAK sekali-kali menjadi output untuk pelayar; ia hanya
 * melindungi log server daripada bocor kunci atau ID akaun.
 */
export function redactProviderErrorBody(body: string): string {
  return body
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted-email]')
    .replace(/bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(
      /("?(?:api[_-]?key|apikey|key|token|secret|password|authorization|credential)"?\s*[:=]\s*)"?[^",}\s]+"?/gi,
      '$1[redacted]'
    )
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '[redacted-id]'
    )
    .replace(
      /\b(?=[A-Za-z0-9_-]{16,}\b)(?=[^\s]*\d)[A-Za-z0-9_-]{16,}\b/g,
      '[redacted-token]'
    )
    .slice(0, PROVIDER_BODY_LOG_LIMIT);
}

// ============================================================================
// Klasifikasi kegagalan HTTP provider (dikongsi oleh kedua-dua runtime)
// Fungsi-fungsi ini TIDAK pernah mendedahkan badan mentah provider kepada
// pelayar: mereka hanya menghasilkan reason code, hint tunggu dan status HTTP.
// ============================================================================

export type ProviderHttpFailureReason =
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_QUOTA_EXHAUSTED'
  | 'PROVIDER_MODEL_NOT_FOUND'
  | 'PROVIDER_ACCESS_DENIED';

export interface ProviderFailureClassification {
  reason: ProviderHttpFailureReason;
  retryable: boolean;
  retryAfterMs?: number;
  /** Petunjuk tunggu asal provider, contoh "19h3m41s". */
  retryHint?: string;
}

/**
 * Menguraikan token mentah petunjuk tunggu daripada mesej provider,
 * contoh "Please retry in 19h3m41s." -> "19h3m41s".
 */
export function parseProviderRetryHintText(body: string): string | undefined {
  const match = /retry in (\d+(?:h\d+m\d+s|\d+m\d+s|\d+h\d+m|\d+s|\d+m|\d+h))/i.exec(body);
  return match ? match[1] : undefined;
}

/**
 * Menguraikan petunjuk tunggu daripada mesej provider, contoh
 * "Please retry in 19h3m41s." -> 68601000 ms.
 */
export function parseProviderRetryHint(body: string): number | undefined {
  const token = parseProviderRetryHintText(body);
  if (!token) return undefined;
  let total = 0;
  const hours = /(\d+)h/i.exec(token);
  const minutes = /(\d+)m/i.exec(token);
  const seconds = /(\d+)s/i.exec(token);
  if (hours) total += Number(hours[1]) * 3600_000;
  if (minutes) total += Number(minutes[1]) * 60_000;
  if (seconds) total += Number(seconds[1]) * 1000;
  return total > 0 ? total : undefined;
}

/**
 * Menggolongkan kegagalan HTTP provider kepada reason code yang boleh
 * ditindir oleh runtime:
 *
 * - 429 / "quota exceeded"  -> PROVIDER_QUOTA_EXHAUSTED (sementara, ada retry hint )
 * - 404 / "not found for account" -> PROVIDER_MODEL_NOT_FOUND (tidak boleh retry,
 *   calon mati untuk akaun ini )
 * - 410 / "end of life"     -> PROVIDER_MODEL_NOT_FOUND (model telah EOL, mati
 *   untuk akaun ini — bukan kegagalan sementara )
 * - 401 / 403 / "denied access" -> PROVIDER_ACCESS_DENIED ( kelayakan ditolak )
 */
export function classifyProviderHttpFailure(
  status: number,
  body: string
): ProviderFailureClassification {
  const text = body.toLowerCase();
  if (status === 429 || text.includes('quota exceeded') || text.includes('resource_exhausted')) {
    const retryAfterMs = parseProviderRetryHint(body);
    const retryHint = parseProviderRetryHintText(body);
    return {
      reason: 'PROVIDER_QUOTA_EXHAUSTED',
      retryable: true,
      retryAfterMs,
      retryHint,
    };
  }
  if (
    status === 404 ||
    status === 410 ||
    text.includes('not found for account') ||
    text.includes('model not found') ||
    text.includes('end of life')
  ) {
    return { reason: 'PROVIDER_MODEL_NOT_FOUND', retryable: false };
  }
  if (
    status === 401 ||
    status === 403 ||
    text.includes('denied access') ||
    text.includes('permission_denied') ||
    text.includes('api_key_expired') ||
    text.includes('authentication_error')
  ) {
    return { reason: 'PROVIDER_ACCESS_DENIED', retryable: false };
  }
  return { reason: 'PROVIDER_HTTP_ERROR', retryable: true };
}

/**
 * Reason code eksplisit untuk setiap keputusan runtime. Runtime tidak pernah
 * melaporkan `completed` tanpa panggilan provider yang benar-benar berjaya.
 *
 * `PROVIDER_QUOTA_EXHAUSTED` bermaksud kongsi: provider menolak dengan HTTP 429
 * (atau mesej "quota exceeded"). Ini DINDING SEMENTARA — runtime mengekalkan
 * petunjuk tunggu sebenar provider (contoh "retry in 19h3m41s") supaya callers
 * tahu bila run seterusnya boleh dicuba semula.
 */
export type CopilotRunReasonCode =
  | 'PROVIDER_CALL_SUCCEEDED'
  | 'PROVIDER_CREDENTIALS_MISSING'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_ENDPOINT_UNREACHABLE'
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_EMPTY_RESPONSE'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'PROVIDER_QUOTA_EXHAUSTED'
  | 'PROVIDER_MODEL_NOT_FOUND'
  | 'PROVIDER_ACCESS_DENIED'
  | 'MODEL_ADAPTER_UNAVAILABLE'
  | 'MODEL_BUDGET_EXCEEDED'
  | 'MODEL_DEADLINE_EXCEEDED'
  | 'MODEL_TOKEN_BUDGET_EXCEEDED'
  | 'POLICY_VIOLATION_REJECTED'
  | 'ACTOR_NOT_VERIFIED'
  | 'EMPTY_MESSAGES_ARRAY'
  | 'ADK_BRIDGE_NOT_CONFIGURED'
  | 'ADK_BRIDGE_HOST_NOT_ALLOWED'
  | 'ADK_BRIDGE_UNAVAILABLE'
  | 'ADK_BRIDGE_RUNTIME_UNAVAILABLE'
  | 'ADK_BRIDGE_RUN_ERROR'
  | 'ADK_BRIDGE_UNRESOLVED'
  | 'ADK_BRIDGE_NO_TEXT';

/**
 * Laluan yang benar-benar melayani run ini. Nilai ini tidak pernah boleh
 * mencadangkan laluan yang tidak dicuba.
 *
 * - `python_adk_bridge` : jawapan datang daripada microservis Python Google ADK
 * - `direct_model`      : jawapan datang daripada adapter provider langsung
 * - `local_rules`       : mod deterministic tempatan (tiada model awan)
 * - `none`              : tiada apa-apa yang melayani run ini
 */
export type CopilotServedBy = 'python_adk_bridge' | 'direct_model' | 'local_rules' | 'none';

export type CopilotCandidateState =
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'unusable'
  | 'cooldown';

/** Pecahan sebab bagi setiap calon percuma dalam satu run. */
export interface CopilotCandidateReport {
  model: string;
  providerId: string;
  state: CopilotCandidateState;
  reason?: CopilotRunReasonCode;
  detail?: string;
  httpStatus?: number;
  retryAfterMs?: number;
  /**
   * `false` = kegagalan tidak sementara untuk akaun ini (contoh HTTP 404
   * "Function ... Not found for account"). Calon sedemikian ditanda mati dan
   * tidak akan dibakar bajet panggilan model lagi.
   */
  retryable?: boolean;
  /**
   * Petunjuk tunggu asal provider dalam bentuk mentahnya, contoh
   * "19h3m41s". Nilai ini diuraikan daripada mesej provider DI SISI SERVER
   * dan hanya diterima selepas disahkan oleh server — badan mentah provider
   * tidak pernah dihantar ke pelayar.
   */
  retryHint?: string;
}

/**
 * `live` = panggilan HTTP sebenar kepada provider. `mock` / `fixture` hanya
 * dibenarkan dalam ujian unit dan tidak bolehpresented sebagai integrasi
 * produksi; runtime mengekstrak label ini ke dalam respons.
 */
export type CopilotModelTransport = 'live' | 'mock' | 'fixture';

export interface CopilotRunAttempt {
  model: string;
  providerId: string;
  outcome: 'succeeded' | 'failed' | 'skipped';
  reason?: CopilotRunReasonCode;
  detail?: string;
  inputTokens?: number;
  outputTokens?: number;
  /** HTTP status sebenar daripada provider (bila ada). */
  httpStatus?: number;
  /**
   * `false` = kegagalan tidak sementara untuk akaun ini (contoh HTTP 404
   * "Function ... Not found for account"). Calon ditanda mati dan dilangkau.
   */
  retryable?: boolean;
  /**
   * Petunjuk tunggu (ms) yang diberi provider sendiri — contoh mesej
   * "Please retry in 19h3m41s." menjadi 68601000 ms. Tidak pernah diteka.
   */
  retryAfterMs?: number;
  /**
   * Petunjuk tunggu asal provider ("19h3m41s"). Diuraikan di sisi server
   * daripada mesej provider; badan mentah provider tidak dihantar ke pelayar.
   */
  retryHint?: string;
}
