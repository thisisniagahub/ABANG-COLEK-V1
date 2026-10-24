/**
 * ABANGCOLEK-PLATFORM — Python ADK Bridge & Candidate Resilience Tests (Writer B)
 *
 * Semua ujian ini menggunakan transport suntikan yang DETERMINISTIK — tiada
 * ujian bergantung pada kuota live atau perkhidmatan yang sedang berjalan.
 *
 * The AG-UI transcript below was captured from the REAL Python service
 * (`agents/google-adk/.venv/Scripts/python.exe agents/google-adk/app.py`,
 * google.adk 2.12.0, bound to 127.0.0.1:8030) with:
 *
 *   POST /agent/abangcolek_ops/stream
 *   {"message": "Semak katalogAlignment dan status stok"}
 *
 * Only the absolute `databasePath` inside the tool result was redacted
 * (`<redacted>`); every event name, id, tool call and text is verbatim.
 */

import { describe, expect, test } from 'bun:test';
import { AdkBridgeClient } from '../../server/agents/adk-bridge/client';
import { parseSseFrames, summariseAguiEvents } from '../../server/agents/adk-bridge/agui';
import {
  CopilotV2Runtime,
  createChildBudget,
  resolveSpecialistDelegation,
  syncChildBudgetToParent,
} from '../../server/agents/copilot/runtime';
import {
  FreeModelRouter,
  assertFreeModelOnly,
  createBudget,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../server/agents/providers/model-router';
import {
  ModelAdapterError,
  type ModelAdapter,
  type ModelAdapterRegistry,
  type ModelCallOutcome,
  type ModelCallRequest,
  type ModelTransportKind,
} from '../../server/agents/providers/model-adapters';
import type { Actor } from '../../shared/platform-contracts';
import type { FreeModelCandidate } from '../../shared/copilot-contracts';

const VERIFIED_ACTOR: Actor = {
  userId: 'founder-01',
  workspaceId: 'ws-main',
  membershipVersion: 1,
};

/** Transcript AG-UI sebenar (ditangkap daripada perkhidmatan Python). */
const REAL_AGUI_TRANSCRIPT = `event: RUN_STARTED
data: {"type": "RUN_STARTED", "thread_id": "thread-f649d4599efa465da79be85d206ff559", "run_id": "run-442ea7a2456740af9b1dc5ae09c0319e"}

event: TOOL_CALL_START
data: {"type": "TOOL_CALL_START", "tool_call_id": "abangcolek_ops-fc", "tool_call_name": "transfer_to_agent"}

event: TOOL_CALL_ARGS
data: {"type": "TOOL_CALL_ARGS", "tool_call_id": "abangcolek_ops-fc", "delta": "{\\"agent_name\\":\\"commerce_reader\\"}"}

event: TOOL_CALL_END
data: {"type": "TOOL_CALL_END", "tool_call_id": "abangcolek_ops-fc"}

event: TOOL_CALL_RESULT
data: {"type": "TOOL_CALL_RESULT", "message_id": "a80b3047-67b3-4db1-8fff-0aa8a9ce0b67", "tool_call_id": "abangcolek_ops-fc", "content": "{\\"result\\": null}"}

event: TOOL_CALL_START
data: {"type": "TOOL_CALL_START", "tool_call_id": "commerce_reader-fc", "tool_call_name": "read_published_catalogue"}

event: TOOL_CALL_ARGS
data: {"type": "TOOL_CALL_ARGS", "tool_call_id": "commerce_reader-fc", "delta": "{\\"query\\":\\"Semak katalogAlignment dan status stok\\"}"}

event: TOOL_CALL_END
data: {"type": "TOOL_CALL_END", "tool_call_id": "commerce_reader-fc"}

event: TOOL_CALL_RESULT
data: {"type": "TOOL_CALL_RESULT", "message_id": "e938c5e9-e427-4c8e-95ff-b5ff32d79ed8", "tool_call_id": "commerce_reader-fc", "content": "{\\"available\\": true, \\"storeAvailable\\": true, \\"reasonCode\\": \\"CATALOGUE_EMPTY\\", \\"detail\\": \\"Tiada produk berstatus 'published' dalam katalog semasa.\\", \\"summary\\": \\"Tiada produk berstatus 'published' dalam katalog semasa (catalogue version 0).\\", \\"publishedProducts\\": 0, \\"catalogueVersion\\": 0, \\"products\\": [], \\"databasePath\\": \\"<redacted>\\", \\"readAt\\": \\"2026-10-20T13:18:50.302Z\\", \\"query\\": \\"Semak katalogAlignment dan status stok\\"}"}

event: TEXT_MESSAGE_START
data: {"type": "TEXT_MESSAGE_START", "message_id": "9cfb9382-c806-42bb-b392-7e586a036d9d", "role": "assistant"}

event: TEXT_MESSAGE_CONTENT
data: {"type": "TEXT_MESSAGE_CONTENT", "message_id": "9cfb9382-c806-42bb-b392-7e586a036d9d", "delta": "Tiada produk berstatus 'published' dalam katalog semasa (catalogue version 0)."}

event: TEXT_MESSAGE_END
data: {"type": "TEXT_MESSAGE_END", "message_id": "9cfb9382-c806-42bb-b392-7e586a036d9d"}

event: STATE_SNAPSHOT
data: {"type": "STATE_SNAPSHOT", "snapshot": {"agent": "abangcolek_ops", "delegatedAgent": "commerce_reader", "result": {"available": true, "storeAvailable": true, "reasonCode": "CATALOGUE_EMPTY", "detail": "Tiada produk berstatus 'published' dalam katalog semasa.", "summary": "Tiada produk berstatus 'published' dalam katalog semasa (catalogue version 0).", "publishedProducts": 0, "catalogueVersion": 0, "products": [], "databasePath": "<redacted>", "readAt": "2026-10-20T13:18:50.302Z", "query": "Semak katalogAlignment dan status stok"}}}

event: RUN_FINISHED
data: {"type": "RUN_FINISHED", "thread_id": "thread-f649d4599efa465da79be85d206ff559", "run_id": "run-442ea7a2456740af9b1dc5ae09c0319e", "result": {"agent": "abangcolek_ops", "delegatedAgent": "commerce_reader", "emittedAt": "2026-10-20T13:18:50.351Z"}}
`;

/** Payload `/health` sebenar daripada perkhidmatan Python. */
const REAL_HEALTH = {
  status: 'ok',
  service: 'abangcolek-google-adk-agent-service',
  version: '2.3.0',
  port: 8030,
  host: '127.0.0.1',
  runtime: 'google-adk',
  runtimeAvailable: true,
  runtimeDetails: {
    available: true,
    version: '2.12.0',
    modulePath: 'D:\\ABANGCOLEK-PLATFORM\\agents\\google-adk\\.venv\\Lib\\site-packages\\google\\adk\\__init__.py',
    importError: null,
    pythonVersion: '3.12.13',
    fastapiVersion: '0.141.1',
  },
  model: {
    kind: 'local_policy',
    provider: 'local',
    model: 'abangcolek-policy-v1',
    credentialsConfigured: true,
    credentialSource: 'GEMINI_API_KEY',
    live: false,
    reason: 'Tiada model hos dikonfigurasi; model dasar deterministik tempatan digunakan.',
  },
  specialists: ['commerce_reader', 'qc_jev_reviewer', 'marketing_drafter'],
  agents: ['abangcolek_ops', 'commerce_reader', 'qc_jev_reviewer', 'marketing_drafter'],
  aguiEvents: [
    'RUN_STARTED',
    'TOOL_CALL_START',
    'TOOL_CALL_ARGS',
    'TOOL_CALL_END',
    'TOOL_CALL_RESULT',
    'TEXT_MESSAGE_START',
    'TEXT_MESSAGE_CONTENT',
    'TEXT_MESSAGE_END',
    'STATE_SNAPSHOT',
    'STATE_DELTA',
    'RUN_FINISHED',
    'RUN_ERROR',
  ],
  schemaVersion: 'a2ui.v1',
  zeroPaidSpend: true,
  persistence: 'read_only',
  checkedAt: '2026-10-20T13:18:48.764Z',
};

// ---------------------------------------------------------------------------
// Pembantu ujian
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

function recordingFetch(
  handler: (call: FetchCall) => Response | Promise<Response>
): { fetchFn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: FetchCall = {
      url: typeof input === 'string' ? input : input.toString(),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

interface MockAdapterOptions {
  candidate: FreeModelCandidate;
  content?: string;
  error?: ModelAdapterError;
  configured?: boolean;
}

class MockAdapter implements ModelAdapter {
  readonly candidate: FreeModelCandidate;
  readonly transport: ModelTransportKind = 'mock';
  readonly calls: ModelCallRequest[] = [];
  private readonly content: string;
  private readonly error?: ModelAdapterError;
  private readonly configured: boolean;

  constructor(options: MockAdapterOptions) {
    this.candidate = options.candidate;
    this.content = options.content ?? 'Jawapan mock';
    this.error = options.error;
    this.configured = options.configured ?? true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  credentialSource(): string {
    return 'MOCK_ONLY';
  }

  async call(request: ModelCallRequest): Promise<ModelCallOutcome> {
    this.calls.push(request);
    if (this.error) throw this.error;
    return { content: this.content, inputTokens: 100, outputTokens: 30, model: this.candidate.model };
  }
}

function mockRegistry(adapters: MockAdapter[]): ModelAdapterRegistry {
  return {
    get(candidate: FreeModelCandidate): ModelAdapter | undefined {
      return adapters.find(
        adapter =>
          adapter.candidate.providerId === candidate.providerId && adapter.candidate.model === candidate.model
      );
    },
    list(): ModelAdapter[] {
      return [...adapters];
    },
  };
}

function adaptersFor(overrides: Record<string, Partial<MockAdapterOptions>> = {}): MockAdapter[] {
  return STRICT_FREE_CANDIDATE_SEQUENCE.map(candidate =>
    new MockAdapter({ candidate, ...(overrides[candidate.model] ?? {}) })
  );
}

function chatRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/copilotkit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Jambatan ADK
// ---------------------------------------------------------------------------

describe('Python ADK bridge — AG-UI event parsing', () => {
  test('M解析 transcript AG-UI sebenar daripada perkhidmatan Python', () => {
    const events = parseSseFrames(REAL_AGUI_TRANSCRIPT);
    expect(events).toHaveLength(14);
    expect(events.map(event => event.type)).toEqual([
      'RUN_STARTED',
      'TOOL_CALL_START',
      'TOOL_CALL_ARGS',
      'TOOL_CALL_END',
      'TOOL_CALL_RESULT',
      'TOOL_CALL_START',
      'TOOL_CALL_ARGS',
      'TOOL_CALL_END',
      'TOOL_CALL_RESULT',
      'TEXT_MESSAGE_START',
      'TEXT_MESSAGE_CONTENT',
      'TEXT_MESSAGE_END',
      'STATE_SNAPSHOT',
      'RUN_FINISHED',
    ]);

    const summary = summariseAguiEvents(events);
    expect(summary.text).toBe(
      "Tiada produk berstatus 'published' dalam katalog semasa (catalogue version 0)."
    );
    expect(summary.finished).toBe(true);
    expect(summary.runId).toBe('run-442ea7a2456740af9b1dc5ae09c0319e');
    expect(summary.threadId).toBe('thread-f649d4599efa465da79be85d206ff559');
    expect(summary.error).toBeUndefined();

    expect(summary.toolCalls).toHaveLength(2);
    expect(summary.toolCalls[0].name).toBe('transfer_to_agent');
    expect(summary.toolCalls[0].args).toEqual({ agent_name: 'commerce_reader' });
    expect(summary.toolCalls[0].hasResult).toBe(true);
    expect(summary.toolCalls[1].name).toBe('read_published_catalogue');
    expect(summary.toolCalls[1].args).toEqual({ query: 'Semak katalogAlignment dan status stok' });
    expect(String(summary.toolCalls[1].result)).toContain('CATALOGUE_EMPTY');

    expect(summary.stateSnapshot?.agent).toBe('abangcolek_ops');
    expect(summary.stateSnapshot?.delegatedAgent).toBe('commerce_reader');
  });

  test('Bridge memanggil /health lalu /agent/abangcolek_ops/stream', async () => {
    const { fetchFn, calls } = recordingFetch(call => {
      if (call.url.endsWith('/health')) return jsonResponse(REAL_HEALTH);
      return sseResponse(REAL_AGUI_TRANSCRIPT);
    });
    const bridge = new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn });

    const outcome = await bridge.run({ message: 'Semak katalogAlignment dan status stok' });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.reply).toBe(
      "Tiada produk berstatus 'published' dalam katalog semasa (catalogue version 0)."
    );
    expect(calls[0].url).toBe('http://127.0.0.1:8030/health');
    expect(calls[1].url).toBe('http://127.0.0.1:8030/agent/abangcolek_ops/stream');
    expect(calls[1].method).toBe('POST');
  });

  test('Health payload perkhidmatan ialah sumber kebenaran (runtimeAvailable, model.live)', async () => {
    const { fetchFn } = recordingFetch(call => {
      if (call.url.endsWith('/health')) return jsonResponse(REAL_HEALTH);
      return sseResponse(REAL_AGUI_TRANSCRIPT);
    });
    const bridge = new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn });

    const outcome = await bridge.run({ message: 'Semak katalog' });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error('expected ok');
    // Perkhidmatan melaporkan model.live=false — jambatan mestialleyLikewise.
    expect(outcome.modelLive).toBe(false);
    expect(outcome.modelLabel).toBe('adk-local_policy');
    expect(outcome.health?.runtimeAvailable).toBe(true);
    expect(outcome.health?.runtimeDetails?.version).toBe('2.12.0');
  });

  test('Bridge tidak dikonfigurasikan → ADK_BRIDGE_NOT_CONFIGURED', async () => {
    const bridge = new AdkBridgeClient({ baseUrl: '', env: {} });
    const outcome = await bridge.run({ message: 'Hello' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('expected failure');
    expect(outcome.error.reason).toBe('ADK_BRIDGE_NOT_CONFIGURED');
  });

  test('Bridge hanya membenarkan host loopback (server-to-server)', async () => {
    const bridge = new AdkBridgeClient({ baseUrl: 'https://adk.example.com' });
    expect(bridge.configuration().configured).toBe(false);
    expect(bridge.configuration().reason).toBe('ADK_BRIDGE_HOST_NOT_ALLOWED');
  });

  test('Bridge tidak boleh dihubungi → ADK_BRIDGE_UNAVAILABLE, tiada jawapan direka', async () => {
    const { fetchFn } = recordingFetch(() => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8030');
    });
    const bridge = new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn });
    const outcome = await bridge.run({ message: 'Hello' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('expected failure');
    expect(outcome.error.reason).toBe('ADK_BRIDGE_UNAVAILABLE');
  });

  test('Runtime ADK men angrily available → unavailable dengan sebab eksplisit', async () => {
    const { fetchFn } = recordingFetch(() => jsonResponse({ ...REAL_HEALTH, runtimeAvailable: false }, 200));
    const bridge = new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn });
    const outcome = await bridge.run({ message: 'Hello' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('expected failure');
    expect(outcome.error.reason).toBe('ADK_BRIDGE_RUNTIME_UNAVAILABLE');
  });
});

