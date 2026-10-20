import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  OperationsBriefApp,
  parseOperationsBrief,
} from '../../src/features/copilot/mcp-apps/OperationsBriefApp';

const brief = {
  title: 'Taklimat operasi',
  briefDate: '2026-10-19',
  metrics: [{ label: 'Pesanan', value: '8' }],
  readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED',
  source: 'operations-brief-v1',
  revision: 'snapshot-12',
};

test('the read-only brief projection is returned as a verified result', () => {
  expect(parseOperationsBrief(brief)).toEqual({ ok: true, value: brief });
  expect(parseOperationsBrief({ ...brief, url: 'https://untrusted.example' })).toEqual({ ok: false });
  expect(parseOperationsBrief({ ...brief, title: '' })).toEqual({ ok: false });
});

test('the resource state object reports loading, denied and unknown outcomes distinctly', () => {
  const loading = renderToStaticMarkup(
    React.createElement(OperationsBriefApp, { state: { status: 'loading' } }),
  );
  const denied = renderToStaticMarkup(
    React.createElement(OperationsBriefApp, {
      state: { status: 'denied', reason: 'CAPABILITY_REQUIRED' },
    }),
  );
  const unknown = renderToStaticMarkup(
    React.createElement(OperationsBriefApp, { state: { status: 'unknown_outcome' } }),
  );

  expect(loading).toContain('Memuat taklimat');
  expect(denied).toContain('Akses taklimat tidak dibenarkan');
  expect(unknown).toContain('Status resource tidak diketahui');
  expect(denied).toContain('CAPABILITY_REQUIRED');
});

test('an untrusted reason is never echoed back into the view', () => {
  const denied = renderToStaticMarkup(
    React.createElement(OperationsBriefApp, {
      state: { status: 'denied', reason: 'https://untrusted.example' },
    }),
  );

  expect(denied).toContain('Akses taklimat tidak dibenarkan');
  expect(denied).not.toContain('https://');
  expect(denied).not.toContain('untrusted.example');
});

test('a ready state renders the verified brief with scoped provenance', () => {
  const html = renderToStaticMarkup(
    React.createElement(OperationsBriefApp, { state: { status: 'ready', brief } }),
  );

  expect(html).toContain('Taklimat operasi');
  expect(html).toContain('operations-brief-v1');
  expect(html).toContain('snapshot-12');
  expect(html).toContain('Paparan sahaja');
  expect(html).not.toContain('<button');
});

test('a ready state without a verified brief reports insufficient data', () => {
  const html = renderToStaticMarkup(
    React.createElement(OperationsBriefApp, { state: { status: 'ready' } }),
  );
  expect(html).toContain('Tiada taklimat operasi');
});
