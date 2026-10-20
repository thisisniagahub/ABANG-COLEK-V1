/**
 * AbangColek Sovereign GrowthOS — CopilotKit Runtime Route (public app origin)
 * Route: /api/copilotkit
 *
 * Laluan ini ialah pelayan CopilotKit yang sebenar:
 *
 * - `POST /api/copilotkit` — kontrak platform. Ia mendelegasikan kepada
 *   `CopilotV2Runtime` milik Writer B (`server/agents/copilot/runtime.ts`)
 *   dan memulangkan respons B SECARA VERBATIM: `status` union
 *   (`completed` | `partial` | `unavailable` | `local_rules`), header
 *   `X-Copilot-Run-Id` / `X-Copilot-Model`, kod `MALFORMED_JSON_PAYLOAD` /
 *   `INVALID_MESSAGES_ARRAY`, dan bentuk `unavailable` / `RUNTIME_NOT_READY`.
 * - `POST /api/copilotkit/agent/:agentId/run` — laluan AG-UI rasmi yang
 *   diservis oleh `@copilotkit/runtime` (`createCopilotRuntimeHandler`). Ejen
 *   AG-UI (`PlatformAguiAgent`) mendelegasikan kepada runtime B yang sama, jadi
 *   tiada provider direka-reka.
 * - `GET /api/copilotkit/info` — laluan `info` rasmi pelayan CopilotKit.
 * - `GET /api/copilotkit` — descriptor runtime yang JUJUR: ia hanya
 *   menyatakan apa yang sebenarnya melayani.
 *
 * Perbatimuan anti-echo: respons B tidak pernah memuat teks prompt; laluan
 * ini tidak menambah sebarang echo.
 */

// Import PERTAMA: mematikan telemetri CopilotKit sebelum pustaka dimuatkan.
import '../server/agents/mcp/telemetry';

import { CopilotRuntime, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';
import { AbstractAgent } from '@ag-ui/client';
import type { RunAgentInput } from '@ag-ui/client';
import { EventType } from '@ag-ui/core';
import type { BaseEvent } from '@ag-ui/core';
import { Observable } from 'rxjs';
import type { Actor } from '../shared/platform-contracts';
import type { CopilotV2Runtime } from '../server/agents/copilot/runtime';import {
  copilotRuntime,
  PUBLIC_ORIGIN_ACTOR,
} from '../server/agents/copilot/runtime-instance';

/** ID ejen AG-UI yang dipaparkan oleh laluan run. */
export const COPILOTKIT_AGENT_ID = 'abangcolek';

interface PlatformRunPayload {
  status: 'completed' | 'partial' | 'unavailable' | 'local_rules';
  runId: string;
  threadId: string;
  model: string;
  providerId: string;
  message: { role: 'assistant'; content: string };
  reason?: string;
  code?: string;
}

/**
 * Ejen AG-UI yang meneruskan run ke runtime platform.
 *
 * Ejen ini TIDAK memanggil provider sendiri. Ia membina badan permintaan
 * platform, memanggil `CopilotV2Runtime`, dan menukar jawapan kepada event
 * AG-UI yang standard (`RUN_STARTED`, `TEXT_MESSAGE_*`, `RUN_FINISHED`).
 */
class PlatformAguiAgent extends AbstractAgent {
  private readonly runtime: CopilotV2Runtime;
  private readonly actor: Actor;

  constructor(runtime: CopilotV2Runtime, actor: Actor) {
    super({
      agentId: COPILOTKIT_AGENT_ID,
      description: 'Pembantu operasi AbangColek (runtime platform CopilotV2Runtime).',
    });
    this.runtime = runtime;
    this.actor = actor;
  }

  /**
   * `AbstractAgent.clone()` membina objek kosong melalui
   * `Object.create(Object.getPrototypeOf(this))` dan hanya menyalin medan
   * asas SDK — medan subclass seperti `runtime`/`actor` HILANG. Tanpa
   * override ini, salinan agent tidak tahu runtime mana yang perlu dipanggil.
   */
  override clone(): PlatformAguiAgent {
    const copy = new PlatformAguiAgent(this.runtime, this.actor);
    copy.agentId = this.agentId;
    copy.description = this.description;
    copy.threadId = this.threadId;
    copy.messages = [...this.messages];
    copy.state = { ...this.state };
    copy.subscribers = [...this.subscribers];
    const source = this as unknown as { middlewares?: unknown[] };
    const target = copy as unknown as { middlewares?: unknown[] };
    if (source.middlewares) target.middlewares = [...source.middlewares];
    return copy;
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>(subscriber => {
      let cancelled = false;

      const emit = (event: BaseEvent): void => {
        if (!cancelled) subscriber.next(event);
      };

      void (async () => {
        emit({
          type: EventType.RUN_STARTED,
          ...(input.threadId ? { threadId: input.threadId } : {}),
          ...(input.runId ? { runId: input.runId } : {}),
        });

        const messages = input.messages
          .filter(message => message.role === 'user' || message.role === 'assistant')
          .map(message => ({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : '',
          }));

        const request = new Request('http://localhost/api/copilotkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            ...(input.threadId ? { threadId: input.threadId } : {}),
            ...(input.runId ? { runId: input.runId } : {}),
          }),
        });

        const response = await this.runtime.handleRequest(request, this.actor);
        const payload = await response.json() as PlatformRunPayload;

        if (payload.status === 'completed' || payload.status === 'partial') {
          const messageId = `asst_${payload.runId}`;
          emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' });
          emit({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: payload.message.content,
          });
          emit({ type: EventType.TEXT_MESSAGE_END, messageId });
        } else {
          emit({
            type: EventType.RUN_ERROR,
            message: payload.message.content,
            code: payload.code ?? 'RUNTIME_NOT_READY',
          });
        }

        emit({
          type: EventType.RUN_FINISHED,
          ...(input.threadId ? { threadId: input.threadId } : {}),
          ...(input.runId ? { runId: input.runId } : {}),
          result: {
            copilotRunId: payload.runId,
            model: payload.model,
            providerId: payload.providerId,
            status: payload.status,
            ...(payload.reason ? { reason: payload.reason } : {}),
            ...(payload.code ? { code: payload.code } : {}),
          },
        });

        if (!cancelled) subscriber.complete();
      })().catch((error: unknown) => {
        if (cancelled) return;
        subscriber.error(error instanceof Error ? error : new Error(String(error)));
      });

      return () => {
        cancelled = true;
      };
    });
  }
}

