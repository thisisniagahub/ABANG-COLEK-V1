/**
 * ABANGCOLEK-PLATFORM — Kontrak Runtime Copilot: calon mati untuk akaun
 * (HTTP 404), truthfully `unavailable`, dan polisi sifar kos.
 *
 * Ujian ini TIDAK bergantung pada keadaan kuota free tier semasa. Semua
 * balasan provider adalah balasan HTTP yang DITANGKAP (literal sebenar),
 * disuntik melalui seam `CopilotRuntimeConfig.adapters` / `fetchFn` adapter.
 *
 * Yang dibuktikan:
 * 1. HTTP 404 "Not found for account" → calon ditanda mati untuk akaun ini,
 *    dilangkau, sebab direkod, tetapi percubaannya tetap dikira bajet.
 * 2. Calon mati tidak membakar bajet semula pada run seterusnya.
 * 3. Semua calon tidak boleh digunakan → `unavailable` jujur dengan pecahan
 *    sebab setiap calon; tiada `completed` rekaan dan tiada echo prompt.
 * 4. Calon berjaya memulangkan jawapan provider verbatim.
 * 5. Calon berbayar tidak pernah dipilih.
 */

import { describe, expect, test } from 'bun:test';
import { CopilotV2Runtime } from '../../server/agents/copilot/runtime';
import { FreeModelRouter, assertFreeModelOnly } from '../../server/agents/providers/model-router';
import { OpenRouterFreeAdapter } from '../../server/agents/providers/model-adapters';
import {
  STRICT_FREE_CANDIDATE_SEQUENCE,
  type FreeModelCandidate,
} from '../../shared/copilot-contracts';
import {
  REAL_GEMINI_QUOTA_BODY,
  REAL_OPENROUTER_DEAD_CANDIDATE_BODY,
  VERIFIED_ACTOR,
  chatRequest,
  mockAdapterRegistry,
  mockAdaptersFor,
  MockProviderAdapter,
} from './copilot-runtime-contract-support';

const PRIMARY = STRICT_FREE_CANDIDATE_SEQUENCE[0];
const SECONDARY = STRICT_FREE_CANDIDATE_SEQUENCE[1];
const TERTIARY = STRICT_FREE_CANDIDATE_SEQUENCE[2];

