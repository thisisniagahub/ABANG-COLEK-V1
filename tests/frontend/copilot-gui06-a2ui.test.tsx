import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const modulePath = '../../src/features/copilot/declarative/A2UIFixedRenderer';
const envelope = {
  schemaVersion: 'a2ui.v1',
  component: 'OperationsBriefCard',
  props: {
    title: 'Test-only brief',
    briefDate: '2026-10-19',
    metrics: [{ label: 'Test metric', value: '1' }],
  },
  provenance: {
    source: 'database',
    timestamp: '2026-10-19T12:00:00.000Z',
    revision: 4,
  },
};

describe('GUI-06 fixed-schema A2UI', () => {
  test('accepts fixed allowlisted envelopes and rejects unknown or oversized payloads', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    expect(implementation.parseA2UIFixedSchema(envelope).ok).toBe(true);
    expect(implementation.parseA2UIFixedSchema({
      ...envelope,
      component: 'ArbitraryHtml',
    })).toMatchObject({ ok: false, reason: 'unknown-component' });
    expect(implementation.parseA2UIFixedSchema({
      ...envelope,
      props: { title: 'x'.repeat(20_000) },
    })).toMatchObject({ ok: false, reason: 'oversized' });
    const tooDeep: Record<string, unknown> = {};
    let cursor = tooDeep;
    for (let depth = 0; depth < 9; depth += 1) {
      const next: Record<string, unknown> = {};
      cursor.nested = next;
      cursor = next;
    }
    cursor.value = true;
    expect(implementation.parseA2UIFixedSchema({
      ...envelope,
      props: tooDeep,
    })).toMatchObject({ ok: false, reason: 'malformed' });
  });

  test('renders fixed UI as inert display and never executes payload actions or financial claims', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const markup = renderToStaticMarkup(
      React.createElement(implementation.A2UIFixedRenderer, {
        payload: {
          ...envelope,
          actions: [{
            id: 'approve-refund',
            label: 'Approve refund',
            actionType: 'approve',
            payload: { amountSen: 2500 },
          }],
        },
      }),
    );
    expect(markup).toContain('Test-only brief');
    expect(markup).toContain('Test metric');
    expect(markup).not.toContain('<button');

    const refund = renderToStaticMarkup(
      React.createElement(implementation.A2UIFixedRenderer, {
        payload: {
          ...envelope,
          component: 'RefundImpactPanel',
          props: {
            issueClass: 'LEAKAGE',
            rootCause: 'UNDETERMINED',
            hitlRequired: true,
            estimatedImpactSen: 2500,
            sopAction: 'Review evidence',
          },
          actions: [{
            id: 'approve-refund',
            label: 'Approve refund',
            actionType: 'approve',
          }],
        },
      }),
    );
    expect(refund).toContain('canonical receipt');
    expect(refund).not.toContain('RM 25.00');
    expect(refund).not.toContain('2500');
    expect(refund).not.toContain('<button');
  });
});
