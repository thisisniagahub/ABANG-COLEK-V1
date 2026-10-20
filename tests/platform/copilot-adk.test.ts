import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { createPlatformApp } from '../../server/platform/app';
import { FreeModelRouter, FREE_PROVIDERS, assertFreeModelOnly, STRICT_FREE_CANDIDATE_SEQUENCE } from '../../server/platform/freeModelRouter';
import { GoogleAdkAgent, A2UI_ALLOWLISTED_COMPONENTS, validateA2UIComponent } from '../../server/platform/adkAgent';
import { evaluateMarginContribution } from '../../shared/growth-contracts';

function cleanup(path: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { unlinkSync(path + suffix); } catch {}
  }
}

/** Kunci API provider yang mengawal sama ada router boleh memanggil provider. */
const PROVIDER_KEYS = [
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
  'NVIDIA_API_KEY',
  'OPENCODE_ZEN_API_KEY',
  'GROQ_API_KEY',
] as const;

function snapshotProviderEnv(): Record<string, string | undefined> {
  return Object.fromEntries(PROVIDER_KEYS.map(key => [key, process.env[key]]));
}

function restoreProviderEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of PROVIDER_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
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

    // Test deterministic sovereign completion fallback.
    // Fallback TIDAK boleh dikreditkan kepada provider awam yang aktif:
    // jawapan dijana secara lokal oleh platform (blueprint:293).
    //
    // KONTRAK BARU (bajet run bounded): reason code bergantung pada SEBAB
    // tiada jawapan provider. Di sini Tiada provider dikonfigurasi langsung
    // (semua kunci API dibuang, mod offline dikekalkan), jadi sebabnya
    // `LOCAL_RULES_NO_PROVIDER_RESPONSE` — bukan reason code bajet. Assertion
    // lama (`toBe('LOCAL_RULES_NO_PROVIDER_RESPONSE')`) hanya benar pada mesin
    // tanpa kunci; pada mesin ber-kunci ia bergantung pada sama ada failover
    // sempat membakar bajet — itu puncanya assertion ini perlu dipecah.
    const envSnapshot = snapshotProviderEnv();
    const previousDisable = process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS;
    try {
      for (const key of PROVIDER_KEYS) delete process.env[key];
      process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS = '1';
      const result = await router.complete([
        { role: 'user', content: 'Aduan botol bocor penutup pecah' }
      ]);
      expect(result.providerId).toBe('local_rules');
      expect(result.model).toBe('local-rules-deterministic');
      expect(result.status).toBe('local_rules');
      expect(result.reason).toBe('LOCAL_RULES_NO_PROVIDER_RESPONSE');
      // Tiada ReasonCode bajet: tiada apa-apa yang cuba memanggil provider.
      expect(result.budgetBlockReason).toBeUndefined();
      expect(result.budget?.providerCallsMade).toBe(0);
      expect(result.budget?.maxProviderCalls).toBe(3);
      expect(result.content).toContain('botol kuah colek bocor');
      expect(result.content).toContain('UNDETERMINED');
      // Fallback tidak boleh mendakwa sebarang tindakan luaran berlaku.
      expect(result.content).not.toContain('telah direkodkan');
      expect(result.content).not.toContain('telah dimulakan');
    } finally {
      restoreProviderEnv(envSnapshot);
      if (previousDisable === undefined) delete process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS;
      else process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS = previousDisable;
    }
  });

  test('Bajet run yang dibekukan menghalang failover dan dilabel LOCAL_RULES_BUDGET_EXHAUSTED', async () => {
    const envSnapshot = snapshotProviderEnv();
    const previousDisable = process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS;
    const previousFetch = globalThis.fetch;
    let providerCalls = 0;
    try {
      // Hanya dua provider dikonfigurasi; selebihnya tiada kunci, jadi senarai
      // calon yang dicuba ialah urutan ketat free + satu calon lokal.
      for (const key of PROVIDER_KEYS) delete process.env[key];
      process.env.GEMINI_API_KEY = 'kunci-ujian';
      process.env.OPENROUTER_API_KEY = 'kunci-ujian';
      process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS = '0';
      // Jaringan disekat pada sempadan: router tidak pernah memanggil provider
      // sebenar, dan tiada kuota free tier produksi dimakan.
      (globalThis as { fetch: typeof fetch }).fetch = (async () => {
        providerCalls += 1;
        throw new Error('PROVIDER_ENDPOINT_UNREACHABLE');
      }) as unknown as typeof fetch;

      const router = new FreeModelRouter('gemini_free');
      const result = await router.complete([
        { role: 'user', content: 'Aduan botol bocor penutup pecah' }
      ]);

      // Had bajet: maksimum 3 panggilan provider bagi satu run, walaupun
      // failover cuba berlanjut selepas setiap kegagalan.
      expect(providerCalls).toBe(3);
      expect(result.budget?.maxProviderCalls).toBe(3);
      expect(result.budget?.providerCallsMade).toBe(3);
      expect(result.budget?.deadlineMs).toBe(30000);

      // Reason code baharu: bajet yang nyata menghalang failover.
      expect(result.reason).toBe('LOCAL_RULES_BUDGET_EXHAUSTED');
      expect(result.reason).not.toBe('LOCAL_RULES_NO_PROVIDER_RESPONSE');
      expect(result.budgetBlockReason).toBe('MODEL_BUDGET_EXCEEDED');

      // Label kekal jujur: jawapan dijana lokal, BUKAN dikreditkan ke model awam.
      expect(result.providerId).toBe('local_rules');
      expect(result.model).toBe('local-rules-deterministic');
      expect(result.status).toBe('local_rules');
      expect(result.content).toContain('UNDETERMINED');
      expect(result.content).not.toContain('telah direkodkan');
      expect(result.content).not.toContain('telah dimulakan');
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = previousFetch;
      restoreProviderEnv(envSnapshot);
      if (previousDisable === undefined) delete process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS;
      else process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS = previousDisable;
    }
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

    // 1. Chat JSON for margin inquiry WITH real commercial inputs.
    // Kad margin hanya boleh dipaparkan selepas penilai margin kanonikal
    // evaluateMarginContribution benar-benar dijalankan.
    const marginSimulation = {
      netSalesExTaxSen: 10000,
      cogsSen: 6000,
      packagingSen: 200,
      paymentFeesSen: 0,
      fulfilmentVariableCostSen: 0,
      deliverySubsidySen: 0,
      agentCommissionSen: 0,
      rewardCostSen: 0,
      expectedReturnLossSen: 0,
      minimumContributionSen: 2000,
      minimumContributionMarginPct: 25,
    };
    const expectedMargin = evaluateMarginContribution(marginSimulation);
    const marginRes = await post('/copilot/chat', {
      message: `Bolehkah saya buat kempen diskaun margin sekarang? netSalesExTaxSen=10000 cogsSen=6000 packagingSen=200 minimumContributionSen=2000 minimumContributionMarginPct=25`,
    });
    expect(marginRes.status).toBe(200);
    const marginData = (await marginRes.json() as any).data;
    expect(marginData.generativeUi).toBeDefined();
    expect(marginData.generativeUi.name).toBe('MarginSimulator');
    expect(marginData.generativeUi.props.contributionMarginPct).toBe(expectedMargin.contributionMarginPct);
    expect(marginData.generativeUi.props.contributionSen).toBe(expectedMargin.contributionSen);
    expect(marginData.a2ui.component).toBe('MarginSimulator');
    expect(marginData.a2ui.provenance.source).toBe('canonical_evaluator');
    expect(marginData.reply.length).toBeGreaterThan(0);

    // 1b. Chat JSON for margin inquiry WITHOUT commercial inputs:
    // tiada simulasi boleh dijalankan, tiada margin lulus dipaparkan.
    const noInputRes = await post('/copilot/chat', {
      message: 'Bolehkah saya buat kempen diskaun margin sekarang?'
    });
    expect(noInputRes.status).toBe(200);
    const noInputData = (await noInputRes.json() as any).data;
    expect(noInputData.generativeUi).toBeUndefined();
    expect(noInputData.a2ui.component).toBe('MarginSummaryCard');
    expect(noInputData.a2ui.props.simulationPerformed).toBe(false);
    expect(noInputData.a2ui.props.status).toBe('NOT_SIMULATED');
    expect(noInputData.a2ui.provenance.source).not.toBe('canonical_evaluator');

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

    // 6. Chat with SSE Stream (Accept: text/event-stream).
    // Pesanan sebenar disimpan dalam store supaya jejakannya boleh dibaca.
    app.store.save('orders', {
      id: 'ord-copilot-trace-01',
      customerId: 'cust-trace-01',
      outletId: 'hq',
      status: 'requested',
      fulfilmentStatus: 'dispatched',
      paymentState: 'verified',
      amountSen: 4200,
      paidAmountSen: 4200,
      refundAmountSen: 0,
      lines: [],
      contactRef: 'Ahmad Colek, No 12 Jalan Kebun, 50000 Kuala Lumpur, Tel: 0123456789',
      trackingTokenHash: 'hash_tracked_9f82ab7e',
      trackingTokenExpiresAt: new Date(Date.now() + 14 * 24 * 3600_000).toISOString(),
      revision: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const streamRes = await post('/copilot/chat', {
      message: 'Jejak status kargo bas ekspres Pantai Timur untuk pesanan ord-copilot-trace-01 sekarang'
    }, {
      'Accept': 'text/event-stream'
    });
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('content-type')).toContain('text/event-stream');
    const streamBodyText = await streamRes.text();
    expect(streamBodyText).toContain('event: start');
    expect(streamBodyText).toContain('event: gen_ui');
    expect(streamBodyText).toContain('OrderTrackingBadge');
    expect(streamBodyText).toContain('ord-copilot-trace-01');
    expect(streamBodyText).toContain('event: done');

    app.close();
    cleanup(db);
  }, 25000);

  test('Strict candidate model sequence and zero paid fallback enforcement', () => {
    const router = new FreeModelRouter('gemini_free');
    const candidates = router.getStrictFreeCandidates();
    expect(candidates).toHaveLength(3);

    // 1. gemini-3.6-flash (Primary Free)
    expect(candidates[0].model).toBe('gemini-3.6-flash');
    expect(candidates[0].providerId).toBe('gemini_free');

    // 2. gemini-3.5-flash-lite (Secondary Free)
    expect(candidates[1].model).toBe('gemini-3.5-flash-lite');
    expect(candidates[1].providerId).toBe('gemini_free');

    // 3. nvidia/nemotron-3-ultra-550b-a55b:free (OpenRouter Free)
    expect(candidates[2].model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(candidates[2].providerId).toBe('openrouter');

    // Zero paid fallback: rejects any paid model
    expect(() => assertFreeModelOnly('gpt-4o', 'openai')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
    expect(() => assertFreeModelOnly('claude-3-5-sonnet', 'anthropic')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
    expect(() => assertFreeModelOnly('meta-llama/llama-3.3-70b-instruct', 'openrouter')).toThrow(/OpenRouter hanya dibenarkan model dengan akhiran :free/);

    // Free models pass validation
    expect(() => assertFreeModelOnly('gemini-3.6-flash', 'gemini_free')).not.toThrow();
    expect(() => assertFreeModelOnly('gemini-3.5-flash-lite', 'gemini_free')).not.toThrow();
    expect(() => assertFreeModelOnly('nvidia/nemotron-3-ultra-550b-a55b:free', 'openrouter')).not.toThrow();
  });

  test('CopilotKit Runtime /v2 endpoint with A2UI Fixed Schema and streaming', async () => {
    const db = `var/lib/qa/copilot-v2-${Date.now()}.sqlite`;
    cleanup(db);
    const app = createPlatformApp({ databasePath: db, bootstrapToken: 'qa-token', origin: 'http://localhost:3000' });

    // Bootstrap Founder
    const boot = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'founder-v2@test.local', password: 'password123456', name: 'Founder V2', token: 'qa-token' }),
    }));
    expect(boot.status).toBe(200);
    const cookie = boot.headers.get('set-cookie')!;
    const csrf = (await boot.clone().json() as any).data.csrfToken;

    // 1. GET /api/platform/v2 returns v2 runtime descriptor
    const getV2Res = await app.fetch(new Request('http://localhost:3000/api/platform/v2', {
      method: 'GET',
      headers: { Cookie: cookie, Origin: 'http://localhost:3000' }
    }));
    expect(getV2Res.status).toBe(200);
    const v2Desc = (await getV2Res.json() as any).data;
    expect(v2Desc.version).toBe('2.0.0');
    // Descriptor mesti menyatakan kebenaran: laluan ini dilayani router
    // kata kunci tempatan, BUKAN runtime CopilotKit/AG-UI rasmi.
    expect(v2Desc.runtime).toBe('local-keyword-router');
    expect(v2Desc.aguiProtocolImplemented).toBe(false);
    expect(v2Desc.copilotkitRuntimeImplemented).toBe(false);
    expect(v2Desc.schema).toBe('a2ui.v1');
    expect(v2Desc.paidFallbackAllowed).toBe(false);
    expect(v2Desc.candidateModels[0].model).toBe('gemini-3.6-flash');
    expect(v2Desc.candidateModels[1].model).toBe('gemini-3.5-flash-lite');
    expect(v2Desc.candidateModels[2].model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');

    // Also verify GET /api/platform/copilot/v2 returns identical descriptor
    const getCopilotV2Res = await app.fetch(new Request('http://localhost:3000/api/platform/copilot/v2', {
      method: 'GET',
      headers: { Cookie: cookie, Origin: 'http://localhost:3000' }
    }));
    expect(getCopilotV2Res.status).toBe(200);
    expect((await getCopilotV2Res.json() as any).data.schema).toBe('a2ui.v1');

    // 2. POST /api/platform/v2 with CopilotKit messages array format
    const postV2Res = await app.fetch(new Request('http://localhost:3000/api/platform/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
        Cookie: cookie,
        'x-csrf-token': csrf
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos' }
        ]
      })
    }));
    expect(postV2Res.status).toBe(200);
    const postV2Data = (await postV2Res.json() as any).data;
    expect(postV2Data.a2ui).toBeDefined();
    expect(postV2Data.a2ui.schemaVersion).toBe('a2ui.v1');
    expect(postV2Data.a2ui.component).toBe('RefundImpactPanel');
    expect(postV2Data.a2ui.provenance).toBeDefined();
    // Tiada penilai margin dan tiada bacaan pangkalan data dijalankan untuk
    // kad ini, jadi provenance TIDAK boleh claiming 'canonical_evaluator'.
    expect(postV2Data.a2ui.provenance.source).toBe('jev_local_rules');
    expect(postV2Data.a2ui.provenance.source).not.toBe('canonical_evaluator');
    expect(postV2Data.a2ui.provenance.source).not.toBe('database');
    expect(postV2Data.hitlAction).toBeDefined();

    // 3. POST /api/platform/v2 with margin simulation inquiry (real inputs)
    const marginV2Res = await app.fetch(new Request('http://localhost:3000/api/platform/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
        Cookie: cookie,
        'x-csrf-token': csrf
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Bolehkah saya buat kempen diskaun margin sekarang? netSalesExTaxSen=10000 cogsSen=6000 packagingSen=200 minimumContributionSen=2000 minimumContributionMarginPct=25'
          }
        ]
      })
    }));
    expect(marginV2Res.status).toBe(200);
    const marginV2Data = (await marginV2Res.json() as any).data;
    const expectedV2Margin = evaluateMarginContribution({
      netSalesExTaxSen: 10000,
      cogsSen: 6000,
      packagingSen: 200,
      paymentFeesSen: 0,
      fulfilmentVariableCostSen: 0,
      deliverySubsidySen: 0,
      agentCommissionSen: 0,
      rewardCostSen: 0,
      expectedReturnLossSen: 0,
      minimumContributionSen: 2000,
      minimumContributionMarginPct: 25,
    });
    expect(marginV2Data.a2ui.component).toBe('MarginSimulator');
    expect(marginV2Data.a2ui.props.contributionMarginPct).toBe(expectedV2Margin.contributionMarginPct);
    expect(marginV2Data.a2ui.props.contributionSen).toBe(expectedV2Margin.contributionSen);
    expect(marginV2Data.a2ui.provenance.source).toBe('canonical_evaluator');

    // 4. POST /api/platform/v2 with SSE stream returns event: a2ui
    const streamV2Res = await app.fetch(new Request('http://localhost:3000/api/platform/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        Origin: 'http://localhost:3000',
        Cookie: cookie,
        'x-csrf-token': csrf
      },
      body: JSON.stringify({
        message: 'Aduan kualiti penutup botol pecah dan bocor',
        stream: true
      })
    }));
    expect(streamV2Res.status).toBe(200);
    expect(streamV2Res.headers.get('content-type')).toContain('text/event-stream');
    const streamV2Text = await streamV2Res.text();
    expect(streamV2Text).toContain('event: start');
    expect(streamV2Text).toContain('a2ui.v1');
    expect(streamV2Text).toContain('event: a2ui');
    expect(streamV2Text).toContain('JevAssessmentCard');
    expect(streamV2Text).toContain('event: done');

    app.close();
    cleanup(db);
  }, 25000);
});
