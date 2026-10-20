/**
 * AbangColek Sovereign GrowthOS — CopilotKit Runtime Fetch Handler v2.5 (Fasa 02)
 * Pinned Fetch Handler • Zero-New-Paid-Cloud-Spend • Stateless Loopback Boundary
 *
 * PERUBAHAN KESELAMPAAN (Writer B):
 * - Versi lama adalah PSEUDO-RUNTIME: ia membaca mesej pengguna terakhir dan
 *   memulangkannya semula di dalam template string dengan status `completed`
 *   serta label model hardcoded. Tiada provider dipanggil langsung.
 * - Versi ini memanggil provider SEBENARNYA melalui lapisan adapter
 *   (`server/agents/providers/model-adapters.ts`), menguatkuasakan bajet
 *   (deadline / 3 panggilan model / had token) DALAM runtime, dan memulangkan
 *   `unavailable` / `local_rules` yang jujur dengan reason code eksplisit
 *   apabila tiada calon yang boleh dicapai. Runtime TIDAK PERNAH mengembalikan
 *   `completed` tanpa jawapan provider sebenar.
 */

import {
  FreeModelRouter,
  assertFreeModelOnly,
  candidateKey,
  checkTokenBudget,
  createBudget,
  isDeadlineExceeded,
  recordTokenUsage,
  remainingDeadlineMs,
  type FreeModelCandidate,
  type ModelCallBudget,
  type ModelCallBudgetCaps,
} from '../providers/model-router';
import {
  createDefaultAdapterRegistry,
  ModelAdapterError,
  redactProviderErrorBody,
  type AdapterMessage,
  type ModelAdapter,
  type ModelAdapterRegistry,
  type ModelCallOutcome,
  type ModelCallRequest,
  type ModelTransportKind,
} from '../providers/model-adapters';
import {
  A2UI_ALLOWLISTED_COMPONENTS,
  COPILOT_RUN_BUDGET,
  STRICT_FREE_CANDIDATE_SEQUENCE,
  type CopilotCandidateReport,
  type CopilotRunAttempt,
  type CopilotRunReasonCode,
  type CopilotServedBy,
  type CopilotV2RuntimeDescriptor,
} from '../../../shared/copilot-contracts';
import { AdkBridgeClient } from '../adk-bridge/client';
import type { Actor } from '../../../shared/platform-contracts';

export interface CopilotRuntimeConfig {
  router?: FreeModelRouter;
  defaultDeadlineMs?: number;
  /** Had panggilan model bagi setiap run (termasuk failover/retry). */
  maxModelCalls?: number;
  /** Titik suntikan adapter — digunakan oleh ujian unit dengan transport `mock`. */
  adapters?: ModelAdapterRegistry;
  /**
   * Jambatan Python ADK. Jika tidak diberi, jambatan dibina daripada
   * persekitaran (`ADK_BRIDGE_URL`). Jambatan hanya digunakan bila ia
   * dikonfigurasikan; jika tidak, runtime terus ke laluan model langsung.
   */
  bridge?: AdkBridgeClient;
  /** Prompt sistem milik server; mesej `system` daripada pelayar ditolak. */
  systemPrompt?: string;
  budgetCaps?: ModelCallBudgetCaps;
}

export interface CopilotChatPayload {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  threadId?: string;
  runId?: string;
}

export type CopilotRunStatus = 'completed' | 'partial' | 'unavailable' | 'local_rules';

export interface CopilotChatResponse {
  runId: string;
  threadId: string;
  model: string;
  providerId: string;
  status: CopilotRunStatus;
  message: {
    role: 'assistant';
    content: string;
  };
  /** Reason code eksplisit untuk keputusan runtime. */
  reason?: CopilotRunReasonCode;
  reasonDetail?: string;
  /**
   * Petunjuk tunggu (ms) yang diberi provider sendiri apabila run ini disekat
   * oleh dinding kuota (HTTP 429). Nilai ini DISALIN daripada provider —
   * ia tidak pernah diteka atau dipalsukan.
   */
  retryAfterMs?: number;
  /**
   * Petunjuk tunggu asal provider ("19h3m41s"). Diuraikan di sisi server
   * daripada mesej provider; badan mentah provider tidak dihantar ke pelayar.
   */
  retryHint?: string;
  /** Kode mesin untuk laluan "tidak dapat menjawab" (selaras dengan kontrak platform). */
  code?: 'RUNTIME_NOT_READY';
  /** Laluan yang benar-benar melayani run ini. */
  servedBy?: CopilotServedBy;
  /** Pecahan sebab bagi setiap calon percuma dalam run ini. */
  candidates?: CopilotCandidateReport[];
  /** `live` = panggilan provider sebenar; `mock`/`fixture` = ujian unit sahaja. */
  transport?: ModelTransportKind;
  attempts?: CopilotRunAttempt[];
  budget?: {
    maxModelCalls: number;
    modelCallsMade: number;
    deadlineMs: number;
    inputTokensUsed: number;
    outputTokensUsed: number;
  };
  /** Label `runId` yang dihantar pelayar — tidak pernah digunakan sebagai kebenaran. */
  clientRunId?: string;
  /** Butiran jambatan ADK (hanya diisi apabila jambatan yang melayani). */
  adk?: {
    modelLive: boolean;
    runId?: string;
    toolCalls: string[];
  };
}

