/**
 * ABANGCOLEK Sovereign GrowthOS — Shared Copilot run / thread identity
 *
 * The Pet sidecar and the Copilot workspace are ONE surface: a message typed
 * in the Pet and a message typed in the Copilot chat must belong to the same
 * thread and the same run. This controller owns that identity.
 *
 * It is deliberately dependency-free so that both surfaces can import it
 * without creating a cycle:
 *   - Pet  : `src/features/pet/PetCompanion.tsx`
 *   - Copilot: `src/features/copilot/**` (Writer A — mount requirement below)
 *
 * The controller is local-only state: it never persists anything and never
 * sends anything on its own.
 *
 * TRUST — the controller is also the authority on how much a run may be
 * trusted. A run keeps the STRICTEST trust it has ever seen: once an
 * untrusted input (a voice transcript) joins a run, that run stays untrusted
 * for its whole life and a later trusted input can never upgrade it back.
 * The downgrade is persisted, so `getIdentity()` always reports the trust the
 * controller really holds.
 */

/**
 * The trust level of one input.
 * - `trusted`    : typed by the user.
 * - `untrusted`  : a voice transcript. It may never authorise a mutation.
 */
export type CopilotInputTrust = 'trusted' | 'untrusted';

export interface CopilotRunIdentity {
  threadId: string;
  runId: string;
  startedAt: string;
  /**
   * A voice transcript is UNTRUSTED input. It may never authorise a refund
   * or any other mutation on its own.
   */
  inputTrust: CopilotInputTrust;
  /** Where the run was started from. */
  surface: 'copilot' | 'pet';
}

export type CopilotRunListener = (identity: CopilotRunIdentity | null) => void;

/**
 * The strictest of two trust levels. `untrusted` always wins: a run that has
 * seen an untrusted input stays untrusted for the rest of its life, and a
 * later trusted input can never upgrade it back.
 */
function strictestTrust(a: CopilotInputTrust, b: CopilotInputTrust): CopilotInputTrust {
  return a === 'untrusted' || b === 'untrusted' ? 'untrusted' : 'trusted';
}

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export class CopilotRunController {
  private threadId: string | null = null;
  private identity: CopilotRunIdentity | null = null;
  private listeners: CopilotRunListener[] = [];
  /** The thread both surfaces share. Created on first use. */
  ensureThread(): string {
    if (!this.threadId) this.threadId = newId('thr');
    return this.threadId;
  }

  /** The current thread id, or null when no run has happened yet. */
  getThreadId(): string | null {
    return this.threadId;
  }

  /** The identity of the run in flight, or null. */
  getIdentity(): CopilotRunIdentity | null {
    return this.identity;
  }

  /**
   * Starts a run. Both surfaces call this, so a run started in the Pet is the
   * same run the Copilot surface renders.
   */
  beginRun(options: { surface: 'copilot' | 'pet'; inputTrust?: CopilotInputTrust }): CopilotRunIdentity {
    const identity: CopilotRunIdentity = {
      threadId: this.ensureThread(),
      runId: newId('run'),
      startedAt: new Date().toISOString(),
      inputTrust: options.inputTrust ?? 'trusted',
      surface: options.surface,
    };
    this.identity = identity;
    this.notify();
    return identity;
  }

  /**
   * Records the trust of an input that JOINS the run that is already open.
   *
   * Strictest wins:
   * - an `untrusted` input (a voice transcript) DOWNGRADES the open run, and
   *   the downgrade is persisted, so `getIdentity()` reports the downgraded
   *   value and the controller's own state stays authoritative;
   * - a `trusted` input can never upgrade a run that was already downgraded,
   *   so a downgrade is NOT reversible for the lifetime of that run.
   *
   * Returns the identity of the open run (downgraded when needed), or `null`
   * when no run is open.
   */
  applyInputTrust(inputTrust: CopilotInputTrust): CopilotRunIdentity | null {
    const open = this.identity;
    if (!open) return null;

    const strictest = strictestTrust(open.inputTrust, inputTrust);
    if (strictest === open.inputTrust) return open;

    const downgraded: CopilotRunIdentity = { ...open, inputTrust: strictest };
    this.identity = downgraded;
    this.notify();
    return downgraded;
  }

  /** Ends the current run. */
  endRun(): void {
    if (!this.identity) return;
    this.identity = null;
    this.notify();
  }

  /**
   * Adds the shared identity to a request body so the server can bind the
   * run and the thread.
   *
   * When a run is already open, the input JOINS that run: the same `runId`
   * and the same `threadId` are returned, and the trust of the incoming input
   * is applied to the open run (strictest wins, never reversible). When no
   * run is open, a new run is started with the given trust.
   */
  attachIdentity<T extends Record<string, unknown>>(body: T, options: { surface: 'copilot' | 'pet'; inputTrust?: CopilotInputTrust }): T & { threadId: string; runId: string } {
    const open = this.identity;
    if (open) {
      const identity = this.applyInputTrust(options.inputTrust ?? 'trusted') ?? open;
      return { ...body, threadId: identity.threadId, runId: identity.runId };
    }
    const identity = this.beginRun(options);
    return { ...body, threadId: identity.threadId, runId: identity.runId };
  }

  subscribe(listener: CopilotRunListener): () => void {
    this.listeners.push(listener);
    listener(this.identity);
    return () => {
      this.listeners = this.listeners.filter((entry) => entry !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.identity);
  }
}

/** The process-wide controller shared by the Pet and the Copilot surface. */
export const copilotRunController = new CopilotRunController();
