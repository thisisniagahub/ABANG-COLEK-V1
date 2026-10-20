/**
 * AbangColek Sovereign GrowthOS — Advanced Tool Registry Engine v2.5 (Fasa 03B)
 *
 * Scope Enforcement • Server-Owned Tool Budget (Max 6 Dispatches) • Strict
 * Validation • Live Capability Catalogue.
 *
 * The dispatch budget lives on the server inside the registry. A caller cannot
 * supply, inflate or reset the counter: the only client-controlled field is the
 * run id, and the counter for that run is owned by this process.
 */

import {
  ADVANCED_TOOLS_DEFINITIONS,
  ALL_ADVANCED_TOOL_DEFINITIONS,
} from './definitions';
import type { ToolCapabilityDescriptor, ToolDefinition, ToolRole } from './types';
import { createToolRuntime, type ToolRuntime } from './runtime';
import { describeValidationError } from './validation';

export interface ToolDispatchContext {
  /** Canonical actor id. Authority is re-verified by the tool against live records. */
  actorId: string;
  role: ToolRole;
  /** Server-issued run identifier that owns the dispatch budget. */
  runId: string;
  /**
   * @deprecated Read-only mirror of the server-owned dispatch counter.
   * The registry never reads this field: the authoritative counter lives in the
   * registry, keyed by `runId`. A client supplied value is ignored and
   * overwritten, so the browser can neither inflate nor reset the budget.
   */
  dispatchesCount?: number;
  /**
   * @deprecated Ignored. The dispatch limit is owned by the server registry.
   */
  maxDispatches?: number;
}

export interface ToolRegistryOptions {
  definitions?: ToolDefinition[];
  runtime?: ToolRuntime;
}

/** Role gate: which actor roles may dispatch a tool of the given required role. */
export function roleAllows(requiredRole: ToolRole, actorRole: ToolRole): boolean {
  switch (requiredRole) {
    case 'founder':
      return actorRole === 'founder';
    case 'staff':
      return actorRole === 'staff' || actorRole === 'founder';
    case 'developer':
      return actorRole === 'developer' || actorRole === 'founder';
    case 'customer':
    default:
      return true;
  }
}

export class ToolRegistry {
  private readonly definitions: Map<string, ToolDefinition> = new Map();
  private readonly maxDispatchesPerRun: number;
  private readonly runtime: ToolRuntime;
  /** Server-owned budget counters, keyed by run id. */
  private readonly runBudgets = new Map<string, number>();

  constructor(maxDispatchesPerRun = 6, options: ToolRegistryOptions = {}) {
    this.maxDispatchesPerRun = maxDispatchesPerRun;
    this.runtime = options.runtime ?? createToolRuntime();
    const source = options.definitions ?? ALL_ADVANCED_TOOL_DEFINITIONS;
    for (const definition of source) {
      this.definitions.set(definition.registrationName, definition);
    }
  }

  public get runtime_(): ToolRuntime {
    return this.runtime;
  }

  public registerTool(def: ToolDefinition): void {
    this.definitions.set(def.registrationName, def);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.definitions.get(name);
  }

  public listAllTools(): ToolDefinition[] {
    return [...this.definitions.values()];
  }

  public listAvailableTools(role: ToolRole): ToolDefinition[] {
    return [...this.definitions.values()].filter((definition) => roleAllows(definition.requiredRole, role));
  }

  /** Live capability catalogue used by ADV-01 discover_capabilities. */
  public capabilityCatalog(role: ToolRole): ToolCapabilityDescriptor[] {
    return this.listAvailableTools(role).map((definition) => ({
      logicalCapabilityId: definition.logicalCapabilityId,
      registrationName: definition.registrationName,
      riskClass: definition.riskClass,
      description: definition.description,
      requiredRole: definition.requiredRole,
    }));
  }

  public registeredCapabilityCount(): number {
    return this.definitions.size;
  }

  /** Server-side release of a run budget (called by the run controller, never the browser). */
  public resetRun(runId: string): void {
    this.runBudgets.delete(runId);
  }

