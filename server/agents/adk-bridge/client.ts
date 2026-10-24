/**
 * AbangColek Sovereign GrowthOS — Python ADK Bridge Client (Writer B)
 *
 * Pelanggan TypeScript untuk microservis Python Google ADK
 * (`agents/google-adk/**`). Tanggungjawab:
 *
 * 1. `GET /health` — mencari sama ada runtime ADK benar-benar ada, dan
 *    menggunakan `runtimeAvailable` / `runtimeDetails` / `model.live` sebagai
 *    sumber kebenaran (bukan anggapan).
 * 2. `POST /agent/abangcolek_ops` — jalankan master agent (bukan streaming).
 * 3. `POST /agent/abangcolek_ops/stream` — jalankan master agent dan parse
 *    event protokol AG-UI.
 *
 * Keselamatan:
 * - Tiada rahsia dalam fail ini. Kunci API diselesaikan oleh perkhidmatan
 *   sendiri daripada persekitarannya; jambatan tidak pernah membacanya.
 * - Identiti hanya daripada server. `runAgent` menerima actor server
 *   (workspace/user server-derived) dan TIDAK PERNAH menerima atau
 *   membawa sebarang identiti pelayar.
 * - Server-to-server sahaja: hanya host loopback dibenarkan.
 */

import { parseSseFrames, summariseAguiEvents } from './agui';
import { redactProviderErrorBody } from '../../../shared/copilot-contracts';
import {
  AdkBridgeError,
  type AdkAgentResponse,
  type AdkBridgeOutcome,
  type AdkBridgeReason,
  type AdkDelegationTrace,
  type AdkHealthPayload,
  type AguiToolCall,
} from './types';

export const DEFAULT_ADK_BRIDGE_URL = 'http://127.0.0.1:8030';
export const ADK_BRIDGE_HEALTH_PATH = '/health';
export const ADK_BRIDGE_AGENT_PATH = '/agent/abangcolek_ops';
export const ADK_BRIDGE_STREAM_PATH = '/agent/abangcolek_ops/stream';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export interface AdkBridgeOptions {
  /** URL asas jambatan. Kosong/tiada → `ADK_BRIDGE_NOT_CONFIGURED`. */
  baseUrl?: string;
  /** Persekitaran untuk resolving konfigurasi (default `process.env`). */
  env?: Record<string, string | undefined>;
  /** Transport suntikan untuk ujian unit. */
  fetchFn?: typeof fetch;
  /** Had masa probe kesihatan (ms). */
  healthTimeoutMs?: number;
  /** Had masa satu larian ADK (ms). */
  runTimeoutMs?: number;
}

export interface AdkBridgeRunRequest {
  /** Mesej operasi daripada pengguna (teks sahaja). */
  message: string;
  /** Actor server — digunakan untuk skop, BUKAN untuk identiti yang dihantar klien. */
  actor?: { userId?: string; workspaceId?: string };
  /** Label thread pelayar — label sahaja, bukan tuntutan keutamaan. */
  threadLabel?: string;
  /** Jejak delegasi parent -> child (CPK-10). */
  trace?: {
    traceId: string;
    parentRunId: string;
    childRunId?: string;
    parentAgent?: 'abangcolek_ops';
    delegatedAgent?: string | null;
  };
  /** Bajet yang diwarisi daripada run induk (CPK-10). */
  inheritedBudget?: AdkDelegationTrace['inheritedBudget'];
  /** Rujukan lampiran yang disahkan server (EXT-07). */
  attachments?: Array<{
    evidenceId: string;
    sha256: string;
    mimeType: string;
    name: string;
    permitted: boolean;
    revoked: boolean;
  }>;
}

