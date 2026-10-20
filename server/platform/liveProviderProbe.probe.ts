/**
 * ABANGCOLEK-PLATFORM — Live provider probe harness (evidence lane, 21 Oktober 2026)
 *
 * Harness ini memanggil laluan SEBENAR (bukan mock) untuk mengumpul bukti live
 * bagi baris ledger CPK-01 (chat runtime — real provider call) dan AI-01
 * (free model routing — real provider, failover, truthful fallback).
 *
 * Laluan yang digunakan (TIADA laluan selari yang direka):
 *
 * 1. `CopilotV2Runtime` (`server/agents/copilot/runtime.ts`) dengan adapter
 *    sebenar (`createDefaultAdapterRegistry`) — runtime yang sama seperti
 *    `api/copilotkit.ts` (`POST /api/copilotkit`).
 * 2. `server/platform/freeModelRouter.ts` (router legacy platform) dengan
 *    calon yang didokumentasikan dalam
 *    `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`.
 *
 * KAWALAN BAJET (mengikut arahan bukti live 21 Okt 2026):
 *
 * - Maksimum 1 permintaan HTTP bagi setiap provider + calon.
 * - Jika satu provider memulangkan HTTP 429 (kuota free tier), TIADA
 *   permintaan进一步的 kepada provider yang sama dihantar.
 * - Tiada maklum balas provider mentah dicetak atau disimpan; laporan
 *   hanya mengandungi: provider id, model id, status HTTP, reason code,
 *   latensi ms dan ringkasan satu baris yang dipangkas.
 * - Tiada kunci API dicetak, dilog atau ditulis ke mana-mana fail.
 *
 * HARNESS INI TIDAK DITEMUI AUTOMATIK oleh `bun test` (nama fail tidak
 * sepadan dengan corak `*.test.ts` / `*.spec.ts`) dan ia `skip` secara
 * lalai. Ia hanya berjalan apabila `ABANGCOLEK_LIVE_PROVIDERS=1` hadir,
 * supaya suite unit tidak pernah memakan kuota free tier luar.
 */

import { describe, expect, test } from 'bun:test';
import { CopilotV2Runtime } from '../agents/copilot/runtime';
import { FreeModelRouter } from '../agents/providers/model-router';
import { createDefaultAdapterRegistry } from '../agents/providers/model-adapters';
import { AdkBridgeClient } from '../agents/adk-bridge/client';
import {
  STRICT_FREE_CANDIDATE_SEQUENCE,
  type FreeModelCandidate,
} from '../../shared/copilot-contracts';
import type { Actor } from '../../shared/platform-contracts';
import { FreeModelRouter as PlatformFreeModelRouter } from './freeModelRouter';

/**
 * Suite `bun test` memuatkan `tests/setup/offline-providers.ts` yang
 * menetapkan `ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1`. Router platform
 * (`server/platform/freeModelRouter.ts`) menolak panggilan keluar dalam mod
 * itu, jadi probe langsung perlu mematikannya semula.
 */
process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS = '0';

const LIVE_ENABLED = process.env.ABANGCOLEK_LIVE_PROVIDERS === '1';

/**
 * Langkah probe yang dipilih (`ABANGCOLEK_LIVE_PROBE_STEPS`, nilai `all` atau
 * senarai dipisah koma). Selection ini membolehkan probe semula dijalankan
 * tanpa membakar kuota provider yang sama dua kali.
 */
const REQUESTED_STEPS = new Set(
  (process.env.ABANGCOLEK_LIVE_PROBE_STEPS ?? 'all')
    .split(',')
    .map(step => step.trim())
    .filter(step => step.length > 0)
);

function shouldRun(step: string): boolean {
  return REQUESTED_STEPS.has('all') || REQUESTED_STEPS.has(step);
}

/** Actor server (bukan daripada pelayar) — berdiri untuk session resolver. */
const PROBE_ACTOR: Actor = {
  userId: 'probe-live-01',
  workspaceId: 'ws-live-probe',
  membershipVersion: 1,
};

/** Canari anti-echo: penjawab tidak boleh memuat kod dalaman ini. */
const ECHO_CANARY = 'ECHO-CANARY-4F7Q';

