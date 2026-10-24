import { expect, test } from 'bun:test';

const adapters = await import(
  '../../src/features/copilot/components/frontendToolAdapters'
).catch(() => null);

test('frontend tool adapter rejects unknown actions and arbitrary routes', async () => {
  expect(typeof adapters?.createFrontendToolAdapter).toBe('function');
  if (!adapters) return;

  const calls: string[] = [];
  const adapter = adapters.createFrontendToolAdapter({
    capabilities: ['navigate'],
    handlers: {
      navigate: (route: string) => calls.push(route),
    },
  });

  expect(
    await adapter.dispatch({
      eventId: 'evt-1',
      action: { type: 'navigate', route: 'https://attacker.example' },
    }),
  ).toEqual({ status: 'invalid' });
  expect(
    await adapter.dispatch({
      eventId: 'evt-2',
      action: { type: 'execute', code: 'alert(1)' },
    }),
  ).toEqual({ status: 'invalid' });
  expect(calls).toEqual([]);
});

test('frontend tool adapter checks server-granted capability before calling handlers', async () => {
  expect(typeof adapters?.createFrontendToolAdapter).toBe('function');
  if (!adapters) return;

  let selected = '';
  const adapter = adapters.createFrontendToolAdapter({
    capabilities: [],
    handlers: {
      selectRecord: (recordId: string) => {
        selected = recordId;
      },
    },
  });

  expect(
    await adapter.dispatch({
      eventId: 'evt-3',
      action: { type: 'select_record', recordType: 'order', recordId: 'order-8' },
    }),
  ).toEqual({ status: 'denied' });
  expect(selected).toBe('');
});

test('replayed frontend tool events never execute a handler twice', async () => {
  expect(typeof adapters?.createFrontendToolAdapter).toBe('function');
  if (!adapters) return;

  const calls: string[] = [];
  const adapter = adapters.createFrontendToolAdapter({
    capabilities: ['set_filter'],
    handlers: {
      setFilter: (filter: string, value: string) => calls.push(`${filter}:${value}`),
    },
  });
  const event = {
    eventId: 'evt-4',
    action: { type: 'set_filter', filter: 'orders.status', value: 'packing' },
  };

  expect(await adapter.dispatch(event)).toEqual({ status: 'handled' });
  expect(await adapter.dispatch(event)).toEqual({ status: 'duplicate' });
  expect(calls).toEqual(['orders.status:packing']);
});

test('CPK-07: live agent run round-trip invokes allowlisted frontend tool adapter end-to-end', async () => {
  expect(typeof adapters?.runAgentFrontendToolRoundTrip).toBe('function');
  if (!adapters) return;

  const executed: string[] = [];
  const adapter = adapters.createFrontendToolAdapter({
    capabilities: ['navigate', 'select_record', 'set_filter', 'fill_draft', 'request_decision'],
    handlers: {
      navigate: (route) => {
        executed.push(`navigate:${route}`);
      },
      selectRecord: (recordType, recordId) => {
        executed.push(`select:${recordType}:${recordId}`);
      },
      setFilter: (filter, value) => {
        executed.push(`filter:${filter}:${value}`);
      },
      fillDraft: (draftType, field, value) => {
        executed.push(`draft:${draftType}:${field}:${value}`);
      },
      requestDecision: (proposalId) => {
        executed.push(`decision:${proposalId}`);
      },
    },
  });

  const roundTrip = await adapters.runAgentFrontendToolRoundTrip({
    adapter,
    invokeAgentRun: async () => ({
      runId: 'run-live-cpk07',
      events: [
        {
          type: 'TOOL_CALL_RESULT',
          result: {
            frontendActions: [
              { eventId: 'evt-rt-1', action: { type: 'navigate', route: 'orders' } },
              { eventId: 'evt-rt-2', action: { type: 'select_record', recordType: 'order', recordId: 'ORD-88' } },
              { eventId: 'evt-rt-3', action: { type: 'fill_draft', draftType: 'refund', field: 'amountSen', value: 1500 } },
              { eventId: 'evt-rt-1', action: { type: 'navigate', route: 'orders' } },
              { eventId: 'evt-rt-bad', action: { type: 'navigate', route: 'https://evil.example' } },
            ],
          },
        },
      ],
    }),
  });

  expect(roundTrip.runId).toBe('run-live-cpk07');
  expect(roundTrip.results).toEqual([
    { eventId: 'evt-rt-1', outcome: { status: 'handled' } },
    { eventId: 'evt-rt-2', outcome: { status: 'handled' } },
    { eventId: 'evt-rt-3', outcome: { status: 'handled' } },
    { eventId: 'evt-rt-1', outcome: { status: 'duplicate' } },
    { eventId: 'evt-rt-bad', outcome: { status: 'invalid' } },
  ]);
  expect(executed).toEqual([
    'navigate:orders',
    'select:order:ORD-88',
    'draft:refund:amountSen:1500',
  ]);
});
