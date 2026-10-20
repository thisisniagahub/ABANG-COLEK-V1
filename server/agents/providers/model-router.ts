/**
 * AbangColek Sovereign GrowthOS — Free Model Router v2.4 (Fasa 02)
 * Zero-New-Paid-Cloud-Spend • Strict Free Candidate Sequence
 *
 * Sequence:
 * 1. gemini-3.6-flash (Primary Free)
 * 2. gemini-3.5-flash-lite (Secondary Free)
 * 3. nvidia/nemotron-3-ultra-550b-a55b:free (OpenRouter Community Free)
 *
 * Nota integriti: router ini hanya MEMILIH calon. Ia tidak pernah memanggil
 * provider. Pemanggilan sebenar dijalankan oleh `server/agents/providers/model-adapters.ts`
 * dan bajetcalls/token dikuatkuasakan di dalam runtime (`server/agents/copilot/runtime.ts`).
 */

import {
  type CopilotRunReasonCode,
  type FreeModelCandidate,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../../shared/copilot-contracts';

export { type FreeModelCandidate, STRICT_FREE_CANDIDATE_SEQUENCE };

export interface ModelCallBudgetCaps {
  maxInputTokensPerCall?: number;
  maxOutputTokensPerCall?: number;
  maxCumulativeInputTokens?: number;
  maxCumulativeOutputTokens?: number;
}

export interface ModelCallBudget {
  maxCalls: number;
  callsMade: number;
  deadlineMs: number;
  startedAt: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  maxInputTokensPerCall: number;
  maxOutputTokensPerCall: number;
  maxCumulativeInputTokens: number;
  maxCumulativeOutputTokens: number;
}

const DEFAULT_TOKEN_CAPS: Required<ModelCallBudgetCaps> = {
  maxInputTokensPerCall: 8192,
  maxOutputTokensPerCall: 1024,
  maxCumulativeInputTokens: 24576,
  maxCumulativeOutputTokens: 3072,
};

export function createBudget(
  maxCalls = 3,
  deadlineMs = 30000,
  caps?: ModelCallBudgetCaps
): ModelCallBudget {
  return {
    maxCalls,
    callsMade: 0,
    deadlineMs,
    startedAt: Date.now(),
    inputTokensUsed: 0,
    outputTokensUsed: 0,
    maxInputTokensPerCall: caps?.maxInputTokensPerCall ?? DEFAULT_TOKEN_CAPS.maxInputTokensPerCall,
    maxOutputTokensPerCall: caps?.maxOutputTokensPerCall ?? DEFAULT_TOKEN_CAPS.maxOutputTokensPerCall,
    maxCumulativeInputTokens:
      caps?.maxCumulativeInputTokens ?? DEFAULT_TOKEN_CAPS.maxCumulativeInputTokens,
    maxCumulativeOutputTokens:
      caps?.maxCumulativeOutputTokens ?? DEFAULT_TOKEN_CAPS.maxCumulativeOutputTokens,
  };
}

export function assertFreeModelOnly(modelName: string, providerId: string): void {
  const lower = modelName.toLowerCase();
  if (
    lower.includes(':paid') ||
    lower.includes('gpt-4o') ||
    lower.includes('claude-3-5') ||
    lower.includes('claude-3-opus') ||
    lower.includes('gemini-1.5-pro-paid')
  ) {
    throw new Error(`PERLANGGARAN POLISI SIFAR KOS: Model '${modelName}' dikesan sebagai model berbayar. Tiada paid fallback dibenarkan.`);
  }
  if (providerId === 'openrouter' && !lower.endsWith(':free')) {
    throw new Error(`PERLANGGARAN POLISI SIFAR KOS: OpenRouter hanya dibenarkan model dengan akhiran :free. Model '${modelName}' ditolak.`);
  }
}

export function candidateKey(candidate: FreeModelCandidate): string {
  return `${candidate.providerId}:${candidate.model}`;
}

export function isDeadlineExceeded(budget: ModelCallBudget, now: number = Date.now()): boolean {
  return now - budget.startedAt > budget.deadlineMs;
}

export function remainingDeadlineMs(budget: ModelCallBudget, now: number = Date.now()): number {
  return Math.max(0, budget.startedAt + budget.deadlineMs - now);
}

export interface TokenUsageVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * Mengesahkan penggunaan token bagi satu panggilan terhadap had per-panggilan
 * dan had kumulatif run. Token kumulatif direkodkan hanya selepas verdict OK.
 */
export function checkTokenBudget(
  budget: ModelCallBudget,
  inputTokens: number,
  outputTokens: number
): TokenUsageVerdict {
  if (inputTokens > budget.maxInputTokensPerCall) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Input ${inputTokens} token melebihi had ${budget.maxInputTokensPerCall} token bagi satu panggilan.`,
    };
  }
  if (outputTokens > budget.maxOutputTokensPerCall) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Output ${outputTokens} token melebihi had ${budget.maxOutputTokensPerCall} token bagi satu panggilan.`,
    };
  }
  if (budget.inputTokensUsed + inputTokens > budget.maxCumulativeInputTokens) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Input kumulatif ${budget.inputTokensUsed + inputTokens} token melebihi had ${budget.maxCumulativeInputTokens} token bagi satu run.`,
    };
  }
  if (budget.outputTokensUsed + outputTokens > budget.maxCumulativeOutputTokens) {
    return {
      ok: false,
      reason: `MODEL_TOKEN_BUDGET_EXCEEDED: Output kumulatif ${budget.outputTokensUsed + outputTokens} token melebihi had ${budget.maxCumulativeOutputTokens} token bagi satu run.`,
    };
  }
  return { ok: true };
}

export function recordTokenUsage(
  budget: ModelCallBudget,
  inputTokens: number,
  outputTokens: number
): void {
  budget.inputTokensUsed += inputTokens;
  budget.outputTokensUsed += outputTokens;
}

export interface ModelRouterOptions {
  candidates?: readonly FreeModelCandidate[];
  /** Diperlukan oleh `server/agents/providers/model-adapters.ts`; router ini tidak memanggil provider. */
  fetchFn?: typeof fetch;
}

export interface RouteResult {
  candidate: FreeModelCandidate;
  attempt: number;
  status: 'active' | 'cooldown' | 'exhausted';
}

export interface SelectCandidateOptions {
  /** Calon yang mesti dilangkau (gagal / tiada kelayakan) bagi run semasa. */
  exclude?: readonly FreeModelCandidate[];
}

export type FreeModelCandidateState = 'active' | 'cooldown' | 'unusable';

export interface FreeModelCandidateStatus {
  candidate: FreeModelCandidate;
  state: FreeModelCandidateState;
  /** Reason code runtime — bukan teks bebas. */
  reason?: CopilotRunReasonCode;
  /** Butiran kegagalan asal (contoh mesej provider sebenar). */
  detail?: string;
  /** Petunjuk tunggu (ms) untuk cooldown kuota. */
  retryAfterMs?: number;
}

interface CandidateFailureState {
  reason: CopilotRunReasonCode;
  detail?: string;
}

interface CandidateCooldownState extends CandidateFailureState {
  until: number;
}

export class FreeModelRouter {
  private candidates: readonly FreeModelCandidate[];
  private cooldowns: Map<string, CandidateCooldownState> = new Map();
  private unusable: Map<string, CandidateFailureState> = new Map();

  constructor(options?: ModelRouterOptions) {
    this.candidates = options?.candidates || STRICT_FREE_CANDIDATE_SEQUENCE;
  }

  public getActiveCandidates(): FreeModelCandidate[] {
    const now = Date.now();
    return this.candidates.filter(c => {
      const key = candidateKey(c);
      if (this.unusable.has(key)) return false;
      const cd = this.cooldowns.get(key);
      return !cd || cd.until <= now;
    });
  }

  /**
   * Menanda calon sebagai cooldown (kegagalan sementara, contoh HTTP 429).
   * `reason` dan `detail` disimpan supaya runtime boleh melaporkan punca
   * sebenar dan petunjuk tunggu provider tanpa meneka.
   */
  public markCooldown(
    candidate: FreeModelCandidate,
    durationMs = 60000,
    reason: CopilotRunReasonCode = 'PROVIDER_QUOTA_EXHAUSTED',
    detail?: string
  ): void {
    this.cooldowns.set(candidateKey(candidate), {
      until: Date.now() + durationMs,
      reason,
      detail,
    });
  }

  /**
   * Menanda calon sebagai mati untuk akaun ini (kegagalan tidak sementara,
   * contoh HTTP 404 "Function ... Not found for account"). Calon tidak akan
   * dibakar bajet panggilan model lagi.
   */
  public markUnusable(
    candidate: FreeModelCandidate,
    reason: CopilotRunReasonCode,
    detail?: string
  ): void {
    this.unusable.set(candidateKey(candidate), { reason, detail });
  }

  public isUnusable(candidate: FreeModelCandidate): boolean {
    return this.unusable.has(candidateKey(candidate));
  }

  public getUnusableReason(candidate: FreeModelCandidate): CopilotRunReasonCode | undefined {
    return this.unusable.get(candidateKey(candidate))?.reason;
  }

  public getUnusableDetail(candidate: FreeModelCandidate): string | undefined {
    return this.unusable.get(candidateKey(candidate))?.detail;
  }

  public getCooldownRemainingMs(candidate: FreeModelCandidate, now: number = Date.now()): number {
    const entry = this.cooldowns.get(candidateKey(candidate));
    if (!entry) return 0;
    return Math.max(0, entry.until - now);
  }

  public getCandidateStatuses(now: number = Date.now()): FreeModelCandidateStatus[] {
    return this.candidates.map(candidate => {
      const unusable = this.unusable.get(candidateKey(candidate));
      if (unusable) {
        return {
          candidate,
          state: 'unusable' as const,
          reason: unusable.reason,
          detail: unusable.detail,
        };
      }
      const cooldown = this.cooldowns.get(candidateKey(candidate));
      const remaining = cooldown ? Math.max(0, cooldown.until - now) : 0;
      if (cooldown && remaining > 0) {
        return {
          candidate,
          state: 'cooldown' as const,
          reason: cooldown.reason,
          detail: cooldown.detail,
          retryAfterMs: remaining,
        };
      }
      return { candidate, state: 'active' as const };
    });
  }

  public selectNextCandidate(
    budget: ModelCallBudget,
    options?: SelectCandidateOptions
  ): FreeModelCandidate {
    // 1. Check budget constraints
    if (budget.callsMade >= budget.maxCalls) {
      throw new Error('MODEL_BUDGET_EXCEEDED: Had maksimum 3 panggilan model bagi setiap sesi telah dicapai.');
    }
    if (isDeadlineExceeded(budget)) {
      throw new Error('MODEL_DEADLINE_EXCEEDED: Had masa 30 saat untuk inferensi telah tamat.');
    }

    // 2. Select from strict ordered candidates
    const excluded = new Set((options?.exclude ?? []).map(candidateKey));
    const available = this.getActiveCandidates().filter(c => !excluded.has(candidateKey(c)));
    if (available.length === 0) {
      throw new Error('MODEL_ADAPTER_UNAVAILABLE: Tiada calon model percuma yang aktif atau layak. Beralih kepada local_rules.');
    }

    const candidate = available[0];
    assertFreeModelOnly(candidate.model, candidate.providerId);
    budget.callsMade++;
    return candidate;
  }
}