describe('Kontrak runtime — calon mati untuk akaun (HTTP 404)', () => {
  test('HTTP 404 menanda calon sebagai unusable, direkodkan, dan attempt dikira bajet', async () => {
    const router = new FreeModelRouter();
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': {
        httpFailure: { status: 404, body: REAL_OPENROUTER_DEAD_CANDIDATE_BODY },
      },
      'gemini-3.5-flash-lite': { content: 'Jawapan calon kedua.' },
    });
    const runtime = new CopilotV2Runtime({ router, adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    // Percubaan yang gagal TETAP dikira terhadap bajet 3 panggilan.
    expect(json.budget.modelCallsMade).toBe(2);
    expect(json.budget.maxModelCalls).toBe(3);

    // Sebab direkod: HTTP 404 "Not found for account" = kegagalan tidak
    // sementara untuk akaun ini.
    expect(json.attempts[0].model).toBe('gemini-3.6-flash');
    expect(json.attempts[0].outcome).toBe('failed');
    expect(json.attempts[0].reason).toBe('PROVIDER_MODEL_NOT_FOUND');
    expect(json.attempts[0].httpStatus).toBe(404);
    expect(json.attempts[0].retryable).toBe(false);
    expect(json.attempts[0].detail).toContain('Not found for account');

    // Calon ditanda mati untuk akaun ini…
    expect(router.isUnusable(PRIMARY)).toBe(true);
    expect(router.getUnusableReason(PRIMARY)).toBe('PROVIDER_MODEL_NOT_FOUND');
    // …dan dilaporkan sebagai `unusable` dalam pecahan sebab.
    expect(json.candidates[0].state).toBe('unusable');
    expect(json.candidates[0].reason).toBe('PROVIDER_MODEL_NOT_FOUND');
    expect(json.candidates[0].detail).toContain('Not found for account');
  });

  test('Calon mati dilangkau pada run seterusnya dan tidak membakar bajet semula', async () => {
    const router = new FreeModelRouter();
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': {
        httpFailure: { status: 404, body: REAL_OPENROUTER_DEAD_CANDIDATE_BODY },
      },
      'gemini-3.5-flash-lite': {
        httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY },
      },
      'nvidia/nemotron-3-ultra-550b-a55b:free': { content: 'Jawapan calon ketiga.' },
    });
    const runtime = new CopilotV2Runtime({ router, adapters: mockAdapterRegistry(adapters) });

    const first = await (
      await runtime.handleRequest(
        chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
        VERIFIED_ACTOR
      )
    ).json();

    expect(first.status).toBe('completed');
    expect(first.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(first.budget.modelCallsMade).toBe(3);

    const second = await (
      await runtime.handleRequest(
        chatRequest({ messages: [{ role: 'user', content: 'Hello lagi' }] }),
        VERIFIED_ACTOR
      )
    ).json();

    // Run kedua: calon mati (unusable) dan calon cooldown (429) dilangkau;
    // hanya calon ketiga yang dipanggil — 1 unit bajet, bukan 3.
    expect(second.status).toBe('completed');
    expect(second.budget.modelCallsMade).toBe(1);
    expect(second.candidates[0].state).toBe('unusable');
    expect(second.candidates[0].reason).toBe('PROVIDER_MODEL_NOT_FOUND');
    expect(second.candidates[1].state).toBe('cooldown');
    expect(second.candidates[1].reason).toBe('PROVIDER_QUOTA_EXHAUSTED');

    // Bukti utama: calon mati hanya pernah dibakar SATU KALI dalam dua run.
    expect(adapters[0].calls).toHaveLength(1);
    expect(adapters[1].calls).toHaveLength(1);
    expect(adapters[2].calls).toHaveLength(2);
  });

  test('Semua calon mati → unavailable jujur dengan pecahan sebab setiap calon', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': {
        httpFailure: { status: 404, body: REAL_OPENROUTER_DEAD_CANDIDATE_BODY },
      },
      'gemini-3.5-flash-lite': {
        httpFailure: { status: 404, body: REAL_OPENROUTER_DEAD_CANDIDATE_BODY },
      },
      'nvidia/nemotron-3-ultra-550b-a55b:free': {
        httpFailure: { status: 404, body: REAL_OPENROUTER_DEAD_CANDIDATE_BODY },
      },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'PROMPT-TIDAK-BOLEH-DIECHO-9911' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    // Tiada `completed` rekaan.
    expect(json.status).toBe('unavailable');
    expect(json.status).not.toBe('completed');
    expect(json.reason).toBe('PROVIDER_MODEL_NOT_FOUND');
    expect(json.code).toBe('RUNTIME_NOT_READY');

    // Tiada echo prompt.
    expect(json.message.content).not.toContain('PROMPT-TIDAK-BOLEH-DIECHO-9911');
    expect(json.message.content).toContain('RUNTIME_NOT_READY');

    // Pecahan sebab bagi SETIAP calon.
    expect(json.candidates).toHaveLength(3);
    for (const candidate of json.candidates) {
      expect(candidate.state).toBe('unusable');
      expect(candidate.reason).toBe('PROVIDER_MODEL_NOT_FOUND');
      expect(candidate.detail).toContain('Not found for account');
    }
    expect(json.budget.modelCallsMade).toBe(3);
    expect(json.attempts).toHaveLength(3);
  });

  test('Adapter OpenRouter production memetakan 404 "Not found for account" kepada kegagalan tidak sementara', async () => {
    const adapter = new OpenRouterFreeAdapter(TERTIARY, {
      env: { OPENROUTER_API_KEY: 'kunci-ujian' },
      fetchFn: (async () =>
        new Response(REAL_OPENROUTER_DEAD_CANDIDATE_BODY, { status: 404 })) as unknown as typeof fetch,
    });

    let thrown: unknown;
    try {
      await adapter.call({
        messages: [{ role: 'user', content: 'x' }],
        maxInputTokens: 10,
        maxOutputTokens: 10,
        timeoutMs: 1000,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const failure = thrown as {
      reason?: string;
      retryable?: boolean;
      httpStatus?: number;
      message: string;
    };
    expect(failure.reason).toBe('PROVIDER_MODEL_NOT_FOUND');
    expect(failure.retryable).toBe(false);
    expect(failure.httpStatus).toBe(404);
    expect(failure.message).toContain('Not found for account');
  });
});

describe('Kontrak runtime — kejayaan dan Closing', () => {
  test('Calon berjaya memulangkan jawapan provider verbatim, status completed, tiada echo prompt', async () => {
    const prompt = 'PROMPT-PENGGUNA-7788xx';
    const reply = 'Status pesanan ORD-001 sedang diproses.';
    const adapters = mockAdaptersFor({ 'gemini-3.6-flash': { content: reply } });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: prompt }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(json.status).toBe('completed');
    expect(json.reason).toBe('PROVIDER_CALL_SUCCEEDED');
    expect(json.message.content).toBe(reply);
    expect(json.message.content).not.toContain(prompt);
    expect(json.model).toBe('gemini-3.6-flash');
    expect(json.providerId).toBe('gemini_free');
    expect(json.transport).toBe('mock');
    expect(json.budget.modelCallsMade).toBe(1);
    expect(json.attempts).toHaveLength(1);
    expect(json.attempts[0].outcome).toBe('succeeded');
    expect(json.candidates[0].state).toBe('succeeded');
  });
});