const USER_PROMPT = `Ringkaskan status penghantaran pesanan ORD-8811 dalam satu ayat Bahasa Melayu. Jangan sertakan sebarang kod dalaman ${ECHO_CANARY}.`;

/** Bentuk respons runtime yang digunakan oleh probe (subset yang dibaca). */
interface RuntimeProbeBody {
  status?: string;
  reason?: string;
  reasonDetail?: string;
  code?: string;
  servedBy?: string;
  transport?: string;
  model?: string;
  providerId?: string;
  message?: { content?: string };
  attempts?: Array<{
    model?: string;
    providerId?: string;
    outcome?: string;
    reason?: string;
    httpStatus?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    retryHint?: string;
    inputTokens?: number;
    outputTokens?: number;
  }>;
  candidates?: Array<{
    model?: string;
    providerId?: string;
    state?: string;
    reason?: string;
    httpStatus?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    retryHint?: string;
  }>;
  budget?: {
    maxModelCalls?: number;
    modelCallsMade?: number;
    deadlineMs?: number;
    inputTokensUsed?: number;
    outputTokensUsed?: number;
  };
}

interface RuntimeProbeResult {
  label: string;
  latencyMs: number;
  httpStatus: number;
  body: RuntimeProbeBody;
}

interface PlatformProbeResult {
  label: string;
  latencyMs: number;
  providerId?: string;
  model?: string;
  status?: string;
  reason?: string;
  blockingReason?: string;
  budgetBlockReason?: string;
  contentExcerpt?: string;
  candidates?: Array<{
    providerId?: string;
    model?: string;
    state?: string;
    reason?: string;
    httpStatus?: number;
    retryAfterMs?: number;
    retryHint?: string;
  }>;
  budget?: {
    maxProviderCalls?: number;
    providerCallsMade?: number;
    deadlineMs?: number;
    outputTokensUsed?: number;
  };
}

function oneLine(value: string | undefined, max = 140): string | undefined {
  if (!value) return undefined;
  const flat = value.replace(/\s+/g, ' ').trim();
  if (flat.length === 0) return undefined;
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function makeRuntime(candidates: readonly FreeModelCandidate[]): CopilotV2Runtime {
  return new CopilotV2Runtime({
    router: new FreeModelRouter({ candidates }),
    adapters: createDefaultAdapterRegistry(),
    // Jambatan Python ADK bukan sebahagian urutan calon free dan tidak
    // dijalankan dalam persekitaran ini; ia dilumpuhkan secara eksplisit
    // supaya bajet 3 panggilan tidak dibakar oleh jambatan.
    bridge: new AdkBridgeClient({ baseUrl: '' }),
  });
}

async function probeRuntime(
  label: string,
  candidates: readonly FreeModelCandidate[],
  actor: Actor | undefined,
  extraPayload: Record<string, unknown> = {}
): Promise<RuntimeProbeResult> {
  const runtime = makeRuntime(candidates);
  const request = new Request('http://127.0.0.1/api/copilotkit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: USER_PROMPT }],
      threadId: 'thread-live-probe',
      runId: 'run-live-probe',
      ...extraPayload,
    }),
  });

  const startedAt = Date.now();
  const response = await runtime.handleRequest(request, actor);
  const latencyMs = Date.now() - startedAt;
  const body = (await response.json()) as RuntimeProbeBody;
  return { label, latencyMs, httpStatus: response.status, body };
}

async function probePlatformRouter(
  label: string,
  candidateModels: Array<{ providerId: string; model: string }>
): Promise<PlatformProbeResult> {
  const router = new PlatformFreeModelRouter('gemini_free');
  const startedAt = Date.now();
  const result = await router.complete([{ role: 'user', content: USER_PROMPT }], {
    candidateModels,
    maxTokens: 256,
    timeoutMs: 8000,
  });
  const latencyMs = Date.now() - startedAt;
  return {
    label,
    latencyMs,
    providerId: result.providerId,
    model: result.model,
    status: result.status,
    reason: result.reason,
    blockingReason: result.blockingReason,
    budgetBlockReason: result.budgetBlockReason,
    contentExcerpt: oneLine(result.content),
    candidates: result.candidates,
    budget: result.budget,
  };
}

/**
 * Bukti yang dicetak: Tiada kunci, tiada badan provider mentah. Hanya
 * provider id, model id, status HTTP, reason code, latensi ms dan ringkasan
 * satu baris.
 */
