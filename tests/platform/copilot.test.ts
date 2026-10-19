import { afterEach, describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

function createHarness() {
  const directory = mkdtempSync(join(tmpdir(), 'copilot-test-'));
  const app = createPlatformApp({
    databasePath: join(directory, 'test.sqlite'),
    bootstrapToken: 'copilot-bootstrap-token',
    origin: 'http://localhost:3000',
  });
  cleanups.push(() => {
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, directory };
}

async function apiCall(
  app: ReturnType<typeof createPlatformApp>,
  path: string,
  body?: unknown,
  session?: { cookie: string; csrf: string },
  extra: Record<string, string> = {}
) {
  const response = await app.fetch(
    new Request(`http://localhost:3010/api/platform${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
              'Idempotency-Key': crypto.randomUUID(),
            }),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  );
  return { response, json: await response.json() };
}

async function createUser(app: ReturnType<typeof createPlatformApp>, name: string, founder = false) {
  const result = await apiCall(app, founder ? '/auth/bootstrap' : '/auth/signup', {
    email: `${name}@example.test`,
    name,
    password: 'secure test password 123',
    ...(founder ? { token: 'copilot-bootstrap-token' } : {}),
  });
  expect(result.response.status).toBe(200);
  const cookie = result.response.headers.get('set-cookie')?.split(';')[0] ?? '';
  return {
    cookie,
    csrf: (result.json as any).data.csrfToken as string,
    user: (result.json as any).data.user,
  };
}

describe('Copilot ADK & Free Model Router Integration', () => {
  test('Menghalang capaian awam tanpa log masuk ke endpoint copilot (401)', async () => {
    const { app } = createHarness();
    const res = await apiCall(app, '/copilot/providers');
    expect(res.response.status).toBe(401);
  });

  test('Pengguna founder & operasi boleh menyenaraikan dan menukar provider percuma', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder', true);

    const listRes = await apiCall(app, '/copilot/providers', undefined, founder);
    expect(listRes.response.status).toBe(200);
    const providers = listRes.json.data;
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(5);

    // Semak keberadaan provider percuma
    const providerIds = providers.map((p: any) => p.id);
    expect(providerIds).toContain('gemini_free');
    expect(providerIds).toContain('nvidia');
    expect(providerIds).toContain('openrouter');
    expect(providerIds).toContain('opencode_zen');
    expect(providerIds).toContain('ollama');

    // Tukar ke NVIDIA NIM
    const switchRes = await apiCall(app, '/copilot/provider', { providerId: 'nvidia' }, founder);
    expect(switchRes.response.status).toBe(200);
    expect(switchRes.json.data.activeProvider.id).toBe('nvidia');

    // Tukar semula ke Gemini Free
    const switchBack = await apiCall(app, '/copilot/provider', { providerId: 'gemini_free' }, founder);
    expect(switchBack.response.status).toBe(200);
    expect(switchBack.json.data.activeProvider.id).toBe('gemini_free');
  });

  test('POST /copilot/chat memulangkan respons ADK berstruktur dengan sandaran luar talian', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder', true);

    const chatRes = await apiCall(
      app,
      '/copilot/chat',
      {
        message: 'Tolong semak status inventori sambal dan botol bocor terkini',
        stream: false,
      },
      founder
    );

    expect(chatRes.response.status).toBe(200);
    expect(chatRes.json.ok).toBe(true);
    expect(chatRes.json.data.reply).toBeDefined();
    expect(typeof chatRes.json.data.reply).toBe('string');
    expect(chatRes.json.data.reply.length).toBeGreaterThan(0);
  });

  test('POST /copilot/chat menghasilkan Generative UI apabila diminta penilaian JEV', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder', true);

    const chatRes = await apiCall(
      app,
      '/copilot/chat',
      {
        message: 'Beri saya penilaian JEV untuk penambahbaikan kargo bas',
        stream: false,
      },
      founder
    );

    expect(chatRes.response.status).toBe(200);
    expect(chatRes.json.ok).toBe(true);
    if (chatRes.json.data.generativeUi) {
      expect(chatRes.json.data.generativeUi.name).toBe('JevAssessmentCard');
      expect(chatRes.json.data.generativeUi.props).toBeDefined();
    }
  });

  test('Human-In-The-Loop: Founder boleh menyenaraikan dan membuat keputusan meluluskan/menolak', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder', true);

    // Cipta satu aksi HITL melalui chat atau terus melalui adkAgent
    const chatRes = await apiCall(
      app,
      '/copilot/chat',
      {
        message: 'Saya cadangkan buat refund penuh untuk pesanan botol pecah ORD-9988',
        stream: false,
      },
      founder
    );

    expect(chatRes.response.status).toBe(200);

    // Senarai tindakan HITL
    const hitlList = await apiCall(app, '/copilot/hitl', undefined, founder);
    expect(hitlList.response.status).toBe(200);
    expect(Array.isArray(hitlList.json.data)).toBe(true);

    if (hitlList.json.data.length > 0) {
      const action = hitlList.json.data[0];
      expect(action.status).toBe('pending_approval');

      // Founder luluskan tindakan HITL
      const decideRes = await apiCall(
        app,
        `/copilot/hitl/${action.id}/decide`,
        { approve: true },
        founder
      );
      expect(decideRes.response.status).toBe(200);
      expect(decideRes.json.data.status).toBe('approved');
      expect(decideRes.json.data.reviewedBy).toBe(founder.user.id);
    }
  });
});
