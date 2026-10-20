/**
 * AbangColek Sovereign GrowthOS — Intelligence layer errors
 *
 * A single coded error type so every refusal carries a machine code that a
 * test (and an operator) can assert on. No refusal is ever silent.
 */

export class IntelligenceError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'IntelligenceError';
  }
}

export function failIntelligence(code: string, message: string): never {
  throw new IntelligenceError(code, message);
}