function summarise(results: {
  runtime: RuntimeProbeResult[];
  platform: PlatformProbeResult[];
}): {
  meta: Record<string, unknown>;
  runtimeRuns: Record<string, unknown>[];
  platformRuns: Record<string, unknown>[];
} {
  const meta = {
    probeDate: new Date().toISOString(),
    userPromptExcerpt: oneLine(USER_PROMPT),
    echoCanary: ECHO_CANARY,
  };
  return {
    meta,
    runtimeRuns: results.runtime.map(run => ({
      label: run.label,
      latencyMs: run.latencyMs,
      httpStatus: run.httpStatus,
      status: run.body.status,
      reason: run.body.reason,
      servedBy: run.body.servedBy,
      transport: run.body.transport,
      providerId: run.body.providerId,
      model: run.body.model,
      code: run.body.code,
      contentExcerpt: oneLine(run.body.message?.content),
      attempts: run.body.attempts,
      candidates: run.body.candidates,
      budget: run.body.budget,
    })),
    platformRuns: results.platform.map(run => ({
      label: run.label,
      latencyMs: run.latencyMs,
      providerId: run.providerId,
      model: run.model,
      status: run.status,
      reason: run.reason,
      blockingReason: run.blockingReason,
      budgetBlockReason: run.budgetBlockReason,
      contentExcerpt: run.contentExcerpt,
      candidates: run.candidates,
      budget: run.budget,
    })),
  };
}