function readConfig(options?: AdkBridgeOptions): { baseUrl?: string; reason?: AdkBridgeReason } {
  const env = options?.env ?? process.env;
  const configured = options?.baseUrl ?? env.ADK_BRIDGE_URL ?? env.ABANGCOLEK_ADK_BRIDGE_URL;
  const trimmed = typeof configured === 'string' ? configured.trim() : '';
  if (trimmed.length === 0) {
    return { reason: 'ADK_BRIDGE_NOT_CONFIGURED' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { reason: 'ADK_BRIDGE_NOT_CONFIGURED' };
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    return { reason: 'ADK_BRIDGE_HOST_NOT_ALLOWED' };
  }
  return { baseUrl: trimmed.replace(/\/+$/, '') };
}

function extractReply(payload: AdkAgentResponse | undefined): string | undefined {
  const direct = payload?.data?.reply;
  if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();
  return undefined;
}

export class AdkBridgeClient {
  private readonly options: AdkBridgeOptions;

  constructor(options?: AdkBridgeOptions) {
    this.options = options ?? {};
  }

  /** Adakah jambatan dikonfigurasikan dan dibenarkan (loopback)? */
  public configuration(): { configured: boolean; baseUrl?: string; reason?: string } {
    const { baseUrl, reason } = readConfig(this.options);
    return baseUrl ? { configured: true, baseUrl } : { configured: false, reason };
  }

  /**
   * Probe kesihatan. Sumber kebenaran ialah payload perkhidmatan itu sendiri:
   * `runtimeAvailable`, `runtimeDetails` dan `model.live`.
   */
  public async health(): Promise<AdkHealthPayload> {
    const { baseUrl, reason } = readConfig(this.options);
    if (!baseUrl) {
      throw new AdkBridgeError(reason ?? 'ADK_BRIDGE_NOT_CONFIGURED', 'Jambatan ADK tidak dikonfigurasikan.');
    }
    const fetchFn = this.options.fetchFn ?? fetch;
    const timeoutMs = this.options.healthTimeoutMs ?? 3000;
    try {
      const response = await fetchFn(`${baseUrl}${ADK_BRIDGE_HEALTH_PATH}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new AdkBridgeError(
          'ADK_BRIDGE_UNAVAILABLE',
          `Python ADK bridge memulangkan HTTP ${response.status} untuk /health.`,
          response.status
        );
      }
      const payload = (await response.json()) as AdkHealthPayload;
      if (payload.runtimeAvailable !== true) {
        throw new AdkBridgeError(
          'ADK_BRIDGE_RUNTIME_UNAVAILABLE',
          `Python ADK bridge melaporkan runtimeAvailable=false (runtime: ${payload.runtime ?? 'unknown'}).`,
          response.status
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof AdkBridgeError) throw error;
      throw new AdkBridgeError(
        'ADK_BRIDGE_UNAVAILABLE',
        `Python ADK bridge tidak dapat dihubungi: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Menjalankan master agent dan streamed AG-UI events.
   *
   * Body yang dihantar hanya mengandungi mesej operasi + skop server. Tiada
   * `user_id`/`role` daripada klien dihantar sebagai tuntutan keutamaan.
   */
  public async run(request: AdkBridgeRunRequest): Promise<AdkBridgeOutcome> {
    const { baseUrl, reason } = readConfig(this.options);
    if (!baseUrl) {
      return {
        ok: false,
        error: new AdkBridgeError(
          reason ?? 'ADK_BRIDGE_NOT_CONFIGURED',
          'Jambatan ADK tidak dikonfigurasikan untuk run ini.'
        ),
      };
    }

    let health: AdkHealthPayload | undefined;
    try {
      health = await this.health();
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof AdkBridgeError
            ? error
            : new AdkBridgeError('ADK_BRIDGE_UNAVAILABLE', String(error)),
      };
    }

    const body = this.buildRequestBody(request);
    const fetchFn = this.options.fetchFn ?? fetch;
    const baseTimeoutMs = this.options.runTimeoutMs ?? 25000;
    const timeoutMs = request.inheritedBudget?.remainingDeadlineMs
      ? Math.max(1, Math.min(baseTimeoutMs, request.inheritedBudget.remainingDeadlineMs))
      : baseTimeoutMs;

    try {
      const response = await fetchFn(`${baseUrl}${ADK_BRIDGE_STREAM_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.warn(`[adk-bridge] HTTP ${response.status}: ${redactProviderErrorBody(detail)}`);
        return {
          ok: false,
          health,
          error: new AdkBridgeError(
            'ADK_BRIDGE_UNAVAILABLE',
            `Python ADK bridge memulangkan HTTP ${response.status}`,
            response.status
          ),
        };
      }

      const raw = await response.text();
      const events = parseSseFrames(raw);
      const summary = summariseAguiEvents(events);

      if (summary.error) {
        return {
          ok: false,
          health,
          error: new AdkBridgeError('ADK_BRIDGE_RUN_ERROR', summary.error),
        };
      }
      if (summary.text.trim().length === 0) {
        return {
          ok: false,
          health,
          error: new AdkBridgeError(
            'ADK_BRIDGE_NO_TEXT',
            'Python ADK bridge tidak memancarkan sebarang teks untuk run ini.'
          ),
        };
      }

      const delegatedAgent = this.extractDelegatedAgent(summary.stateSnapshot, summary.toolCalls, request);
      const specialistTool = summary.toolCalls.find(
        tc => tc.name && tc.name !== 'transfer_to_agent'
      )?.name;
      const parentRunId = request.trace?.parentRunId ?? summary.runId ?? 'run-adk-parent';
      const childRunId =
        request.trace?.childRunId ??
        (delegatedAgent ? `${parentRunId}:sub:${delegatedAgent}` : `${parentRunId}:sub:none`);
      const traceId = request.trace?.traceId ?? `trace-${parentRunId}`;
      const delegation: AdkDelegationTrace = {
        traceId,
        parentRunId,
        childRunId,
        parentAgent: 'abangcolek_ops',
        delegatedBy: 'abangcolek_ops',
        delegatedAgent,
        ...(specialistTool ? { specialistTool } : {}),
        inheritedBudget: request.inheritedBudget ?? {
          parentMaxCalls: 3,
          remainingModelCalls: 2,
          remainingDeadlineMs: timeoutMs,
          remainingInputTokens: 24576,
          remainingOutputTokens: 3072,
        },
      };

      return {
        ok: true,
        health,
        reply: summary.text.trim(),
        text: summary.text,
        toolCalls: summary.toolCalls,
        stateSnapshot: summary.stateSnapshot,
        modelLive: health.model?.live === true,
        modelLabel: this.modelLabel(health),
        events,
        runId: summary.runId,
        threadId: summary.threadId,
        delegatedAgent,
        delegation,
      };
    } catch (error) {
      return {
        ok: false,
        health,
        error:
          error instanceof AdkBridgeError
            ? error
            : new AdkBridgeError(
                'ADK_BRIDGE_UNAVAILABLE',
                `Python ADK bridge tidak dapat dihubungi: ${error instanceof Error ? error.message : String(error)}`
              ),
      };
    }
  }

  /**
   * Jalankan master agent tanpa streaming (bentuk `{ ok, data }`).
   */
  public async runOnce(request: AdkBridgeRunRequest): Promise<AdkBridgeOutcome> {
    const { baseUrl, reason } = readConfig(this.options);
    if (!baseUrl) {
      return {
        ok: false,
        error: new AdkBridgeError(
          reason ?? 'ADK_BRIDGE_NOT_CONFIGURED',
          'Jambatan ADK tidak dikonfigurasikan untuk run ini.'
        ),
      };
    }

    let health: AdkHealthPayload | undefined;
    try {
      health = await this.health();
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof AdkBridgeError
            ? error
            : new AdkBridgeError('ADK_BRIDGE_UNAVAILABLE', String(error)),
      };
    }

    const fetchFn = this.options.fetchFn ?? fetch;
    const timeoutMs = this.options.runTimeoutMs ?? 25000;
    try {
      const response = await fetchFn(`${baseUrl}${ADK_BRIDGE_AGENT_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(this.buildRequestBody(request)),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.warn(`[adk-bridge] HTTP ${response.status}: ${redactProviderErrorBody(detail)}`);
        return {
          ok: false,
          health,
          error: new AdkBridgeError(
            'ADK_BRIDGE_UNAVAILABLE',
            `Python ADK bridge memulangkan HTTP ${response.status}`,
            response.status
          ),
        };
      }
      const payload = (await response.json()) as AdkAgentResponse;
      const reply = extractReply(payload);
      if (!reply) {
        const reasonCode = payload.data?.reasonCode ?? 'ADK_BRIDGE_UNRESOLVED';
        return {
          ok: false,
          health,
          error: new AdkBridgeError(
            'ADK_BRIDGE_UNRESOLVED',
            `Python ADK bridge tidak menghasilkan jawapan (reasonCode: ${reasonCode}).`
          ),
        };
      }
      return {
        ok: true,
        health,
        reply,
        modelLive: health.model?.live === true,
        modelLabel: this.modelLabel(health),
      };
    } catch (error) {
      return {
        ok: false,
        health,
        error:
          error instanceof AdkBridgeError
            ? error
            : new AdkBridgeError(
                'ADK_BRIDGE_UNAVAILABLE',
                `Python ADK bridge tidak dapat dihubungi: ${error instanceof Error ? error.message : String(error)}`
              ),
      };
    }
  }

  /**
   * Badan permintaan yang dihantar ke perkhidmatan.
   *
   * Hanya mesej operasi dan skop SERVER yang dihantar. Tiada `user_id`,
   * `role` atau sebarang identiti pelayar tidak pernah dimuatkan.
   */
  public buildRequestBody(request: AdkBridgeRunRequest): Record<string, unknown> {
    const payload: Record<string, unknown> = { query: request.message };
    const workspaceId = request.actor?.workspaceId?.trim();
    if (workspaceId) {
      // Skop ruang kerja server — bukan identiti peribadi.
      payload.workspaceScope = workspaceId;
    }
    if (request.threadLabel) {
      payload.threadId = request.threadLabel;
    }
    if (request.trace) {
      payload.trace = {
        traceId: request.trace.traceId,
        parentRunId: request.trace.parentRunId,
        ...(request.trace.childRunId ? { childRunId: request.trace.childRunId } : {}),
        parentAgent: request.trace.parentAgent ?? 'abangcolek_ops',
        ...(request.trace.delegatedAgent !== undefined ? { delegatedAgent: request.trace.delegatedAgent } : {}),
      };
    }
    if (request.inheritedBudget) {
      payload.budget = { ...request.inheritedBudget };
    }
    if (request.attachments && request.attachments.length > 0) {
      payload.attachments = request.attachments.map(att => ({
        evidenceId: att.evidenceId,
        sha256: att.sha256,
        mimeType: att.mimeType,
        name: att.name,
        permitted: att.permitted,
        revoked: att.revoked,
      }));
    }
    return { message: request.message, payload };
  }

  private extractDelegatedAgent(
    stateSnapshot: Record<string, unknown> | undefined,
    toolCalls: AguiToolCall[],
    request: AdkBridgeRunRequest
  ): string | null {
    if (typeof stateSnapshot?.delegatedAgent === 'string' && stateSnapshot.delegatedAgent.trim().length > 0) {
      return stateSnapshot.delegatedAgent.trim();
    }
    const transferCall = toolCalls.find(tc => tc.name === 'transfer_to_agent');
    if (transferCall && typeof transferCall.args === 'object' && transferCall.args !== null) {
      const agentName = (transferCall.args as { agent_name?: unknown }).agent_name;
      if (typeof agentName === 'string' && agentName.trim().length > 0) {
        return agentName.trim();
      }
    }
    if (typeof request.trace?.delegatedAgent === 'string' && request.trace.delegatedAgent.trim().length > 0) {
      return request.trace.delegatedAgent.trim();
    }
    return null;
  }

  /** Label model yang jujur:ikut apa yang perkhidmatan 자체 laporkan. */
  private modelLabel(health: AdkHealthPayload): string {
    const model = health.model;
    if (!model) return 'adk-runtime-unknown';
    if (model.kind === 'gemini' && model.model) return model.model;
    if (model.kind) return `adk-${model.kind}`;
    return 'adk-runtime-unknown';
  }
}
