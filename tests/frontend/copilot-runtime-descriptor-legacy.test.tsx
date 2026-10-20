/**
 * The legacy descriptor describes a DIFFERENT runtime.
 *
 * `server/platform/app.ts` serves the project-local keyword router under
 * `/copilot/v2`. Its descriptor is truthful — it says `runtime:
 * 'local-keyword-router'`, `aguiProtocolImplemented: false` and
 * `copilotkitRuntimeImplemented: false` — and it must never be read as proof
 * that the official CopilotKit runtime is serving the app.
 *
 * It must also never be read the other way round: a legacy descriptor must
 * not enable chat, and it must not smuggle a provider into the UI.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';
import {
  CopilotWorkspaceView,
  isLegacyKeywordRouterDescriptor,
  isOfficialCopilotRuntimeDescriptor,
  loadRuntimeDescriptor,
  resolveRuntimeDescriptor,
  type RuntimeCheckState,
} from '../../src/features/workspaces/CopilotWorkspace';
import {
  LEGACY_KEYWORD_ROUTER_DESCRIPTOR,
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

describe('the legacy keyword-router descriptor is never the official runtime', () => {
  test('the legacy descriptor is recognised as legacy and refused as official', () => {
    expect(isLegacyKeywordRouterDescriptor(LEGACY_KEYWORD_ROUTER_DESCRIPTOR)).toBe(true);
    expect(isOfficialCopilotRuntimeDescriptor(LEGACY_KEYWORD_ROUTER_DESCRIPTOR)).toBe(false);
  });

  test('a raw legacy descriptor does not become a runtime', () => {
    const state = resolveRuntimeDescriptor(LEGACY_KEYWORD_ROUTER_DESCRIPTOR);
    expect(state.kind).toBe('unrecognized');
  });

  test('a legacy descriptor wrapped in the platform envelope does not become a runtime', () => {
    const state = resolveRuntimeDescriptor({
      ok: true,
      data: LEGACY_KEYWORD_ROUTER_DESCRIPTOR,
    });
    expect(state.kind).toBe('unrecognized');
  });

  test('a served legacy descriptor leaves the workspace unavailable', async () => {
    const state = await withMockedFetch(
      () => jsonResponse(LEGACY_KEYWORD_ROUTER_DESCRIPTOR),
      () => loadRuntimeDescriptor(),
    );

    expect(state.kind).not.toBe('descriptor');
    expect(state.kind).toBe('unrecognized');

    const html = renderWorkspace(state);
    expect(html).toMatch(TEXTAREA_DISABLED);
    expect(html).toMatch(SUBMIT_DISABLED);
    expect(html).toContain('CopilotKit /v2 runtime is not available');
    // The legacy descriptor's provider is never shown as a live provider.
    expect(html).not.toContain('gemini_free');
  });
});