describe.skipIf(!LIVE_ENABLED)('live provider probe (evidence lane)', () => {
  test(
    'probes the real free-provider path once per provider+candidate',
    async () => {
      // Log provider mentah disekat semasa probe: badan provider tidak
      // pernah dicetak (mesti kekal di sisi server sahaja).
      const originalWarn = console.warn;
      console.warn = () => {};

      const runtimeResults: RuntimeProbeResult[] = [];
      const platformResults: PlatformProbeResult[] = [];

      try {
        const [primary, secondary, tertiary] = STRICT_FREE_CANDIDATE_SEQUENCE;
        const deadRegisteredCandidate: FreeModelCandidate = {
          providerId: 'openrouter',
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          name: 'NVIDIA Nemotron 3 Super 120B Free (register-documented dead candidate)',
        };

        // (0) Gerbang actor: TIDAK ada actor server. Badan permintaan
        //     membawa actor palsu daripada "pelayar" — ia mesti diabaikan.
        let gateRun: RuntimeProbeResult | undefined;
        if (shouldRun('gate')) {
          gateRun = await probeRuntime('actor-gate:no-server-actor', [primary], undefined, {
            actor: { userId: 'pelayar-palsu', workspaceId: 'ws-hijack' },
          });
          runtimeResults.push(gateRun);
        }

        // (1) Calon #1 — gemini_free / gemini-3.6-flash (1 permintaan).
        let primaryQuotaBlocked = false;
        if (shouldRun('c1')) {
          const runPrimary = await probeRuntime('candidate#1:gemini-3.6-flash', [primary], PROBE_ACTOR);
          runtimeResults.push(runPrimary);
          primaryQuotaBlocked =
            runPrimary.body.attempts?.some(
              attempt => attempt.reason === 'PROVIDER_QUOTA_EXHAUSTED'
            ) ?? false;
        }

        // (2) Calon #2 — gemini_free / gemini-3.5-flash-lite. Hanya jika
        //     calon #1 TIDAK mengembalikan HTTP 429 (dinding kuota).
        if (shouldRun('c2') && !primaryQuotaBlocked) {
          const runSecondary = await probeRuntime('candidate#2:gemini-3.5-flash-lite', [secondary], PROBE_ACTOR);
          runtimeResults.push(runSecondary);
        }

        // (3) Calon #3 — openrouter / nvidia/nemotron-3-ultra-550b-a55b:free.
        if (shouldRun('c3')) {
          const runTertiary = await probeRuntime('candidate#3:openrouter-nemotron-ultra', [tertiary], PROBE_ACTOR);
          runtimeResults.push(runTertiary);
        }

        // (4) Calon mati yang didokumentasikan dalam register (HTTP 404
        //     "Function ... Not found for account" pada 20 Okt) melalui
        //     router LEGACY platform. Registry adapter runtime hanya
        //     membina adapter untuk urutan ketat, jadi router legacy
        //     adalah laluan sebenar yang boleh memanggil calon ini.
        if (shouldRun('platform-dead')) {
          platformResults.push(
            await probePlatformRouter('platform-router:register-dead-candidate', [
              {
                providerId: deadRegisteredCandidate.providerId,
                model: deadRegisteredCandidate.model,
              },
            ])
          );
        }

        // (5) Router legacy platform — calon live yang didokumentasikan
        //     dalam register (NVIDIA NIM terus).
        if (shouldRun('platform-live')) {
          platformResults.push(
            await probePlatformRouter('platform-router:nvidia-nemotron-ultra', [
              { providerId: 'nvidia', model: 'nvidia/nemotron-3-ultra-550b-a55b' },
            ])
          );
        }

        // (6) Router legacy platform — laluan local (tanpa kuota luar)
        //     untuk mengukur pelabelan fallback yang jujur.
        if (shouldRun('platform-fallback')) {
          platformResults.push(
            await probePlatformRouter('platform-router:ollama-local', [
              { providerId: 'ollama', model: 'llama3.2:latest' },
            ])
          );
        }

        const summary = summarise({ runtime: runtimeResults, platform: platformResults });
        // Dicetak satu baris JSON bagi setiap run supaya output mudah dibaca
        // dan tiada satu baris panjang.
        console.log('LIVE_PROBE_SUMMARY_BEGIN');
        console.log(`LIVE_PROBE_META ${JSON.stringify(summary.meta)}`);
        for (const run of summary.runtimeRuns) {
          console.log(`LIVE_PROBE_RUNTIME ${JSON.stringify(run)}`);
        }
        for (const run of summary.platformRuns) {
          console.log(`LIVE_PROBE_PLATFORM ${JSON.stringify(run)}`);
        }
        console.log('LIVE_PROBE_SUMMARY_END');

        // --- Invarian yang WAJIB hold pada laluan live ---
        // 1. Gerbang actor: gagal tutup, TIDAK ada panggilan provider.
        if (gateRun) {
          expect(gateRun.body.status).toBe('unavailable');
          expect(gateRun.body.reason).toBe('ACTOR_NOT_VERIFIED');
          expect(gateRun.body.attempts ?? []).toHaveLength(0);
          expect(gateRun.body.servedBy).toBe('none');
          expect(gateRun.body.message?.content ?? '').not.toContain(ECHO_CANARY);
        }

        // 2. Tiada jawapan yang merupakan echo prompt pengguna.
        for (const run of runtimeResults) {
          if (run === gateRun) continue;
          const content = run.body.message?.content ?? '';
          expect(content).not.toBe(USER_PROMPT);
          expect(content.includes(USER_PROMPT)).toBe(false);
        }

        // 3. Bajet run: maksimum 3 panggilan model, deadline 30 saat,
        //    had token per-panggilan dan kumulatif.
        for (const run of runtimeResults) {
          if (run === gateRun) continue;
          const budget = run.body.budget;
          if (!budget) continue;
          expect(budget.modelCallsMade ?? 0).toBeLessThanOrEqual(3);
          expect(budget.maxModelCalls).toBe(3);
          expect(budget.deadlineMs).toBe(30000);
          expect(run.latencyMs).toBeLessThanOrEqual(30000);
          expect(budget.outputTokensUsed ?? 0).toBeLessThanOrEqual(3072);
          expect(budget.inputTokensUsed ?? 0).toBeLessThanOrEqual(24576);
        }

        // 4. Setiap run memanggil provider live (transport live) atau gagal
        //    dengan reason code sebenar — tiada jawapan reka.
        for (const run of runtimeResults) {
          if (run === gateRun) continue;
          const status = run.body.status ?? '';
          expect(['completed', 'partial', 'unavailable', 'local_rules']).toContain(status);
          if (status === 'completed') {
            expect(run.body.transport).toBe('live');
            expect(run.body.reason).toBe('PROVIDER_CALL_SUCCEEDED');
          } else {
            expect(run.body.reason).toBeTruthy();
          }
        }
      } finally {
        console.warn = originalWarn;
      }
    },
    300_000
  );
});
