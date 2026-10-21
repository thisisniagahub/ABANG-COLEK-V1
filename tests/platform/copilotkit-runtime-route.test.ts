/**
 * AbangColek Sovereign GrowthOS — CopilotKit runtime route contract
 *
 * Ujian ini memalsukan `ModelAdapterRegistry` yang SEBENAR (adapter `mock`
 * dengan `call()` sebenar), jadi laluan `/api/copilotkit` diuji terhadap
 * runtime platform sebenar, bukan terhadap stub.
 *
 * Yang dibuktikan:
 * - `POST /api/copilotkit` berfungsi dan memulangkan kontrak Writer B.
 * - `GET /api/copilotkit` memulangkan descriptor yang jujur.
 * - Input rosak gagal tutup dengan kod yang betul.
 * - Prompt pengguna tidak pernah diecho dalam respons.
 * - Laluan AG-UI rasmi (`@copilotkit/runtime`) menyalakan event AG-UI.
 */

import { describe, expect, test } from 'bun:test';
import { createCopilotKitRoute } from '../../api/copilotkit';
import { CopilotV2Runtime } from '../../server/agents/copilot/runtime';
import { PlatformStore, id, now } from '../../server/platform/store';
import { hash } from '../../server/platform/auth';
import type {
  ModelAdapter,
  ModelAdapterRegistry,
  ModelCallOutcome,
  ModelCallRequest,
} from '../../server/agents/providers/model-adapters';
import { A2UI_ALLOWLISTED_COMPONENTS } from '../../shared/copilot-contracts';

const ANSWER = 'Pesanan ORD-001 telah dihantar dari outlet HQ.';

const adapter: ModelAdapter = {
  candidate: {
    providerId: 'gemini_free',
    model: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (Primary Free)',
  },
  transport: 'mock',
  isConfigured: () => true,
  credentialSource: () => 'TEST_TRANSPORT',
  call: async (_request: ModelCallRequest): Promise<ModelCallOutcome> => ({
    content: ANSWER,
    inputTokens: 12,
    outputTokens: 9,
    model: 'gemini-3.6-flash',
  }),
};

const registry: ModelAdapterRegistry = {
  get: candidate => (candidate.providerId === 'gemini_free' ? adapter : undefined),
  list: () => [adapter],
};

function route(): (req: Request) => Promise<Response> {
  return createCopilotKitRoute({ runtime: new CopilotV2Runtime({ adapters: registry }) });
}

function post(body: string, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/copilotkit', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
}

describe('/api/copilotkit — POST (platform contract)', () => {
  test('memulangkan status union, header run-id dan model', async () => {
    const response = await route()(post(JSON.stringify({
      messages: [{ role: 'user', content: 'Status ORD-001?' }],
    })));

    expect(response.status).toBe(200);
    const body = await response.json() as {
      status: string;
      runId: string;
      model: string;
      providerId: string;
      message: { role: string; content: string };
      transport?: string;
    };

    expect(body.status).toBe('completed');
    expect(body.model).toBe('gemini-3.6-flash');
    expect(body.providerId).toBe('gemini_free');
    expect(body.message.role).toBe('assistant');
    expect(body.message.content).toBe(ANSWER);
    expect(body.transport).toBe('mock');

    expect(response.headers.get('X-Copilot-Run-Id')).toBe(body.runId);
    expect(response.headers.get('X-Copilot-Model')).toBe('gemini-3.6-flash');
  });

  test('tidak pernah meng-echo prompt pengguna', async () => {
    const secret = 'RAHSIA-PELANGGAN-9F3A2B';
    const response = await route()(post(JSON.stringify({
      messages: [{ role: 'user', content: secret }],
    })));
    const text = await response.text();
    expect(text).not.toContain(secret);
    expect(text).toContain(ANSWER);
  });

  test('JSON rosak gagal tutup dengan MALFORMED_JSON_PAYLOAD', async () => {
    const response = await route()(post('{ ini bukan json'));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; detail: string };
    expect(body.error).toBe('MALFORMED_JSON_PAYLOAD');
    expect(response.headers.get('X-Copilot-Run-Id')).toBeTruthy();
  });

  test('array mesej tidak sah gagal tutup dengan INVALID_MESSAGES_ARRAY', async () => {
    const response = await route()(post(JSON.stringify({ messages: 'bukan array' })));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('INVALID_MESSAGES_ARRAY');
  });

  test('kaedah selain POST dan GET tidak dilayan sebagai run chat', async () => {
    const response = await route()(new Request('http://localhost/api/copilotkit', {
      method: 'PUT',
    }));
    expect(response.status).not.toBe(200);
  });

  test('GET kekal menolak dengan METHOD_NOT_ALLOWED (kontrak runtime platform)', async () => {
    const response = await route()(new Request('http://localhost/api/copilotkit', {
      method: 'GET',
    }));
    expect(response.status).toBe(405);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('METHOD_NOT_ALLOWED');
    expect(response.headers.get('X-Copilot-Run-Id')).toBeTruthy();
  });
});

