/**
 * AbangColek Sovereign GrowthOS — Model Adapter Layer v2.4 (Fasa 02)
 * Zero-New-Paid-Cloud-Spend • Native Google Gemini + App-Owned OpenRouter Adapter
 *
 * Rujukan ini adalah lapisan adapter yang BENAR-benar memanggil provider:
 * - `GeminiFreeAdapter`  : native Google Gemini (SDK `@google/genai` — asas ADK yang sama)
 * - `OpenRouterFreeAdapter`: app-owned BaseLlm-style adapter (node `fetch`, tiada LiteLLM)
 *
 * Tiada dependency baharu dipasang. Tiada lapisan inferens TS Elsewhere.
 * Setiap adapter mesti:
 * 1. menolak model berbayar (lihat `assertFreeModelOnly`),
 * 2. melaporkan penggunaan token sebenar untuk penguatkuasaan bajet,
 * 3. melabel transport (`live` / `mock` / `fixture`) supaya mock tidak pernah
 *    kelihatan sebagai integrasi produksi.
 */

import { GoogleGenAI } from '@google/genai';
import type { FreeModelCandidate } from '../../../shared/copilot-contracts';
import {
  classifyProviderHttpFailure as classifyProviderHttpFailureShared,
  parseProviderRetryHint as parseProviderRetryHintShared,
  parseProviderRetryHintText as parseProviderRetryHintTextShared,
  redactProviderErrorBody,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../../shared/copilot-contracts';

/**
 * Klasifikasi HTTP provider tinggal di `shared/copilot-contracts.ts` supaya
 * router platform (`server/platform`) boleh menggunakan kontrak yang sama
 * tanpa mengimport `server/agents` (module-interface cycle). Nama eksport
 * kekal sama untuk backward-kompatibiliti.
 */
export const classifyProviderHttpFailure = classifyProviderHttpFailureShared;
export const parseRetryHint = parseProviderRetryHintShared;
export const parseRetryHintText = parseProviderRetryHintTextShared;
export { redactProviderErrorBody };

export type AdapterMessageRole = 'system' | 'user' | 'assistant';

export interface AdapterMessage {
  role: AdapterMessageRole;
  content: string;
}

export interface ModelCallRequest {
  messages: AdapterMessage[];
  maxInputTokens: number;
  maxOutputTokens: number;
  /** Baki masa run (ms) — pemanggilan mesti dihentikan selepas tempoh ini. */
  timeoutMs: number;
}

export interface ModelCallOutcome {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export type AdapterFailureReason =
  | 'PROVIDER_CREDENTIALS_MISSING'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_ENDPOINT_UNREACHABLE'
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_EMPTY_RESPONSE'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'PROVIDER_QUOTA_EXHAUSTED'
  | 'PROVIDER_MODEL_NOT_FOUND'
  | 'PROVIDER_ACCESS_DENIED';

export type ModelTransportKind = 'live' | 'mock' | 'fixture';

export class ModelAdapterError extends Error {
  readonly reason: AdapterFailureReason;
  readonly httpStatus?: number;
  /** Adakah kegagalan ini boleh dicuba semula kemudian? */
  readonly retryable: boolean;
  /** Petunjuk tunggu (ms) untuk kegagalan kuota. */
  readonly retryAfterMs?: number;
  /**
   * Petunjuk tunggu asal provider ("19h3m41s"). Diuraikan di sisi server;
   * badan mentah provider tidak pernah dihantar ke pelayar.
   */
  readonly retryHint?: string;

  constructor(
    reason: AdapterFailureReason,
    message: string,
    httpStatus?: number,
    options?: { retryable?: boolean; retryAfterMs?: number; retryHint?: string }
  ) {
    super(message);
    this.name = 'ModelAdapterError';
    this.reason = reason;
    this.retryable = options?.retryable ?? true;
    if (httpStatus !== undefined) this.httpStatus = httpStatus;
    if (options?.retryAfterMs !== undefined) this.retryAfterMs = options.retryAfterMs;
    if (options?.retryHint !== undefined) this.retryHint = options.retryHint;
  }
}

/**
 * Label yang BENAR-BENAR tetap untuk setiap reason code. Label ini ditulis
 * tangan (bukan disalin daripada badan provider) supaya mesej yang sampai
 * ke pelayar hanya mengandungi fakta yang terklasifikasi — tiada badan
 * provider mentah, tiada kunci, tiada ID akaun.
 */
export const PROVIDER_FAILURE_LABELS: Record<AdapterFailureReason, string> = {
  PROVIDER_CREDENTIALS_MISSING: 'Kelayakan provider tidak dikonfigurasikan',
  PROVIDER_TIMEOUT: 'Provider melebihi had masa',
  PROVIDER_ENDPOINT_UNREACHABLE: 'Endpoint provider tidak dapat dihubungi',
  PROVIDER_HTTP_ERROR: 'Ralat HTTP provider',
  PROVIDER_EMPTY_RESPONSE: 'Provider memulangkan jawapan kosong',
  PROVIDER_RESPONSE_INVALID: 'Respons provider tidak sah',
  PROVIDER_QUOTA_EXHAUSTED: 'Quota exceeded',
  PROVIDER_MODEL_NOT_FOUND: 'Not found for account',
  PROVIDER_ACCESS_DENIED: 'Access denied',
};

/**
 * Membina butiran kegagalan provider yang JUJUR tetapi TIDAK bocor:
 * mesej provider sendiri tidak lagi disalin ke dalam mesej. Yang dikekalkan
 * ialah maklumat yang SUDAH diklasifikasi — status HTTP, reason code, label
 * tetap bagi reason code itu, petunjuk tunggu yang diuraikan ("19h3m41s")
 * dan `retryAfterMs`.
 *
 * Badan mentah provider TIDAK pernah masuk ke dalam mesej ini; ia hanya
 * dicatatkan di sisi server melalui `logProviderFailure`.
 */
export function describeProviderFailure(input: {
  providerLabel: string;
  model: string;
  status: number;
  body: string;
  retryAfterMs?: number;
  reason?: AdapterFailureReason;
}): string {
  const classified = classifyProviderHttpFailureShared(input.status, input.body);
  const reason: AdapterFailureReason = input.reason ?? classified.reason;
  const retryAfterMs = input.retryAfterMs ?? classified.retryAfterMs;
  const hintText = parseProviderRetryHintTextShared(input.body);
  const label = PROVIDER_FAILURE_LABELS[reason] ?? PROVIDER_FAILURE_LABELS.PROVIDER_HTTP_ERROR;
  const hintParts: string[] = [];
  if (hintText) hintParts.push(`provider meminta tunggu "${hintText}"`);
  if (retryAfterMs !== undefined) hintParts.push(`retryAfterMs=${retryAfterMs}`);
  const hint = hintParts.length > 0 ? ` [Petunjuk tunggu: ${hintParts.join(', ')}]` : '';
  return `Provider ${input.providerLabel} '${input.model}' gagal: HTTP ${input.status} - ${label} (${reason})${hint}`;
}

/**
 * Sink server-side untuk badan provider mentah. Tiada modul logger dalam
 * `server/`, jadi output langsung ke `console.warn` (log pelayan) digunakan.
 * Kunci dan bahagian yang mengenal pasti akaun disamar sebelum dicetak.
 */
export function logProviderFailure(input: {
  providerLabel: string;
  model: string;
  status?: number;
  reason: AdapterFailureReason;
  body: string;
}): void {
  try {
    console.warn(
      JSON.stringify({
        component: 'copilot_provider_failure',
        provider: input.providerLabel,
        model: input.model,
        status: input.status,
        reason: input.reason,
        body: redactProviderErrorBody(input.body),
      })
    );
  } catch {
    // Pencatatan tidak pernah boleh menggagalkan run.
  }
}

export interface ModelAdapter {
  readonly candidate: FreeModelCandidate;
  readonly transport: ModelTransportKind;
  /** Adakah adapter ini mempunyai kelayakan (kunci API) untuk memanggil provider? */
  isConfigured(): boolean;
  /** Nama pemboleh ubah persekitaran yang membekalkan kelayakan. */
  credentialSource(): string;
  call(request: ModelCallRequest): Promise<ModelCallOutcome>;
}

export interface ModelAdapterOptions {
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  /** URL microservis Python ADK (Native ADK Gemini). */
  adkBridgeUrl?: string;
}

export const DEFAULT_ADK_BRIDGE_URL = 'http://127.0.0.1:8030';
export const ADK_BRIDGE_OPS_ENDPOINT = '/agent/abangcolek_ops';

function readSecret(
  env: Record<string, string | undefined>,
  key: string
): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractSystemPrompt(messages: AdapterMessage[]): string | undefined {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  return system.trim().length > 0 ? system : undefined;
}

function toGeminiContents(messages: AdapterMessage[]) {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, parts: [{ text: m.content }] }));
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: string; message?: string };
  return (
    candidate.name === 'AbortError' ||
    candidate.name === 'TimeoutError' ||
    /abort/i.test(candidate.message ?? '')
  );
}

