/**
 * ABANGCOLEK Sovereign GrowthOS — Shared Copilot run / thread identity bridge.
 *
 * The Pet companion (`src/features/pet/PetCompanion.tsx`) and the Copilot
 * workspace (`src/features/workspaces/CopilotWorkspace.tsx`) are ONE
 * conversational surface. Every message typed in the Pet and every message
 * typed in the Copilot chat must belong to the same thread and the same run,
 * so the server can correlate a request with the AG-UI thread it belongs to
 * (CPK-02).
 *
 * This module does NOT own the identity. The identity lives in
 * `copilotRunController` (`src/features/intelligence/copilotRunController.ts`),
 * which stays the single source of truth. This bridge only decides whether an
 * outgoing request CONTINUES the open run or STARTS one, and it marks the
 * identifiers for what they are.
 *
 * SECURITY — the identifiers are CLIENT-SUPPLIED CORRELATION LABELS:
 *  - `threadId` / `runId` are labels the browser offers so the server can
 *    correlate a request with a thread. They are NOT proof of identity,
 *    tenancy, authority or completion.
 *  - The server remains the only authority for the real run identity. A client
 *    that invents a label gets a label back, never authority.
 *  - The UI must never present these labels as verified. `RUN_LABEL_DISCLOSURE`
 *    is the wording used wherever a label is rendered.
 *  - A run keeps the trust level it was opened with. A voice transcript
 *    (`untrusted`) therefore keeps the whole run untrusted even when the run is
 *    continued from the typed Copilot surface.
 */

import {
  copilotRunController,
  type CopilotRunController,
  type CopilotRunIdentity,
} from '../intelligence/copilotRunController';

export type CopilotSurface = 'copilot' | 'pet';

export type ClientInputTrust = 'trusted' | 'untrusted';

/**
 * The only value the browser is allowed to attach to its own identifiers.
 * It states plainly that the ids are labels, not authority.
 */
export const CLIENT_IDENTITY_AUTHORITY = 'client_correlation_label';

export type ClientIdentityAuthority = typeof CLIENT_IDENTITY_AUTHORITY;

/** Copy shown wherever a client correlation label is rendered. */
export const RUN_LABEL_DISCLOSURE =
  'Label korelasi sisi klien — bukan bukti identiti, ketenan atau kebenaran. Identiti sebenar kekal dipegang oleh pelayan.';

export interface CopilotRunResolution {
  identity: CopilotRunIdentity;
  /** True when the request continues the run that is already open. */
  continued: boolean;
}

/**
 * Resolves the identity for an outgoing request.
 *
 * - When a run is already open in this identity scope, the request CONTINUES
 *   that run: same `runId`, same `threadId`. This is what makes a message
 *   typed in the Pet and a message typed in the Copilot chat one run.
 * - When no run is open, a new run is started on the shared controller.
 *
 * An identity scope is one controller instance. Two independent sessions use
 * two controllers and therefore never share a thread or a run.
 */
export function resolveCopilotRun(
  controller: CopilotRunController,
  options: { surface: CopilotSurface; inputTrust?: ClientInputTrust },
): CopilotRunResolution {
  const open = controller.getIdentity();
  if (open) {
    return { identity: continueRun(open, options.inputTrust), continued: true };
  }
  return {
    identity: controller.beginRun({
      surface: options.surface,
      inputTrust: options.inputTrust,
    }),
    continued: false,
  };
}

/**
 * A run keeps the strictest trust level it has seen. A voice transcript that
 * joins an open run downgrades the run, so the run can never be treated as
 * fully trusted because its first message happened to be typed.
 */
function continueRun(
  open: CopilotRunIdentity,
  inputTrust: ClientInputTrust | undefined,
): CopilotRunIdentity {
  if (inputTrust !== 'untrusted' || open.inputTrust === 'untrusted') return open;
  return { ...open, inputTrust: 'untrusted' };
}

/**
 * Attaches the shared identity to a request body.
 *
 * Both surfaces call this so the body always carries the controller's
 * `threadId` / `runId` — never a locally invented string — and so the
 * receiver can see that the ids are labels.
 */
export function attachCopilotRunIdentity<T extends Record<string, unknown>>(
  controller: CopilotRunController,
  body: T,
  options: { surface: CopilotSurface; inputTrust?: ClientInputTrust },
): T & { threadId: string; runId: string; identityAuthority: ClientIdentityAuthority } {
  const { identity } = resolveCopilotRun(controller, options);
  return {
    ...body,
    threadId: identity.threadId,
    runId: identity.runId,
    identityAuthority: CLIENT_IDENTITY_AUTHORITY,
  };
}

/**
 * Closes the open run of an identity scope. A closed scope starts a new run
 * on the next request; the thread of the scope is kept.
 */
export function closeCopilotRun(controller: CopilotRunController): void {
  controller.endRun();
}

export interface RunCorrelationLabel {
  threadId: string;
  runId: string;
  surface: CopilotSurface;
  startedAt: string;
  inputTrust: ClientInputTrust;
  /** Always `client_correlation_label`: the browser never asserts authority. */
  authority: ClientIdentityAuthority;
  /** The non-authoritative wording that must accompany the labels in the UI. */
  disclosure: string;
}

/**
 * Describes the open run for rendering. Returns `null` when no run is open,
 * so the UI never shows an identity that does not exist.
 */
export function describeRunCorrelation(
  identity: CopilotRunIdentity | null,
): RunCorrelationLabel | null {
  if (!identity) return null;
  return {
    threadId: identity.threadId,
    runId: identity.runId,
    surface: identity.surface,
    startedAt: identity.startedAt,
    inputTrust: identity.inputTrust,
    authority: CLIENT_IDENTITY_AUTHORITY,
    disclosure: RUN_LABEL_DISCLOSURE,
  };
}

/** The process-wide identity scope shared by the Pet and the Copilot surface. */
export { copilotRunController };
