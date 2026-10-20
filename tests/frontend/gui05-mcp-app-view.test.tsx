import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mcpApp = await import(
  '../../src/features/copilot/mcp-apps/OperationsBriefApp'
).catch(() => null);

test('operations brief renderer exposes loading, denied, and unknown outcomes distinctly', () => {
  expect(typeof mcpApp?.OperationsBriefApp).toBe('function');
  if (!mcpApp) return;

  const loading = renderToStaticMarkup(
    React.createElement(mcpApp.OperationsBriefApp, { state: { status: 'loading' } }),
  );
  const denied = renderToStaticMarkup(
    React.createElement(mcpApp.OperationsBriefApp, {
      state: { status: 'denied', reason: 'CAPABILITY_REQUIRED' },
    }),
  );
  const unknown = renderToStaticMarkup(
    React.createElement(mcpApp.OperationsBriefApp, {
      state: { status: 'unknown_outcome' },
    }),
  );

  expect(loading).toContain('Memuat taklimat');
  expect(denied).toContain('Akses taklimat tidak dibenarkan');
  expect(unknown).toContain('Status resource tidak diketahui');
  expect(denied).not.toContain('https://');
});

test('operations brief renderer shows scoped provenance and read-only notice without unsafe HTML', () => {
  expect(typeof mcpApp?.OperationsBriefApp).toBe('function');
  if (!mcpApp) return;

  const html = renderToStaticMarkup(
    React.createElement(mcpApp.OperationsBriefApp, {
      state: {
        status: 'ready',
        brief: {
          title: '<script>alert(1)</script>',
          briefDate: '2026-10-19',
          metrics: [{ label: 'Pesanan', value: '8' }],
          readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED',
          source: 'operations-brief-v1',
          revision: 'snapshot-12',
        },
      },
    }),
  );

  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain('operations-brief-v1');
  expect(html).toContain('snapshot-12');
  expect(html).toContain('Paparan sahaja');
  expect(html).toContain('8');
});

test('operations brief parser rejects arbitrary URL fields and oversized metric lists', () => {
  expect(typeof mcpApp?.parseOperationsBrief).toBe('function');
  if (!mcpApp) return;

  const brief = {
    title: 'Taklimat operasi',
    briefDate: '2026-10-19',
    metrics: [{ label: 'Pesanan', value: '8' }],
    readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED',
    source: 'operations-brief-v1',
    revision: 'snapshot-12',
  };

  expect(mcpApp.parseOperationsBrief({ ...brief, url: 'https://untrusted.example' })).toEqual({
    ok: false,
  });
  expect(
    mcpApp.parseOperationsBrief({
      ...brief,
      metrics: Array.from({ length: 21 }, (_, index) => ({
        label: `Metrik ${index}`,
        value: `${index}`,
      })),
    }),
  ).toEqual({ ok: false });
  expect(mcpApp.parseOperationsBrief(brief)).toMatchObject({ ok: true });
});