/**
 * HTTP 400 "invalid argument" — model tidak menerima sebahagian parameter
 * konfigurasi (contoh `thinkingConfig`).
 */
/**
 * Model yang menolak `thinkingConfig` dikesan sekali sahaja untuk seluruh
 * proses, supaya panggilan berikutnya tidak membuang satu pusingan HTTP.
 */
const THINKING_CONFIG_UNSUPPORTED = new Set<string>();

function isInvalidArgumentError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { status?: number; code?: unknown; message?: string };
  const status = typeof candidate.status === 'number' ? candidate.status : undefined;
  const message = candidate.message ?? '';
  if (status === 400) return true;
  return /invalid argument|INVALID_ARGUMENT/i.test(message);
}

function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = error as { status?: unknown; code?: unknown; response?: { status?: unknown } };
  const values = [candidate.status, candidate.code, candidate.response?.status];
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

// ============================================================================
// Native Google Gemini adapter (SDK `@google/genai` — jinak ADK yang sama)
// ============================================================================

export class GeminiFreeAdapter implements ModelAdapter {
  readonly candidate: FreeModelCandidate;
  readonly transport: ModelTransportKind = 'live';
  private readonly apiKey: string | undefined;
  private readonly credentialName: string;
  private readonly client: GoogleGenAI | undefined;

