/**
 * ABANGCOLEK-PLATFORM — Kontrak Runtime Copilot: dinding kuota (HTTP 429)
 *
 * Ujian ini TIDAK bergantung pada keadaan kuota free tier semasa. Semua
 * balasan provider adalah balasan HTTP yang DITANGKAP (literal sebenar),
 * disuntik melalui seam `CopilotRuntimeConfig.adapters` / `fetchFn` adapter.
 *
 * Yang dibuktikan:
 * 1. HTTP 429 → reason code `PROVIDER_QUOTA_EXHAUSTED` + petunjuk tunggu
 *    provider ("Please retry in 19h3m41s") dipaparkan, tidak disembunyikan.
 * 2. HTTP 429 tidak membakar bajet melebihi baki run.
 * 3. Bajet 3 panggilan model tidak pernah dilampaui, dan setiap percubaan
 *    (termasuk kegagalan dan failover) dikira.
 */

import { describe, expect, test } from 'bun:test';
import { CopilotV2Runtime } from '../../server/agents/copilot/runtime';
import { FreeModelRouter } from '../../server/agents/providers/model-router';
import {
  OpenRouterFreeAdapter,
  classifyProviderHttpFailure,
  parseRetryHint,
  parseRetryHintText,
} from '../../server/agents/providers/model-adapters';
import { STRICT_FREE_CANDIDATE_SEQUENCE } from '../../shared/copilot-contracts';
import {
  REAL_GEMINI_QUOTA_BODY,
  VERIFIED_ACTOR,
  chatRequest,
  mockAdapterRegistry,
  mockAdaptersFor,
} from './copilot-runtime-contract-support';

/** 19h3m41s = 68,621,000 ms. */
const EXPECTED_RETRY_AFTER_MS = 19 * 3_600_000 + 3 * 60_000 + 41_000;

describe('Kontrak runtime — dinding kuota provider (HTTP 429)', () => {
  test('HTTP 429 menghasilkan reason code PROVIDER_QUOTA_EXHAUSTED', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'gemini-3.5-flash-lite': { content: 'Jawapan calon kedua.' },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.attempts[0].model).toBe('gemini-3.6-flash');
    expect(json.attempts[0].outcome).toBe('failed');
    expect(json.attempts[0].reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(json.attempts[0].httpStatus).toBe(429);
    expect(json.attempts[0].retryable).toBe(true);
  });

  test('Petunjuk tunggu provider dipaparkan — ia tidak disembunyikan di sebalik kegagalan umum', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'gemini-3.5-flash-lite': { content: 'Jawapan calon kedua.' },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    // Petunjuk tunggu mentah provider ("19h3m41s") mesti kelihatan.
    expect(json.attempts[0].retryAfterMs).toBe(EXPECTED_RETRY_AFTER_MS);
    expect(json.attempts[0].detail).toContain('19h3m41s');
    expect(json.attempts[0].detail).toContain('Quota exceeded');
    // Laporan per-calon juga membawa petunjuk tunggu yang sama.
    expect(json.candidates[0].state).toBe('cooldown');
    expect(json.candidates[0].reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(json.candidates[0].retryAfterMs).toBe(EXPECTED_RETRY_AFTER_MS);
  });

  test('HTTP 429 tidak membakar bajet melebihi baki run (calon ketiga tidak dipanggil)', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'gemini-3.5-flash-lite': { content: 'Jawapan calon kedua.' },
      'nvidia/nemotron-3-ultra-550b-a55b:free': { content: 'Jawapan calon ketiga.' },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('completed');
    expect(json.model).toBe('gemini-3.5-flash-lite');
    // Dua unit bajet: satu gagal (429) + satu berjaya. Tidak ada yang ketiga.
    expect(json.budget.modelCallsMade).toBe(2);
    expect(json.budget.maxModelCalls).toBe(3);
    expect(adapters[0].calls).toHaveLength(1);
    expect(adapters[1].calls).toHaveLength(1);
    expect(adapters[2].calls).toHaveLength(0);
  });

  test('Semua calon terkena 429 → unavailable jujur, bukan completed, dengan retryAfterMs', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'gemini-3.5-flash-lite': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'nvidia/nemotron-3-ultra-550b-a55b:free': {
        httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY },
      },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'PROMPT-TIDAK-BOLEH-DIECHO' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('unavailable');
    expect(json.status).not.toBe('completed');
    expect(json.reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(json.retryAfterMs).toBe(EXPECTED_RETRY_AFTER_MS);
    expect(json.reasonDetail).toContain('19h3m41s');
    expect(json.message.content).not.toContain('PROMPT-TIDAK-BOLEH-DIECHO');
    expect(json.budget.modelCallsMade).toBe(3);
  });

  test('Bajet 3 panggilan model tidak pernah dilampaui sepanjang rantaian failover penuh', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'gemini-3.5-flash-lite': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'nvidia/nemotron-3-ultra-550b-a55b:free': {
        httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY },
      },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.budget.maxModelCalls).toBe(3);
    expect(json.budget.modelCallsMade).toBe(3);
    expect(json.attempts).toHaveLength(3);
    // Setiap percubaan — termasuk yang gagal — dikira terhadap bajet yang sama.
    expect(json.attempts.filter((attempt: { outcome: string }) => attempt.outcome === 'failed')).toHaveLength(3);
    // Setiap calon dicuba tepat sekali: tiada model's attempts' burned dua kali.
    expect(adapters[0].calls).toHaveLength(1);
    expect(adapters[1].calls).toHaveLength(1);
    expect(adapters[2].calls).toHaveLength(1);
    // Urutan calon kekal ketat.
    expect(adapters.map(adapter => adapter.candidate.model)).toEqual([
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
    ]);
  });

  test('Urutan ketat calon kekal dan tiada calon baharu ditambahkan selepas kuota', async () => {
    const router = new FreeModelRouter();
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'gemini-3.5-flash-lite': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
      'nvidia/nemotron-3-ultra-550b-a55b:free': {
        httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY },
      },
    });
    const runtime = new CopilotV2Runtime({ router, adapters: mockAdapterRegistry(adapters) });

    await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );

    expect(router.getCandidateStatuses().map(status => status.candidate.model)).toEqual(
      STRICT_FREE_CANDIDATE_SEQUENCE.map(candidate => candidate.model)
    );
    expect(router.getCandidateStatuses().every(status => status.state === 'cooldown')).toBe(true);
  });
});