export interface CopilotKitRouteOptions {
  /** Runtime platform yang digunakan. Default: singleton `copilotRuntime`. */
  runtime?: CopilotV2Runtime;
  /** Actor server. Default: `PUBLIC_ORIGIN_ACTOR` (tiada kuasa data). */
  actor?: Actor;
}

/**
 * Membina pengendali `/api/copilotkit`.
 *
 * Kilang ini membolehkan ujian menyuntik transport adapter yang sebenar
 * (`ModelAdapterRegistry`) tanpa menukar kontrak laluan.
 */
export function createCopilotKitRoute(options: CopilotKitRouteOptions = {}): (
  req: Request,
) => Promise<Response> {
  const runtime = options.runtime ?? copilotRuntime;
  const actor = options.actor ?? PUBLIC_ORIGIN_ACTOR;

  /**
   * Pelayan CopilotKit rasmi. Ejen AG-UI itu sahaja penjana jawapan ialah
   * runtime platform, jadi tiada provider kedua yang direka-reka.
   */
  const copilotKitRuntime = new CopilotRuntime({
    agents: { [COPILOTKIT_AGENT_ID]: new PlatformAguiAgent(runtime, actor) },
  });

  const copilotKitHandler = createCopilotRuntimeHandler({
    runtime: copilotKitRuntime,
    basePath: '/api/copilotkit',
    activateChannels: false,
  });

  /**
   * Descriptor runtime yang jujur.
   *
   * Asas descriptor diambil daripada `CopilotV2Runtime.describe()` (Writer B)
   * supaya kedua-dua descriptor — di laluan awam dan di laluan platform —
   * konsisten melaporkan perkara yang sama. Tambahan di bawah hanya
   * menyatakan fakta yang boleh disahkan oleh laluan ini sahaja: runtime
   * CopilotKit rasmi memang berkhidmat di bawah `/api/copilotkit`.
   */
  const runtimeDescriptor = (): Record<string, unknown> => {
    const described = runtime.describe() as unknown as Record<string, unknown>;
    const candidates = Array.isArray(described.candidateModels)
      ? described.candidateModels.slice(0, 3)
      : [];
    return {
      ...described,
      candidateModels: candidates,
      aguiProtocolImplemented: true,
      copilotkitRuntimeImplemented: true,
      copilotkitRuntimeVersion: '1.79.1',
      aguiRunRoute: `/api/copilotkit/agent/${COPILOTKIT_AGENT_ID}/run`,
      platformRunRoute: '/api/copilotkit',
      platformRunContract: 'server/agents/copilot/runtime.ts#CopilotV2Runtime',
      providerReachability: 'verified-per-run-only',
      notes:
        'Descriptor ini hanya menyatakan apa yang sebenarnya melayani. '
        + 'Status sebenar provider hanya diketahui selepas satu run; '
        + 'run tanpa provider mengembalikan `unavailable` / `RUNTIME_NOT_READY`.',
    };
  };

  const jsonResponse = (payload: unknown, status = 200): Response =>
    new Response(JSON.stringify(payload, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    // Kontrak platform: SEMUA kaedah (termasuk GET) didelegasikan kepada
    // `CopilotV2Runtime` Writer B. GET devuelve 405 `METHOD_NOT_ALLOWED`
    // bersama `X-Copilot-Run-Id` — ini kontrak sedia ada dan tidak diubah.
    if (url.pathname === '/api/copilotkit' && !url.searchParams.has('surface')) {
      return runtime.handleRequest(req, actor);
    }

    // Descriptor runtime yang jujur. Laluan berasingan supaya kontrak
    // `CopilotV2Runtime` (405 untuk kaedah bukan POST) kekal utuh.
    if (req.method === 'GET' && url.pathname === '/api/copilotkit/descriptor') {
      return jsonResponse(runtimeDescriptor());
    }

    if (req.method === 'GET' && url.pathname === '/api/copilotkit/info') {
      const info = await copilotKitHandler(req);
      if (info.status === 404) return jsonResponse(runtimeDescriptor());
      return info;
    }

    // Semua laluan lain di bawah `/api/copilotkit` dikendalikan oleh pelayan
    // CopilotKit rasmi (AG-UI run, info, dll).
    const response = await copilotKitHandler(req);
    if (response.status !== 404) return response;

    return jsonResponse(
      {
        error: 'NOT_FOUND',
        detail: 'Laluan CopilotKit ini tidak dijumpai.',
        availableRoutes: [
          'POST /api/copilotkit',
          'POST /api/copilotkit/agent/abangcolek/run',
          'GET /api/copilotkit/descriptor',
          'GET /api/copilotkit/info',
        ],
      },
      404,
    );
  };
}

export default createCopilotKitRoute();