  constructor(candidate: FreeModelCandidate, options?: ModelAdapterOptions) {
    const env = options?.env ?? process.env;
    this.candidate = candidate;
    // SDK `@google/genai` memuat GOOGLE_API_KEY daripada persekitaran dan
    // menggunakannya secara automatik. Kunci itu TIDAK layak untuk akaun ini
    // (403 "Your project has been denied access"), jadi runtime ALWAYS
    // menghantar kunci secara eksplisit: GEMINI_API_KEY didahulukan.
    const geminiKey = readSecret(env, 'GEMINI_API_KEY');
    const googleKey = readSecret(env, 'GOOGLE_API_KEY');
    this.apiKey = geminiKey ?? googleKey;
    this.credentialName = geminiKey ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY';
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  public isConfigured(): boolean {
    return this.client !== undefined;
  }

  public credentialSource(): string {
    return this.credentialName;
  }

  public async call(request: ModelCallRequest): Promise<ModelCallOutcome> {
    const client = this.client;
    if (!client) {
      throw new ModelAdapterError(
        'PROVIDER_CREDENTIALS_MISSING',
        `${this.credentialName} tidak dikonfigurasikan; panggilan provider percuma tidak boleh dibuat.`
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, request.timeoutMs));
    try {
      const response = await this.generateWithFallback(client, request, controller.signal);

      const content = (response.text ?? '').trim();
      if (content.length === 0) {
        throw new ModelAdapterError(
          'PROVIDER_EMPTY_RESPONSE',
          `Provider Gemini '${this.candidate.model}' memulangkan jawapan kosong.`
        );
      }
      const usage = response.usageMetadata;
      return {
        content,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        model: response.modelVersion ?? this.candidate.model,
      };
    } catch (error) {
      if (error instanceof ModelAdapterError) throw error;
      if (isAbortError(error)) {
        throw new ModelAdapterError(
          'PROVIDER_TIMEOUT',
          `Provider Gemini '${this.candidate.model}' melebihi had masa run.`
        );
      }
      const status = httpStatusOf(error);
      if (status !== undefined) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const classified = classifyProviderHttpFailureShared(status, rawMessage);
        // Badan mentah provider kekal di sisi server sahaja.
        logProviderFailure({
          providerLabel: 'Gemini',
          model: this.candidate.model,
          status,
          reason: classified.reason,
          body: rawMessage,
        });
        throw new ModelAdapterError(
          classified.reason,
          describeProviderFailure({
            providerLabel: 'Gemini',
            model: this.candidate.model,
            status,
            body: rawMessage,
            retryAfterMs: classified.retryAfterMs,
            reason: classified.reason,
          }),
          status,
          {
            retryable: classified.retryable,
            retryAfterMs: classified.retryAfterMs,
            retryHint: classified.retryHint,
          }
        );
      }
      const rawMessage = error instanceof Error ? error.message : String(error);
      logProviderFailure({
        providerLabel: 'Gemini',
        model: this.candidate.model,
        reason: 'PROVIDER_ENDPOINT_UNREACHABLE',
        body: rawMessage,
      });
      throw new ModelAdapterError(
        'PROVIDER_ENDPOINT_UNREACHABLE',
        `Provider Gemini '${this.candidate.model}' tidak dapat dihubungi.`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Beberapa calon Gemini (contoh `gemini-3.5-flash-lite`) tidak menerima
   * `thinkingConfig`. Jika model itu menolak permintaan (HTTP 400 invalid
   * argument), panggilan diulang sekali tanpa `thinkingConfig` — masih satu
   * unit bajet panggilan model.
   */
  private async generateWithFallback(
    client: GoogleGenAI,
    request: ModelCallRequest,
    signal: AbortSignal
  ): Promise<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>> {
    const base = {
      model: this.candidate.model,
      contents: toGeminiContents(request.messages),
    };
    const config = {
      systemInstruction: extractSystemPrompt(request.messages),
      maxOutputTokens: request.maxOutputTokens,
      temperature: 0.2,
      abortSignal: signal,
      // SDK secara lalai cuba semula 5 kali; di sini runtime sendiri yang
      // mengawal failover antara calon, jadi satu percubaan sahaja.
      httpOptions: { retryOptions: { attempts: 1 } },
    };

    if (THINKING_CONFIG_UNSUPPORTED.has(this.candidate.model)) {
      return client.models.generateContent({ ...base, config });
    }

    try {
      return await client.models.generateContent({
        ...base,
        config: { ...config, thinkingConfig: { thinkingBudget: 0 } },
      });
    } catch (error) {
      if (!isInvalidArgumentError(error)) throw error;
      THINKING_CONFIG_UNSUPPORTED.add(this.candidate.model);
      return client.models.generateContent({ ...base, config });
    }
  }
}

// ============================================================================
// App-owned BaseLlm-style adapter untuk OpenRouter (node `fetch`)
// Tiada LiteLLM; tiada dependency baharu; model mesti berakhir dengan `:free`.
// ============================================================================

export class OpenRouterFreeAdapter implements ModelAdapter {
  readonly candidate: FreeModelCandidate;
  readonly transport: ModelTransportKind = 'live';
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(candidate: FreeModelCandidate, options?: ModelAdapterOptions) {
    const env = options?.env ?? process.env;
    this.candidate = candidate;
    this.apiKey = readSecret(env, 'OPENROUTER_API_KEY');
    this.baseUrl = readSecret(env, 'OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  public isConfigured(): boolean {
    return this.apiKey !== undefined;
  }

  public credentialSource(): string {
    return 'OPENROUTER_API_KEY';
  }

  public async call(request: ModelCallRequest): Promise<ModelCallOutcome> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new ModelAdapterError(
        'PROVIDER_CREDENTIALS_MISSING',
        'OPENROUTER_API_KEY tidak dikonfigurasikan; panggilan provider percuma tidak boleh dibuat.'
      );
    }
    if (!this.candidate.model.toLowerCase().endsWith(':free')) {
      throw new ModelAdapterError(
        'PROVIDER_HTTP_ERROR',
        `Model '${this.candidate.model}' ditolak: OpenRouter hanya membenarkan model dengan akhiran :free.`
      );
    }

    const system = extractSystemPrompt(request.messages);
    const history = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://abangcolek.gangniaga.my',
          'X-Title': 'AbangColek Sovereign GrowthOS',
        },
        body: JSON.stringify({
          model: this.candidate.model,
          messages: system ? [{ role: 'system', content: system }, ...history] : history,
          max_tokens: request.maxOutputTokens,
          temperature: 0.2,
          usage: { include: true },
        }),
        signal: AbortSignal.timeout(Math.max(1, request.timeoutMs)),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const classified = classifyProviderHttpFailureShared(response.status, detail);
        // Badan mentah provider kekal di sisi server sahaja.
        logProviderFailure({
          providerLabel: 'OpenRouter',
          model: this.candidate.model,
          status: response.status,
          reason: classified.reason,
          body: detail,
        });
        throw new ModelAdapterError(
          classified.reason,
          describeProviderFailure({
            providerLabel: 'OpenRouter',
            model: this.candidate.model,
            status: response.status,
            body: detail,
            retryAfterMs: classified.retryAfterMs,
            reason: classified.reason,
          }),
          response.status,
          {
            retryable: classified.retryable,
            retryAfterMs: classified.retryAfterMs,
            retryHint: classified.retryHint,
          }
        );
      }

      const payload = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = (payload.choices?.[0]?.message?.content ?? '').trim();
      if (content.length === 0) {
        throw new ModelAdapterError(
          'PROVIDER_EMPTY_RESPONSE',
          `Provider OpenRouter '${this.candidate.model}' memulangkan jawapan kosong.`
        );
      }
      return {
        content,
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
        model: payload.model ?? this.candidate.model,
      };
    } catch (error) {
      if (error instanceof ModelAdapterError) throw error;
      if (isAbortError(error)) {
        throw new ModelAdapterError(
          'PROVIDER_TIMEOUT',
          `Provider OpenRouter '${this.candidate.model}' melebihi had masa run.`
        );
      }
      const rawMessage = error instanceof Error ? error.message : String(error);
      logProviderFailure({
        providerLabel: 'OpenRouter',
        model: this.candidate.model,
        reason: 'PROVIDER_ENDPOINT_UNREACHABLE',
        body: rawMessage,
      });
      throw new ModelAdapterError(
        'PROVIDER_ENDPOINT_UNREACHABLE',
        `Provider OpenRouter '${this.candidate.model}' tidak dapat dihubungi.`
      );
    }
  }
}

// ============================================================================
// Registry adapter
// ============================================================================

export interface ModelAdapterRegistry {
  get(candidate: FreeModelCandidate): ModelAdapter | undefined;
  list(): ModelAdapter[];
}

export function createDefaultAdapterRegistry(options?: ModelAdapterOptions): ModelAdapterRegistry {
  // Registry ini dibina daripada kontrak yang sama (`STRICT_FREE_CANDIDATE_SEQUENCE`)
  // supaya model ID tidak pernah berpecah antara kontrak dan adapter.
  const adapters: ModelAdapter[] = STRICT_FREE_CANDIDATE_SEQUENCE.map(candidate =>
    candidate.providerId === 'openrouter'
      ? new OpenRouterFreeAdapter(candidate, options)
      : new GeminiFreeAdapter(candidate, options)
  );

  return {
    get(candidate: FreeModelCandidate): ModelAdapter | undefined {
      return adapters.find(
        adapter => adapter.candidate.providerId === candidate.providerId && adapter.candidate.model === candidate.model
      );
    },
    list(): ModelAdapter[] {
      return [...adapters];
    },
  };
}
