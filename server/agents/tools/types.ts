/**
 * AbangColek Sovereign GrowthOS — Advanced Tool Contracts
 */

import type { Schema } from './validation';
import type { ToolRole, ToolRuntime } from './runtime';

export type { ToolRole };

export type RiskClass = 'Q' | 'S' | 'D' | 'C' | 'X';

export interface ToolOutcomeSuccess {
  ok: true;
  /** Optional machine code, e.g. ALREADY_EXECUTED for an idempotent replay. */
  code?: string;
  [key: string]: unknown;
}

export interface ToolOutcomeFailure {
  ok: false;
  code: string;
  message: string;
  [key: string]: unknown;
}

export type ToolOutcome = ToolOutcomeSuccess | ToolOutcomeFailure;

export interface ToolCapabilityDescriptor {
  logicalCapabilityId: string;
  registrationName: string;
  riskClass: RiskClass;
  description: string;
  requiredRole: ToolRole;
}

export interface ToolExecutionContext {
  actorId: string;
  role: ToolRole;
  /** Server-issued run identifier. Optional only for direct (non-registry) calls. */
  runId?: string;
  /** Runtime dependencies. Optional only for direct (non-registry) calls. */
  runtime?: ToolRuntime;
  /** Live capability catalogue of the registry, filtered for the actor role. */
  catalog?: (role: ToolRole) => ToolCapabilityDescriptor[];
  /** Total number of registered capabilities, regardless of role. */
  catalogTotal?: () => number;
}

/** The context a tool body always receives: every dependency is materialised. */
export interface ResolvedToolContext {
  actorId: string;
  role: ToolRole;
  runId: string;
  runtime: ToolRuntime;
  catalog: (role: ToolRole) => ToolCapabilityDescriptor[];
  catalogTotal: () => number;
}

export interface ToolDefinition {
  logicalCapabilityId: string;
  registrationName: string;
  riskClass: RiskClass;
  description: string;
  requiredRole: ToolRole;
  inputSchema: Schema;
  /** Optional machine code returned when input validation fails. */
  validationMessage?: string;
  validateInput: (input: unknown) => { ok: true; data: any } | { ok: false; error: string };
  execute: (input: any, context: ToolExecutionContext) => Promise<ToolOutcome>;
}
