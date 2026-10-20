/**
 * Fail closed.
 *
 * If the descriptor request fails, times out, or answers with a shape the
 * frontend does not recognise, the runtime must be reported as NOT available.
 * A missing, broken, or surprising descriptor must never enable chat.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';
import {
  CopilotWorkspaceView,
  loadRuntimeDescriptor,
  resolveRuntimeDescriptor,
  type RuntimeCheckState,
} from '../../src/features/workspaces/CopilotWorkspace';
import {
  OFFICIAL_RUNTIME_DESCRIPTOR,
  SUBMIT_DISABLED,
  TEXTAREA_DISABLED,
  jsonResponse,
  withMockedFetch,
} from './copilot-runtime-descriptor-fixtures';

function renderWorkspace(runtime: RuntimeCheckState): string {
  return renderToStaticMarkup(
    <CopilotWorkspaceView
      runtime={runtime}
      session={null}
      threadId="thread-1"
      messages={[]}
      inputMessage="Semak stok ORD-001"
      isSending={false}
      chatError={null}
      run={initialAguiRunState}
      activeIdentity={null}
      onInputChange={() => undefined}
      onSubmit={() => undefined}
      onRetryRuntime={() => undefined}
    />,
  );
}

function assertUnavailable(html: string): void {
  expect(html).toMatch(TEXTAREA_DISABLED);
  expect(html).toMatch(SUBMIT_DISABLED);
  expect(html).toContain('CopilotKit /v2 runtime belum tersedia');
  expect(html).toContain('CopilotKit /v2 runtime is not available');
  expect(html).toContain('No prompt has been sent');
  // No provider may be presented when the runtime is not confirmed.
  expect(html).not.toContain('gemini_free');
  expect(html).not.toContain('NVIDIA Nemotron');
}

describe('the runtime is unavailable whenever the descriptor cannot be trusted', () => {
  test('a network failure is reported as unavailable', async () => {
    const state = await withMockedFetch(
      () => {
        throw new TypeError('fetch failed');
      },
      () => loadRuntimeDescriptor(),
    );

    expect(state.kind).toBe('unavailable');
    if (state.kind === 'unavailable') expect(state.code).toBe('UNAVAILABLE');
    assertUnavailable(renderWorkspace(state));
  });

  test('a non-2xx descriptor response is reported as unavailable', async () => {
    const state = await withMockedFetch(
      () => jsonResponse({ error: 'NOT_FOUND' }, 404),
      () => loadRuntimeDescriptor(),
    );

    expect(state.kind).toBe('unavailable');
    if (state.kind === 'unavailable') expect(state.code).toBe('HTTP_ERROR');
    assertUnavailable(renderWorkspace(state));
  });

  test('a non-JSON descriptor response is reported as unavailable', async () => {
    const state = await withMockedFetch(
      () => new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
      () => loadRuntimeDescriptor(),
    );

    expect(state.kind).toBe('unavailable');
    if (state.kind === 'unavailable') expect(state.code).toBe('INVALID_RESPONSE');
    assertUnavailable(renderWorkspace(state));
  });

  test('a rejected descriptor envelope is reported as unavailable with the server code', async () => {
    const state = await withMockedFetch(
      () => jsonResponse({
        ok: false,
        error: 'RUNTIME_NOT_READY',
        code: 'RUNTIME_NOT_READY',
        requestId: 'run-1',
        message: 'Perkhidmatan model tidak tersedia untuk run ini.',
      }),
      () => loadRuntimeDescriptor(),
    );

    expect(state.kind).toBe('unavailable');
    if (state.kind === 'unavailable') expect(state.code).toBe('RUNTIME_NOT_READY');
    assertUnavailable(renderWorkspace(state));
  });

  test('an unrecognised descriptor shape is reported as unavailable, not as a runtime', () => {
    for (const body of [
      { hello: 'world' },
      { ok: true, data: { nothing: 'useful' } },
      { ...OFFICIAL_RUNTIME_DESCRIPTOR, copilotkitRuntimeImplemented: false },
      { ...OFFICIAL_RUNTIME_DESCRIPTOR, aguiProtocolImplemented: false },
      { ...OFFICIAL_RUNTIME_DESCRIPTOR, version: '1.0.0' },
      { ...OFFICIAL_RUNTIME_DESCRIPTOR, paidFallbackAllowed: true },
      { ...OFFICIAL_RUNTIME_DESCRIPTOR, allowlistedComponents: ['<script>'] },
      { ...OFFICIAL_RUNTIME_DESCRIPTOR, candidateModels: 'not-an-array' },
      null,
      'not-an-object',
      42,
    ]) {
      const state = resolveRuntimeDescriptor(body);
      expect(state.kind).toBe('unrecognized');
      assertUnavailable(renderWorkspace(state));
    }
  });
});