  public runBudgetState(runId: string): { used: number; limit: number } {
    return { used: this.runBudgets.get(runId) ?? 0, limit: this.maxDispatchesPerRun };
  }

  public async dispatchTool(
    toolName: string,
    rawInput: unknown,
    ctx: ToolDispatchContext,
  ): Promise<
    | { ok: true; result: any }
    | { ok: false; code: string; message: string; detail?: string }
  > {
    // 0. A run must own the budget. Without a server-issued run id there is no
    //    budget owner and the call is refused.
    if (!ctx || typeof ctx.runId !== 'string' || !ctx.runId.trim()) {
      return {
        ok: false,
        code: 'RUN_ID_REQUIRED',
        message: 'Permintaan alatan memerlukan ID sesi pelayan yang sah.',
      };
    }

    // 1. Server-owned budget check: max N dispatches per run.
    const limit = this.maxDispatchesPerRun;
    const used = this.runBudgets.get(ctx.runId) ?? 0;
    if (used >= limit) {
      return {
        ok: false,
        code: 'TOOL_BUDGET_EXCEEDED',
        message: `Had alatan telah dicapai (${used}/${limit} panggilan dibenarkan per sesi).`,
      };
    }

    // 2. Existence check
    const tool = this.definitions.get(toolName);
    if (!tool) {
      return {
        ok: false,
        code: 'TOOL_NOT_FOUND',
        message: `Alatan '${toolName}' tidak dijumpai dalam registri.`,
      };
    }

    // 3. Role authorization check
    if (!roleAllows(tool.requiredRole, ctx.role)) {
      return {
        ok: false,
        code:
          tool.requiredRole === 'founder'
            ? 'FORBIDDEN_FOUNDER_REQUIRED'
            : tool.requiredRole === 'staff'
              ? 'FORBIDDEN_STAFF_REQUIRED'
              : 'FORBIDDEN_DEVELOPER_REQUIRED',
        message: `Tindakan '${toolName}' memerlukan peranan ${tool.requiredRole}.`,
      };
    }

    // 4. Strict input validation (unknown keys, missing fields, wrong types).
    const validation = tool.validateInput(rawInput);
    if (!validation.ok) {
      return {
        ok: false,
        code: 'TOOL_INPUT_INVALID',
        message: tool.validationMessage ?? describeValidationError(validation.error),
        detail: validation.error,
      };
    }

    // 5. Consume the server-owned budget, then execute.
    this.runBudgets.set(ctx.runId, used + 1);
    // Mirror the authoritative counter for observability only.
    try {
      ctx.dispatchesCount = used + 1;
    } catch {
      /* frozen context: the authoritative counter still lives in the registry */
    }
    try {
      const result = await tool.execute(validation.data, {
        actorId: ctx.actorId,
        role: ctx.role,
        runId: ctx.runId,
        runtime: this.runtime,
        catalog: (role) => this.capabilityCatalog(role),
        catalogTotal: () => this.registeredCapabilityCount(),
      });
      if (result && result.ok === false) {
        return {
          ok: false,
          code: result.code,
          message: result.message ?? 'Alatan tidak dapat dilaksanakan.',
          ...(typeof result.reason === 'string' ? { reason: result.reason } : {}),
        };
      }
      return { ok: true, result };
    } catch (err: any) {
      const message = err?.message || 'Ralat semasa menjalankan alatan.';
      // A tool that throws a coded error keeps its specific failure code.
      const coded = /^([A-Z][A-Z0-9_]{3,})\s*:/.exec(message);
      if (coded) {
        return { ok: false, code: coded[1], message };
      }
      return {
        ok: false,
        code: 'TOOL_EXECUTION_ERROR',
        message,
      };
    }
  }
}

export { ADVANCED_TOOLS_DEFINITIONS, ALL_ADVANCED_TOOL_DEFINITIONS };
export type { ToolDefinition, ToolRole };
