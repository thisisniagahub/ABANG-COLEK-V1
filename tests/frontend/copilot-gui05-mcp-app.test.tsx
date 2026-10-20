import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const modulePath = '../../src/features/copilot/mcp-apps/OperationsBriefApp';
const briefFixture = {
  title: 'Test-only operations brief',
  briefDate: '2026-10-19',
  metrics: [{ label: 'Pending orders', value: '14' }],
  readOnlyNotice: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED',
  source: 'fixture:test',
  revision: 3,
};

describe('GUI-05 read-only Operations Brief presentation', () => {
  test('accepts only the bounded fixed brief projection', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    expect(implementation.parseOperationsBrief(briefFixture)).toEqual({
      ok: true,
      value: briefFixture,
    });
    expect(implementation.parseOperationsBrief({
      ...briefFixture,
      readOnlyNotice: 'UNRESTRICTED_PROXY',
    }).ok).toBe(false);
    expect(implementation.parseOperationsBrief({
      ...briefFixture,
      metrics: Array.from({ length: 13 }, (_, index) => ({
        label: `metric-${index}`,
        value: '1',
      })),
    }).ok).toBe(false);
    expect(implementation.parseOperationsBrief({
      ...briefFixture,
      briefDate: '2026-02-30',
    }).ok).toBe(false);
  });

  test('renders read-only data safely and reports unavailable states without actions', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const html = renderToStaticMarkup(
      React.createElement(implementation.OperationsBriefApp, { brief: {
        ...briefFixture,
        metrics: [{ label: '<script>alert(1)</script>', value: '<img src=x>' }],
      } }),
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).toContain('read-only');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<button');

    const denied = renderToStaticMarkup(
      React.createElement(implementation.OperationsBriefApp, { state: 'denied' }),
    );
    expect(denied).toContain('Akses tidak dibenarkan');
  });
});