describe('Python ADK bridge — keselamatan identiti', () => {
  test('Bridge tidak pernah menghantar identiti pelayar sebagai tuntutan keutamaan', async () => {
    const { fetchFn, calls } = recordingFetch(call => {
      if (call.url.endsWith('/health')) return jsonResponse(REAL_HEALTH);
      return sseResponse(REAL_AGUI_TRANSCRIPT);
    });
    const bridge = new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn });

    // Pelayar mencoba menghantar identiti/Founder/role sendiri.
    await bridge.run({
      message: 'Semak katalog',
      actor: { userId: 'founder-01', workspaceId: 'ws-main' },
      threadLabel: 'thread-pelayar',
    });

    const body = JSON.stringify(calls[1].body);
    expect(body).not.toContain('founder-01');
    expect(body).not.toContain('userId');
    expect(body).not.toContain('user_id');
    expect(body).not.toContain('role');
    expect(body).not.toContain('membershipVersion');
    // Skop ruang kerja server sahaja yang dihantar, dan ia skop, bukan identiti.
    expect(body).toContain('ws-main');
    expect(body).toContain('workspaceScope');
  });

  test('Runtime tidak menghantar tuntutan identiti pelayar kepada jambatan', async () => {
    const { fetchFn, calls } = recordingFetch(call => {
      if (call.url.endsWith('/health')) return jsonResponse(REAL_HEALTH);
      return sseResponse(REAL_AGUI_TRANSCRIPT);
    });
    const runtime = new CopilotV2Runtime({
      bridge: new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn }),
      adapters: mockRegistry(adaptersFor()),
    });

    await runtime.handleRequest(
      chatRequest({
        messages: [{ role: 'user', content: 'Semak katalog' }],
        threadId: 'thread-pelayar',
        userId: 'browser-fake-founder',
        role: 'founder',
        actor: { userId: 'browser-fake-founder', workspaceId: 'browser-ws' },
      }),
      VERIFIED_ACTOR
    );

    const bridgeCall = calls.find(call => call.url.includes('/stream'));
    expect(bridgeCall).toBeDefined();
    const body = JSON.stringify(bridgeCall?.body);
    expect(body).not.toContain('browser-fake-founder');
    expect(body).not.toContain('browser-ws');
    expect(body).not.toContain('"role"');
    // Skop yang dihantar ialah workspace server, bukan workspace pelayar.
    expect(body).toContain('ws-main');
  });
});

