/**
 * AbangColek Sovereign GrowthOS — EXT-01 Local Inspector
 *
 * A developer-only view of a local run: threads, tools, state and latency.
 *
 * Rules this module enforces:
 *  - It is gated to local/development. In a production build it refuses to
 *    produce a snapshot at all (`INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION`).
 *  - It never writes telemetry anywhere: the recorder lives in memory only and
 *    the snapshot is computed on demand.
 *  - Secrets and PII are redacted before anything is rendered.
 *
 * Persistence mode: `in_memory`. Locality: `local`.
 *
 * Why it lives here (and not under `server/agents/intelligence`):
 *
 *  The inspector is a platform-local development instrument — it observes the
 *  platform process that constructs it. The platform layer is the base layer
 *  of the server: every server module may depend on it, but it must never
 *  depend on a module (`server/agents/**`, `server/automation/**`). Keeping
 *  the implementation inside `server/platform/**` is what makes that direction
 *  rule hold; `server/agents/intelligence/inspector.ts` re-exports it so the
 *  historical import path keeps working.
 */

import { failIntelligence } from '../../../shared/intelligence-errors';

export type InspectorEnvironment = {
  nodeEnv?: string;
  /** Explicit opt-in for a local developer machine. */
  allowLocalInspector?: boolean;
};

export interface InspectorRedactionRule {
  label: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * The redaction rules applied to every value the inspector shows. The rules
 * cover API keys, bearer tokens, private keys, e-mail addresses, Malaysian
 * identity numbers, Malaysian phone numbers and long opaque tokens.
 */
export const INSPECTOR_REDACTION_RULES: InspectorRedactionRule[] = [
  { label: 'PRIVATE_KEY', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: '[REDACTED:private-key]' },
  { label: 'API_KEY', pattern: /\b(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,})\b/g, replacement: '[REDACTED:api-key]' },
  { label: 'BEARER_TOKEN', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, replacement: '[REDACTED:bearer-token]' },
  { label: 'ASSIGNED_SECRET', pattern: /\b(password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*['"][^'"]{4,}['"]/gi, replacement: '$1=[REDACTED]' },
  { label: 'EMAIL', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[REDACTED:email]' },
  { label: 'MY_IC', pattern: /\b\d{6}-\d{2}-\d{4}\b/g, replacement: '[REDACTED:ic]' },
  { label: 'MY_PHONE', pattern: /\b(?:\+?60|0)1\d[-\s]?\d{3,4}[-\s]?\d{4}\b/g, replacement: '[REDACTED:phone]' },
  { label: 'LONG_TOKEN', pattern: /\b[A-Za-z0-9_-]{32,}\b/g, replacement: '[REDACTED:token]' },
];

/** Redacts a single value. Returns the redacted string. */
export function redactValue(value: string): string {
  let output = value;
  for (const rule of INSPECTOR_REDACTION_RULES) {
    output = output.replace(rule.pattern, rule.replacement);
  }
  return output;
}

/** Redacts every string inside an arbitrary JSON-ish value. */
export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[REDACTED:depth]';
  if (typeof value === 'string') return redactValue(value);
  if (Array.isArray(value)) return value.map((entry) => redactDeep(entry, depth + 1));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = redactDeep(entry, depth + 1);
    }
    return output;
  }
  return value;
}

export interface InspectorToolCall {
  toolName: string;
  /** Duration in milliseconds, measured by the recorder. */
  durationMs: number;
  outcome: 'success' | 'error' | 'unknown';
}

export interface InspectorThreadView {
  threadId: string;
  eventCount: number;
  toolCalls: InspectorToolCall[];
  /** Redacted state snapshot. */
  state: Record<string, unknown>;
  lastEventAt: string;
}

export interface InspectorSnapshot {
  generatedAt: string;
  threads: InspectorThreadView[];
  totals: {
    threads: number;
    toolCalls: number;
    errors: number;
    totalDurationMs: number;
  };
  /** How the snapshot is persisted. Never remote. */
  persistence: 'in_memory';
  locality: 'local';
}

