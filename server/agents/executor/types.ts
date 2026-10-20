/**
 * AbangColek Sovereign GrowthOS — Agent Executor Contracts
 *
 * An executor performs the actual side effect of an approved action against the
 * canonical platform domain. Executors never mint receipts themselves — the
 * execution service owns receipt identity and durability.
 */

import type { PlatformStore } from '../../platform/store';
import type { Principal } from '../../platform/auth';
import type { ApprovalRole } from '../approval/types';

export interface ExecutorContext {
  actorId: string;
  role: ApprovalRole;
  runId?: string;
  /** Canonical platform store. Absent => the executor is unavailable. */
  store?: PlatformStore;
  principal?: Principal | null;
  /** ISO instant captured once for the whole execution. */
  at: string;
}

export interface ExecutorResult {
  ok: boolean;
  code?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface Executor {
  /** Action family handled, e.g. `refund.execute`. */
  readonly actionType: string;
  execute(payload: Record<string, unknown>, context: ExecutorContext): Promise<ExecutorResult>;
}
