/**
 * CPK-10 / GUI-01 — the Copilot runtime speaks the OFFICIAL AG-UI protocol.
 *
 * The wire contract is defined by `src/features/copilot/agui/aguiClient.ts`
 * (see its header, lines 1-41) and by `src/features/copilot/agui/aguiEvents.ts`:
 *
 *  - The transport is `text/event-stream`.
 *  - The event type lives INSIDE the JSON payload of a `data:` frame
 *    (`{"type":"RUN_STARTED"}`), because that is what the official
 *    `@ag-ui/core` encoder writes. The legacy project-local protocol
 *    (`event: start` / `event: text_delta` / `event: done`) is NOT accepted.
 *  - The legacy JSON-answer fallback (`eventsFromJsonAnswer`) was REMOVED, so
 *    a `application/json` answer can never be mistaken for a completed answer.
 *
 * The internal lifecycle events the client emits are unchanged:
 * `start` / `text_delta` / `done` / `error`.
 *
 * Every assertion in this file is executed — the previous revision of this
 * file failed at module load (it imported a deleted export), so NONE of its
 * assertions had ever run. Each one below was re-derived from the current
 * source before being kept.
 */

import { expect, test } from 'bun:test';
import {
  AGUI_EVENT_NAMES,
  parseAguiEvent,
  parseSseFrame,
  type AguiEvent,
} from '../../src/features/copilot/agui/aguiEvents';
import * as aguiClientModule from '../../src/features/copilot/agui/aguiClient';
import {
  AGUI_OFFICIAL_EVENT_NAMES,
  COPILOT_AGUI_RUN_ENDPOINT,
  streamCopilotRun,
} from '../../src/features/copilot/agui/aguiClient';
import {
  initialAguiRunState,
  reduceAguiEvent,
  runToolStatus,
} from '../../src/features/copilot/agui/aguiRunState';
import {
  buildScopedStateProjection,
  isDisallowedStateKey,
} from '../../src/features/copilot/state-rendering/scopedStateProjection';
import {
  toolStateFromDispatch,
  toolStatusFromDispatch,
} from '../../src/features/copilot/tool-rendering/toolExecutionState';

/** Builds a `text/event-stream` response from raw SSE frames. */
function sseResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}

/** Drains one run into the list of events the client actually emitted. */
async function collect(
  request: Parameters<typeof streamCopilotRun>[0],
): Promise<AguiEvent[]> {
  const events: AguiEvent[] = [];
  for await (const event of streamCopilotRun(request)) events.push(event);
  return events;
}

/** The message of an error event, or `''` when the event is not an error. */
function errorMessage(event: AguiEvent | undefined): string {
  return event?.type === 'error' ? event.message : '';
}

test('AG-UI parser accepts only the event names the runtime actually emits', () => {
  expect([...AGUI_EVENT_NAMES]).toEqual([
    'start',
    'text_delta',
    'a2ui',
    'gen_ui',
    'hitl_prompt',
    'done',
    'error',
  ]);

  expect(parseAguiEvent('start', JSON.stringify({
    activeProvider: 'gemini_free',
    model: 'gemini-3.6-flash',
    runtime: 'v2',
    schemaVersion: 'a2ui.v1',
  }))).toEqual({
    type: 'start',
    providerId: 'gemini_free',
    model: 'gemini-3.6-flash',
    runtime: 'v2',
    schemaVersion: 'a2ui.v1',
  });

  expect(parseAguiEvent('text_delta', JSON.stringify({ content: ' operative' })))
    .toEqual({ type: 'text_delta', content: 'operative' });

  expect(parseAguiEvent('unknown_event', JSON.stringify({ content: 'x' }))).toBeNull();
  expect(parseAguiEvent('text_delta', 'not-json')).toBeNull();
  expect(parseAguiEvent('text_delta', JSON.stringify({ content: 42 }))).toBeNull();
});

