import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

const modulePath = '../../src/features/copilot/interactive/MarginSimulatorForm';

describe('GUI-02 interactive margin draft', () => {
  test('validates sen and percentage inputs and prevents duplicate submissions', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    expect(implementation.parseMarginSimulationInput('2800', '20.5')).toEqual({
      ok: true,
      value: { inputSen: 2800, discountPct: 20.5 },
    });
    expect(implementation.parseMarginSimulationInput('2.5', '20')).toMatchObject({
      ok: false,
      field: 'inputSen',
    });
    expect(implementation.parseMarginSimulationInput('2800', '100.01')).toMatchObject({
      ok: false,
      field: 'discountPct',
    });

    const gate = new implementation.SubmissionGate();
    let calls = 0;
    let finishFirst!: () => void;
    const first = gate.run(async () => {
      calls += 1;
      await new Promise<void>((resolve) => { finishFirst = resolve; });
      return 'callback-returned';
    });
    expect(first).not.toBeNull();
    if (!first) return;
    await Promise.resolve();
    const duplicate = gate.run(async () => {
      calls += 1;
      return 'duplicate';
    });

    expect(duplicate).toBeNull();
    expect(calls).toBe(1);
    finishFirst();
    expect(await first).toBe('callback-returned');
    const next = gate.run(async () => 'next draft');
    expect(next).not.toBeNull();
    if (next) expect(await next).toBe('next draft');
  });

  test('renders a keyboard-usable draft form and never claims a simulation result', async () => {
    const implementation = await import(modulePath).catch(() => null);
    expect(implementation).not.toBeNull();
    if (!implementation) return;

    const markup = renderToStaticMarkup(
      React.createElement(implementation.MarginSimulatorForm, {
        onSimulate: () => undefined,
        onCancel: () => undefined,
      }),
    );
    expect(markup).toContain('name="inputSen"');
    expect(markup).toContain('name="discountPct"');
    expect(markup).toContain('Cancel');
    expect(markup).not.toContain('PASSED');
    expect(markup).not.toContain('simulation completed');
  });
});