describe('Python ADK bridge — integrasi runtime & servedBy', () => {
  test('servedBy = python_adk_bridge apabila jambatan menjawab', async () => {
    const { fetchFn } = recordingFetch(call => {
      if (call.url.endsWith('/health')) return jsonResponse(REAL_HEALTH);
      return sseResponse(REAL_AGUI_TRANSCRIPT);
    });
    const adapters = adaptersFor();
    const runtime = new CopilotV2Runtime({
      bridge: new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn }),
      adapters: mockRegistry(adapters),
    });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Semak katalog' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('completed');
    expect(json.servedBy).toBe('python_adk_bridge');
    expect(json.providerId).toBe('python_adk_bridge');
    expect(json.model).toBe('adk-local_policy');
    expect(json.adk?.modelLive).toBe(false);
    expect(json.adk?.toolCalls).toContain('read_published_catalogue');
    expect(response.headers.get('X-Copilot-Served-By')).toBe('python_adk_bridge');
    // Adapter langsung TIDAK dipanggil — jambatan yang melayani.
    expect(adapters.every(adapter => adapter.calls.length === 0)).toBe(true);
  });

  test('servedBy = direct_model apabila jambatan gagal dan adapter langsung menjawab', async () => {
    const { fetchFn } = recordingFetch(() => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8030');
    });
    const adapters = adaptersFor({ 'gemini-3.6-flash': { content: 'Jawapan terus.' } });
    const runtime = new CopilotV2Runtime({
      bridge: new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn }),
      adapters: mockRegistry(adapters),
    });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('completed');
    expect(json.servedBy).toBe('direct_model');
    expect(json.message.content).toBe('Jawapan terus.');
    expect(json.attempts.some((attempt: { providerId: string }) => attempt.providerId === 'python_adk_bridge')).toBe(true);
  });

  test('servedBy = local_rules apabila tiada calon langsung yang layak', async () => {
    const router = new FreeModelRouter();
    for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) router.markCooldown(candidate);
    const runtime = new CopilotV2Runtime({ router, adapters: mockRegistry(adaptersFor()) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('local_rules');
    expect(json.servedBy).toBe('local_rules');
  });

  test('servedBy = none apabila runtime gagal tutup (tanpa actor)', async () => {
    const runtime = new CopilotV2Runtime({ adapters: mockRegistry(adaptersFor()) });
    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] })
    );
    const json = await response.json();

    expect(json.status).toBe('unavailable');
    expect(json.servedBy).toBe('none');
    expect(json.code).toBe('RUNTIME_NOT_READY');
  });
});

