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