test('AG-UI parser keeps the real A2UI and HITL payloads for the fixed renderers', () => {
  const a2ui = {
    schemaVersion: 'a2ui.v1',
    component: 'OperationsBriefCard',
    componentName: 'OperationsBriefCard',
    props: { title: 'Taklimat', briefDate: '2026-10-19', metrics: [] },
    provenance: { source: 'local_authoritative', timestamp: '2026-10-19T12:00:00.000Z', revision: 1 },
  };
  const event = parseAguiEvent('a2ui', JSON.stringify(a2ui));
  expect(event?.type).toBe('a2ui');
  expect(event?.type === 'a2ui' ? event.payload : null).toEqual(a2ui);

  const hitl = {
    id: 'hitl-1',
    actionType: 'refund',
    entity: { type: 'order', id: 'ord-1' },
    amountSen: 2500,
    revision: 1,
    reason: 'Aduan kualiti',
    expiry: '2026-10-21T00:00:00.000Z',
    status: 'pending_approval',
    description: 'Permintaan ganti rugi',
    payload: {},
    createdAt: '2026-10-20T00:00:00.000Z',
  };
  const hitlEvent = parseAguiEvent('hitl_prompt', JSON.stringify(hitl));
  expect(hitlEvent?.type).toBe('hitl_prompt');
  expect(hitlEvent?.type === 'hitl_prompt' ? hitlEvent.payload : null).toEqual(hitl);
});

test('SSE frame parsing follows the runtime framing', () => {
  expect(parseSseFrame('event: start\ndata: {"activeProvider":"local_rules"}')).toEqual({
    name: 'start',
    data: '{"activeProvider":"local_rules"}',
  });
  expect(parseSseFrame(': keep-alive\n\n')).toBeNull();
  expect(parseSseFrame('data: {"a":1}')).toBeNull();
});

test('run state follows the server lifecycle and never invents a provider', () => {
  let state = initialAguiRunState;
  expect(runToolStatus(state).state).toBe('queued');
  expect(state.providerId).toBeUndefined();

  state = reduceAguiEvent(state, {
    type: 'start',
    providerId: 'gemini_free',
    model: 'gemini-3.6-flash',
  });
  expect(state.status).toBe('running');
  expect(runToolStatus(state).state).toBe('running');

  state = reduceAguiEvent(state, { type: 'text_delta', content: 'Hello' });
  state = reduceAguiEvent(state, { type: 'text_delta', content: ' world' });
  expect(state.text).toBe('Hello world');

  state = reduceAguiEvent(state, {
    type: 'done',
    reply: 'Hello world',
    providerUsed: 'gemini_free',
    modelUsed: 'gemini-3.6-flash',
    payload: { reply: 'Hello world' },
  });
  expect(state.status).toBe('completed');
  expect(runToolStatus(state).state).toBe('succeeded');
  expect(state.providerId).toBe('gemini_free');

  const failed = reduceAguiEvent(initialAguiRunState, {
    type: 'error',
    message: 'Model awan tidak tersedia',
  });
  expect(failed.status).toBe('failed');
  expect(runToolStatus(failed).state).toBe('failed');
  expect(failed.providerId).toBeUndefined();
});

test('the AG-UI client no longer exports the retired JSON-answer fallback', () => {
  // `eventsFromJsonAnswer` was DELETED (aguiClient.ts:20-21). A named import of
  // it is a module-load SyntaxError, so the contract is asserted through the
  // module namespace instead.
  expect('eventsFromJsonAnswer' in aguiClientModule).toBe(false);
  expect(Object.keys(aguiClientModule)).not.toContain('eventsFromJsonAnswer');
  expect(typeof (aguiClientModule as Record<string, unknown>).eventsFromJsonAnswer).toBe('undefined');
});

test('the client publishes the official AG-UI event names it accepts', () => {
  expect([...AGUI_OFFICIAL_EVENT_NAMES]).toEqual([
    'RUN_STARTED',
    'TEXT_MESSAGE_START',
    'TEXT_MESSAGE_CONTENT',
    'TEXT_MESSAGE_END',
    'RUN_FINISHED',
    'RUN_ERROR',
  ]);
  expect(COPILOT_AGUI_RUN_ENDPOINT).toBe('/api/copilotkit/agent/abangcolek_ops/run');
});

