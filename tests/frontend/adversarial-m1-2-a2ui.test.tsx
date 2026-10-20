import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  A2UIFixedRenderer,
  parseA2UIFixedSchema,
} from '../../src/features/copilot/declarative/A2UIFixedRenderer';
import {
  parseMarginSimulationInput,
  SubmissionGate,
  MarginSimulatorForm,
} from '../../src/features/copilot/interactive/MarginSimulatorForm';

describe('Adversarial Verification Suite M1-2: Frontend A2UI & Forms (Challenger M1-2)', () => {
  // =========================================================================
  // FOCUS AREA 3: Frontend Component Smoke & Crash Resistance
  // =========================================================================
  describe('3. Frontend Component Crash Resistance on Malformed/Invalid Payloads', () => {
    describe('3.1 A2UIFixedRenderer Payload Parsing Fuzzing', () => {
      test('parseA2UIFixedSchema rejects null, primitive, or malformed inputs without throwing', () => {
        const toxicInputs = [
          null,
          undefined,
          '',
          12345,
          true,
          [],
          {},
          { schemaVersion: 'invalid' },
          { schemaVersion: 'a2ui.v1', component: 'ArbitraryXSSComponent' },
          {
            schemaVersion: 'a2ui.v1',
            component: 'MarginSimulator',
            props: null,
          },
          {
            schemaVersion: 'a2ui.v1',
            component: 'MarginSimulator',
            props: {},
            provenance: null,
          },
          {
            schemaVersion: 'a2ui.v1',
            component: 'MarginSimulator',
            props: {},
            provenance: { source: 'hacker_source', timestamp: 'invalid-date' },
          },
        ];

        for (const input of toxicInputs) {
          const res = parseA2UIFixedSchema(input);
          expect(res.ok).toBe(false);
          expect(['malformed', 'unknown-component', 'oversized']).toContain((res as any).reason);
        }
      });

      test('parseA2UIFixedSchema blocks prototype pollution attempts', () => {
        const polluted = JSON.parse('{"__proto__": {"injected": true}}');
        const res = parseA2UIFixedSchema(polluted);
        expect(res.ok).toBe(false);
      });

      test('parseA2UIFixedSchema rejects deep nesting (>8 levels)', () => {
        let nested: any = { value: 'leaf' };
        for (let i = 0; i < 15; i++) {
          nested = { child: nested };
        }
        const res = parseA2UIFixedSchema(nested);
        expect(res.ok).toBe(false);
        expect((res as any).reason).toBe('malformed');
      });

      test('parseA2UIFixedSchema rejects oversized payloads (>16KB)', () => {
        const largeString = 'A'.repeat(25000);
        const res = parseA2UIFixedSchema({
          schemaVersion: 'a2ui.v1',
          component: 'OperationsBriefCard',
          props: { title: largeString },
          provenance: { source: 'database', timestamp: new Date().toISOString() },
        });
        expect(res.ok).toBe(false);
        expect((res as any).reason).toBe('oversized');
      });
    });

    describe('3.2 A2UIFixedRenderer Static Rendering Resilience', () => {
      test('Renders fallback alert on completely invalid payloads without throwing unhandled exceptions', () => {
        const malformedPayloads = [
          null,
          undefined,
          'malformed string',
          {},
          { schemaVersion: 'a2ui.v999' },
          { schemaVersion: 'a2ui.v1', component: 'NonExistentMaliciousComponent' },
        ];

        for (const badPayload of malformedPayloads) {
          expect(() => {
            const html = renderToStaticMarkup(
              React.createElement(A2UIFixedRenderer, { payload: badPayload })
            );
            expect(html).toContain('role="alert"');
          }).not.toThrow();
        }
      });

      test('Renders OperationsBriefCard with corrupted or empty props safely', () => {
        const validEnvelope = {
          schemaVersion: 'a2ui.v1',
          component: 'OperationsBriefCard',
          props: { unexpectedExtraField: 999 }, // missing required fields
          provenance: { source: 'database', timestamp: new Date().toISOString() },
        };

        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(A2UIFixedRenderer, { payload: validEnvelope })
          );
          expect(typeof html).toBe('string');
        }).not.toThrow();
      });

      test('Renders RefundImpactPanel with invalid props safely', () => {
        const envelope = {
          schemaVersion: 'a2ui.v1',
          component: 'RefundImpactPanel',
          props: {
            issueClass: 'NON_EXISTENT_CLASS',
            rootCause: 'NON_EXISTENT_CAUSE',
            hitlRequired: false, // Invalid for panel
          },
          provenance: { source: 'local_authoritative', timestamp: new Date().toISOString() },
        };

        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(A2UIFixedRenderer, { payload: envelope })
          );
          expect(html).toContain('Refund impact');
        }).not.toThrow();
      });

      test('Renders JevAssessmentCard with corrupt props safely', () => {
        const envelope = {
          schemaVersion: 'a2ui.v1',
          component: 'JevAssessmentCard',
          props: {
            issueClass: 'CORRUPT',
            rootCause: 'CORRUPT',
          },
          provenance: { source: 'jev_local_rules', timestamp: new Date().toISOString() },
        };

        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(A2UIFixedRenderer, { payload: envelope })
          );
          expect(typeof html).toBe('string');
        }).not.toThrow();
      });

      test('Renders MarginSimulator with corrupt props safely', () => {
        const envelope = {
          schemaVersion: 'a2ui.v1',
          component: 'MarginSimulator',
          props: {
            contributionSen: 'not a number',
            status: 'INVALID_STATUS',
          },
          provenance: { source: 'canonical_evaluator', timestamp: new Date().toISOString() },
        };

        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(A2UIFixedRenderer, { payload: envelope })
          );
          expect(typeof html).toBe('string');
        }).not.toThrow();
      });

      test('Renders OrderTrackingBadge with invalid props safely', () => {
        const envelope = {
          schemaVersion: 'a2ui.v1',
          component: 'OrderTrackingBadge',
          props: {
            orderId: '',
            stage: 'invalid_stage',
          },
          provenance: { source: 'database', timestamp: new Date().toISOString() },
        };

        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(A2UIFixedRenderer, { payload: envelope })
          );
          expect(typeof html).toBe('string');
        }).not.toThrow();
      });

      test('Renders CommissionCard with corrupt summary safely', () => {
        const envelope = {
          schemaVersion: 'a2ui.v1',
          component: 'CommissionCard',
          props: {
            summary: { corrupt: true },
          },
          provenance: { source: 'database', timestamp: new Date().toISOString() },
        };

        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(A2UIFixedRenderer, { payload: envelope })
          );
          expect(typeof html).toBe('string');
        }).not.toThrow();
      });
    });

    describe('3.3 MarginSimulatorForm Input Parsing & Concurrency Resilience', () => {
      test('parseMarginSimulationInput rejects invalid sen inputs', () => {
        const badSenInputs = [
          '',
          '   ',
          '-100',
          '100.5',
          'abc',
          '<script>alert(1)</script>',
          '1e5',
          '0x10',
          '99999999999999999999999999999999999999', // Exceeds safe integer
        ];

        for (const bad of badSenInputs) {
          const res = parseMarginSimulationInput(bad, '10');
          expect(res.ok).toBe(false);
          if (!res.ok) {
            expect(res.field).toBe('inputSen');
          }
        }
      });

      test('parseMarginSimulationInput rejects invalid discount inputs', () => {
        const badDiscounts = [
          '',
          '   ',
          '-5',
          '101',
          '150',
          '10.123', // More than 2 decimal places
          'twenty percent',
          'NaN',
          'Infinity',
        ];

        for (const bad of badDiscounts) {
          const res = parseMarginSimulationInput('10000', bad);
          expect(res.ok).toBe(false);
          if (!res.ok) {
            expect(res.field).toBe('discountPct');
          }
        }
      });

      test('parseMarginSimulationInput accepts valid inputs and normalizes', () => {
        const res = parseMarginSimulationInput('10000', '15.5');
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.value.inputSen).toBe(10000);
          expect(res.value.discountPct).toBe(15.5);
        }
      });

      test('SubmissionGate prevents concurrent double-submissions', async () => {
        const gate = new SubmissionGate();
        let executionCount = 0;

        const slowTask = () =>
          new Promise<string>((resolve) => {
            setTimeout(() => {
              executionCount++;
              resolve('done');
            }, 50);
          });

        // Trigger two simultaneous submissions
        const promise1 = gate.run(slowTask);
        const promise2 = gate.run(slowTask);

        // First task gets a promise, second is blocked and returns null
        expect(promise1).not.toBeNull();
        expect(promise2).toBeNull();

        await promise1;
        expect(executionCount).toBe(1);

        // Gate unlocks after promise1 finishes
        const promise3 = gate.run(slowTask);
        expect(promise3).not.toBeNull();
        await promise3;
        expect(executionCount).toBe(2);
      });

      test('SubmissionGate unlocks even if operation throws an exception', async () => {
        const gate = new SubmissionGate();

        const failingTask = () => {
          throw new Error('Explosion');
        };

        const promise = gate.run(failingTask);
        expect(promise).not.toBeNull();

        await expect(promise).rejects.toThrow('Explosion');

        // Verify gate unlocked after error
        const nextPromise = gate.run(() => 'recovered');
        expect(nextPromise).not.toBeNull();
        const res = await nextPromise;
        expect(res).toBe('recovered');
      });

      test('MarginSimulatorForm renders to static HTML without crashing', () => {
        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(MarginSimulatorForm, {
              onSimulate: () => {},
            })
          );
          expect(html).toContain('<form');
          expect(html).toContain('inputSen');
          expect(html).toContain('discountPct');
        }).not.toThrow();
      });
    });
  });
});