const DEFAULT_SYSTEM_PROMPT = [
  'Anda ialah Pembantu Operasi AbangColek Sovereign GrowthOS.',
  'Jawab dalam Bahasa Melayu secara ringkas, tepat dan berorientasikan operasi perniagaan.',
  'Sentiasa rujuk nombor pesanan, ID lot, ID dealer atau ID lain yang diberi pengguna dengan tepat (contoh ORD-001) dalam jawapan anda.',
  'Jangan mengarang status, angka kewangan atau bukti; jika data tidak tersedia, nyatakan dengan jujur.',
  'Polisi sifar kos: hanya model free digunakan, tiada kos pengkomputeran awan berbayar dibenarkan.',
].join(' ');

const THREAD_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const CHAT_ROLES = new Set(['user', 'assistant', 'system']);

/**
 * Kandungan mesej fail-closed. Kandungan ini TIDAK pernah memasukkan teks
 * pengguna (anti-echo) dan sentiasa menamakan laluan provider sebenar:
 * Native ADK Gemini melalui Python ADK bridge + adapter OpenRouter `:free`.
 */
const FAIL_CLOSED_PATHS =
  'Laluan native Gemini (Python ADK bridge) dan adapter OpenRouter `:free`';

const FAIL_CLOSED_NO_ACTOR = `RUNTIME_NOT_READY: Tiada panggilan model dibuat untuk run ini kerana tiada actor server disahkan. ${FAIL_CLOSED_PATHS} dilangkau; identiti daripada pelayar tidak pernah memberi kuasa.`;

const FAIL_CLOSED_NO_MESSAGES = `RUNTIME_NOT_READY: Tiada mesej pengguna untuk dijawab dalam run ini, jadi tiada panggilan model dibuat. ${FAIL_CLOSED_PATHS} dilangkau.`;

function failClosedMessage(reason: CopilotRunReasonCode): string {
  return `RUNTIME_NOT_READY: Tiada jawapan model boleh dihasilkan untuk run ini (${reason}). ${FAIL_CLOSED_PATHS} tidak dapat dicapai.`;
}

/**
 * Actor mesti datang daripada server. Actor kosong/berfields kosong tidak
 * dikira sebagai actor disahkan.
 */
function isVerifiedActor(actor: Actor | undefined): boolean {
  if (!actor) return false;
  const userId = typeof actor.userId === 'string' ? actor.userId.trim() : '';
  const workspaceId = typeof actor.workspaceId === 'string' ? actor.workspaceId.trim() : '';
  return userId.length > 0 && workspaceId.length > 0;
}

