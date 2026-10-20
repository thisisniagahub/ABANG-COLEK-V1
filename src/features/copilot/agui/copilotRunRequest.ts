/**
 * ABANGCOLEK Sovereign GrowthOS — Copilot run request builder.
 *
 * Builds the AG-UI run request for the Copilot workspace from the SHARED run
 * identity (`src/features/intelligence/copilotRunController.ts`). The
 * `threadId` / `runId` that leave the browser are the controller's, and they
 * are declared as client correlation labels so the server stays the authority
 * for the real identity.
 */

import type { CopilotRunController, CopilotRunIdentity } from '../../intelligence/copilotRunController';
import type { CopilotRunHistoryEntry, CopilotRunRequest } from './aguiClient';
import {
  CLIENT_IDENTITY_AUTHORITY,
  resolveCopilotRun,
  type ClientInputTrust,
} from '../runIdentity';

export interface CopilotRunRequestParams {
  message: string;
  history?: CopilotRunHistoryEntry[];
  csrfToken?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  /**
   * Trust level of the input that opens the run. Typed chat is `trusted`;
   * a voice transcript is `untrusted`. An open run keeps the trust level it
   * was opened with, so a run started from voice stays untrusted.
   */
  inputTrust?: ClientInputTrust;
}

export interface CopilotRunRequestResolution {
  request: CopilotRunRequest;
  identity: CopilotRunIdentity;
  /** True when the request continues the run that was already open. */
  continued: boolean;
}

/**
 * Resolves the shared identity and returns the request that carries it.
 * The request never contains an identifier the controller did not issue.
 */
export function buildCopilotRunRequest(
  controller: CopilotRunController,
  params: CopilotRunRequestParams,
): CopilotRunRequestResolution {
  const { identity, continued } = resolveCopilotRun(controller, {
    surface: 'copilot',
    inputTrust: params.inputTrust,
  });

  const request: CopilotRunRequest = {
    message: params.message,
    history: params.history ?? [],
    threadId: identity.threadId,
    runId: identity.runId,
    identityAuthority: CLIENT_IDENTITY_AUTHORITY,
    ...(params.csrfToken ? { csrfToken: params.csrfToken } : {}),
    ...(params.signal ? { signal: params.signal } : {}),
    ...(params.fetchImpl ? { fetchImpl: params.fetchImpl } : {}),
    ...(params.endpoint ? { endpoint: params.endpoint } : {}),
  };

  return { request, identity, continued };
}
