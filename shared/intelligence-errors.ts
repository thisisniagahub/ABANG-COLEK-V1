/**
 * AbangColek Sovereign GrowthOS — Coded refusals (server base layer)
 *
 * A single coded error type so every refusal carries a machine code that a
 * test (and an operator) can assert on. No refusal is ever silent.
 *
 * Why this lives in `shared/`:
 *
 *  - The intelligence layer (`server/agents/intelligence/**`) throws it.
 *  - The platform layer (`server/platform/**`) throws it too — the local
 *    inspector (EXT-01) refuses to run in production with the code
 *    `INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION`.
 *
 * `shared/` is the only layer both of them may depend on: `shared/**` must
 * never import `src/**` or `server/**` (rule
 * `FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER`), and the platform must never
 * import a server module (module-interface cycle rule). Keeping the class
 * here preserves ONE class identity for every consumer.
 */

/** The single coded error used by every server refusal. */
export class IntelligenceError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'IntelligenceError';
  }
}

/** Throws an `IntelligenceError` with an exact machine code. */
export function failIntelligence(code: string, message: string): never {
  throw new IntelligenceError(code, message);
}
