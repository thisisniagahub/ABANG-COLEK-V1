/**
 * AbangColek Sovereign GrowthOS — Executor Registry
 *
 * Every action family that may be executed must have exactly one registered
 * executor. Unknown action types are refused with EXECUTOR_UNAVAILABLE; there is
 * no generic "do anything" executor.
 */

import type { Executor, ExecutorContext, ExecutorResult } from './types';

export class ExecutorRegistry {
  private readonly executors = new Map<string, Executor>();

  register(executor: Executor): void {
    this.executors.set(executor.actionType, executor);
  }

  get(actionType: string): Executor | undefined {
    return this.executors.get(actionType);
  }

  has(actionType: string): boolean {
    return this.executors.has(actionType);
  }

  list(): Array<{ actionType: string }> {
    return [...this.executors.keys()].sort().map((actionType) => ({ actionType }));
  }

  async execute(
    actionType: string,
    payload: Record<string, unknown>,
    context: ExecutorContext,
  ): Promise<ExecutorResult> {
    const executor = this.executors.get(actionType);
    if (!executor) {
      return {
        ok: false,
        code: 'EXECUTOR_UNAVAILABLE',
        message: `Tiada eksekutor didaftar untuk tindakan '${actionType}'.`,
      };
    }
    return executor.execute(payload, context);
  }
}