test('official AG-UI SSE framing is accepted and translated to the internal lifecycle', async () => {
  const events = await collect({
    message: 'Hai',
    threadId: 'thread-1',
    runId: 'run-1',
    fetchImpl: (async () => sseResponse([
      'data: {"type":"RUN_STARTED","threadId":"thread-1","runId":"run-1"}\n\n',
      'data: {"type":"TEXT_MESSAGE_START","messageId":"m1"}\n\n',
      'data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m1","delta":"Hai"}\n\n',
      'data: {"type":"TEXT_MESSAGE_END","messageId":"m1"}\n\n',
      'data: {"type":"RUN_FINISHED","result":{"status":"completed","providerId":"gemini_free","model":"gemini-3.6-flash"}}\n\n',
    ])) as unknown as typeof fetch,
  });

  expect(events.map((event) => event.type)).toEqual(['start', 'text_delta', 'done']);
  expect(events[1]?.type === 'text_delta' ? events[1].content : '').toBe('Hai');
  expect(events[2]).toMatchObject({
    type: 'done',
    reply: 'Hai',
    providerUsed: 'gemini_free',
    modelUsed: 'gemini-3.6-flash',
  });
});

test('the legacy `event:` framing is rejected and never becomes an answer', async () => {
  const events = await collect({
    message: 'Hai',
    threadId: 'thread-1',
    runId: 'run-1',
    fetchImpl: (async () => sseResponse([
      'event: start\ndata: {"activeProvider":"gemini_free","model":"gemini-3.6-flash"}\n\n',
      'event: text_delta\ndata: {"content":"Hai"}\n\n',
      'event: done\ndata: {"reply":"Hai"}\n\n',
    ])) as unknown as typeof fetch,
  });

  // The retired protocol yields no lifecycle event at all, so the run ends
  // without a terminal frame and fails closed (aguiClient.ts:306-311).
  expect(events.map((event) => event.type)).toEqual(['error']);
  expect(errorMessage(events[0])).toContain('tanpa peristiwa penutup');
});

test('a JSON answer is refused — it is never rendered as a completed answer', async () => {
  const events = await collect({
    message: 'Hai',
    threadId: 'thread-1',
    runId: 'run-1',
    fetchImpl: (async () => new Response(
      JSON.stringify({ ok: true, data: { reply: 'Taklimat hari ini' } }),
      { headers: { 'Content-Type': 'application/json' } },
    )) as unknown as typeof fetch,
  });

  expect(events.map((event) => event.type)).toEqual(['error']);
  expect(errorMessage(events[0])).toContain('text/event-stream');
});

test('RUN_ERROR fails the run and a following RUN_FINISHED cannot resurrect it', async () => {
  const events = await collect({
    message: 'Hai',
    threadId: 'thread-1',
    runId: 'run-1',
    fetchImpl: (async () => sseResponse([
      'data: {"type":"RUN_STARTED"}\n\n',
      'data: {"type":"RUN_ERROR","message":"Model awan tidak tersedia."}\n\n',
      'data: {"type":"RUN_FINISHED","result":{"status":"completed"}}\n\n',
    ])) as unknown as typeof fetch,
  });

  // `RUN_STARTED` still opens the run; the `RUN_ERROR` then fails it and the
  // trailing `RUN_FINISHED` is ignored (aguiClient.ts:187-198).
  expect(events.map((event) => event.type)).toEqual(['start', 'error']);
  expect(errorMessage(events[1])).toBe('Model awan tidak tersedia.');
});

