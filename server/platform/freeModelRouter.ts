/**
 * AbangColek Sovereign GrowthOS — Free Model Router v1.0
 * Zero-New-Paid-Cloud-Spend • Multi-Provider Free Tier Failover
 * 
 * Providers Supported:
 * 1. OpenRouter Free (:free models)
 * 2. NVIDIA NIM (integrate.api.nvidia.com)
 * 3. OpenCode Zen (opencode.ai/zen/v1)
 * 4. Google Gemini Free (generativelanguage.googleapis.com)
 * 5. Ollama Local / Cloud (127.0.0.1:11434)
 * 6. Groq / OpenAI Codex Compatible (api.groq.com)
 */

import {
  COPILOT_RUN_BUDGET,
  checkRunTokenBudget,
  classifyProviderHttpFailure,
  createRunBudgetTracker,
  recordRunTokenUsage,
  redactProviderErrorBody,
  remainingRunBudgetMs,
  type CopilotRunBudgetBlockReason,
  type CopilotRunBudgetPolicy,
  type FreeModelCandidate,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../shared/copilot-contracts';

export { type FreeModelCandidate, STRICT_FREE_CANDIDATE_SEQUENCE };

export interface FreeProviderConfig {
  id: 'openrouter' | 'nvidia' | 'opencode_zen' | 'gemini_free' | 'ollama' | 'groq';
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  contextWindow: number;
  rateLimitNote: string;
}

export function assertFreeModelOnly(modelName: string, providerId: string): void {
  const lower = modelName.toLowerCase();
  if (
    lower.includes(':paid') ||
    lower.includes('gpt-4o') ||
    lower.includes('claude-3-5') ||
    lower.includes('claude-3-opus') ||
    lower.includes('gemini-1.5-pro-paid')
  ) {
    throw new Error(`PERLANGGARAN POLISI SIFAR KOS: Model '${modelName}' dikesan sebagai model berbayar. Tiada paid fallback dibenarkan.`);
  }
  if (providerId === 'openrouter' && !lower.endsWith(':free')) {
    throw new Error(`PERLANGGARAN POLISI SIFAR KOS: OpenRouter hanya dibenarkan model dengan akhiran :free. Model '${modelName}' ditolak.`);
  }
}

export const FREE_PROVIDERS: Record<string, FreeProviderConfig> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Free Tier',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    // Disahkan HTTP 200 secara live pada 20 Oktober 2026. Shay lama
    // `nvidia/nemotron-3-super-120b-a12b:free` memulangkan HTTP 404
    // "Function ... Not found for account" untuk akaun ini.
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    contextWindow: 131072,
    rateLimitNote: 'Free tier with rotating community quota (:free)',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM Flagship Free',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_API_KEY',
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b',
    contextWindow: 131072,
    rateLimitNote: 'Free 1,000 requests per key tier',
  },
  opencode_zen: {
    id: 'opencode_zen',
    name: 'OpenCode Zen Coding Free',
    baseUrl: 'https://opencode.ai/zen/v1',
    apiKeyEnv: 'OPENCODE_ZEN_API_KEY',
    defaultModel: 'x-preview-f-free',
    contextWindow: 1048576,
    rateLimitNote: '1M context free tier for developer tools',
  },
  gemini_free: {
    id: 'gemini_free',
    name: 'Google Gemini Flash (AI Studio)',
    // Tanpa trailing slash: router menambah `/chat/completions`, jadi trailing
    // slash menghasilkan URL berganda (`/openai//chat/completions`) yang
    // memulangkan HTTP 404 kosong.
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-3.6-flash',
    contextWindow: 1048576,
    rateLimitNote: '15 RPM / 1M TPM free tier',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama Local / Cloud',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
    apiKeyEnv: 'OLLAMA_API_KEY',
    defaultModel: 'llama3.2:latest',
    contextWindow: 32768,
    rateLimitNote: '100% Unlimited local hardware',
  },
  groq: {
    id: 'groq',
    name: 'Groq LPUs (Fast Free Tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    contextWindow: 131072,
    rateLimitNote: '30 RPM free tier',
  },
};

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface CompletionOptions {
  providerOrder?: ('openrouter' | 'nvidia' | 'opencode_zen' | 'gemini_free' | 'ollama' | 'groq')[];
  candidateModels?: Array<{ providerId: string; model: string }>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  stream?: boolean;
  /**
   * Bajet run yang mengikat router ini. Default ialah `COPILOT_RUN_BUDGET`
   * (3 panggilan provider, deadline 30 saat, had token per-panggilan dan
   * kumulatif) — kontrak yang SAMA seperti runtime Copilot.
   */
  budget?: CopilotRunBudgetPolicy;
}

