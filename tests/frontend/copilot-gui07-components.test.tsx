import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const modulePath = '../../src/features/copilot/components/CopilotSurfaceCard';

describe('GUI-07 ABANGCOLEK component adapter', () => {
  test('reuses the shared surface tokens and exposes an accessible content region', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const markup = renderToStaticMarkup(
      React.createElement(implementation.CopilotSurfaceCard, {
        id: 'copilot-runtime',
        title: 'Chat',
        description: 'Test-only surface',
        children: <p>Scoped content</p>,
      }),
    );
    expect(markup).toContain('aria-labelledby="copilot-runtime-heading"');
    expect(markup).toContain('id="copilot-runtime-heading"');
    expect(markup).toContain('bg-[var(--ui-surface)]');
    expect(markup).toContain('Scoped content');
  });
});
