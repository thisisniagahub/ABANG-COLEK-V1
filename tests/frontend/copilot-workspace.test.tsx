import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import * as workspaceModule from '../../src/features/workspaces/CopilotWorkspace';
import CopilotWorkspace from '../../src/features/workspaces/CopilotWorkspace';

describe('Copilot workspace runtime availability', () => {
  test('starts with a checkable runtime state instead of a permanent unavailable placeholder', () => {
    const markup = renderToStaticMarkup(<CopilotWorkspace />);

    expect(markup).toContain('Checking runtime availability');
    expect(markup).toContain('Check runtime again');
    expect(markup).not.toContain('Runtime unavailable · Belum tersedia');
  });

  test('renders inside the existing workspace main landmark without nesting another main', () => {
    const markup = renderToStaticMarkup(<CopilotWorkspace />);

    expect(markup).toStartWith('<section');
    expect(markup).not.toContain('<main');
  });

  test('accepts only a fixed Copilot v2 descriptor shape', () => {
    const validate = workspaceModule.isCopilotV2Descriptor;
    expect(typeof validate).toBe('function');
    expect(validate?.({
      version: '2.0.0',
      runtime: 'copilotkit-v2-agui',
      schema: 'a2ui.v1',
      activeProvider: 'gemini_free',
      candidateModels: [],
      allowlistedComponents: ['OperationsBriefCard'],
      paidFallbackAllowed: false,
    })).toBe(true);
    expect(validate?.({
      version: '2.0.0',
      runtime: 'custom-sse',
      schema: 'a2ui.v1',
      allowlistedComponents: ['OperationsBriefCard', 'script'],
      paidFallbackAllowed: true,
    })).toBe(false);
  });
});
