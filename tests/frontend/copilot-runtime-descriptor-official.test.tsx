/**
 * The frontend must ask the RIGHT question about the runtime.
 *
 * It reads `GET /api/copilotkit/descriptor` — the endpoint that describes the
 * official CopilotKit runtime — and it only enables chat when that descriptor
 * CONFIRMS the implementation with the real field names the server serves.
 *
 * This file proves the positive path: the official descriptor is recognised,
 * the workspace asks the official endpoint, chat becomes usable, and no
 * provider is invented by the UI.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initialAguiRunState } from '../../src/features/copilot/agui/aguiRunState';
import {
  CopilotWorkspaceView,
  RUNTIME_DESCRIPTOR_PATH,
  isCopilotV2Descriptor,
  isOfficialCopilotRuntimeDescriptor,
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

describe('the official runtime descriptor is accepted with the real field names', () => {
  test('the descriptor served by /api/copilotkit/descriptor is the official runtime', () => {
    expect(isCopilotV2Descriptor(OFFICIAL_RUNTIME_DESCRIPTOR)).toBe(true);
    expect(isOfficialCopilotRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR)).toBe(true);
    expect(resolveRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR).kind).toBe('descriptor');
  });

  test('a descriptor without the implementation flags is not the official runtime', () => {
    const base = {
      version: '2.0.0',
      runtime: 'copilotkit-v2-agui',
      schema: 'a2ui.v1',
      activeProvider: 'gemini_free',
      candidateModels: [],
      allowlistedComponents: ['OperationsBriefCard'],
      paidFallbackAllowed: false,
    };

    // The base contract alone proves nothing about the implementation.
    expect(isCopilotV2Descriptor(base)).toBe(true);
    expect(isOfficialCopilotRuntimeDescriptor(base)).toBe(false);
    expect(resolveRuntimeDescriptor(base).kind).toBe('unrecognized');
  });

  test('the workspace asks the official descriptor endpoint, not the legacy one', async () => {
    const urls: string[] = [];

    const state = await withMockedFetch(
      (url) => {
        urls.push(url);
        return jsonResponse(OFFICIAL_RUNTIME_DESCRIPTOR);
      },
      () => loadRuntimeDescriptor(),
    );

    expect(urls).toEqual([RUNTIME_DESCRIPTOR_PATH]);
    expect(RUNTIME_DESCRIPTOR_PATH).toBe('/api/copilotkit/descriptor');
    expect(state.kind).toBe('descriptor');
  });

  test('the official descriptor enables chat', () => {
    const state = resolveRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR);
    const html = renderWorkspace(state);

    expect(state.kind).toBe('descriptor');
    expect(html).not.toMatch(TEXTAREA_DISABLED);
    expect(html).not.toMatch(SUBMIT_DISABLED);
    expect(html).toContain('Runtime descriptor confirmed the official CopilotKit runtime');
    expect(html).toContain('CopilotKit /v2 runtime disahkan oleh pelayan dan sedia menerima arahan');
    expect(html).toContain('/api/copilotkit/agent/abangcolek/run');
  });

  test('the enabled workspace does not present a fake provider', () => {
    const html = renderWorkspace(resolveRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR));

    // The provider shown is the one the SERVER reported, never one the UI
    // invented, and it is never presented as already connected.
    expect(html).toContain('Provider yang dikonfigurasi oleh pelayan: gemini_free');
    expect(html).toContain('verified-per-run-only');
    expect(html).not.toContain('Penyedia model aktif');
    expect(html).not.toContain('NVIDIA Nemotron');
    expect(html).not.toContain('Sifar Kos Protocol');
  });

  test('a different server-reported provider is rendered as reported, never hardcoded', () => {
    const html = renderWorkspace(resolveRuntimeDescriptor({
      ...OFFICIAL_RUNTIME_DESCRIPTOR,
      activeProvider: 'local_rules',
    }));

    expect(html).toContain('Provider yang dikonfigurasi oleh pelayan: local_rules');
    expect(html).not.toContain('gemini_free');
  });

  test('the server-listed fixed UI components are still shown from the descriptor', () => {
    const html = renderWorkspace(resolveRuntimeDescriptor(OFFICIAL_RUNTIME_DESCRIPTOR));

    expect(html).toContain('Server-listed fixed UI components:');
    expect(html).toContain('OperationsBriefCard');
    expect(html).toContain('CommissionCard');
  });
});