export interface CompletionResult {
  providerId: string;
  model: string;
  content: string;
  /**
   * `live` = jawapan datang daripada panggilan HTTP sebenar kepada provider.
   * `local_rules` = jawapan dijana secara lokal oleh platform TIADA provider
   * yang dipanggil. Nilai ini Wajib dipaparkan; `local_rules` tidak boleh
   * disamakan dengan jawapan model awam (blueprint:293).
   */
  status?: 'live' | 'local_rules';
  /** Reason code eksplisit untuk keputusan runtime. */
  reason?: string;
  /**
   * Reason code sekatan bajet — ditetapkan HANYA apabila had bajet yang nyata
   * menghalang failover. Nilai ini tidak pernah diteka.
   */
  budgetBlockReason?: CopilotRunBudgetBlockReason;
  /** Ringkasan penggunaan bajet bagi run ini (sejajar dengan runtime Copilot). */
  budget?: {
    maxProviderCalls: number;
    providerCallsMade: number;
    deadlineMs: number;
    outputTokensUsed: number;
    maxOutputTokensPerCall: number;
    maxCumulativeOutputTokens: number;
  };
  toolCalls?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Provider id yang digunakan apabila jawapan dijana secara lokal oleh platform. */
export const LOCAL_RULES_PROVIDER_ID = 'local_rules';
/** Model id (bukan model awam) untuk jawapan yang dijana secara lokal. */
export const LOCAL_RULES_MODEL_ID = 'local-rules-deterministic';
/** Reason code untuk jawapan tanpa panggilan provider. */
export const LOCAL_RULES_REASON = 'LOCAL_RULES_NO_PROVIDER_RESPONSE';
/**
 * Reason code untuk jawapan tempatan apabila had bajet yang nyata menghalang
 * failover provider. Jawapan ini TIDAK daripada model awam — ia dilabel
 * dengan jujur sebagai `local_rules`.
 */
export const LOCAL_RULES_BUDGET_EXHAUSTED_REASON = 'LOCAL_RULES_BUDGET_EXHAUSTED';

/**
 * Kesalahan provider yang TIDAK membawa mesej mentah provider. `code` ialah
 * reason code yang stabil; `message` ialah mesej tetap dalam Bahasa Melayu.
 */
export class FreeModelProviderError extends Error {
  readonly code: string;
  readonly httpStatus?: number;