describe('/api/copilotkit — GET (descriptor)', () => {
  test('descriptor jujur dan lengkap', async () => {
    const response = await route()(new Request('http://localhost/api/copilotkit/descriptor', {
      method: 'GET',
    }));
    expect(response.status).toBe(200);
    const descriptor = await response.json() as {
      version: string;
      runtime: string;
      schema: string;
      activeProvider: string;
      candidateModels: Array<{ providerId: string; model: string; name: string }>;
      allowlistedComponents: string[];
      paidFallbackAllowed: boolean;
      aguiProtocolImplemented: boolean;
      copilotkitRuntimeImplemented: boolean;
      aguiRunRoute: string;
    };

    expect(descriptor.version).toBe('2.0.0');
    expect(descriptor.runtime).toBe('copilotkit-v2-agui');
    expect(descriptor.schema).toBe('a2ui.v1');
    expect(descriptor.activeProvider).toBe('gemini_free');
    expect(descriptor.candidateModels.length).toBeLessThanOrEqual(3);
    expect(descriptor.candidateModels[0]?.providerId).toBe('gemini_free');
    expect(descriptor.allowlistedComponents).toEqual([...A2UI_ALLOWLISTED_COMPONENTS]);
    expect(descriptor.paidFallbackAllowed).toBe(false);
    expect(descriptor.aguiProtocolImplemented).toBe(true);
    expect(descriptor.copilotkitRuntimeImplemented).toBe(true);
    expect(descriptor.aguiRunRoute).toBe('/api/copilotkit/agent/abangcolek_ops/run');
  });
});

describe('/api/copilotkit — AG-UI route (official @copilotkit/runtime)', () => {
  /**
   * Laluan ejen (run/connect/suggest) MEWAJIBKAN sesi yang disahkan:
   * ADR-0003 "tiada public unrestricted Copilot" + contract §3:69. Tanpa
   * sesi, tiada panggilan provider boleh berlaku.
   */
  function sessionFixture(): { store: PlatformStore; cookie: string } {
    const store = new PlatformStore(':memory:');
    const userId = 'user-copilotkit';
    store.db
      .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
      .run(userId, `${userId}@example.test`, userId, 'hash', now());
    store.db
      .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
      .run(id(), userId, 'founder', JSON.stringify(['hq']), null, 'active', 1);
    const token = 'token-copilotkit-route';
    store.db
      .query('INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at,revoked,csrf_token) VALUES(?,?,?,?,0,?)')
      .run(hash(token), userId, hash('csrf'), new Date(Date.now() + 3_600_000).toISOString(), 'csrf');
    return { store, cookie: `platform_session=${token}` };
  }

  function agentRoute(store: PlatformStore): (req: Request) => Promise<Response> {
    return createCopilotKitRoute({ runtime: new CopilotV2Runtime({ adapters: registry }), store });
  }

  test('NEGATIF tanpa sesi ⇒ 401 dan tiada panggilan provider', async () => {
    const { store } = sessionFixture();
    try {
      const response = await agentRoute(store)(new Request(
        'http://localhost/api/copilotkit/agent/abangcolek_ops/run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            threadId: 'thread-1',
            runId: 'run-1',
            messages: [{ id: 'u1', role: 'user', content: 'Status ORD-001?' }],
            state: {},
            tools: [],
            context: [],
          }),
        },
      ));
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).not.toContain('RUN_STARTED');
    } finally {
      store.close();
    }
  });

  test('menyayani event AG-UI melalui laluan ejen', async () => {
    const { store, cookie } = sessionFixture();
    try {
      const response = await agentRoute(store)(new Request(
        'http://localhost/api/copilotkit/agent/abangcolek_ops/run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Cookie: cookie,
          },
          body: JSON.stringify({
            threadId: 'thread-1',
            runId: 'run-1',
            messages: [{ id: 'u1', role: 'user', content: 'Status ORD-001?' }],
            state: {},
            tools: [],
            context: [],
          }),
        },
      ));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      const stream = await response.text();
      expect(stream).toContain('RUN_STARTED');
      expect(stream).toContain('TEXT_MESSAGE_CONTENT');
      expect(stream).toContain('RUN_FINISHED');
      expect(stream).toContain('gemini-3.6-flash');
    } finally {
      store.close();
    }
  });
});