/**
 * True when the inspector may run. The inspector is available on a local
 * development machine only; a production build never exposes it.
 */
export function isLocalInspectorAllowed(environment: InspectorEnvironment = {}): boolean {
  const nodeEnv = environment.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') return false;
  if (environment.allowLocalInspector === false) return false;
  if (environment.allowLocalInspector === true) return true;
  return nodeEnv !== 'production';
}

/**
 * The in-memory recorder the inspector reads. It stores raw values; every
 * value is redacted when the snapshot is produced, so the raw buffer never
 * leaves the process.
 */
export class LocalRunRecorder {
  private readonly threads = new Map<string, {
    eventCount: number;
    toolCalls: InspectorToolCall[];
    state: Record<string, unknown>;
    lastEventAt: string;
  }>();

  constructor(private readonly clock: () => string = () => new Date().toISOString()) {}

  recordEvent(threadId: string): void {
    const thread = this.ensure(threadId);
    thread.eventCount += 1;
    thread.lastEventAt = this.clock();
  }

  recordToolCall(threadId: string, call: InspectorToolCall): void {
    const thread = this.ensure(threadId);
    thread.toolCalls.push(call);
    thread.eventCount += 1;
    thread.lastEventAt = this.clock();
  }

  recordState(threadId: string, key: string, value: unknown): void {
    const thread = this.ensure(threadId);
    thread.state[key] = value;
    thread.lastEventAt = this.clock();
  }

  reset(): void {
    this.threads.clear();
  }

  /** The recorded threads, for the inspector to render. */
  entries(): Array<[string, {
    eventCount: number;
    toolCalls: InspectorToolCall[];
    state: Record<string, unknown>;
    lastEventAt: string;
  }]> {
    return [...this.threads.entries()];
  }

  private ensure(threadId: string) {
    let thread = this.threads.get(threadId);
    if (!thread) {
      thread = { eventCount: 0, toolCalls: [], state: {}, lastEventAt: this.clock() };
      this.threads.set(threadId, thread);
    }
    return thread;
  }
}

/**
 * The local inspector. Produces a redacted, in-memory snapshot of a local run.
 */
export class LocalInspector {
  constructor(
    private readonly recorder: LocalRunRecorder,
    private readonly environment: InspectorEnvironment = {},
  ) {}

  /** Throws when the inspector is not allowed to run (e.g. in production). */
  assertAvailable(): void {
    if (!isLocalInspectorAllowed(this.environment)) {
      failIntelligence(
        'INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION',
        'Inspector hanya dibenarkan pada mesin pembangunan tempatan; ia tidak didedahkan dalam build produksi.',
      );
    }
  }

  /** A redacted snapshot of the recorded local run. Writes nothing. */
  snapshot(): InspectorSnapshot {
    this.assertAvailable();
    const threads: InspectorThreadView[] = [];
    let toolCalls = 0;
    let errors = 0;
    let totalDurationMs = 0;
    for (const [threadId, thread] of this.recorder.entries()) {
      toolCalls += thread.toolCalls.length;
      errors += thread.toolCalls.filter((call) => call.outcome === 'error').length;
      totalDurationMs += thread.toolCalls.reduce((sum, call) => sum + call.durationMs, 0);
      threads.push({
        threadId,
        eventCount: thread.eventCount,
        toolCalls: thread.toolCalls.map((call) => ({
          toolName: redactValue(call.toolName),
          durationMs: call.durationMs,
          outcome: call.outcome,
        })),
        state: redactDeep(thread.state) as Record<string, unknown>,
        lastEventAt: thread.lastEventAt,
      });
    }
    return {
      generatedAt: new Date().toISOString(),
      threads,
      totals: { threads: threads.length, toolCalls, errors, totalDurationMs },
      persistence: 'in_memory',
      locality: 'local',
    };
  }
}