  constructor(code: string, message: string, httpStatus?: number) {
    super(message);
    this.name = 'FreeModelProviderError';
    this.code = code;
    if (httpStatus !== undefined) this.httpStatus = httpStatus;
  }
}

/**
 * Mesej tetap ( Bahasa Melayu ) untuk setiap reason code provider. Mesej
 * provider yang mentah TIDAK pernah dihantar ke pelayar.
 */
export const CLIENT_SAFE_ERROR_MESSAGES: Record<string, string> = {
  PROVIDER_QUOTA_EXHAUSTED:
    'Penyedia model menolak permintaan kerana kuota free tier habis. Cuba lagi selepas tempoh tunggu yang diberikan.',
  PROVIDER_MODEL_NOT_FOUND:
    'Model yang diminta tidak tersedia untuk akaun ini.',
  PROVIDER_ACCESS_DENIED:
    'Akses kepada penyedia model ditolak untuk akaun ini.',
  PROVIDER_HTTP_ERROR:
    'Penyedia model mengembalikan ralat HTTP. Cuba lagi sebentar nanti.',
  PROVIDER_UNAVAILABLE:
    'Tiada penyedia model percuma yang dapat dihubungi buat masa ini.',
  MODEL_BUDGET_EXCEEDED:
    'Had panggilan model bagi run ini telah dicapai.',
  MODEL_DEADLINE_EXCEEDED:
    'Had masa run telah tamat sebelum jawapan diterima.',
  MODEL_TOKEN_BUDGET_EXCEEDED:
    'Had token run telah dicapai.',
};

/**
 * Menukar reason code kepada mesej tetap yang selamat dihantar ke pelayar.
 * Mesej provider yang mentah TIDAK pernah digunakan di sini.
 */
export function clientSafeErrorMessage(code: string | undefined): string {
  if (!code) return 'Ralat Copilot: permintaan tidak dapat diproses.';
  return CLIENT_SAFE_ERROR_MESSAGES[code] ?? 'Ralat Copilot: permintaan tidak dapat diproses.';
}

/**
 * Sink server-side untuk badan provider mentah (router platform). Tiada
 * modul logger dalam `server/`, jadi `console.warn` digunakan. Badan yang
 * dicetak sudah disamar — kunci dan ID akaun tidak pernah dicetak.
 */
export function logPlatformProviderFailure(input: {
  provider: string;
  model: string;
  status?: number;
  reason: string;
  body: string;
}): void {
  try {
    console.warn(
      JSON.stringify({
        component: 'platform_provider_failure',
        provider: input.provider,
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

/**
 * Mod offline: panggilan provider langsung dilumpuhkan.
 *
 * Suite ujian dijalankan dengan `ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1` supaya
 * ia tidak bergantung pada kuota free tier luar (limit 20 permintaan/hari
 * pada Gemini) dan tidak memakannya — ujian yang bergantung pada luar gagal
 * secara rawak dan上进kan kos kuota produksi.
 */
export function liveProvidersDisabled(): boolean {
  return process.env.ABANGCOLEK_DISABLE_LIVE_PROVIDERS === '1';
}

/**
 * Estimasi token (heuristik 4 aksara = 1 token) untuk senarai mesej.
 */
function estimateMessageTokens(messages: ChatMessageParam[]): number {
  return messages.reduce(
    (total, message) => total + Math.ceil((message.content?.length ?? 0) / 4),
    0
  );
}

/**
 * Memangkas sejarah mesej supaya permintaan/provider call tidak pernah
 * melebihi had input per-panggilan. Mesej sistem dikekalkan; mesej terkini
 * dikekalkan dan dipangkas hanya jika perlu.
 */
function trimMessagesToTokenBudget(
  messages: ChatMessageParam[],
  maxInputTokens: number
): ChatMessageParam[] {
  if (estimateMessageTokens(messages) <= maxInputTokens) return messages;
  const system = messages.filter(message => message.role === 'system');
  const rest = messages.filter(message => message.role !== 'system');
  let used = estimateMessageTokens(system);
  const kept: ChatMessageParam[] = [];
  for (let index = rest.length - 1; index >= 0; index -= 1) {
    const cost = estimateMessageTokens([rest[index]]);
    if (used + cost > maxInputTokens) break;
    used += cost;
    kept.unshift(rest[index]);
  }
  if (kept.length === 0 && rest.length > 0) {
    const last = rest[rest.length - 1];
    const room = Math.max(0, maxInputTokens - used);
    kept.push({ ...last, content: last.content.slice(0, room * 4) });
  }
  return [...system, ...kept];
}

export class FreeModelRouter {
  private activeProviderId: string = 'gemini_free';
  public enableDeterministicFallback: boolean = true;
  private mockHandler: ((messages: ChatMessageParam[], options: CompletionOptions) => Promise<CompletionResult | null>) | null = null;

  constructor(defaultProvider: string = 'gemini_free') {
    if (FREE_PROVIDERS[defaultProvider]) {
      this.activeProviderId = defaultProvider;
    }
  }

  getStrictFreeCandidates(): readonly FreeModelCandidate[] {
    return STRICT_FREE_CANDIDATE_SEQUENCE;
  }

  setMockHandler(handler: ((messages: ChatMessageParam[], options: CompletionOptions) => Promise<CompletionResult | null>) | null) {
    this.mockHandler = handler;
  }

  getActiveProvider(): FreeProviderConfig {
    return FREE_PROVIDERS[this.activeProviderId] || FREE_PROVIDERS.gemini_free;
  }

  setActiveProvider(providerId: string): boolean {
    if (FREE_PROVIDERS[providerId]) {
      this.activeProviderId = providerId;
      return true;
    }
    return false;
  }

  listProviders(): Array<FreeProviderConfig & { isConfigured: boolean; isActive: boolean }> {
    return Object.values(FREE_PROVIDERS).map((p) => ({
      ...p,
      isConfigured: p.id === 'ollama' ? true : !!process.env[p.apiKeyEnv],
      isActive: p.id === this.activeProviderId,
    }));
  }

  /**
   * Execute chat completion with automatic zero-cost failover adhering strictly to
   * 1. gemini-3.6-flash
   * 2. gemini-3.5-flash-lite
   * 3. nvidia/nemotron-3-ultra-550b-a55b:free (OpenRouter)
   * Without any paid fallback!
   */
  async complete(
    messages: ChatMessageParam[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    if (this.mockHandler) {
      const mockResult = await this.mockHandler(messages, options);
      if (mockResult) return mockResult;
    }

    // Bajet run: kontrak yang SAMA seperti runtime Copilot
    // (`shared/copilot-contracts.ts`). Router ini tidak boleh mengimport
    // `server/agents`, jadi kontrak ini datang daripada lapisan `shared`.
    const policy = options.budget ?? COPILOT_RUN_BUDGET;
    const tracker = createRunBudgetTracker(policy);
    const requestMessages = trimMessagesToTokenBudget(messages, policy.maxInputTokensPerCall);
    const maxOutputTokens = Math.max(
      1,
      Math.min(options.maxTokens ?? 2048, policy.maxOutputTokensPerCall)
    );

    // Build ordered list of candidate (providerId, model) pairs
    const candidatesToTry: Array<{ providerId: string; model: string }> = [];

    if (options.candidateModels && options.candidateModels.length > 0) {
      candidatesToTry.push(...options.candidateModels);
    } else if (options.providerOrder && options.providerOrder.length > 0) {
      for (const pid of options.providerOrder) {
        const conf = FREE_PROVIDERS[pid];
        if (conf) candidatesToTry.push({ providerId: pid, model: conf.defaultModel });
      }
    } else if (this.activeProviderId !== 'gemini_free') {
      const activeConf = this.getActiveProvider();
      candidatesToTry.push({ providerId: activeConf.id, model: activeConf.defaultModel });
    } else {
      // Default strict candidate sequence:
      // 1. gemini-3.6-flash (gemini_free)
      // 2. gemini-3.5-flash-lite (gemini_free)
      // 3. nvidia/nemotron-3-ultra-550b-a55b:free (openrouter)
      for (const cand of STRICT_FREE_CANDIDATE_SEQUENCE) {
        if (!candidatesToTry.some(c => c.providerId === cand.providerId && c.model === cand.model)) {
          candidatesToTry.push({ providerId: cand.providerId, model: cand.model });
        }
      }

      // Append remaining free providers as backup
      const otherFreeProviders: Array<'nvidia' | 'opencode_zen' | 'groq' | 'ollama'> = [
        'nvidia',
        'opencode_zen',
        'groq',
        'ollama',
      ];
      for (const pid of otherFreeProviders) {
        const conf = FREE_PROVIDERS[pid];
        if (conf && !candidatesToTry.some(c => c.providerId === pid)) {
          candidatesToTry.push({ providerId: pid, model: conf.defaultModel });
        }
      }
    }

    let lastError: FreeModelProviderError | null = null;
    let budgetBlockReason: CopilotRunBudgetBlockReason | undefined;

    for (const { providerId, model: targetModel } of candidatesToTry) {
      // Strict Zero-Cost Enforcement: Reject any paid model
      assertFreeModelOnly(targetModel, providerId);

      const config = FREE_PROVIDERS[providerId];
      if (!config) continue;

      const apiKey = process.env[config.apiKeyEnv] || (config.id === 'ollama' ? 'ollama' : '');
      if (!apiKey && config.id !== 'ollama') {
        // Skip provider if key is not configured in environment
        continue;
      }
      if (liveProvidersDisabled()) {
        // Mod offline: tiada panggilan keluar. Jalur local_rules digunakan.
        continue;
      }

      // BAJET RUN: panggilan provider dikira terhadap kontrak yang sama
      // seperti runtime Copilot — maksimum 3 panggilan dan deadline 30 saat.
      if (tracker.providerCallsMade >= policy.maxModelCalls) {
        budgetBlockReason = 'MODEL_BUDGET_EXCEEDED';
        break;
      }
      const remainingMs = remainingRunBudgetMs(tracker);
      if (remainingMs <= 0) {
        budgetBlockReason = 'MODEL_DEADLINE_EXCEEDED';
        break;
      }

      tracker.providerCallsMade++;
      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(options.timeoutMs ?? 3500, remainingMs))
          ),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...(config.id === 'openrouter'
              ? {
                  'HTTP-Referer': 'https://abangcolek.gangniaga.my',
                  'X-Title': 'AbangColek Sovereign GrowthOS',
                }
              : {}),
          },
          body: JSON.stringify({
            model: targetModel,
            messages: requestMessages,
            temperature: options.temperature ?? 0.3,
            max_tokens: maxOutputTokens,
          }),
        });

        if (!response.ok) {
          // Badan mentah provider TIDAK pernah dihantar ke pelayar: ia hanya
          // diklasifikasi menjadi reason code stabil + mesej tetap.
          const errText = await response.text().catch(() => '');
          const classified = classifyProviderHttpFailure(response.status, errText);
          logPlatformProviderFailure({
            provider: config.name,
            model: targetModel,
            status: response.status,
            reason: classified.reason,
            body: errText,
          });
          throw new FreeModelProviderError(
            classified.reason,
            clientSafeErrorMessage(classified.reason),
            response.status
          );
        }

        const data = (await response.json()) as any;
        const choice = data.choices?.[0];
        const content = choice?.message?.content || '';
        const inputTokens = Number(data.usage?.prompt_tokens ?? 0);
        const outputTokens = Number(data.usage?.completion_tokens ?? 0);

        // BAJET TOKEN: had per-panggilan dan kumulatif dikuatkuasakan
        // sebelum jawapan dilayani.
        const verdict = checkRunTokenBudget(tracker, inputTokens, outputTokens);
        if (!verdict.ok) {
          recordRunTokenUsage(tracker, inputTokens, outputTokens);
          lastError = new FreeModelProviderError(
            'MODEL_TOKEN_BUDGET_EXCEEDED',
            clientSafeErrorMessage('MODEL_TOKEN_BUDGET_EXCEEDED')
          );
          budgetBlockReason = 'MODEL_TOKEN_BUDGET_EXCEEDED';
          break;
        }
        recordRunTokenUsage(tracker, inputTokens, outputTokens);

        return {
          providerId: config.id,
          model: data.model || targetModel,
          content,
          status: 'live',
          reason: 'PROVIDER_CALL_SUCCEEDED',
          toolCalls: choice?.message?.tool_calls,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
              }
            : undefined,
          budget: {
            maxProviderCalls: policy.maxModelCalls,
            providerCallsMade: tracker.providerCallsMade,
            deadlineMs: policy.deadlineMs,
            outputTokensUsed: tracker.outputTokensUsed,
            maxOutputTokensPerCall: policy.maxOutputTokensPerCall,
            maxCumulativeOutputTokens: policy.maxCumulativeOutputTokens,
          },
        };
      } catch (err: any) {
        lastError =
          err instanceof FreeModelProviderError
            ? err
            : new FreeModelProviderError('PROVIDER_UNAVAILABLE', clientSafeErrorMessage('PROVIDER_UNAVAILABLE'));
        // Continue to next free candidate model in failover queue
        continue;
      }
    }

    if (this.enableDeterministicFallback) {
      // Tiada provider menjawab. Jawapan ini dijana secara LOKAL — ia TIDAK
      // boleh dikreditkan kepada provider awam yang aktif (blueprint:293).
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      return {
        providerId: LOCAL_RULES_PROVIDER_ID,
        model: LOCAL_RULES_MODEL_ID,
        content: this.generateFallbackResponse(lastUserMsg),
        status: 'local_rules',
        reason: budgetBlockReason ? LOCAL_RULES_BUDGET_EXHAUSTED_REASON : LOCAL_RULES_REASON,
        ...(budgetBlockReason ? { budgetBlockReason } : {}),
        budget: {
          maxProviderCalls: policy.maxModelCalls,
          providerCallsMade: tracker.providerCallsMade,
          deadlineMs: policy.deadlineMs,
          outputTokensUsed: tracker.outputTokensUsed,
          maxOutputTokensPerCall: policy.maxOutputTokensPerCall,
          maxCumulativeOutputTokens: policy.maxCumulativeOutputTokens,
        },
      };
    }

    throw new FreeModelProviderError(
      lastError?.code ?? 'PROVIDER_UNAVAILABLE',
      clientSafeErrorMessage(lastError?.code ?? 'PROVIDER_UNAVAILABLE')
    );
  }