test('an empty RUN_FINISHED fails the run — an empty response is not an answer', async () => {
  const events = await collect({
    message: 'Hai',
    threadId: 'thread-1',
    runId: 'run-1',
    fetchImpl: (async () => sseResponse([
      'data: {"type":"RUN_STARTED"}\n\n',
      'data: {"type":"RUN_FINISHED","result":{"status":"completed"}}\n\n',
    ])) as unknown as typeof fetch,
  });

  expect(events.map((event) => event.type)).toEqual(['start', 'error']);
  expect(errorMessage(events[1])).toContain('tidak mengembalikan sebarang jawapan');
});

test('a run without threadId / runId fails closed and never reaches the network', async () => {
  let called = 0;
  const fetchImpl = (async () => {
    called += 1;
    return sseResponse(['data: {"type":"RUN_FINISHED"}\n\n']);
  }) as unknown as typeof fetch;

  const events = await collect({ message: 'Hai', fetchImpl });

  expect(called).toBe(0);
  expect(events.map((event) => event.type)).toEqual(['error']);
  expect(errorMessage(events[0])).toContain('threadId dan runId');
});

test('the streaming client posts the official AG-UI run request', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return sseResponse([
      'data: {"type":"RUN_STARTED"}\n\n',
      'data: {"type":"TEXT_MESSAGE_CONTENT","delta":"Hai"}\n\n',
      'data: {"type":"RUN_FINISHED","result":{"status":"completed"}}\n\n',
    ]);
  }) as unknown as typeof fetch;

  const events = await collect({
    message: 'Hai',
    history: [{ role: 'user', content: 'Hai' }],
    threadId: 'thread-1',
    runId: 'run-1',
    csrfToken: 'csrf-value',
    fetchImpl,
  });

  expect(events.map((event) => event.type)).toEqual(['start', 'text_delta', 'done']);
  expect(calls[0].url).toBe('/api/copilotkit/agent/abangcolek_ops/run');
  expect(calls[0].init?.method).toBe('POST');
  const headers = calls[0].init?.headers as Record<string, string>;
  expect(headers.Accept).toBe('text/event-stream');
  expect(headers['X-CSRF-Token']).toBe('csrf-value');
  const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
  expect(body.threadId).toBe('thread-1');
  expect(body.runId).toBe('run-1');
  expect(body.messages).toEqual([
    { id: 'msg_hist_0', role: 'user', content: 'Hai' },
    { id: 'msg_user_1', role: 'user', content: 'Hai' },
  ]);
});

test('scoped state projection drops authority fields and keeps the safe schema', () => {
  const scope = { workspaceId: 'workspace-a', userId: 'user-a', threadId: 'thread-a' };
  const projection = buildScopedStateProjection(scope, {
    selectedOrderId: 'order-17',
    filters: { status: 'packing', role: 'founder', paid: true, price: 999 },
    draft: { note: 'Call before delivery', approvalGranted: true },
    workflowProgress: { label: 'Order review', currentStep: 2, totalSteps: 4 },
  }, '2026-10-20T00:00:00.000Z');

  expect(projection.schemaVersion).toBe('scoped_state.v1');
  expect(projection.scope).toEqual(scope);
  expect(projection.filters).toEqual({ status: 'packing' });
  expect(projection.draft).toEqual({ note: 'Call before delivery' });
  expect(projection.workflowProgress).toEqual({
    label: 'Order review',
    currentStep: 2,
    totalSteps: 4,
  });
  expect(isDisallowedStateKey('refundApprover')).toBe(true);
  expect(isDisallowedStateKey('packing')).toBe(false);
});

test('tool status never reports a refused dispatch as succeeded', () => {
  expect(toolStateFromDispatch({ ok: true, result: { receiptId: 'r-1' } })).toBe('succeeded');
  expect(toolStateFromDispatch({
    ok: false,
    code: 'TOOL_BUDGET_EXCEEDED',
    message: 'Had alatan telah dicapai.',
  })).toBe('failed');
  expect(toolStateFromDispatch(undefined)).toBe('unknown');
  expect(toolStatusFromDispatch('preview_refund', { ok: true, result: {} }, 'exec-9')).toEqual({
    executionId: 'exec-9',
    toolName: 'preview_refund',
    state: 'succeeded',
  });
});
