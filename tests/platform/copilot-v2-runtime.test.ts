import { describe, expect, test } from 'bun:test';
import {
  FreeModelRouter,
  assertFreeModelOnly,
  createBudget,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../server/agents/providers/model-router';
import { CopilotV2Runtime } from '../../server/agents/copilot/runtime';
import {
  REAL_GEMINI_QUOTA_BODY,
  VERIFIED_ACTOR,
  chatRequest,
  mockAdapterRegistry,
  mockAdaptersFor,
} from './copilot-runtime-contract-support';

describe('CPK-01 / AI-01 CopilotKit Runtime Fetch v2 & Free Model Router (Fasa 02)', () => {
  describe('Polisi Sifar Kos (Zero-New-Paid-Cloud-Spend)', () => {
    test('Menolak model berbayar atau model tanpa akhiran :free pada OpenRouter', () => {
      expect(() => assertFreeModelOnly('gpt-4o', 'openai')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
      expect(() => assertFreeModelOnly('claude-3-5-sonnet', 'anthropic')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
      expect(() => assertFreeModelOnly('gemini-1.5-pro-paid', 'google')).toThrow(/PERLANGGARAN POLISI SIFAR KOS/);
      expect(() => assertFreeModelOnly('meta-llama/llama-3-70b-instruct', 'openrouter')).toThrow(/akhiran :free/);
    });

    test('Membenarkan calon model percuma yang sah', () => {
      expect(() => assertFreeModelOnly('gemini-3.6-flash', 'gemini_free')).not.toThrow();
      expect(() => assertFreeModelOnly('gemini-3.5-flash-lite', 'gemini_free')).not.toThrow();
      expect(() => assertFreeModelOnly('nvidia/nemotron-3-ultra-550b-a55b:free', 'openrouter')).not.toThrow();
    });
  });

  describe('Urutan Calon Model Percuma (Strict Candidate Sequence)', () => {
    test('Memilih model mengikut urutan tetap keutamaan 1, 2, 3', () => {
      const router = new FreeModelRouter();
      const budget = createBudget(3, 30000);

      const m1 = router.selectNextCandidate(budget);
      expect(m1.model).toBe('gemini-3.6-flash');
      expect(budget.callsMade).toBe(1);

      // Tandakan m1 cooldown (contohnya kena rate limit 429)
      router.markCooldown(m1);

      const m2 = router.selectNextCandidate(budget);
      expect(m2.model).toBe('gemini-3.5-flash-lite');
      expect(budget.callsMade).toBe(2);

      // Tandakan m2 cooldown
      router.markCooldown(m2);

      const m3 = router.selectNextCandidate(budget);
      expect(m3.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
      expect(budget.callsMade).toBe(3);

      // Had bajet 3 panggilan dicapai
      expect(() => router.selectNextCandidate(budget)).toThrow(/MODEL_BUDGET_EXCEEDED/);
    });

    test('Beralih kepada MODEL_ADAPTER_UNAVAILABLE apabila semua calon model dalam cooldown', () => {
      const router = new FreeModelRouter();
      const budget = createBudget(3, 30000);

      for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) {
        router.markCooldown(candidate);
      }

      expect(() => router.selectNextCandidate(budget)).toThrow(/MODEL_ADAPTER_UNAVAILABLE/);
    });
  });

  describe('CopilotV2Runtime Fetch Request Handler', () => {
    test('Mengendalikan permintaan POST CopilotKit yang sah', async () => {
      // Adapter disuntik melalui seam `CopilotRuntimeConfig.adapters`: tiada
      // panggilan HTTP keluar, tiada bergantung pada kuota free tier.
      const adapters = mockAdaptersFor({
        'gemini-3.6-flash': { content: 'Status pesanan ORD-001 sedang diproses.' },
      });
      const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });
      const req = new Request('http://localhost:3000/api/platform/copilot/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Apakah status pesanan ORD-001?' }],
          threadId: 'thread-test-123',
        }),
      });

      const res = await runtime.handleRequest(req, VERIFIED_ACTOR);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('completed');
      expect(json.threadId).toBe('thread-test-123');
      expect(json.message.content).toContain('ORD-001');

      // KONTRAK, bukan "model mana yang menjawab hari ini". Jawapan mesti
      // datang daripada salah satu calon percuma yang dipin, dan jejak
      // `attempts[]` mesti konsisten dengan model yang dilaporkan. Ini tidak
      // berputar dengan kuota free tier dan tidak pernah menyentuh network.
      const pinned = STRICT_FREE_CANDIDATE_SEQUENCE;
      expect(pinned.map(candidate => candidate.model)).toContain(json.model);
      const winner = pinned.find(candidate => candidate.model === json.model);
      expect(winner).toBeDefined();
      expect(json.providerId).toBe(winner!.providerId);
      expect(() => assertFreeModelOnly(json.model, json.providerId)).not.toThrow();

      const attempts = json.attempts as Array<{
        model: string;
        outcome: string;
        providerId: string;
      }>;
      const billed = attempts.filter(attempt => attempt.outcome !== 'skipped');
      const succeeded = attempts.filter(attempt => attempt.outcome === 'succeeded');
      expect(succeeded).toHaveLength(1);
      expect(succeeded[0].model).toBe(json.model);
      expect(succeeded[0].providerId).toBe(json.providerId);
      // Attempt yang berjaya ialah attempt terakhir.
      expect(attempts[attempts.length - 1].model).toBe(json.model);
      // Setiap panggilan yang dihitung ada dalam jejak — tiada percubaan
      // yang hilang dari jejak.
      expect(json.budget.modelCallsMade).toBe(billed.length);
      expect(json.budget.modelCallsMade).toBeLessThanOrEqual(json.budget.maxModelCalls);
      expect(json.budget.maxModelCalls).toBe(3);
      // Laporan per-calon konsisten dengan jawapan.
      const reported = (json.candidates as Array<{ model: string; state: string }>).find(
        candidate => candidate.model === json.model
      );
      expect(reported?.state).toBe('succeeded');

      // Bukti TIDAK ada panggilan provider sebenar: transport berlabel mock.
      expect(json.transport).toBe('mock');
      expect(json.transport).not.toBe('live');
      expect(adapters[0].calls).toHaveLength(1);
      expect(adapters[1].calls).toHaveLength(0);
      expect(adapters[2].calls).toHaveLength(0);
    });

    test('Failover: apabila calon utama kena 429, runtime pindah ke calon seterusnya', async () => {
      // Perilaku ini diperhatikan pada probe LIVE (calon utama HTTP 429 →
      // failover ke calon kedua dengan status completed). Di sini ia dipin
      // semula secara deterministik melalui mock transport.
      const adapters = mockAdaptersFor({
        'gemini-3.6-flash': { httpFailure: { status: 429, body: REAL_GEMINI_QUOTA_BODY } },
        'gemini-3.5-flash-lite': { content: 'Status pesanan ORD-001 sedang diproses.' },
        'nvidia/nemotron-3-ultra-550b-a55b:free': { content: 'Jawapan calon ketiga.' },
      });
      const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

      const res = await runtime.handleRequest(
        chatRequest({ messages: [{ role: 'user', content: 'Apakah status pesanan ORD-001?' }] }),
        VERIFIED_ACTOR
      );
      const json = await res.json();

      expect(json.status).toBe('completed');
      // Model yang dilaporkan ialah calon yang BENAR-BENAR menjawab.
      expect(json.model).toBe('gemini-3.5-flash-lite');
      expect(json.budget.modelCallsMade).toBe(2);
      expect(json.attempts[0].model).toBe('gemini-3.6-flash');
      expect(json.attempts[0].outcome).toBe('failed');
      expect(json.attempts[0].reason).toBe('PROVIDER_QUOTA_EXHAUSTED');
      expect(json.attempts[0].httpStatus).toBe(429);
      expect(json.attempts[1].model).toBe('gemini-3.5-flash-lite');
      expect(json.attempts[1].outcome).toBe('succeeded');
      // Calon ketiga tidak dibakar — baki bajet tidak dibazirkan.
      expect(adapters[2].calls).toHaveLength(0);
      expect(json.message.content).toContain('ORD-001');
    });

    test('Jawapan model dikembalikan verbatim dan TIDAK mengecho prompt pengguna', async () => {
      const prompt = 'PROMPT-RAHSIA-1234mq9';
      const adapters = mockAdaptersFor({
        'gemini-3.6-flash': { content: 'Status pesanan ORD-001 sedang diproses.' },
      });
      const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });

      const res = await runtime.handleRequest(
        chatRequest({ messages: [{ role: 'user', content: prompt }] }),
        VERIFIED_ACTOR
      );
      const json = await res.json();

      expect(json.status).toBe('completed');
      expect(json.reason).toBe('PROVIDER_CALL_SUCCEEDED');
      expect(json.message.content).toBe('Status pesanan ORD-001 sedang diproses.');
      expect(json.message.content).not.toContain(prompt);
      expect(json.budget.modelCallsMade).toBe(1);
      expect(json.budget.maxModelCalls).toBe(3);
      expect(json.attempts).toHaveLength(1);
      expect(json.attempts[0].outcome).toBe('succeeded');
      expect(json.candidates).toHaveLength(3);
      expect(json.candidates[0].state).toBe('succeeded');
    });

    test('Deterministik: dua run dengan input sama menghasilkan kontrak sama', async () => {
      const build = async () => {
        const adapters = mockAdaptersFor({
          'gemini-3.6-flash': { content: 'Jawapan deterministik.' },
        });
        const runtime = new CopilotV2Runtime({ adapters: mockAdapterRegistry(adapters) });
        const res = await runtime.handleRequest(
          chatRequest({ messages: [{ role: 'user', content: 'Hello' }] }),
          VERIFIED_ACTOR
        );
        const json = await res.json();
        return {
          status: json.status,
          model: json.model,
          reason: json.reason,
          transport: json.transport,
          content: json.message.content,
          calls: json.budget.modelCallsMade,
        };
      };

      expect(await build()).toEqual(await build());
    });

    test('Menolak kaedah GET dengan 405 Method Not Allowed', async () => {
      const runtime = new CopilotV2Runtime({
        adapters: mockAdapterRegistry(mockAdaptersFor()),
      });
      const req = new Request('http://localhost:3000/api/platform/copilot/v2', {
        method: 'GET',
      });

      const res = await runtime.handleRequest(req);
      expect(res.status).toBe(405);
    });

    test('Fallback kepada local_rules secara selamat apabila semua provider awan unavailable', async () => {
      const router = new FreeModelRouter();
      for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) {
        router.markCooldown(candidate);
      }

      const runtime = new CopilotV2Runtime({
        router,
        adapters: mockAdapterRegistry(mockAdaptersFor()),
      });
      const req = new Request('http://localhost:3000/api/platform/copilot/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Uji fallback bila offline' }],
        }),
      });

      const res = await runtime.handleRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('local_rules');
      expect(json.providerId).toBe('local_rules');
      expect(json.message.content).toContain('LOCAL_RULES');
    });
  });
});
