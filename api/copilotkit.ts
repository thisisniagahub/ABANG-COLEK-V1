/**
 * AbangColek Sovereign GrowthOS — CopilotKit Runtime Route (public app origin)
 * Route: /api/copilotkit
 *
 * Laluan ini ialah pelayan CopilotKit yang sebenar. SATU implementasi,
 * dua mod rasmi `@copilotkit/runtime` — tiada protokol AG-UI ditulis semula:
 *
 * - `POST /api/copilotkit` (badan BUKAN envelope rasmi) — kontrak platform
 *   Writer B (`CopilotV2Runtime`): `status` union, header `X-Copilot-Run-Id` /
 *   `X-Copilot-Model`, kod `MALFORMED_JSON_PAYLOAD` / `INVALID_MESSAGES_ARRAY`.
 * - `POST /api/copilotkit` (badan envelope rasmi `{method, params, body}`) —
 *   pelayan rasmi mod single-route: `agent/run`, `agent/connect`, `info`,
 *   dsb. Envelope rasmi tidak lagi dibayangi oleh kontrak platform.
 * - `POST /api/copilotkit/agent/:agentId/run|connect|suggest` — laluan AG-UI
 *   rasmi (SSE) yang diservis oleh pelayan rasmi mod multi-route.
 * - `GET /api/copilotkit/info` — badan info runtime RASMI (agens yang
 *   diiklankan dengan nama yang mesti digunakan frontend), dipulangkan
 *   verbatim. Jika pelayan rasmi tidak dapat melayani laluan ini, badan 404
 *   terdokumentasinya yang dipulangkan — bukan descriptor reka 200.
 * - `GET /api/copilotkit/descriptor` — descriptor jujur khusus platform.
 *
 * IDENTITI — sesi server sahaja (CPK-01):
 * - Laluan yang melaksanakan ejen (run/connect/suggest) mesti menyelesaikan
 *   principal yang DISAHKAN daripada cookie `platform_session` melalui
 *   `server/platform/auth.ts`. Tanpa sesi: 401 bertyped. Actor/role/header
 *   daripada badan pelayar BUKAN kuasa dan tidak pernah dibaca.
 * - Kontrak platform pada laluan bare: permintaan TANPA kredensial dilayan
 *   mod awam eksplisit (`PUBLIC_ORIGIN_ACTOR`); permintaan YANG MEMBAWA
 *   kredensial mesti menyelesaikan principal sebenar — tetamu awam tidak
 *   pernah menjadi actor bisnes lalai bagi permintaan yang membawa sesi.
 *
 * PRODUCTION — `vercel.json` menulis semula `/api/copilotkit/:route*` kepada
 * `/api/copilotkit?__route=:route*` (fungsi Vercel hanya dipetakan kepada
 * laluan tepat `api/copilotkit.ts`). Laluan sebenar dipulihkan di sini
 * sebelum dispatch supaya `/info` dan laluan ejen sampai ke pelayan rasmi.
 *
 * Perbatimuan anti-echo: respons runtime tidak pernah memuat teks prompt;
 * laluan ini tidak menambah sebarang echo.
 */

// Import PERTAMA: mematikan telemetri CopilotKit sebelum pustaka dimuatkan.
import '../server/agents/mcp/telemetry';

import { existsSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { CopilotRuntime, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';
import { AbstractAgent } from '@ag-ui/client';
import type { RunAgentInput } from '@ag-ui/client';
import { EventType } from '@ag-ui/core';
import type { BaseEvent } from '@ag-ui/core';
import { Observable } from 'rxjs';
import type { Actor, WorkspaceRole } from '../shared/platform-contracts';
import type { CopilotV2Runtime } from '../server/agents/copilot/runtime';
import {
  copilotRuntime,
  PUBLIC_ORIGIN_ACTOR,
} from '../server/agents/copilot/runtime-instance';
import { visionInferenceAvailability } from '../server/agents/intelligence/availability';
import { Auth, type Principal } from '../server/platform/auth';
import { DomainError, PlatformStore } from '../server/platform/store';
import { SESSION_COOKIE_NAME, sessionCookieTokens } from '../server/platform/sessionCookie';

/** ID ejen AG-UI yang dipaparkan oleh laluan run. */
export const COPILOTKIT_AGENT_ID = 'abangcolek_ops';

/**
 * Nama parameter query yang membawa laluan runtime yang dipulihkan.
 *
 * `vercel.json` menghantar semula segmen `/api/copilotkit/:route*` melalui
 * parameter ini (fungsi Vercel hanya dipetakan kepada laluan tepat). Tanpa
 * pemulihan, `/api/copilotkit/info` tiba sebagai `/api/copilotkit?__route=info`
 * dan pelayan rasmi menjawab 404 walaupun laluan info wujud.
 */
const ROUTE_QUERY = '__route';

/**
 * Kaedah yang diterima oleh endpoint rasmi mod single-route. Senarai ini
 * menyalin `METHOD_NAMES` pelayan rasmi (`single-route-helpers`) supaya
 * pengesanan envelope pada laluan bare konsisten dengan pelayan rasmi —
 * badan dengan medan `method` di luar senarai ini bukan envelope dan terus
 * kepada kontrak platform.
 */
const SINGLE_ROUTE_METHODS = new Set([
  'agent/run',
  'agent/suggest',
  'agent/connect',
  'trajectory/connect',
  'agent/stop',
  'info',
  'inspector/metadata',
  'inspector/learning',
  'transcribe',
  'resource/request',
]);

/** Kaedah envelope yang MELAKSANAKAN ejen — mesti lalui gerbang principal. */
const AGENT_EXECUTING_METHODS = new Set(['agent/run', 'agent/connect', 'agent/suggest']);

const DATABASE_PATH = process.env.PLATFORM_DATABASE_PATH
  ?? 'var/lib/platform/platform.sqlite';

let storeInstance: PlatformStore | undefined;
let storeResolved = false;

/**
 * Store kanonikal platform (jalur yang sama seperti `api/mcp.ts`).
 *
 * Jika fail pangkalan data tidak wujud, TIDAK satu store kosong dikongsi —
 * `undefined` dikembalikan supaya gerbang sesi melaporkan 503
 * `RUNTIME_NOT_READY` dan bukannya menerima sesi palsu.
 */
function platformStore(): PlatformStore | undefined {
  if (storeResolved) return storeInstance;
  storeResolved = true;
  const path = resolvePath(process.cwd(), DATABASE_PATH);
  if (!existsSync(path)) {
    storeInstance = undefined;
    return undefined;
  }
  storeInstance = new PlatformStore(path);
  return storeInstance;
}

/**
 * Penjaga lampiran (BL-21 / EXT-07) untuk laluan awam.
 *
 * Laluan ini TIDAK mempunyai kuasa sesi server: rujukan lampiran tidak boleh
 * diselesaikan di sini (hash fail hanya boleh dibaca oleh store yang
 * disahkan sesi). Vision pula tiada model layak dikonfigurasi dalam repo ini.
 *
 * Oleh itu mana-mana permintaan yang membawa `attachmentIds` ditolak secara
 * jujur dengan 409 `VISION_INFERENCE_UNAVAILABLE` + `reasonCode`
 * `QUALIFIED_VISION_MODEL_REQUIRED`. Tiada vision reka, tiada hash reka.
 */
function attachmentIdsOf(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const ids = (payload as { attachmentIds?: unknown }).attachmentIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((value): value is string => typeof value === 'string');
}

/** Membaca `attachmentIds` tanpa mengubah badan asal (badan diklon). */
async function readAttachmentIds(request: Request): Promise<string[]> {
  if (request.method !== 'POST') return [];
  let payload: unknown;
  try {
    payload = await request.clone().json();
  } catch {
    // Badan bukan JSON: kontrak sedia ada runtime yang mengendalikan
    // (`MALFORMED_JSON_PAYLOAD`) — penjaga ini tidak mendahului runtime.
    return [];
  }
  return attachmentIdsOf(payload);
}

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

/** Principal sesi yang telah disahkan, bersama skop keahlian yang sebenar. */
interface ResolvedRoutePrincipal {
  principal: Principal;
  /** Actor platform yang dibina daripada membership aktif — bukan daripada pelayar. */
  actor: Actor;
  role: WorkspaceRole;
  outletIds: readonly string[];
}

/** Keputusan penyelesaian principal: sama ada disahkan atau gagal bertyped. */
type PrincipalOutcome =
  | { ok: true; resolved: ResolvedRoutePrincipal }
  | { ok: false; status: number; code: string; message: string };

/**
 * Ejen AG-UI yang meneruskan run ke runtime platform.
 *
 * Ejen ini TIDAK memanggil provider sendiri. Ia membina badan permintaan
 * platform, memanggil `CopilotV2Runtime`, dan menukar jawapan kepada event
 * AG-UI yang standard (`RUN_STARTED`, `TEXT_MESSAGE_*`, `RUN_FINISHED`).
 *
 * Principal disuntik pada masa permintaan (kilang ejen rasmi), jadi setiap
 * run terikat kepada sesi yang disahkan. Tanpa principal (senarai `/info`
 * tanpa sesi), runtime platform gagal tutup dengan `ACTOR_NOT_VERIFIED`
 * sebelum mana-mana provider dipanggil — tiada laluan ejen tanpa kuasa.
 */
class PlatformAguiAgent extends AbstractAgent {
  private readonly runtime: CopilotV2Runtime;
  private readonly principal?: ResolvedRoutePrincipal;

  constructor(runtime: CopilotV2Runtime, principal?: ResolvedRoutePrincipal) {
    super({
      agentId: COPILOTKIT_AGENT_ID,
      description: 'Pembantu operasi AbangColek (runtime platform CopilotV2Runtime).',
    });
    this.runtime = runtime;
    this.principal = principal;
  }

  /**
   * `AbstractAgent.clone()` membina objek kosong melalui
   * `Object.create(Object.getPrototypeOf(this))` dan hanya menyalin medan
   * asas SDK — medan subclass seperti `runtime`/`principal` HILANG. Tanpa
   * override ini, salinan agent tidak tahu runtime mana yang perlu dipanggil.
   */
  override clone(): PlatformAguiAgent {
    const copy = new PlatformAguiAgent(this.runtime, this.principal);
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

        const response = await this.runtime.handleRequest(request, this.principal?.actor);
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
          // AG-UI: selepas RUN_ERROR pengeluar TIDAK boleh memancarkan apa-apa
          // selain RUN_STARTED — RUN_FINISHED dikeluarkan daripada laluan
          // ralat supaya klien tidak boleh menafsirkan run gagal sebagai selesai.
          emit({
            type: EventType.RUN_ERROR,
            message: payload.message.content,
            code: payload.code ?? 'RUNTIME_NOT_READY',
          });
          if (!cancelled) subscriber.complete();
          return;
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
            // Skop principal yang benar-benar menyelesaikan run ini — bukti
            // boleh diperiksa bahawa actor datang daripada sesi server.
            // Tiada PII: peranan dan versi keahlian sahaja.
            ...(this.principal
              ? {
                  principal: {
                    role: this.principal.role,
                    membershipVersion: this.principal.actor.membershipVersion,
                  },
                }
              : {}),
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
  /**
   * Actor eksplisit untuk KONTRAK PLATFORM sahaja (mod awam eksplisit /
   * suntikan ujian). Ia TIDAK pernah melonggarkan gerbang principal laluan
   * AG-UI — run/connect/suggest sentiasa memerlukan sesi yang disahkan.
   */
  actor?: Actor;
  /**
   * Store kanonikal untuk pengesahan sesi. Default: `PLATFORM_DATABASE_PATH`
   * (jalur yang sama seperti `api/mcp.ts`). Suntikan store fixture untuk ujian.
   */
  store?: PlatformStore;
}

/**
 * Membina pengendali `/api/copilotkit`.
 *
 * Kilang ini membolehkan ujian menyuntik transport adapter yang sebenar
 * (`ModelAdapterRegistry`) dan store sesi yang sebenar tanpa menukar
 * kontrak laluan.
 */
export function createCopilotKitRoute(options: CopilotKitRouteOptions = {}): (
  req: Request,
) => Promise<Response> {
  const runtime = options.runtime ?? copilotRuntime;
  const explicitActor = options.actor;

  /** Token sesi daripada header `Authorization` (klien bukan pelayar). */
  const bearerToken = (request: Request): string | undefined => {
    const header = request.headers.get('authorization');
    if (!header) return undefined;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    const value = match?.[1]?.trim();
    return value && value.length > 0 ? value : undefined;
  };

  /** Adakah permintaan ini membawa kredensial sesi (cookie atau Bearer)? */
  const hasSessionCredential = (request: Request): boolean =>
    sessionCookieTokens(request).length > 0 || bearerToken(request) !== undefined;

  /**
   * Menyelesaikan principal yang DISAHKAN daripada sesi server sahaja.
   *
   * `Auth.resolve()` mengesahkan setiap nilai cookie `platform_session`
   * terhadap jadual `sessions` (migrasi BL-14); klien Bearer dipetakan kepada
   * cookie sintetik — jalur yang sama seperti `server/agents/mcp/session.ts`.
   * Kegagalan dipetakan kepada keputusan bertyped; tiada stack, tiada PII.
   */
  const resolveRoutePrincipal = (request: Request): PrincipalOutcome => {
    const store = options.store ?? platformStore();
    if (!store) {
      return {
        ok: false,
        status: 503,
        code: 'RUNTIME_NOT_READY',
        message: 'Store platform tidak tersedia; sesi tidak boleh disahkan.',
      };
    }
    const cookieTokens = sessionCookieTokens(request);
    const bearer = bearerToken(request);
    if (!cookieTokens.length && !bearer) {
      return { ok: false, status: 401, code: 'UNAUTHENTICATED', message: 'Sesi tidak dijumpai.' };
    }
    const target = cookieTokens.length ? request : new Request(request.url, {
      method: request.method,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${bearer}` },
    });
    try {
      const principal = new Auth(store).resolve(target);
      const membership = principal.memberships.find(entry => entry.status === 'active');
      if (!membership) {
        return {
          ok: false,
          status: 403,
          code: 'MEMBERSHIP_REVOKED',
          message: 'Tiada membership aktif untuk sesi ini.',
        };
      }
      return {
        ok: true,
        resolved: {
          principal,
          actor: {
            userId: principal.user.id,
            workspaceId: membership.workspaceId,
            membershipVersion: membership.version,
          },
          role: membership.role,
          outletIds: membership.outletIds,
        },
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return { ok: false, status: error.status, code: error.code, message: error.message };
      }
      throw error;
    }
  };

  /** Penolakan bertyped bagi gerbang principal (tiada stack, tiada PII). */
  const authRefusal = (outcome: { status: number; code: string; message: string }): Response =>
    jsonResponse({ ok: false, code: outcome.code, message: outcome.message }, outcome.status);

  /**
   * Cache principal per-permintaan: gerbang laluan ejen menyelesaikan sekali
   * dan kilang ejen rasmi membacanya semula tanpa pertanyaan kedua. Mod
   * single-route membina semula Request (cookie dikekalkan), jadi kilang
   * turun kepada penyelesaian semula daripada cookie — idempoten.
   */
  const principalByRequest = new WeakMap<Request, ResolvedRoutePrincipal>();

  const agentForRequest = (request: Request): PlatformAguiAgent => {
    const cached = principalByRequest.get(request);
    if (cached) return new PlatformAguiAgent(runtime, cached);
    const outcome = resolveRoutePrincipal(request);
    return new PlatformAguiAgent(runtime, outcome.ok ? outcome.resolved : undefined);
  };

  /**
   * Pelayan CopilotKit rasmi. Kilang ejen menyelesaikan principal bagi
   * setiap permintaan (sokongan rasmi `AgentsFactory`), jadi `/info`
   * mengiklankan ejen dengan nama yang mesti digunakan frontend dan setiap
   * run terikat kepada sesi yang disahkan. Ejen itu sahaja penjana jawapan
   * ialah runtime platform, jadi tiada provider kedua yang direka-reka.
   */
  const copilotKitRuntime = new CopilotRuntime({
    agents: ({ request }) => ({ [COPILOTKIT_AGENT_ID]: agentForRequest(request) }),
  });

  const copilotKitHandler = createCopilotRuntimeHandler({
    runtime: copilotKitRuntime,
    basePath: '/api/copilotkit',
    activateChannels: false,
  });

  /** Pelayan rasmi mod single-route untuk envelope pada laluan bare. */
  const singleRouteHandler = createCopilotRuntimeHandler({
    runtime: copilotKitRuntime,
    basePath: '/api/copilotkit',
    mode: 'single-route',
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

  /**
   * Penolakan vision yang jujur (BL-21).
   *
   * Rujukan lampiran TIDAK boleh diselesaikan pada laluan awam (tiada kuasa
   * sesi server), jadi senarai `attachments` kosong dan sebabnya dinyatakan
   * secara eksplisit — tiada hash reka.
   */
  const visionRefusal = (attachmentIds: string[]): Response => {
    const vision = visionInferenceAvailability();
    return jsonResponse(
      {
        ok: false,
        error: 'VISION_INFERENCE_UNAVAILABLE',
        code: 'VISION_INFERENCE_UNAVAILABLE',
        reasonCode: vision.reasonCode,
        message: vision.reason,
        data: {
          reasonCode: vision.reasonCode,
          reason: vision.reason,
          attachmentIds,
          attachments: [],
          attachmentResolution: 'NO_SESSION_AUTHORITY',
        },
      },
      409,
    );
  };

  /** 404 bertyped dengan senarai laluan yang benar-benar diservis. */
  const notFoundResponse = (): Response =>
    jsonResponse(
      {
        error: 'NOT_FOUND',
        detail: 'Laluan CopilotKit ini tidak dijumpai.',
        availableRoutes: [
          'POST /api/copilotkit',
          'POST /api/copilotkit/agent/abangcolek_ops/run',
          'POST /api/copilotkit/agent/abangcolek_ops/connect',
          'GET /api/copilotkit/descriptor',
          'GET /api/copilotkit/info',
        ],
      },
      404,
    );

  /**
   * Memulihkan laluan sebenar daripada parameter `__route` (rewrite Vercel).
   *
   * `null` bermaksud laluan tidak selamat (percubaan keluar daripada
   * `/api/copilotkit`) — permintaan ditolak 404 bertyped.
   */
  const restoreRoute = (request: Request): { request: Request; url: URL } | null => {
    const url = new URL(request.url);
    const route = url.searchParams.get(ROUTE_QUERY);
    if (route === null || route === '' || url.pathname !== '/api/copilotkit') {
      return { request, url };
    }
    const suffix = route.startsWith('/') ? route : `/${route}`;
    if (suffix.split('/').includes('..')) return null;
    const restored = new URL(url.toString());
    restored.pathname = `/api/copilotkit${suffix}`;
    restored.searchParams.delete(ROUTE_QUERY);
    return {
      request: new Request(restored, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: request.signal,
      }),
      url: restored,
    };
  };

  /**
   * Pengesanan envelope rasmi single-route pada laluan bare.
   *
   * Konservatif seperti pelayan rasmi: hanya POST JSON dengan medan `method`
   * yang diterima endpoint single-route dianggap envelope. Badan lain
   * (kontrak platform `{messages}`) tidak pernah mempunyai medan `method`.
   */
  const singleRouteEnvelopeMethod = async (request: Request): Promise<string | undefined> => {
    if (request.method !== 'POST') return undefined;
    if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
      return undefined;
    }
    let envelope: unknown;
    try {
      envelope = await request.clone().json();
    } catch {
      return undefined;
    }
    if (typeof envelope !== 'object' || envelope === null || Array.isArray(envelope)) {
      return undefined;
    }
    const method = (envelope as { method?: unknown }).method;
    return typeof method === 'string' && SINGLE_ROUTE_METHODS.has(method)
      ? method
      : undefined;
  };

  /**
   * Adakah laluan ini melaksanakan ejen? Cermin segmen `agent/:id/(run|
   * connect|suggest)` daripada penghala rasmi — laluan ini mesti lalui
   * gerbang principal sebelum pelayan rasmi dipanggil.
   */
  const isAgentExecutionRoute = (pathname: string): boolean => {
    const segments = pathname.split('/').filter(Boolean);
    const length = segments.length;
    if (length < 3) return false;
    if (segments[length - 3] !== 'agent') return false;
    const tail = segments[length - 1];
    return tail === 'run' || tail === 'connect' || tail === 'suggest';
  };

  return async (req: Request): Promise<Response> => {
    const restored = restoreRoute(req);
    if (!restored) return notFoundResponse();
    req = restored.request;
    const url = restored.url;

    // Laluan bare: kontrak platform (badan bukan envelope) KEKAL — kontrak
    // sedia ada frontend. Envelope rasmi single-route kini diservis pelayan
    // rasmi, jadi laluan bare tidak lagi membayanginya. Kaedah selain POST
    // didelegasikan kepada `CopilotV2Runtime` (405 `METHOD_NOT_ALLOWED`
    // bersama `X-Copilot-Run-Id` — kontrak sedia ada dan tidak diubah).
    if (url.pathname === '/api/copilotkit' && !url.searchParams.has('surface')) {
      const attachmentIds = await readAttachmentIds(req);
      if (attachmentIds.length) return visionRefusal(attachmentIds);
      if (req.method === 'POST') {
        const envelopeMethod = await singleRouteEnvelopeMethod(req);
        if (envelopeMethod !== undefined) {
          if (AGENT_EXECUTING_METHODS.has(envelopeMethod)) {
            const outcome = resolveRoutePrincipal(req);
            if (!outcome.ok) return authRefusal(outcome);
            principalByRequest.set(req, outcome.resolved);
          }
          return singleRouteHandler(req);
        }
        // Kontrak platform: tanpa kredensial ialah mod awam eksplisit;
        // permintaan yang membawa kredensial mesti menyelesaikan principal
        // sebenar — tetamu awam tidak pernah menjadi actor lalai.
        if (explicitActor) return runtime.handleRequest(req, explicitActor);
        if (!hasSessionCredential(req)) return runtime.handleRequest(req, PUBLIC_ORIGIN_ACTOR);
        const outcome = resolveRoutePrincipal(req);
        if (!outcome.ok) return authRefusal(outcome);
        return runtime.handleRequest(req, outcome.resolved.actor);
      }
      return runtime.handleRequest(req, explicitActor ?? PUBLIC_ORIGIN_ACTOR);
    }

    // Descriptor jujur khusus platform (kontrak sedia ada frontend).
    if (req.method === 'GET' && url.pathname === '/api/copilotkit/descriptor') {
      return jsonResponse(runtimeDescriptor());
    }

    // Laluan yang melaksanakan ejen: gerbang principal SEBELUM pelayan
    // rasmi — tanpa sesi yang sah, jawapannya 401 bertyped, bukan run
    // tetamu dengan alat bisnes. Penjaga lampiran (BL-21) mendahului.
    if (req.method === 'POST' && isAgentExecutionRoute(url.pathname)) {
      const attachmentIds = await readAttachmentIds(req);
      if (attachmentIds.length) return visionRefusal(attachmentIds);
      const outcome = resolveRoutePrincipal(req);
      if (!outcome.ok) return authRefusal(outcome);
      principalByRequest.set(req, outcome.resolved);
      return copilotKitHandler(req);
    }

    // `/info` rasmi: badan info pelayan rasmi dipulangkan VERBATIM — 200
    // rasmi kekal 200 rasmi, 404 terdokumentasi kekal 404 terdokumentasi.
    // Tiada descriptor reka yang berpura-pura menjadi badan rasmi.
    if (req.method === 'GET' && url.pathname === '/api/copilotkit/info') {
      return copilotKitHandler(req);
    }

    // Semua laluan lain di bawah `/api/copilotkit` dikendalikan oleh pelayan
    // CopilotKit rasmi (AG-UI connect/stop, inspector, dsb). Penjaga
    // lampiran (BL-21) tetap memeriksa setiap laluan POST sebelum pelayan
    // rasmi dipanggil; 404 rasmi digantikan dengan 404 bertyped senarai laluan.
    const attachmentIds = await readAttachmentIds(req);
    if (attachmentIds.length) return visionRefusal(attachmentIds);
    const response = await copilotKitHandler(req);
    if (response.status !== 404) return response;
    return notFoundResponse();
  };
}

export default createCopilotKitRoute();