describe('Kontrak runtime — polisi sifar kos', () => {
  test('Calon berbayar tidak pernah dipilih dan tidak pernah dipanggil', async () => {
    const paidCandidate: FreeModelCandidate = {
      providerId: 'openrouter',
      model: 'gpt-4o',
      name: 'Model berbayar (haram)',
    };
    const paidAdapter = new MockProviderAdapter({ candidate: paidCandidate, content: 'JAWAPAN BAYAR' });
    const router = new FreeModelRouter({ candidates: [paidCandidate] });
    const runtime = new CopilotV2Runtime({
      router,
      adapters: mockAdapterRegistry([paidAdapter]),
    });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    expect(paidAdapter.calls).toHaveLength(0);
    expect(json.status).not.toBe('completed');
    expect(json.reason).toBe('POLICY_VIOLATION_REJECTED');
    expect(json.candidates[0].reason).toBe('POLICY_VIOLATION_REJECTED');
    expect(json.message.content).not.toContain('JAWAPAN BAYAR');
  });

  test('Setiap calon yang dipanggil dalam run normal adalah free', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { content: 'Jawapan.' },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    const response = await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );
    const json = await response.json();

    for (const attempt of json.attempts) {
      const candidate = STRICT_FREE_CANDIDATE_SEQUENCE.find(
        (item: FreeModelCandidate) =>
          item.model === attempt.model && item.providerId === attempt.providerId
      );
      expect(candidate).toBeDefined();
      expect(() => assertFreeModelOnly(candidate!.model, candidate!.providerId)).not.toThrow();
    }
    expect(json.candidates.every((candidate: { model: string }) =>
      candidate.model.endsWith(':free') || candidate.model.startsWith('gemini-')
    )).toBe(true);
  });

  test('Urutan calon yang dipanggil kekal ketat (utama → sandaran → OpenRouter :free)', async () => {
    const adapters = mockAdaptersFor({
      'gemini-3.6-flash': { content: 'Jawapan pertama.' },
    });
    const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

    await runtime.handleRequest(
      chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
      VERIFIED_ACTOR
    );

    expect(adapters.map(adapter => adapter.candidate.model)).toEqual([
      PRIMARY.model,
      SECONDARY.model,
      TERTIARY.model,
    ]);
    expect(adapters[0].calls).toHaveLength(1);
    expect(adapters[1].calls).toHaveLength(0);
    expect(adapters[2].calls).toHaveLength(0);
  });
});