function createRunId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `run-${Date.now().toString(36)}-${random}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function estimateTokens(messages: AdapterMessage[]): number {
  return messages.reduce((total, message) => total + Math.ceil(message.content.length / 4), 0);
}

function sanitizeLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return undefined;
  return THREAD_ID_PATTERN.test(trimmed) ? trimmed : undefined;
}

export class CopilotV2Runtime {
  private router: FreeModelRouter;
  private defaultDeadlineMs: number;
  private maxModelCalls: number;
  private adapters: ModelAdapterRegistry;
  private bridge: AdkBridgeClient;
  private bridgeEnabled: boolean;
  private systemPrompt: string;
  private budgetCaps?: ModelCallBudgetCaps;

  constructor(config?: CopilotRuntimeConfig) {
    this.router = config?.router || new FreeModelRouter();
    this.defaultDeadlineMs = config?.defaultDeadlineMs ?? COPILOT_RUN_BUDGET.deadlineMs;
    this.maxModelCalls = config?.maxModelCalls ?? COPILOT_RUN_BUDGET.maxModelCalls;
    this.adapters = config?.adapters || createDefaultAdapterRegistry();
    this.bridge = config?.bridge ?? new AdkBridgeClient();
    this.bridgeEnabled = this.bridge.configuration().configured;
    this.systemPrompt = config?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this.budgetCaps = config?.budgetCaps;
  }

  /**
   * Descriptor runtime untuk laluan GET. IaMonitoring keadaan sebenar:
   * calon aktif daripada router dan sama ada jambatan ADK dikonfigurasikan.
   */
  public describe(): CopilotV2RuntimeDescriptor {
    const active = this.router.getActiveCandidates();
    const activeProvider = this.bridgeEnabled
      ? 'python_adk_bridge'
      : active[0]?.providerId ?? 'local_rules';
    return {
      version: '2.0.0',
      runtime: 'copilotkit-v2-agui',
      schema: 'a2ui.v1',
      activeProvider,
      candidateModels: STRICT_FREE_CANDIDATE_SEQUENCE,
      allowlistedComponents: A2UI_ALLOWLISTED_COMPONENTS,
      paidFallbackAllowed: false,
    };
  }

  public async handleRequest(req: Request, actor?: Actor): Promise<Response> {
    const runId = createRunId();

    if (req.method !== 'POST') {
      return this.errorResponse(
        'METHOD_NOT_ALLOWED',
        405,
        runId,
        'Permintaan Copilot hanya menerima kaedah POST.'
      );
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return this.errorResponse(
        'MALFORMED_JSON_PAYLOAD',
        400,
        runId,
        'Badan permintaan bukan JSON yang sah.'
      );
    }

    const messages = this.validateMessages(payload);
    if (messages === 'INVALID_MESSAGES_ARRAY') {
      return this.errorResponse(
        'INVALID_MESSAGES_ARRAY',
        400,
        runId,
        'Request memerlukan array `messages` dengan role user/assistant/system dan content berupa teks.'
      );
    }
    if (messages === 'EMPTY_MESSAGES_ARRAY') {
      // Tiada perbualan untuk dijawab — gagal tutup dengan jujur, bukan 400.
      return this.failClosedResponse(
        runId,
        `thread-${runId}`,
        sanitizeLabel(isRecord(payload) ? payload.runId : undefined),
        'EMPTY_MESSAGES_ARRAY',
        FAIL_CLOSED_NO_MESSAGES,
        'none',
        'none'
      );
    }

    // Identiti pelayar ialah LABEL SAHAJA. `threadId`/`runId` daripada klien
    // tidak pernah memberi kuasa; `actor` hanya datang daripada server.
    const threadId =
      sanitizeLabel(isRecord(payload) ? payload.threadId : undefined) ?? `thread-${runId}`;
    const clientRunId = sanitizeLabel(isRecord(payload) ? payload.runId : undefined);

    const budget = createBudget(this.maxModelCalls, this.defaultDeadlineMs, this.budgetCaps);
    const attempts: CopilotRunAttempt[] = [];
    const excludedCandidates: FreeModelCandidate[] = [];
    const excludedKeys = new Set<string>();
    const exclude = (candidate: FreeModelCandidate): void => {
      const key = candidateKey(candidate);
      if (excludedKeys.has(key)) return;
      excludedKeys.add(key);
      excludedCandidates.push(candidate);
    };

    let controlReason: CopilotRunReasonCode = 'MODEL_ADAPTER_UNAVAILABLE';
    let controlDetail = 'Tiada calon model percuma yang aktif atau layak.';
    let credentialDetail = '';
    let policyDetail = '';
    const providerFailures: Array<{
      reason: CopilotRunReasonCode;
      detail: string;
      retryAfterMs?: number;
      retryHint?: string;
    }> = [];
    let lastModel = 'none';
    let lastProviderId = 'none';

    const activeCandidates = this.router.getActiveCandidates();
    if (activeCandidates.length === 0) {
      return this.localRulesResponse(
        runId,
        threadId,
        clientRunId,
        'MODEL_ADAPTER_UNAVAILABLE',
        controlDetail,
        attempts,
        budget
      );
    }

    // Gerbang actor: panggilan model hanya dibenarkan untuk actor yang
    // disahkan oleh server. Tanpa actor, runtime gagal tutup dengan jujur dan
    // TIDAK pernah memanggil provider (dilindungi juga daripada prompt
    // injection pelayar yang cuba memaksa jawapan).
    if (!isVerifiedActor(actor)) {
      return this.failClosedResponse(
        runId,
        threadId,
        clientRunId,
        'ACTOR_NOT_VERIFIED',
        FAIL_CLOSED_NO_ACTOR,
        'none',
        'none'
      );
    }

    // Laluan 1: jambatan Python Google ADK (Native ADK). Ia hanya dicuba
    // apabila jambatan dikonfigurasikan; jika perkhidmatan tidak berjalan,
    // runtime menurun dengan jujur ke laluan model langsung.
    const bridgeOutcome = await this.tryBridge({
      runId,
      messages,
      actor,
      threadId,
      budget,
    });
    if (bridgeOutcome?.served) {
      return this.jsonBodyResponse(bridgeOutcome.served);
    }
    if (bridgeOutcome?.failure) {
      attempts.push({
        model: 'python-adk-bridge',
        providerId: 'python_adk_bridge',
        outcome: 'failed',
        reason: bridgeOutcome.failure.reason,
        detail: bridgeOutcome.failure.detail,
      });
    }

    // Saringan kelayakan (kunci API) — TIDAK menggunakan bajet panggilan model
    // kerana tiada panggilan keluar dibuat pada peringkat ini.
    for (const candidate of activeCandidates) {
      const adapter = this.adapters.get(candidate);
      if (!adapter) {
        exclude(candidate);
        attempts.push({
          model: candidate.model,
          providerId: candidate.providerId,
          outcome: 'skipped',
          reason: 'MODEL_ADAPTER_UNAVAILABLE',
          detail: 'Tiada adapter dikonfigurasikan untuk calon ini.',
        });
        continue;
      }
      if (!adapter.isConfigured()) {
        exclude(candidate);
        attempts.push({
          model: candidate.model,
          providerId: candidate.providerId,
          outcome: 'skipped',
          reason: 'PROVIDER_CREDENTIALS_MISSING',
          detail: `Kelayakan ${adapter.credentialSource()} tidak dikonfigurasikan.`,
        });
        credentialDetail = credentialDetail
          ? `${credentialDetail}, ${adapter.credentialSource()}`
          : adapter.credentialSource();
      }
    }

    const providerMessages = this.buildProviderMessages(messages, budget);

    while (true) {
      if (budget.callsMade >= budget.maxCalls) {
        controlReason = 'MODEL_BUDGET_EXCEEDED';
        controlDetail = `Had ${budget.maxCalls} panggilan model bagi run ini telah dicapai.`;
        break;
      }
      if (isDeadlineExceeded(budget)) {
        controlReason = 'MODEL_DEADLINE_EXCEEDED';
        controlDetail = `Had masa ${budget.deadlineMs}ms untuk inferensi telah tamat.`;
        break;
      }
      if (estimateTokens(providerMessages) > budget.maxInputTokensPerCall) {
        controlReason = 'MODEL_TOKEN_BUDGET_EXCEEDED';
        controlDetail = `Permintaan melebihi had input ${budget.maxInputTokensPerCall} token bagi satu panggilan.`;
        break;
      }

      let candidate: FreeModelCandidate;
      const nextCandidate = this.nextCandidate(excludedCandidates);
      if (!nextCandidate) {
        controlReason = 'MODEL_ADAPTER_UNAVAILABLE';
        controlDetail = 'Tiada calon model percuma yang aktif atau layak untuk run ini.';
        break;
      }

      // Penjaga polisi: model berbayar atau OpenRouter tanpa akhiran `:free` ditolak
      // SEBELUM panggilan, dan calon itu dikecualikan daripada run ini.
      try {
        assertFreeModelOnly(nextCandidate.model, nextCandidate.providerId);
      } catch (error) {
        exclude(nextCandidate);
        const detail = error instanceof Error ? error.message : String(error);
        attempts.push({
          model: nextCandidate.model,
          providerId: nextCandidate.providerId,
          outcome: 'skipped',
          reason: 'POLICY_VIOLATION_REJECTED',
          detail,
        });
        policyDetail = detail;
        controlReason = 'POLICY_VIOLATION_REJECTED';
        controlDetail = detail;
        continue;
      }

      try {
        candidate = this.router.selectNextCandidate(budget, { exclude: excludedCandidates });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/MODEL_BUDGET_EXCEEDED/.test(message)) {
          controlReason = 'MODEL_BUDGET_EXCEEDED';
        } else if (/MODEL_DEADLINE_EXCEEDED/.test(message)) {
          controlReason = 'MODEL_DEADLINE_EXCEEDED';
        } else {
          controlReason = 'MODEL_ADAPTER_UNAVAILABLE';
        }
        controlDetail = message;
        break;
      }

      const adapter = this.adapters.get(candidate);
      if (!adapter || !adapter.isConfigured()) {
        exclude(candidate);
        continue;
      }

      lastModel = candidate.model;
      lastProviderId = candidate.providerId;

      try {
        const outcome = await this.callWithinDeadline(adapter, {
          messages: providerMessages,
          maxInputTokens: budget.maxInputTokensPerCall,
          maxOutputTokens: budget.maxOutputTokensPerCall,
          timeoutMs: remainingDeadlineMs(budget),
        });

        const verdict = checkTokenBudget(budget, outcome.inputTokens, outcome.outputTokens);
        if (!verdict.ok) {
          attempts.push({
            model: candidate.model,
            providerId: candidate.providerId,
            outcome: 'failed',
            reason: 'MODEL_TOKEN_BUDGET_EXCEEDED',
            detail: verdict.reason,
            inputTokens: outcome.inputTokens,
            outputTokens: outcome.outputTokens,
          });
          controlReason = 'MODEL_TOKEN_BUDGET_EXCEEDED';
          controlDetail = verdict.reason ?? 'Had token dilampaui.';
          break;
        }

        recordTokenUsage(budget, outcome.inputTokens, outcome.outputTokens);
        attempts.push({
          model: candidate.model,
          providerId: candidate.providerId,
          outcome: 'succeeded',
          inputTokens: outcome.inputTokens,
          outputTokens: outcome.outputTokens,
        });

        const body: CopilotChatResponse = {
          runId,
          threadId,
          model: candidate.model,
          providerId: candidate.providerId,
          status: 'completed',
          message: { role: 'assistant', content: outcome.content },
          reason: 'PROVIDER_CALL_SUCCEEDED',
          transport: adapter.transport,
          servedBy: 'direct_model',
          attempts,
          candidates: this.candidateReports(attempts),
          budget: this.budgetSummary(budget),
        };
        if (clientRunId) body.clientRunId = clientRunId;
        return this.jsonBodyResponse(body);
      } catch (error) {
        const reason: CopilotRunReasonCode =
          error instanceof ModelAdapterError
            ? (error.reason as CopilotRunReasonCode)
            : 'PROVIDER_ENDPOINT_UNREACHABLE';
        // `detail` yang sampai ke pelayar MESTI hanya mengandungi fakta yang
        // terklasifikasi. Ralat yang tidak diklasifikasi disaring dengan
        // penapis yang sama seperti log server supaya kunci/ID akaun tidak
        // bocor.
        const detail =
          error instanceof ModelAdapterError
            ? error.message
            : redactProviderErrorBody(error instanceof Error ? error.message : String(error));
        const retryable = error instanceof ModelAdapterError ? error.retryable : true;
        const retryAfterMs = error instanceof ModelAdapterError ? error.retryAfterMs : undefined;
        const retryHint = error instanceof ModelAdapterError ? error.retryHint : undefined;
        const httpStatus = error instanceof ModelAdapterError ? error.httpStatus : undefined;

        // Kerosakan tidak sementara untuk akaun ini (contoh HTTP 404
        // "Function ... Not found for account"): calon ditanda mati supaya ia
        // TIDAK akan membakar bajet panggilan model lagi.
        const unusableForAccount =
          reason === 'PROVIDER_MODEL_NOT_FOUND' ||
          reason === 'PROVIDER_ACCESS_DENIED' ||
          retryable === false;

        if (unusableForAccount) {
          this.router.markUnusable(candidate, reason, detail);
        } else if (reason === 'PROVIDER_QUOTA_EXHAUSTED') {
          // Had sementara: calon masuk cooldown dengan petunjuk tunggu sebenar
          // yang diberi provider (contoh "retry in 19h3m41s").
          this.router.markCooldown(candidate, retryAfterMs ?? 60_000, reason, detail);
        }

        attempts.push({
          model: candidate.model,
          providerId: candidate.providerId,
          outcome: 'failed',
          reason,
          detail,
          httpStatus,
          retryable,
          retryAfterMs,
          retryHint,
        });
        controlReason = reason;
        controlDetail = detail;
        providerFailures.push({ reason, detail, retryAfterMs, retryHint });
        // Failover: calon yang gagal tidak dicuba semula bagi run ini, tetapi
        // panggilan ini sudah dikira terhadap bajet 3 panggilan yang sama.
        exclude(candidate);
        continue;
      }
    }

    const reason = this.resolveFailureReason({
      controlReason,
      controlDetail,
      credentialDetail,
      policyDetail,
      providerFailures,
    });

    return this.unavailableResponse(
      runId,
      threadId,
      clientRunId,
      reason.code,
      reason.detail,
      lastModel,
      lastProviderId,
      attempts,
      budget,
      reason.retryAfterMs,
      reason.retryHint
    );
  }

  /**
   * Calon seterusnya mengikut urutan ketat router, selepas menolak calon yang
   * dikecualikan bagi run ini.
   */
  private nextCandidate(excluded: readonly FreeModelCandidate[]): FreeModelCandidate | undefined {
    const excludedKeys = new Set(excluded.map(candidateKey));
    return this.router.getActiveCandidates().find(candidate => !excludedKeys.has(candidateKey(candidate)));
  }

  /**
   * Cuba jambatan Python ADK. Satu panggilan jambatan = satu unit bajet.
   * Jika jambatan tidak dikonfigurasikan, tiada apa-apa berlaku dan runtime
   * terus ke laluan model langsung.
   */
  private async tryBridge(input: {
    runId: string;
    messages: CopilotChatPayload['messages'];
    actor?: Actor;
    threadId: string;
    budget: ModelCallBudget;
  }): Promise<
    | { served?: CopilotChatResponse; failure?: undefined }
    | { served?: undefined; failure?: { reason: CopilotRunReasonCode; detail: string } }
    | undefined
  > {
    if (!this.bridgeEnabled) return undefined;
    const configuration = this.bridge.configuration();
    if (!configuration.configured) {
      return {
        failure: {
          reason: (configuration.reason as CopilotRunReasonCode) ?? 'ADK_BRIDGE_NOT_CONFIGURED',
          detail: 'Jambatan Python ADK tidak dikonfigurasikan.',
        },
      };
    }
    if (input.budget.callsMade >= input.budget.maxCalls) return undefined;

    const message = [...input.messages].reverse().find(m => m.role === 'user')?.content?.trim();
    if (!message) return undefined;

    input.budget.callsMade++;
    const outcome = await this.bridge.run({
      message,
      actor: input.actor
        ? { userId: input.actor.userId, workspaceId: input.actor.workspaceId }
        : undefined,
      threadLabel: input.threadId,
    });

    if (!outcome.ok) {
      const reason = (outcome.error.reason as CopilotRunReasonCode) ?? 'ADK_BRIDGE_UNAVAILABLE';
      return { failure: { reason, detail: outcome.error.message } };
    }

    const inputTokens = estimateTokens(
      input.messages.map(m => ({ role: m.role, content: m.content })),
    );
    const outputTokens = estimateTokens([{ role: 'assistant', content: outcome.reply }]);
    const verdict = checkTokenBudget(input.budget, inputTokens, outputTokens);
    if (!verdict.ok) {
      return {
        failure: {
          reason: 'MODEL_TOKEN_BUDGET_EXCEEDED',
          detail: verdict.reason ?? 'Had token dilampaui.',
        },
      };
    }
    recordTokenUsage(input.budget, inputTokens, outputTokens);

    const body: CopilotChatResponse = {
      runId: input.runId,
      threadId: input.threadId,
      model: outcome.modelLabel,
      providerId: 'python_adk_bridge',
      status: 'completed',
      message: { role: 'assistant', content: outcome.reply },
      reason: 'PROVIDER_CALL_SUCCEEDED',
      transport: 'live',
      servedBy: 'python_adk_bridge',
      attempts: [
        {
          model: outcome.modelLabel,
          providerId: 'python_adk_bridge',
          outcome: 'succeeded',
        },
      ],
      budget: this.budgetSummary(input.budget),
      adk: {
        modelLive: outcome.modelLive,
        runId: outcome.runId,
        toolCalls: (outcome.toolCalls ?? []).map(call => call.name).filter((name): name is string => !!name),
      },
    };
    return { served: body };
  }

  /**
   * Membina laporan per-calon yang jujur: setiap calon percuma dalam urutan
   * ketat, dengan keadaan dan sebabnya.
   */
  private candidateReports(
    attempts: CopilotRunAttempt[],
    extra?: CopilotCandidateReport[]
  ): CopilotCandidateReport[] {
    const reports: CopilotCandidateReport[] = [];
    for (const status of this.router.getCandidateStatuses()) {
      const attempt = attempts.find(
        item => item.model === status.candidate.model && item.providerId === status.candidate.providerId
      );
      // Keadaan kekal (mati / cooldown) lebih bermakna daripada kegagalan
      // sekali-sekala: iaoform memberitahu caller bahawa calon itu tidak akan
      // dicuba lagi sehingga keadaan berubah.
      if (status.state === 'unusable' || status.state === 'cooldown') {
        reports.push({
          model: status.candidate.model,
          providerId: status.candidate.providerId,
          state: status.state,
          reason: attempt?.reason ?? status.reason,
          detail: attempt?.detail ?? status.detail,
          httpStatus: attempt?.httpStatus,
          retryable: attempt?.retryable,
          retryAfterMs: attempt?.retryAfterMs ?? status.retryAfterMs,
          retryHint: attempt?.retryHint,
        });
        continue;
      }
      if (attempt?.outcome === 'succeeded') {
        reports.push({
          model: status.candidate.model,
          providerId: status.candidate.providerId,
          state: 'succeeded',
          reason: attempt.reason,
          detail: attempt.detail,
        });
        continue;
      }
      if (attempt?.outcome === 'failed') {
        reports.push({
          model: status.candidate.model,
          providerId: status.candidate.providerId,
          state: 'failed',
          reason: attempt.reason,
          detail: attempt.detail,
          httpStatus: attempt.httpStatus,
          retryable: attempt.retryable,
          retryAfterMs: attempt.retryAfterMs,
          retryHint: attempt.retryHint,
        });
        continue;
      }
      reports.push({
        model: status.candidate.model,
        providerId: status.candidate.providerId,
        state: 'skipped',
        reason: attempt?.reason,
        detail: attempt?.detail,
      });
    }
    if (extra) reports.push(...extra);
    return reports;
  }

  private validateMessages(
    payload: unknown
  ): CopilotChatPayload['messages'] | 'INVALID_MESSAGES_ARRAY' | 'EMPTY_MESSAGES_ARRAY' {
    if (!isRecord(payload)) return 'INVALID_MESSAGES_ARRAY';
    const raw = payload.messages;
    if (!Array.isArray(raw)) return 'INVALID_MESSAGES_ARRAY';
    if (raw.length === 0) return 'EMPTY_MESSAGES_ARRAY';
    const messages: CopilotChatPayload['messages'] = [];
    for (const entry of raw) {
      if (!isRecord(entry)) return 'INVALID_MESSAGES_ARRAY';
      const role = entry.role;
      const content = entry.content;
      if (typeof role !== 'string' || !CHAT_ROLES.has(role)) return 'INVALID_MESSAGES_ARRAY';
      if (typeof content !== 'string') return 'INVALID_MESSAGES_ARRAY';
      messages.push({ role: role as 'user' | 'assistant' | 'system', content });
    }
    return messages;
  }

  /**
   * Membina senarai mesej untuk provider. Prompt sistem milik server sahaja —
   * mesej `system` daripada pelayar ditolak supaya pelayar tidak boleh
   * menyuntik arahan peringkat sistem.
   */
  private buildProviderMessages(
    messages: CopilotChatPayload['messages'],
    budget: ModelCallBudget
  ): AdapterMessage[] {
    const system: AdapterMessage = { role: 'system', content: this.systemPrompt };
    const history = messages
      .filter(message => message.role !== 'system')
      .map(message => ({ role: message.role, content: message.content }));
    if (history.length === 0) return [system];

    const room = Math.max(0, budget.maxInputTokensPerCall - estimateTokens([system]));
    const last = history[history.length - 1];
    const earlier = history.slice(0, history.length - 1);

    let lastMessage = last;
    if (estimateTokens([last]) > room) {
      const allowedChars = Math.max(0, (room - 8) * 4);
      lastMessage = { role: last.role, content: last.content.slice(0, allowedChars) };
    }

    const kept: AdapterMessage[] = [];
    for (let index = earlier.length - 1; index >= 0; index -= 1) {
      if (estimateTokens([lastMessage, ...kept, earlier[index]]) > room) break;
      kept.unshift(earlier[index]);
    }

    return [system, ...kept, lastMessage];
  }

  /**
   * Menentukan reason code tahap run bagi kegagalan.
   *
   * Bentuk input/output sengaja DIDELAKKAN kepada senarai kegagalan
   * per-calon (`providerFailures`) dan bukan satu kegagalan tunggal:
   * satu run boleh mempunyai beberapa calon mati (HTTP 404) BERSAMA dengan
   * dinding kuota (HTTP 429), dan dinding kuota itulah yang mesti
   * diadvokasi di peringkat atas kerana ia yang kekal menyekat run selepas
   * calon mati dibaiki. `retryAfterMs` hanya disalin daripada provider — ia
   * tidak pernah diteka.
   */
  private resolveFailureReason(input: {
    controlReason: CopilotRunReasonCode;
    controlDetail: string;
    credentialDetail: string;
    policyDetail: string;
    providerFailures: Array<{
      reason: CopilotRunReasonCode;
      detail: string;
      retryAfterMs?: number;
      retryHint?: string;
    }>;
  }): { code: CopilotRunReasonCode; detail: string; retryAfterMs?: number; retryHint?: string } {
    // Keutamaan: (1) dinding kuota, (2) tamat masa run, (3) punca sebenar
    // calon tidak boleh dicapai, (4) kelayakan, (5) polisi.
    //
    // Dinding kuota mendahulu sebab lain apabila ia berlaku: walaupun calon
    // mati dibaiki, run ini masih akan tersekat sehingga kuota dipulihkan,
    // jadi callers mesti melihat HTTP 429 dan petunjuk tunggu sebenar.
    const stopNotes: string[] = [];
    if (input.controlReason === 'MODEL_BUDGET_EXCEEDED' || input.controlReason === 'MODEL_DEADLINE_EXCEEDED') {
      stopNotes.push(input.controlDetail);
    }

    const quotaFailure = input.providerFailures.find(
      failure => failure.reason === 'PROVIDER_QUOTA_EXHAUSTED'
    );
    if (quotaFailure) {
      return {
        code: 'PROVIDER_QUOTA_EXHAUSTED',
        detail: [quotaFailure.detail, ...stopNotes].filter(Boolean).join(' | '),
        retryAfterMs: quotaFailure.retryAfterMs,
        retryHint: quotaFailure.retryHint,
      };
    }

    if (input.controlReason === 'MODEL_DEADLINE_EXCEEDED') {
      const lastFailure = input.providerFailures[input.providerFailures.length - 1];
      return {
        code: 'MODEL_DEADLINE_EXCEEDED',
        detail: [input.controlDetail, lastFailure?.detail].filter(Boolean).join(' | '),
      };
    }

    const lastFailure = input.providerFailures[input.providerFailures.length - 1];
    if (lastFailure) {
      return {
        code: lastFailure.reason,
        detail: [lastFailure.detail, ...stopNotes].filter(Boolean).join(' | '),
        retryAfterMs: lastFailure.retryAfterMs,
        retryHint: lastFailure.retryHint,
      };
    }

    if (input.credentialDetail) {
      return {
        code: 'PROVIDER_CREDENTIALS_MISSING',
        detail: `Kelayakan provider tidak dikonfigurasikan (${input.credentialDetail}).`,
      };
    }
    if (input.policyDetail) {
      return { code: 'POLICY_VIOLATION_REJECTED', detail: input.policyDetail };
    }
    return { code: input.controlReason, detail: input.controlDetail };
  }

  /**
   * Menguatkuasakan deadline run DI DALAM runtime: walaupun adapter tergantung
   * (atau tidak menghormati `timeoutMs`), runtime tidak akan melebihi had
   * masa run.
   */
  private async callWithinDeadline(
    adapter: ModelAdapter,
    request: ModelCallRequest
  ): Promise<ModelCallOutcome> {
    const timeoutMs = Math.max(1, request.timeoutMs);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new ModelAdapterError(
            'PROVIDER_TIMEOUT',
            `Panggilan provider '${adapter.candidate.model}' melebihi had masa run ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([adapter.call(request), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private budgetSummary(budget: ModelCallBudget): CopilotChatResponse['budget'] {
    return {
      maxModelCalls: budget.maxCalls,
      modelCallsMade: budget.callsMade,
      deadlineMs: budget.deadlineMs,
      inputTokensUsed: budget.inputTokensUsed,
      outputTokensUsed: budget.outputTokensUsed,
    };
  }

  private errorResponse(code: string, status: number, runId: string, detail: string): Response {
    return new Response(JSON.stringify({ error: code, detail }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Copilot-Run-Id': runId,
      },
    });
  }

  /** Respons JSON dengan headers piawai runtime. */
  private jsonBodyResponse(body: CopilotChatResponse): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Copilot-Run-Id': body.runId,
        'X-Copilot-Model': body.model,
        'X-Copilot-Served-By': body.servedBy ?? 'none',
      },
    });
  }

  private localRulesResponse(
    runId: string,
    threadId: string,
    clientRunId: string | undefined,
    reason: CopilotRunReasonCode,
    detail: string,
    attempts: CopilotRunAttempt[],
    budget: ModelCallBudget
  ): Response {
    const body: CopilotChatResponse = {
      runId,
      threadId,
      model: 'local-rules-deterministic',
      providerId: 'local_rules',
      status: 'local_rules',
      message: {
        role: 'assistant',
        content:
          'RUNTIME_NOT_READY: Perkhidmatan model awan tidak tersedia atau dilarang oleh polisi sifar kos. Beralih kepada mod deterministic LOCAL_RULES.',
      },
      reason,
      reasonDetail: detail,
      code: 'RUNTIME_NOT_READY',
      servedBy: 'local_rules',
      attempts,
      candidates: this.candidateReports(attempts),
      budget: this.budgetSummary(budget),
    };
    if (clientRunId) body.clientRunId = clientRunId;
    return this.jsonBodyResponse(body);
  }

  /**
   * Respons fail-closed: status `unavailable` + `code: 'RUNTIME_NOT_READY'`,
   * kandungan tetap yang tidak pernah memuat teks pengguna.
   */
  private failClosedResponse(
    runId: string,
    threadId: string,
    clientRunId: string | undefined,
    reason: CopilotRunReasonCode,
    content: string,
    model: string,
    providerId: string
  ): Response {
    const body: CopilotChatResponse = {
      runId,
      threadId,
      model,
      providerId,
      status: 'unavailable',
      message: { role: 'assistant', content },
      reason,
      reasonDetail: content,
      code: 'RUNTIME_NOT_READY',
      servedBy: 'none',
      attempts: [],
      candidates: this.candidateReports([]),
    };
    if (clientRunId) body.clientRunId = clientRunId;
    return this.jsonBodyResponse(body);
  }

  private unavailableResponse(
    runId: string,
    threadId: string,
    clientRunId: string | undefined,
    reason: CopilotRunReasonCode,
    detail: string,
    model: string,
    providerId: string,
    attempts: CopilotRunAttempt[],
    budget: ModelCallBudget,
    retryAfterMs?: number,
    retryHint?: string
  ): Response {
    const body: CopilotChatResponse = {
      runId,
      threadId,
      model,
      providerId,
      status: 'unavailable',
      message: {
        role: 'assistant',
        content: failClosedMessage(reason),
      },
      reason,
      reasonDetail: detail,
      code: 'RUNTIME_NOT_READY',
      servedBy: 'none',
      attempts,
      candidates: this.candidateReports(attempts),
      budget: this.budgetSummary(budget),
    };
    if (retryAfterMs !== undefined) body.retryAfterMs = retryAfterMs;
    if (retryHint !== undefined) body.retryHint = retryHint;
    if (clientRunId) body.clientRunId = clientRunId;
    return this.jsonBodyResponse(body);
  }
}
