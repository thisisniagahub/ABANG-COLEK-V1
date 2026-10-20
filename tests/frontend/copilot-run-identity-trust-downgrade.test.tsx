/**
 * CPK-09 — the shared run identity AND the trust of that run.
 *
 * Two defects are proven here, both of which used to break the "one surface,
 * one run" promise between the Copilot workspace and the Pet companion:
 *
 *  1. The Pet used `controller.attachIdentity(...)`, and `attachIdentity`
 *     always called `beginRun`, so every Pet message minted a brand new
 *     `runId`. A run opened in the workspace and continued in the Pet shared
 *     the `threadId` but NOT the `runId`. The Pet now resolves its identity
 *     through the shared bridge (`attachCopilotRunIdentity`), so both
 *     surfaces are ONE run.
 *
 *  2. The stored identity was immutable and the controller had no setter, so
 *     a run that was opened `trusted` could never be downgraded to
 *     `untrusted` when a voice transcript joined it. `getIdentity()` kept
 *     reporting the original value, so the controller's own state was not
 *     authoritative about trust. The controller now applies the STRICTEST
 *     trust it has ever seen and persists the downgrade.
 *
 * The truthfulness guarantees of `copilot-run-identity-truthfulness.test.tsx`
 * must survive this change: the ids that leave the browser are CLIENT
 * CORRELATION LABELS, never proof of identity, and the runtime stays
 * unavailable — with chat disabled — while it is not genuinely configured.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopilotRunController } from '../../src/features/intelligence/copilotRunController';
import {
  CLIENT_IDENTITY_AUTHORITY,
  RUN_LABEL_DISCLOSURE,
  attachCopilotRunIdentity,
  describeRunCorrelation,
} from '../../src/features/copilot/runIdentity';
import { buildCopilotRunRequest } from '../../src/features/copilot/agui/copilotRunRequest';
import { buildPetCopilotRequestBody } from '../../src/features/pet/PetCompanion';
import CopilotWorkspace from '../../src/features/workspaces/CopilotWorkspace';

const typedPet = (controller: CopilotRunController, message: string): Record<string, unknown> =>
  JSON.parse(buildPetCopilotRequestBody({ message, history: [], origin: 'text', controller }));

const voicePet = (controller: CopilotRunController, message: string): Record<string, unknown> =>
  JSON.parse(buildPetCopilotRequestBody({ message, history: [], origin: 'voice', controller }));

describe('CPK-09 — the Pet continues the run the Copilot workspace opened', () => {
  test('a run opened in the workspace and continued in the Pet keeps the same run id and thread id', () => {
    const controller = new CopilotRunController();

    // The workspace opens the run with typed (trusted) input.
    const { request, continued } = buildCopilotRunRequest(controller, {
      message: 'Semak margin promosi',
    });
    expect(continued).toBe(false);

    // The Pet continues that same run.
    const petBody = typedPet(controller, 'Teruskan draf emel gantian');

    expect(petBody.runId).toBe(request.runId);
    expect(petBody.threadId).toBe(request.threadId);
    // The controller still holds the one run of this scope.
    expect(controller.getIdentity()?.runId).toBe(request.runId);
    expect(controller.getThreadId()).toBe(request.threadId);
    // The run still belongs to the surface that opened it.
    expect(controller.getIdentity()?.surface).toBe('copilot');
  });

  test('the actual Pet request body carries the workspace run id', () => {
    const controller = new CopilotRunController();
    const { request } = buildCopilotRunRequest(controller, { message: 'Semak stok' });

    const raw = buildPetCopilotRequestBody({
      message: 'Teruskan laporan kebocoran',
      history: [],
      origin: 'text',
      controller,
    });

    // The wire payload itself carries the workspace run id.
    expect(raw).toContain(request.runId);
    expect(raw).toContain(request.threadId);
    expect(JSON.parse(raw).runId).toBe(request.runId);
  });

  test('the Pet does not mint a second run for the next message', () => {
    const controller = new CopilotRunController();
    const { request } = buildCopilotRunRequest(controller, { message: 'Satu' });

    const first = typedPet(controller, 'Dua');
    const second = typedPet(controller, 'Tiga');

    expect(first.runId).toBe(request.runId);
    expect(second.runId).toBe(request.runId);
    expect(first.runId).toBe(second.runId);
    expect(first.threadId).toBe(second.threadId);
  });
});

describe('CPK-09 — the strictest trust wins and a downgrade is never reversed', () => {
  test('a voice transcript that joins an open trusted run downgrades it and the controller reports it', () => {
    const controller = new CopilotRunController();
    const { request } = buildCopilotRunRequest(controller, { message: 'Teks taip' });
    expect(controller.getIdentity()?.inputTrust).toBe('trusted');

    const petBody = voicePet(controller, 'Transkrip suara');

    // The SAME run is downgraded — a voice transcript does not fork a run.
    expect(petBody.runId).toBe(request.runId);
    expect(controller.getIdentity()?.runId).toBe(request.runId);
    // The controller's own state is authoritative about the trust.
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');
    // The value the UI renders reports the downgrade too.
    expect(describeRunCorrelation(controller.getIdentity())?.inputTrust).toBe('untrusted');
  });

  test('a downgrade is not reversible: a later trusted input does not upgrade the run back', () => {
    const controller = new CopilotRunController();
    buildCopilotRunRequest(controller, { message: 'Teks taip' });
    voicePet(controller, 'Transkrip suara');

    const downgradedRunId = controller.getIdentity()?.runId;
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');

    // A typed Pet message joins the run — it must not upgrade it.
    const typedBody = typedPet(controller, 'Teks taip lagi');
    expect(typedBody.runId).toBe(downgradedRunId);
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');

    // The same holds for the workspace surface, which sends trusted input.
    const workspace = buildCopilotRunRequest(controller, {
      message: 'Teks taip dari workspace',
      inputTrust: 'trusted',
    });
    expect(workspace.identity.inputTrust).toBe('untrusted');
    expect(workspace.identity.runId).toBe(downgradedRunId);
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');
  });

  test('attachIdentity downgrades the open run instead of minting a new one', () => {
    const controller = new CopilotRunController();
    const opened = controller.beginRun({ surface: 'copilot' });
    expect(controller.getIdentity()?.inputTrust).toBe('trusted');

    const body = controller.attachIdentity(
      { message: 'Transkrip suara' },
      { surface: 'pet', inputTrust: 'untrusted' },
    );

    expect(body.runId).toBe(opened.runId);
    expect(body.threadId).toBe(opened.threadId);
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');
  });

  test('a downgrade through attachIdentity is not reversible either', () => {
    const controller = new CopilotRunController();
    const opened = controller.beginRun({ surface: 'copilot' });
    controller.attachIdentity(
      { message: 'Transkrip suara' },
      { surface: 'pet', inputTrust: 'untrusted' },
    );

    const trusted = controller.attachIdentity(
      { message: 'Teks taip' },
      { surface: 'pet', inputTrust: 'trusted' },
    );

    expect(trusted.runId).toBe(opened.runId);
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');
  });

  test('a run that was opened untrusted stays untrusted for a typed continuation', () => {
    const controller = new CopilotRunController();
    const opened = controller.beginRun({ surface: 'pet', inputTrust: 'untrusted' });

    const continued = attachCopilotRunIdentity(
      controller,
      { message: 'Teks taip' },
      { surface: 'pet', inputTrust: 'trusted' },
    );

    expect(continued.runId).toBe(opened.runId);
    expect(controller.getIdentity()?.inputTrust).toBe('untrusted');
  });
});

describe('CPK-09 — the truthfulness guarantees survive the shared run and the downgrade', () => {
  test('the Pet request body declares the client ids as a correlation label only', () => {
    const controller = new CopilotRunController();
    buildCopilotRunRequest(controller, { message: 'Semak stok' });

    const body = typedPet(controller, 'Semak stok');

    expect(body.identityAuthority).toBe(CLIENT_IDENTITY_AUTHORITY);
    expect(body.identityAuthority).toBe('client_correlation_label');
    // The label is never presented as a verified or authoritative identity.
    expect(body).not.toHaveProperty('verified');
    expect(body).not.toHaveProperty('verifiedIdentity');
    expect(body).not.toHaveProperty('authoritative');
    expect(body).not.toHaveProperty('identityConfirmed');
  });

  test('the workspace still labels the downgraded identity as a client label and never as verified', () => {
    const controller = new CopilotRunController();
    controller.beginRun({ surface: 'copilot' });
    voicePet(controller, 'Transkrip suara');

    const html = renderToStaticMarkup(<CopilotWorkspace controller={controller} />);

    expect(html).toContain('Client correlation labels');
    expect(html).toContain(RUN_LABEL_DISCLOSURE);
    expect(html).toContain('bukan bukti identiti');
    // The server stays the stated authority for the real identity.
    expect(html).toContain('pelayan');
    for (const forbidden of [
      'verified identity',
      'authoritative run',
      'authoritative thread',
      'identity confirmed',
      'identity verified',
      'trusted thread',
    ]) {
      expect(html.toLowerCase()).not.toContain(forbidden);
    }
  });

  test('an unconfigured runtime stays unavailable and chat stays disabled', () => {
    const html = renderToStaticMarkup(<CopilotWorkspace />);

    expect(html).toContain('CopilotKit /v2 runtime belum tersedia');
    expect(html).toContain('CopilotKit /v2 runtime is not available');
    expect(html).toContain('disabled=""');
    expect(html).toContain('No prompt has been sent');
  });
});
