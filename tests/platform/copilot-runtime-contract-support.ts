/**
 * ABANGCOLEK-PLATFORM — Sokongan Ujian Kontrak Runtime Copilot (Writer K)
 *
 * Adapter mock yang DILABELKAN `transport: 'mock'`. Ia TIDAK pernah memanggil
 * provider dan TIDAK pernah bergantung pada kuota free tier yang sedang
 * berjalan — setiap ujian unit mesti berkeputusan terhadap KONTRAK, bukan
 * terhadap keadaan kuota hari ini.
 *
 * Mock ini menggunakan pengelas produksi `classifyProviderHttpFailure` dan
 * formatter produksi `describeProviderFailure` supaya reason code yang diuji
 * adalah reason code yang benar-benar dikeluarkan runtime ketika provider
 * sebenar menjawab HTTP 429 / 404.
 *
 * Seam suntikan yang digunakan (sama seperti `tests/platform/copilot-runtime-pipeline.test.ts`):
 *   - `new CopilotV2Runtime({ adapters })` → `CopilotRuntimeConfig.adapters`
 *   - `new CopilotV2Runtime({ router })`   → `new FreeModelRouter({ candidates })`
 */

import {
  classifyProviderHttpFailure,
  describeProviderFailure,
  ModelAdapterError,
  type ModelAdapter,
  type ModelAdapterRegistry,
  type ModelCallOutcome,
  type ModelCallRequest,
  type ModelTransportKind,
} from '../../server/agents/providers/model-adapters';
import {
  STRICT_FREE_CANDIDATE_SEQUENCE,
  type FreeModelCandidate,
} from '../../shared/copilot-contracts';
import type { Actor } from '../../shared/platform-contracts';

/** Actor disahkan oleh server (bukan daripada pelayar). */
export const VERIFIED_ACTOR: Actor = {
  userId: 'founder-01',
  workspaceId: 'ws-main',
  membershipVersion: 1,
};

/**
 * Balasan HTTP sebenar yang capturing provider. `body` ialah teks ASAL yang
 * diberikan provider — tiada mesej rekaan.
 */
export interface MockHttpFailure {
  status: number;
  body: string;
}

/** Gangguan tanpa HTTP (contoh endpoint tidak dapat dihubungi). */
export type MockTransportFailure =
  | 'PROVIDER_ENDPOINT_UNREACHABLE'
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_TIMEOUT';

export interface MockAdapterOptions {
  candidate: FreeModelCandidate;
  /** Provider menjawab dengan HTTP bukan-2xx. */
  httpFailure?: MockHttpFailure;
  /** Kegagalan transport tanpa HTTP. */
  transportFailure?: MockTransportFailure;
  /** Menunggu lama lalu melontar timeout (untuk menguji deadline). */
  hangMs?: number;
  /** Kandungan jawapan apabila panggilan berjaya. */
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  /** `false` → adapter tidak mempunyai kelayakan. */
  configured?: boolean;
}

/**
 * ADAPTER MOCK — hanya untuk ujian unit.
 * Ia tidak memanggil provider; ia hanya meniru hasil panggilan keluar dan
 * meng Klassifikasikan kegagalan melalui kod produksi.
 */
export class MockProviderAdapter implements ModelAdapter {
  readonly candidate: FreeModelCandidate;
  readonly transport: ModelTransportKind = 'mock';
  readonly calls: ModelCallRequest[] = [];
  private readonly options: MockAdapterOptions;

  constructor(options: MockAdapterOptions) {
    this.candidate = options.candidate;
    this.options = options;
  }

  isConfigured(): boolean {
    return this.options.configured ?? true;
  }

  credentialSource(): string {
    return 'MOCK_ONLY';
  }

  async call(request: ModelCallRequest): Promise<ModelCallOutcome> {
    this.calls.push(request);
    const hangMs = this.options.hangMs;
    if (hangMs !== undefined) {
      await new Promise(resolve => setTimeout(resolve, hangMs));
      throw new ModelAdapterError('PROVIDER_TIMEOUT', 'mock hang lebih lama daripada deadline');
    }
    const httpFailure = this.options.httpFailure;
    if (httpFailure) {
      const classified = classifyProviderHttpFailure(httpFailure.status, httpFailure.body);
      throw new ModelAdapterError(
        classified.reason,
        describeProviderFailure({
          providerLabel: 'Mock Provider',
          model: this.candidate.model,
          status: httpFailure.status,
          body: httpFailure.body,
          retryAfterMs: classified.retryAfterMs,
        }),
        httpFailure.status,
        { retryable: classified.retryable, retryAfterMs: classified.retryAfterMs }
      );
    }
    const transportFailure = this.options.transportFailure;
    if (transportFailure) {
      throw new ModelAdapterError(transportFailure, `mock failure ${transportFailure}`);
    }
    return {
      content: this.options.content ?? 'Jawapan mock',
      inputTokens: this.options.inputTokens ?? 120,
      outputTokens: this.options.outputTokens ?? 40,
      model: this.candidate.model,
    };
  }
}

/** Registry adapter yang menyuntik mock adapter melalui `CopilotRuntimeConfig.adapters`. */
export function mockAdapterRegistry(adapters: MockProviderAdapter[]): ModelAdapterRegistry {
  return {
    get(candidate: FreeModelCandidate): ModelAdapter | undefined {
      return adapters.find(
        adapter =>
          adapter.candidate.providerId === candidate.providerId &&
          adapter.candidate.model === candidate.model
      );
    },
    list(): ModelAdapter[] {
      return [...adapters];
    },
  };
}

/**
 * Membina mock adapter mengikut urutan ketat calon percuma, dengan
 * penggantian per-calon.
 */
export function mockAdaptersFor(
  overrides: Record<string, Partial<MockAdapterOptions>> = {}
): MockProviderAdapter[] {
  return STRICT_FREE_CANDIDATE_SEQUENCE.map(candidate => {
    const override = overrides[candidate.model] ?? {};
    return new MockProviderAdapter({ candidate, ...override });
  });
}

/** Permintaan POST yang sah untuk runtime. */
export function chatRequest(body: unknown, url = 'http://localhost:3000/api/copilotkit'): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * Mesej provider yang benar-benar ditangkap (evidence luar sebenar).
 * Ia digunakan sebagai literal supaya ujian kekal deterministik walaupun
 * kuota free tier pulih atau Magical.
 */
export const REAL_GEMINI_QUOTA_BODY =
  'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash. Please retry in 19h3m41s.';

/** Mesej provider yang benar-benar ditangkap untuk calon OpenRouter mati. */
export const REAL_OPENROUTER_DEAD_CANDIDATE_BODY =
  "{\"error\":{\"message\":\"Function 'ac74040f-2c58-4d2f-9a2a-1f0b6f5e6c11' Not found for account\",\"code\":404}}";