describe('Kontrak runtime — pengelas HTTP produksi', () => {
  test('classifyProviderHttpFailure meng recognises 429 sebagai kuota dengan petunjuk tunggu', () => {
    const classified = classifyProviderHttpFailure(429, REAL_GEMINI_QUOTA_BODY);
    expect(classified.reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(classified.retryable).toBe(true);
    expect(classified.retryAfterMs).toBe(EXPECTED_RETRY_AFTER_MS);
  });

  test('parseRetryHint / parseRetryHintText menguraikan "retry in 19h3m41s" dengan tepat', () => {
    expect(parseRetryHintText(REAL_GEMINI_QUOTA_BODY)).toBe('19h3m41s');
    expect(parseRetryHint(REAL_GEMINI_QUOTA_BODY)).toBe(EXPECTED_RETRY_AFTER_MS);
    expect(parseRetryHint('tiada petunjuk tunggu')).toBeUndefined();
  });

  test('Adapter OpenRouter production memetakan HTTP 429 kepada kuota (tanpa network)', async () => {
    const candidate = STRICT_FREE_CANDIDATE_SEQUENCE[2];
    const adapter = new OpenRouterFreeAdapter(candidate, {
      env: { OPENROUTER_API_KEY: 'kunci-ujian' },
      fetchFn: (async () =>
        new Response(REAL_GEMINI_QUOTA_BODY, { status: 429 })) as unknown as typeof fetch,
    });

    let thrown: unknown;
    try {
      await adapter.call({ messages: [{ role: 'user', content: 'x' }], maxInputTokens: 10, maxOutputTokens: 10, timeoutMs: 1000 });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const failure = thrown as { reason?: string; retryable?: boolean; retryAfterMs?: number; httpStatus?: number; message: string };
    expect(failure.reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(failure.retryable).toBe(true);
    expect(failure.retryAfterMs).toBe(EXPECTED_RETRY_AFTER_MS);
    expect(failure.httpStatus).toBe(429);
    expect(failure.message).toContain('19h3m41s');
  });
});
