/**
 * AbangColek Sovereign GrowthOS — Provider Run Outcome Contracts
 *
 * Kontraktyped untuk keputusan run provider yang perlu conveyed kepada
 * pelayar tanpa membocorkan badan mentah provider.
 *
 * Setiap keputusan provider dicatatkan sebagai SATU sebab yang boleh mesin
 * baca. Tiada badan mentah provider, tiada kunci, tiada ID akaun.
 *
 * Modul ini TIDAK mengimport daripada `server/` atau `src/`. Ia hanya
 * mengimport types daripada kontrak sibling `copilot-contracts.ts`.
 */

import type { CopilotRunReasonCode } from './copilot-contracts';

/**
 * Keadaan seorang calon provider dalam satu run.
 *
 * - `succeeded` -- panggilan HTTP sebenar berjaya.
 * - `failed` -- panggilan dibuat tetapi gagal (reason code wajib).
 * - `skipped` -- panggilan TIDAK dibuat (tiada kelayakan, atau panggilan
 *   luar dilumpuhkan oleh mod offline suite).
 * - `unusable` -- calon mati untuk akaun ini (contoh HTTP 404 "Function ...
 *   Not found for account"); calon tidak akan dibakar bajet lagi.
 * - `cooldown` -- calon dalam tempoh tunggu sementara (contoh HTTP 429
 *   kuota free tier habis).
 */
export type ProviderCandidateState =
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'unusable'
  | 'cooldown';

/**
 * Reason code untuk setiap calon.
 *
 * `PROVIDER_LIVE_DISABLED` ialah tambahan tempatan kepada union
 * `CopilotRunReasonCode`: ia menandakan bahawa panggilan luar DILUMPUHKAN
 * oleh mod offline suite, bukan kegagalan provider. Ia hanya muncul dalam
 * keputusan server, tidak pernah sebagai punca sebenar.
 */
export type ProviderCandidateReasonCode = CopilotRunReasonCode | 'PROVIDER_LIVE_DISABLED';

export interface ProviderCandidateOutcome {
  providerId: string;
  model: string;
  state: ProviderCandidateState;
  /** Reason code yang boleh mesin baca. */
  reason: ProviderCandidateReasonCode;
  /** Status HTTP sebenar daripada provider (bila ada). */
  httpStatus?: number;
  /**
   * Petunjuk tunggu (ms) yang diberi provider sendiri. Nilai ini DISALIN
   * daripada provider -- ia tidak pernah diteka.
   */
  retryAfterMs?: number;
  /**
   * Petunjuk tunggu asal provider ("19h3m41s"). Diuraikan di sisi server
   * daripada mesej provider; badan mentah provider tidak pernah dihantar
   * ke pelayar.
   */
  retryHint?: string;
}

/**
 * Ringkasan bajet run provider.
 *
 * Semua nilai adalah hasil kiraan pelacak bajet sebenar -- tiada konstanta
 * yang dipalsukan.
 */
export interface ProviderRunBudgetSummary {
  maxProviderCalls: number;
  providerCallsMade: number;
  deadlineMs: number;
  outputTokensUsed: number;
  maxOutputTokensPerCall: number;
  maxCumulativeOutputTokens: number;
}
