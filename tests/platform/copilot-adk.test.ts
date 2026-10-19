import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { createPlatformApp } from '../../server/platform/app';
import { FreeModelRouter, FREE_PROVIDERS } from '../../server/platform/freeModelRouter';
import { GoogleAdkAgent } from '../../server/platform/adkAgent';

function cleanup(path: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { unlinkSync(path + suffix); } catch {}
  }
}

describe('Google ADK Agent & Free Model Router Integration', () => {
  test('FreeModelRouter manages providers and provides deterministic fallback', async () => {
    const router = new FreeModelRouter('gemini_free');
    expect(router.getActiveProvider().id).toBe('gemini_free');

    // Switch provider
    const ok = router.setActiveProvider('nvidia');
    expect(ok).toBe(true);
    expect(router.getActiveProvider().id).toBe('nvidia');

    const invalid = router.setActiveProvider('non-existent-provider');
    expect(invalid).toBe(false);

    // List providers
    const list = router.listProviders();
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list.some(p => p.id === 'openrouter')).toBe(true);
    expect(list.some(p => p.id === 'opencode_zen')).toBe(true);
    expect(list.some(p => p.id === 'ollama')).toBe(true);

    // Test deterministic sovereign completion fallback
    const result = await router.complete([
      { role: 'user', content: 'Aduan botol bocor penutup pecah' }
    ]);
    expect(result.providerId).toBe('nvidia');
    expect(result.content).toContain('botol kuah colek bocor');
    expect(result.content).toContain('UNDETERMINED');
  });

  test('HTTP Platform API: Copilot providers, active switching, and validation', async () => {
    const db = `var/lib/qa/copilot-providers-${Date.now()}.sqlite`;
    cleanup(db);
    const app = createPlatformApp({ databasePath: db, bootstrapToken: 'qa-token', origin: 'http://localhost:3000' });

    // 1. Unauthenticated request to /copilot/providers returns 401
    const unauthGet = await app.fetch(new Request('http://localhost:3000/api/platform/copilot/providers', {
      method: 'GET'
    }));
    expect(unauthGet.status).toBe(401);

    // 2. Bootstrap Founder
    const boot = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'founder-copilot@test.local', password: 'password123456', name: 'Founder Copilot', token: 'qa-token' }),
    }));
    expect(boot.status).toBe(200);
    const cookie = boot.headers.get('set-cookie')!;
    const csrf = (await boot.clone().json() as any).data.csrfToken;

    const get = (path: string) =>
      app.fetch(new Request(`http://localhost:3000/api/platform${path}`, {
        method: 'GET',
        headers: { Cookie: cookie, Origin: 'http://localhost:3000' }
      }));

    const post = (path: string, body: unknown) =>
      app.fetch(new Request(`http://localhost:3000/api/platform${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookie, 'x-csrf-token': csrf },
        body: JSON.stringify(body)
      }));

    // 3. GET /copilot/providers returns active providers
    const provRes = await get('/copilot/providers');
    expect(provRes.status).toBe(200);
    const provData = (await provRes.json() as any).data;
    expect(Array.isArray(provData)).toBe(true);
    expect(provData.some((p: any) => p.id === 'nvidia')).toBe(true);
    expect(provData.some((p: any) => p.id === 'openrouter')).toBe(true);
    expect(provData.some((p: any) => p.id === 'opencode_zen')).toBe(true);

    // 4. POST /copilot/provider switches active provider
    const switchRes = await post('/copilot/provider', { providerId: 'openrouter' });
    expect(switchRes.status).toBe(200);
    const switchData = (await switchRes.json() as any).data;
    expect(switchData.activeProvider.id).toBe('openrouter');

    // 5. POST /copilot/provider rejects invalid provider
    const badSwitch = await post('/copilot/provider', { providerId: 'invalid-cloud-ai' });
    expect(badSwitch.status).toBe(400);
    const badSwitchData = await badSwitch.json() as any;
    expect(badSwitchData.code).toBe('INVALID_PROVIDER');

    app.close();
    cleanup(db);
  });

  test('HTTP Platform API: Copilot Chat JSON & SSE Stream with Generative UI & HITL', async () => {
    const db = `var/lib/qa/copilot-chat-${Date.now()}.sqlite`;
    cleanup(db);
    const app = createPlatformApp({ databasePath: db, bootstrapToken: 'qa-token', origin: 'http://localhost:3000' });

    // Bootstrap Founder
    const boot = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'founder-chat@test.local', password: 'password123456', name: 'Founder Chat', token: 'qa-token' }),
    }));
    expect(boot.status).toBe(200);
    const cookie = boot.headers.get('set-cookie')!;
    const csrf = (await boot.clone().json() as any).data.csrfToken;

    const post = (path: string, body: unknown, extraHeaders: Record<string, string> = {}) =>
      app.fetch(new Request(`http://localhost:3000/api/platform${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: cookie,
          'x-csrf-token': csrf,
          ...extraHeaders
        },
        body: JSON.stringify(body)
      }));

    // 1. Chat JSON for margin inquiry
    const marginRes = await post('/copilot/chat', { message: 'Bolehkah saya buat kempen diskaun margin sekarang?' });
    expect(marginRes.status).toBe(200);
    const marginData = (await marginRes.json() as any).data;
    expect(marginData.generativeUi).toBeDefined();
    expect(marginData.generativeUi.name).toBe('MarginSimulator');
    expect(marginData.generativeUi.props.contributionMarginPct).toBeGreaterThanOrEqual(25);
    expect(marginData.reply.length).toBeGreaterThan(0);

    // 2. Chat JSON for bottle leakage + refund creates HITL action
    const leakRes = await post('/copilot/chat', { message: 'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos' });
    expect(leakRes.status).toBe(200);
    const leakData = (await leakRes.json() as any).data;
    expect(leakData.generativeUi?.name).toBe('JevAssessmentCard');
    expect(leakData.generativeUi?.props.issueClass).toBe('LEAKAGE');
    expect(leakData.generativeUi?.props.rootCause).toBe('UNDETERMINED');
    expect(leakData.hitlAction).toBeDefined();
    expect(leakData.hitlAction.actionType).toBe('refund');
    expect(leakData.hitlAction.status).toBe('pending_approval');
    const hitlId = leakData.hitlAction.id;

    // 3. GET /copilot/hitl lists pending action
    const hitlListRes = await app.fetch(new Request('http://localhost:3000/api/platform/copilot/hitl', {
      method: 'GET',
      headers: { Cookie: cookie, Origin: 'http://localhost:3000' }
    }));
    expect(hitlListRes.status).toBe(200);
    const hitlList = (await hitlListRes.json() as any).data;
    expect(hitlList.some((h: any) => h.id === hitlId && h.status === 'pending_approval')).toBe(true);

    // 4. POST /copilot/hitl/:id/decide approves the action
    const decideRes = await post(`/copilot/hitl/${hitlId}/decide`, { approve: true });
    expect(decideRes.status).toBe(200);
    const decideData = (await decideRes.json() as any).data;
    expect(decideData.status).toBe('approved');
    expect(decideData.reviewedBy).toBeDefined();

    // 5. Trying to decide again fails with 409 HITL_ALREADY_DECIDED
    const reDecideRes = await post(`/copilot/hitl/${hitlId}/decide`, { approve: false });
    expect(reDecideRes.status).toBe(409);
    const reDecideData = await reDecideRes.json() as any;
    expect(reDecideData.code).toBe('HITL_ALREADY_DECIDED');

    // 6. Chat with SSE Stream (Accept: text/event-stream)
    const streamRes = await post('/copilot/chat', {
      message: 'Jejak status kargo bas ekspres Pantai Timur sekarang'
    }, {
      'Accept': 'text/event-stream'
    });
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('content-type')).toContain('text/event-stream');
    const streamBodyText = await streamRes.text();
    expect(streamBodyText).toContain('event: start');
    expect(streamBodyText).toContain('event: gen_ui');
    expect(streamBodyText).toContain('OrderTrackingBadge');
    expect(streamBodyText).toContain('event: done');

    app.close();
    cleanup(db);
  });
});
