import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const workspaceModule = await import(
  '../../src/features/workspaces/CopilotWorkspace'
).catch(() => null);

test('Copilot workspace does not claim a provider or runtime that is not configured', () => {
  expect(typeof workspaceModule?.default).toBe('function');
  if (!workspaceModule) return;

  const html = renderToStaticMarkup(
    React.createElement(workspaceModule.default, { onNavigate: () => undefined }),
  );

  expect(html).toContain('CopilotKit /v2 runtime belum tersedia');
  expect(html).toContain('CopilotKit /v2 runtime is not available');
  expect(html).not.toContain('Sifar Kos Protocol');
  expect(html).not.toContain('NVIDIA NIM');
  expect(html).not.toContain('Gemini Flash');
});

test('chat submission remains unavailable until the AGY runtime contract is wired', () => {
  expect(typeof workspaceModule?.default).toBe('function');
  if (!workspaceModule) return;

  const html = renderToStaticMarkup(
    React.createElement(workspaceModule.default, { onNavigate: () => undefined }),
  );

  expect(html).toContain('role="status"');
  expect(html).toContain('disabled=""');
  expect(html).toContain('No prompt has been sent');
});