describe('Candidate percuma — pengendalian kegagalan', () => {
  test('404 dead candidate ditanda unusable dan tidak membakar bajet pada run seterusnya', async () => {
    const router = new FreeModelRouter();
    const dead = new ModelAdapterError(
      'PROVIDER_MODEL_NOT_FOUND',
      "Function 'ac74040f-...' Not found for account",
      404,
      { retryable: false }
    );
    const transient = new ModelAdapterError('PROVIDER_ENDPOINT_UNREACHABLE', 'upstream down', undefined, {
      retryable: true,
    });
    const list = adaptersFor({
      'gemini-3.6-flash': { error: transient },
      'gemini-3.5-flash-lite': { error: transient },
      'nvidia/nemotron-3-ultra-550b-a55b:free': { error: dead },
    });
    const runtime = new CopilotV2Runtime({ router, adapters: mockRegistry(list) });

    const first = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const firstJson = await first.json();

    expect(firstJson.status).toBe('unavailable');
    expect(firstJson.candidates).toHaveLength(3);
    const deadReport = firstJson.candidates.find(
      (report: { model: string }) => report.model === 'nvidia/nemotron-3-ultra-550b-a55b:free'
    );
    expect(deadReport.state).toBe('unusable');
    expect(deadReport.reason).toBe('PROVIDER_MODEL_NOT_FOUND');
    expect(deadReport.detail).toContain('Not found for account');

    // Run kedua: calon mati TIDAK dicuba lagi (tiada pembakaran bajet).
    const callsBefore = list[2].calls.length;
    const second = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello lagi' }] }),
      VERIFIED_ACTOR
    );
    const secondJson = await second.json();
    expect(list[2].calls.length).toBe(callsBefore);
    expect(secondJson.candidates.find(
      (report: { model: string }) => report.model === 'nvidia/nemotron-3-ultra-550b-a55b:free'
    ).state).toBe('unusable');
    // Bajet run kedua tetap ≤ 3 (dua transient sahaja).
    expect(secondJson.budget.modelCallsMade).toBe(2);
  });

  test('429 quota candidate dapat cooldown + retry hint dan dis surfaced dengan jujur', async () => {
    const router = new FreeModelRouter();
    const quota = new ModelAdapterError(
      'PROVIDER_QUOTA_EXHAUSTED',
      'Quota exceeded for metric: generate_content_free_tier_requests, limit: 20. Please retry in 19h3m41s.',
      429,
      { retryable: true, retryAfterMs: 68_601_000 }
    );
    const list = adaptersFor({ 'gemini-3.6-flash': { error: quota } });
    const runtime = new CopilotV2Runtime({ router, adapters: mockRegistry(list) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    const report = json.candidates.find(
      (item: { model: string }) => item.model === 'gemini-3.6-flash'
    );
    expect(report.state).toBe('cooldown');
    expect(report.reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(report.retryAfterMs).toBeGreaterThan(0);
    // Kegagalan kuota tidak disembunyikan — ia ada dalam attempts dan laporan.
    expect(json.attempts[0].reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(json.attempts[0].detail).toContain('Quota exceeded');
  });

  test('Semua calon mati → unavailable dengan pecahan sebab per-calon, tiada echo', async () => {
    const dead = new ModelAdapterError('PROVIDER_MODEL_NOT_FOUND', 'not found for account', 404, {
      retryable: false,
    });
    const quota = new ModelAdapterError('PROVIDER_QUOTA_EXHAUSTED', 'quota exceeded', 429, {
      retryable: true,
      retryAfterMs: 1000,
    });
    const list = adaptersFor({
      'gemini-3.6-flash': { error: quota },
      'gemini-3.5-flash-lite': { error: quota },
      'nvidia/nemotron-3-ultra-550b-a55b:free': { error: dead },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockRegistry(list) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'ECHO-SEKALI-JANGAN' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('unavailable');
    expect(json.status).not.toBe('completed');
    expect(json.message.content).not.toContain('ECHO-SEKALI-JANGAN');
    expect(json.candidates).toHaveLength(3);
    expect(json.candidates.every((item: { reason?: string }) => !!item.reason)).toBe(true);
    expect(json.budget.modelCallsMade).toBe(3);
  });

  test('Bajet 3 Includes setiap percubaan (kegagalan + failover)', async () => {
    const failure = new ModelAdapterError('PROVIDER_ENDPOINT_UNREACHABLE', 'down', undefined, {
      retryable: true,
    });
    const list = adaptersFor({
      'gemini-3.6-flash': { error: failure },
      'gemini-3.5-flash-lite': { error: failure },
      'nvidia/nemotron-3-ultra-550b-a55b:free': { error: failure },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockRegistry(list) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.budget.modelCallsMade).toBe(3);
    expect(json.budget.maxModelCalls).toBe(3);
    expect(list.every(adapter => adapter.calls.length === 1)).toBe(true);
  });

  test('Urutan calon kekal ketat walaupun ada calon mati', async () => {
    const failure = new ModelAdapterError('PROVIDER_ENDPOINT_UNREACHABLE', 'down', undefined, {
      retryable: true,
    });
    const list = adaptersFor({
      'gemini-3.6-flash': { error: failure },
      'gemini-3.5-flash-lite': { error: failure },
      'nvidia/nemotron-3-ultra-550b-a55b:free': { error: failure },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockRegistry(list) });

    await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );

    expect(list.map(adapter => adapter.candidate.model)).toEqual([
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
    ]);
    expect(list.every(adapter => adapter.calls.length === 1)).toBe(true);
  });

  test('Dasar sifar kos masih berlaku untuk setiap calon (termasuk yang baharu)', () => {
    expect(() => assertFreeModelOnly('gpt-4o', 'openai')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
    expect(() => assertFreeModelOnly('claude-3-opus', 'anthropic')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
    expect(() => assertFreeModelOnly('nvidia/nemotron-3-super-120b-a12b', 'openrouter')).toThrow(
      /akhiran :free/
    );
    for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) {
      expect(() => assertFreeModelOnly(candidate.model, candidate.providerId)).not.toThrow();
    }
  });

  test('Calon berbayar tidak pernah dipanggil', async () => {
    const paidCandidate: FreeModelCandidate = {
      providerId: 'openrouter',
      model: 'gpt-4o',
      name: 'Model berbayar (haram)',
    };
    const paidAdapter = new MockAdapter({ candidate: paidCandidate });
    const router = new FreeModelRouter({ candidates: [paidCandidate] });
    const runtime = new CopilotV2Runtime({ router, adapters: mockRegistry([paidAdapter]) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(paidAdapter.calls).toHaveLength(0);
    expect(json.status).not.toBe('completed');
    expect(json.reason).toBe('POLICY_VIOLATION_REJECTED');
  });
});

describe('CPK-10 — Sub-agents parent-to-child delegation, trace propagation & budget inheritance', () => {
  test('resolveSpecialistDelegation memetakan intent kepada sub-ejen specialist yang betul', () => {
    expect(
      resolveSpecialistDelegation([{ role: 'user', content: 'Semak katalog dan stok lot semasa' }])
    ).toEqual({
      delegatedAgent: 'commerce_reader',
      specialistTool: 'read_published_catalogue',
    });
    expect(
      resolveSpecialistDelegation([{ role: 'user', content: 'Semak aduan QC dan status JEV refund' }])
    ).toEqual({
      delegatedAgent: 'qc_jev_reviewer',
      specialistTool: 'review_qc_and_jev_cases',
    });
    expect(
      resolveSpecialistDelegation([{ role: 'user', content: 'Bina kempen promosi dan semak margin' }])
    ).toEqual({
      delegatedAgent: 'marketing_drafter',
      specialistTool: 'evaluate_campaign_margin',
    });
    expect(
      resolveSpecialistDelegation([{ role: 'user', content: 'Helo selamat pagi' }])
    ).toEqual({
      delegatedAgent: null,
    });
  });

  test('createChildBudget mewarisi baki panggilan, deadline dan token daripada parent budget dan syncChildBudgetToParent menyelaraskan penggunaan', () => {
    const parent = createBudget(3, 30000);
    parent.callsMade = 1;
    parent.inputTokensUsed = 4000;
    parent.outputTokensUsed = 500;

    const child = createChildBudget(parent);
    expect(child.maxCalls).toBe(2);
    expect(child.deadlineMs).toBeLessThanOrEqual(30000);
    expect(child.maxCumulativeInputTokens).toBe(parent.maxCumulativeInputTokens - 4000);
    expect(child.maxCumulativeOutputTokens).toBe(parent.maxCumulativeOutputTokens - 500);

    child.callsMade = 1;
    child.inputTokensUsed = 300;
    child.outputTokensUsed = 120;
    syncChildBudgetToParent(parent, child);

    expect(parent.callsMade).toBe(2);
    expect(parent.inputTokensUsed).toBe(4300);
    expect(parent.outputTokensUsed).toBe(620);
  });

  test('Runtime menyebarkan traceId, parentRunId, childRunId dan inheritedBudget ke Python ADK bridge serta memulangkan jejak delegasi', async () => {
    const { fetchFn, calls } = recordingFetch(call => {
      if (call.url.endsWith('/health')) return jsonResponse(REAL_HEALTH);
      return sseResponse(REAL_AGUI_TRANSCRIPT);
    });
    const runtime = new CopilotV2Runtime({
      bridge: new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn }),
      adapters: mockRegistry(adaptersFor()),
    });

    const response = await runtime.handleRequest(
      chatRequest({
        messages: [{ role: 'user', content: 'Semak katalogAlignment dan status stok' }],
        traceId: 'trace-cpk10-test-01',
      }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('completed');
    expect(json.servedBy).toBe('python_adk_bridge');
    expect(json.adk?.delegatedBy).toBe('abangcolek_ops');
    expect(json.adk?.delegatedAgent).toBe('commerce_reader');
    expect(json.adk?.traceId).toBe('trace-cpk10-test-01');
    expect(json.adk?.parentRunId).toBe(json.runId);
    expect(json.adk?.childRunId).toBe(`${json.runId}:sub:commerce_reader`);

    expect(json.delegation).toBeDefined();
    expect(json.delegation.traceId).toBe('trace-cpk10-test-01');
    expect(json.delegation.parentRunId).toBe(json.runId);
    expect(json.delegation.childRunId).toBe(`${json.runId}:sub:commerce_reader`);
    expect(json.delegation.parentAgent).toBe('abangcolek_ops');
    expect(json.delegation.delegatedBy).toBe('abangcolek_ops');
    expect(json.delegation.delegatedAgent).toBe('commerce_reader');
    expect(json.delegation.specialistTool).toBe('read_published_catalogue');
    expect(json.delegation.inheritedBudget.parentMaxCalls).toBe(3);
    expect(json.delegation.inheritedBudget.remainingModelCalls).toBe(3);

    const streamCall = calls.find(c => c.url.includes('/stream'));
    expect(streamCall).toBeDefined();
    const sentPayload = (streamCall?.body as { payload?: Record<string, any> })?.payload;
    expect(sentPayload?.trace?.traceId).toBe('trace-cpk10-test-01');
    expect(sentPayload?.trace?.parentAgent).toBe('abangcolek_ops');
    expect(sentPayload?.trace?.delegatedAgent).toBe('commerce_reader');
    expect(sentPayload?.budget?.remainingModelCalls).toBe(3);
  });

  test('Laluan direct_model turut mengekalkan jejak delegasi parent->child dan warisan bajet selepas jambatan gagal', async () => {
    const { fetchFn } = recordingFetch(() => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8030');
    });
    const adapters = adaptersFor({
      'gemini-3.6-flash': { content: 'Laporan QC dan JEV telah disemak.' },
    });
    const runtime = new CopilotV2Runtime({
      bridge: new AdkBridgeClient({ baseUrl: 'http://127.0.0.1:8030', fetchFn }),
      adapters: mockRegistry(adapters),
    });

    const response = await runtime.handleRequest(
      chatRequest({
        messages: [{ role: 'user', content: 'Semak aduan QC dan kes refund ORD-001' }],
        traceId: 'trace-cpk10-direct-02',
      }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('completed');
    expect(json.servedBy).toBe('direct_model');
    expect(json.delegation).toBeDefined();
    expect(json.delegation.traceId).toBe('trace-cpk10-direct-02');
    expect(json.delegation.parentAgent).toBe('abangcolek_ops');
    expect(json.delegation.delegatedAgent).toBe('qc_jev_reviewer');
    expect(json.delegation.specialistTool).toBe('review_qc_and_jev_cases');
    // Jambatan menggunakan 1 panggilan, jadi baki panggilan yang diwarisi ke laluan direct ialah 2.
    expect(json.delegation.inheritedBudget.parentMaxCalls).toBe(3);
    expect(json.delegation.inheritedBudget.remainingModelCalls).toBe(2);
  });
});
