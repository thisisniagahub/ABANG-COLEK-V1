/**
 * ABANGCOLEK — JEV native router.
 *
 * Satu tempat menentukan sama ada sesebut kes dinilai dengan TypeSafe Jev
 * (System One typed) atau kekal pada LOCAL_RULES. Router tidak pernah
 * memalsukan pilihan: setiap keputusan membawa reason code yang boleh
 * diaudit.
 *
 * Gate:
 * - Credential transport (KILO_API_KEY untuk gateway, TYPESAFE_API_KEY untuk
 *   API terus).
 * - JEV_NATIVE_ENABLED, JEV_NATIVE_TERMS_ACCEPTED, JEV_NATIVE_DATA_HANDLING_APPROVED.
 * - JEV_NATIVE_SPEND_APPROVED untuk transport yang membillah baki akaun.
 * - Bajet panggilan native harian (JEV_NATIVE_MAX_CALLS_PER_DAY).
 * - Cooldown selepas kegagalan baki/kadar (JEV_NATIVE_COOLDOWN_MS).
 */

import {
  JEV_NATIVE_TRANSPORT_ORDER,
  NATIVE_ENDPOINTS,
  resolveTypeSafeEligibility,
  type JevNativeTransport,
} from './typesafeProvider';

export const DEFAULT_NATIVE_MAX_CALLS_PER_DAY = 200;
export const DEFAULT_NATIVE_COOLDOWN_MS = 30 * 60 * 1000;

export interface JevNativeBudgetState {
  callsUsed: number;
  maxCallsPerDay: number;
  /** Epoch ms; selepas masa ini native dibolehkan semula. */
  disabledUntil: number;
  lastFailureCode: string | null;
}

export interface JevRouteDecision {
  mode: 'TYPESAFE_NATIVE' | 'LOCAL_RULES';
  transport: JevNativeTransport | null;
  model: string | null;
  reasonCodes: string[];
  budget: { callsUsed: number; maxCallsPerDay: number; remaining: number };
  cooldownUntil: string | null;
}

export function createBudgetState(env: Record<string, string | undefined> = process.env, existing?: Partial<JevNativeBudgetState>): JevNativeBudgetState {
  const parsed = Number(env.JEV_NATIVE_MAX_CALLS_PER_DAY);
  const maxCallsPerDay = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_NATIVE_MAX_CALLS_PER_DAY;
  return {
    callsUsed: existing?.callsUsed ?? 0,
    maxCallsPerDay,
    disabledUntil: existing?.disabledUntil ?? 0,
    lastFailureCode: existing?.lastFailureCode ?? null,
  };
}

export function nativeCooldownMs(env: Record<string, string | undefined> = process.env): number {
  const parsed = Number(env.JEV_NATIVE_COOLDOWN_MS);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_NATIVE_COOLDOWN_MS;
}

/**
 * Resolve transport native. `kilo_gateway` diutamakan (tidak perlu akaun
 * TypeSafe berasingan) kemudian `typesafe_direct`.
 */
export function resolveNativeTransport(env: Record<string, string | undefined> = process.env): { transport: JevNativeTransport | null; reasonCodes: string[]; transportReasonCodes: Record<string, string[]> } {
  const transportReasonCodes: Record<string, string[]> = {};
  for (const transport of JEV_NATIVE_TRANSPORT_ORDER) {
    const eligibility = resolveTypeSafeEligibility(env, transport);
    transportReasonCodes[transport] = eligibility.reasonCodes;
    if (eligibility.eligible) return { transport, reasonCodes: [], transportReasonCodes };
  }
  return { transport: null, reasonCodes: ['JEV_NATIVE_NO_ELIGIBLE_TRANSPORT'], transportReasonCodes };
}

/**
 * Keputusan routing. Mode LOCAL_RULES bermaksud tiada panggilan paid dibuat;
 * caller berjalan pada assessment tempatan dan label kekal jujur.
 */
export function decideJevRoute(input: { env?: Record<string, string | undefined>; budget: JevNativeBudgetState; now?: number }): JevRouteDecision {
  const env = input.env ?? process.env;
  const now = input.now ?? Date.now();
  const budget = input.budget;
  const budgetState = { callsUsed: budget.callsUsed, maxCallsPerDay: budget.maxCallsPerDay, remaining: Math.max(0, budget.maxCallsPerDay - budget.callsUsed) };
  const cooldownUntil = budget.disabledUntil > now ? new Date(budget.disabledUntil).toISOString() : null;

  if (budget.callsUsed >= budget.maxCallsPerDay) {
    return { mode: 'LOCAL_RULES', transport: null, model: null, reasonCodes: ['JEV_NATIVE_BUDGET_EXHAUSTED'], budget: budgetState, cooldownUntil };
  }
  if (budget.disabledUntil > now) {
    return { mode: 'LOCAL_RULES', transport: null, model: null, reasonCodes: ['JEV_NATIVE_COOLDOWN_ACTIVE', ...(budget.lastFailureCode ? [budget.lastFailureCode] : [])], budget: budgetState, cooldownUntil };
  }

  const resolved = resolveNativeTransport(env);
  if (!resolved.transport) {
    const detail = Object.entries(resolved.transportReasonCodes).flatMap(([transport, codes]) => codes.map(code => `${transport}:${code}`));
    return { mode: 'LOCAL_RULES', transport: null, model: null, reasonCodes: [...resolved.reasonCodes, ...detail], budget: budgetState, cooldownUntil };
  }
  return { mode: 'TYPESAFE_NATIVE', transport: resolved.transport, model: NATIVE_ENDPOINTS[resolved.transport].model, reasonCodes: [], budget: budgetState, cooldownUntil };
}

/** Satu panggilan native direkodkan; bajet harian berkurang. */
export function recordNativeCall(budget: JevNativeBudgetState): JevNativeBudgetState {
  return { ...budget, callsUsed: budget.callsUsed + 1 };
}

/**
 * Kegagalan dicatatkan. Baki dan had kadar menutup native untuk tempoh
 * cooldown supaya router tidak membakar kos dengan probe berulang.
 */
export function recordNativeFailure(budget: JevNativeBudgetState, reasonCode: string, now: number = Date.now(), cooldownMs: number = DEFAULT_NATIVE_COOLDOWN_MS): JevNativeBudgetState {
  const cooling = reasonCode === 'JEV_NATIVE_BALANCE_EXHAUSTED' || reasonCode === 'JEV_NATIVE_PAYMENT_REQUIRED' || reasonCode === 'JEV_NATIVE_RATE_LIMITED';
  return {
    ...budget,
    lastFailureCode: reasonCode,
    disabledUntil: cooling ? Math.max(budget.disabledUntil, now + cooldownMs) : budget.disabledUntil,
  };
}
