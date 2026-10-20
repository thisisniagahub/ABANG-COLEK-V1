/**
 * AbangColek Sovereign GrowthOS — Advanced Tool Runtime
 *
 * The runtime carries the real dependencies a tool needs to read canonical
 * state: the platform store, the durable approval subsystem and the executor
 * registry. A runtime without a platform store is a *degraded* runtime: query
 * tools then report PLATFORM_STORE_UNAVAILABLE instead of inventing records.
 */

import type { PlatformStore } from '../../platform/store';
import type { ApprovalStore } from '../approval/store';
import { ApprovalService } from '../approval/service';
import { getDefaultApprovalStore } from '../approval/singleton';
import { ExecutorRegistry } from '../executor/registry';
import { RefundExecutor } from '../executor/refund';

export type ToolRole = 'customer' | 'staff' | 'founder' | 'developer';

export type PersistenceLabel = 'in_memory' | 'file' | 'platform_store';

export interface ToolRuntime {
  /** Canonical platform store. Absent => domain reads are unavailable. */
  store?: PlatformStore;
  approvalStore: ApprovalStore;
  approvalService: ApprovalService;
  executors: ExecutorRegistry;
  /** ISO instant source. Overridable for deterministic tests. */
  clock: () => string;
}

export interface Provenance {
  actorId: string;
  role: ToolRole;
  runId: string | null;
  sources: string[];
  evaluator: string;
  at: string;
  persistence: PersistenceLabel;
}

export interface CreateRuntimeOptions {
  store?: PlatformStore;
  approvalStore?: ApprovalStore;
  executors?: ExecutorRegistry;
  clock?: () => string;
}

export function createToolRuntime(options: CreateRuntimeOptions = {}): ToolRuntime {
  const approvalStore = options.approvalStore ?? getDefaultApprovalStore();
  const executors = options.executors ?? new ExecutorRegistry();
  if (!executors.has('refund.execute')) executors.register(new RefundExecutor());
  return {
    store: options.store,
    approvalStore,
    approvalService: new ApprovalService(approvalStore, options.clock),
    executors,
    clock: options.clock ?? (() => new Date().toISOString()),
  };
}

let defaultRuntime: ToolRuntime | null = null;

/**
 * Process default runtime. It carries the durable approval subsystem and the
 * registered executors, but **no** platform store — tools that need canonical
 * records therefore fail closed with PLATFORM_STORE_UNAVAILABLE.
 */
export function getDefaultRuntime(): ToolRuntime {
  if (!defaultRuntime) defaultRuntime = createToolRuntime();
  return defaultRuntime;
}

/** Persistence label of the approval store, for honest evidence. */
export function approvalPersistence(runtime: ToolRuntime): PersistenceLabel {
  return runtime.approvalStore.persistence;
}

export function provenance(
  runtime: ToolRuntime,
  context: { actorId: string; role: ToolRole; runId?: string },
  sources: string[],
  evaluator: string,
): Provenance {
  return {
    actorId: context.actorId,
    role: context.role,
    runId: context.runId ?? null,
    sources,
    evaluator,
    at: runtime.clock(),
    persistence: approvalPersistence(runtime),
  };
}