  /**
   * Jawapan fallback yang dijana secara lokal.
   *
   * PERINTAH KEBENARAN: Teks ini TIDAK boleh mendakwa sebarang tindakan
   * luaran telah berlaku (aduan direkodkan, kuarantin dimulakan, mesej
   * dihantar) dan TIDAK boleh menyatakan margin/nisbah yang tidak dikira.
   * Ia hanya menyatakan apa yang BOLEH dibuat tanpa data dan provider.
   */
  generateFallbackResponse(userPrompt: string): string {
    const lower = userPrompt.toLowerCase();
    if (lower.includes('bocor') || lower.includes('leakage')) {
      return 'Respons ini dijana secara lokal oleh platform (local_rules) kerana tiada model awam menjawab. Isu pembungkusan botol kuah colek bocor: tiada aduan direkodkan dan tiada kuarantin stok dimulakan oleh mesej ini. Berdasarkan invariant JEV, punca utama (Root Cause) ditetapkan sebagai UNDETERMINED sehingga semakan kelompok pembekal dan bukti foto penutup botol bocor selesai. Tindakan kuarantin dan pengesahan bukti mesti dibuat melalui aliran operasi berkuasa (kes kes pelanggan / rekod lot), bukan melalui balasan ini.';
    }
    if (lower.includes('margin') || lower.includes('kempen') || lower.includes('diskaun')) {
      return 'Respons ini dijana secara lokal oleh platform (local_rules) kerana tiada model awam menjawab. Tiada simulasi margin dijalankan dan tiada nisbah margin boleh dipaparkan kerana permintaan ini tidak membekalkan input komersial (jualan bersih, COGS, kos pembolehubah, minimum sumbangan). Beri input tersebut untuk penilai margin kanonikal evaluateMarginContribution mengira keputusan sebenar.';
    }
    if (lower.includes('kargo') || lower.includes('bas') || lower.includes('tracking') || lower.includes('jejak')) {
      return 'Respons ini dijana secara lokal oleh platform (local_rules) kerana tiada model awam menjawab. Status penghantaran tidak boleh disahkan tanpa nombor pesanan atau nombor konsainan sebenar, dan tiada notifikasi WhatsApp dihantar oleh mesej ini.';
    }
    return 'Respons ini dijana secara lokal oleh platform (local_rules) kerana tiada model awam menjawab. Arahan operasi tidak dieksekusi oleh mesej ini; tiada tindakan luaran, bayaran, penghantaran atau perubahan rekod telah berlaku.';
  }
}

export const globalFreeRouter = new FreeModelRouter();

