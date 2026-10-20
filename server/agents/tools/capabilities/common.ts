/**
 * AbangColek Sovereign GrowthOS — Shared helpers for advanced tool definitions
 */

import type { PlatformStore } from '../../../platform/store';
import type {
  ResolvedToolContext,
  ToolDefinition,
  ToolExecutionContext,
  ToolOutcome,
  ToolOutcomeFailure,
} from '../types';
import { resolveActor, type ScopedActor } from '../scope';
import { validateStrict } from '../validation';
import { getDefaultRuntime } from '../runtime';

/**
 * Structured tool failure. `code` is the canonical machine code the caller
 * branches on; `reason` keeps the precise cause when several situations share
 * one canonical code (for example every "no canonical approval" situation is
 * reported as EXECUTOR_UNAVAILABLE because no receipt can be issued).
 */
export const fail = (code: string, message: string, reason?: string): ToolOutcomeFailure => ({
  ok: false,
  code,
  message,
  ...(reason ? { reason } : {}),
});

export interface ResolvedContext {
  ok: true;
  store: PlatformStore;
  actor: ScopedActor;
}

/**
 * Resolves the canonical platform store and the *live* authority of the actor.
 * A tool never proceeds on an unverified actor.
 */
export function resolveContext(ctx: ResolvedToolContext): ResolvedContext | ToolOutcomeFailure {
  const store = ctx.runtime.store;
  if (!store) {
    return fail(
      'PLATFORM_STORE_UNAVAILABLE',
      'Stor platform tidak disambungkan; tiada rekod kanonik boleh dibaca.',
    );
  }
  const actor = resolveActor(store, ctx.actorId);
  if (!actor) {
    return fail(
      'AUTHORITY_UNRESOLVED',
      'Kebenaran pemeran tidak dapat disahkan daripada rekod keahlian aktif.',
    );
  }
  return { ok: true, store, actor };
}

/** Binds the strict schema validator to a tool definition. */
export function defineTool(
  definition: Omit<ToolDefinition, 'validateInput' | 'execute'> & {
    execute: (input: any, context: ResolvedToolContext) => Promise<ToolOutcome>;
  },
): ToolDefinition {
  return {
    ...definition,
    validateInput: (input: unknown) => validateStrict(definition.inputSchema, input),
    execute: async (input: any, context: ToolExecutionContext) =>
      definition.execute(input, resolveToolContext(context)),
  };
}

/**
 * Materialises a complete execution context. Direct (non-registry) calls that
 * omit the runtime receive the process default runtime, which has no platform
 * store — such calls therefore fail closed instead of inventing records.
 */
export function resolveToolContext(context: ToolExecutionContext): ResolvedToolContext {
  return {
    actorId: context.actorId,
    role: context.role,
    runId: context.runId ?? 'direct-call',
    runtime: context.runtime ?? getDefaultRuntime(),
    catalog: context.catalog ?? (() => []),
    catalogTotal: context.catalogTotal ?? (() => 0),
  };
}

/** Case-insensitive substring match used by the record search tool. */
export function matchesQuery(
  haystack: Array<string | number | undefined | null>,
  query: string | undefined,
): boolean {
  if (!query || !query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return haystack.some((value) =>
    value === undefined || value === null ? false : String(value).toLowerCase().includes(needle),
  );
}
