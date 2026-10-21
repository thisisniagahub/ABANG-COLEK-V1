/**
 * ABANGCOLEK Sovereign GrowthOS — AG-UI run client (official CopilotKit route)
 *
 * The browser talks to the OFFICIAL AG-UI run route:
 *
 *   POST /api/copilotkit/agent/abangcolek_ops/run
 *
 * The route is served by `api/copilotkit.ts` (`createCopilotKitRoute()`),
 * which is the SAME handler the local dev server mounts on
 * `http://127.0.0.1:3010` and the SAME handler Vercel serves. The request body
 * is the official `RunAgentInput` shape: `messages` plus the optional
 * `threadId` / `runId` correlation labels.
 *
 * The wire protocol is the official `@ag-ui/core` event stream. The official
 * encoder writes `data: {"type":"RUN_STARTED",...}` frames — the event type
 * lives INSIDE the JSON payload, not in an `event:` line. The legacy
 * project-local keyword router emitted `event: start` / `event: text_delta` /
 * `event: done` frames with a different protocol entirely; that protocol is
 * NOT accepted here, and the legacy JSON-answer fallback
 * (`eventsFromJsonAnswer`) has been removed so a non-AG-UI response can never
 * be mistaken for a completed answer.
 *
 * The internal lifecycle events (`start` / `text_delta` / `done` / `error`,
 * plus the A2UI carriers) stay exactly as they are: they are the contract
 * `src/features/copilot/agui/aguiRunState.ts` and the workspace render. Only
 * their SOURCE changed — the official AG-UI stream.
 *
 * TRUTHFULNESS — a run is only ever reported as completed when the server
 * said so AND a message actually arrived:
 *  - `RUN_ERROR` fails the run; the following `RUN_FINISHED` does NOT
 *    resurrect it as a completed answer.
 *  - a `RUN_FINISHED` that carries no text fails the run as well — an empty
 *    response is not an answer.
 *  - a stream that ends without any terminal event fails the run.
 *  - a non-AG-UI response (JSON, wrong content type) fails the run.
 *
 * IDENTITY — `threadId` / `runId` are CLIENT CORRELATION LABELS. They are
 * never proof of identity, tenancy or authority, and the server stays the
 * authority for the real run. The `identityAuthority` marking travels with
 * the request unchanged.
 */

import { parseAguiEvent, type AguiEvent } from './aguiEvents';
import type { ClientIdentityAuthority } from '../runIdentity';

/** ID ejen AG-UI rasmi yang dilayani oleh `api/copilotkit.ts`. */
export const COPILOTKIT_AGENT_ID = 'abangcolek_ops';

/** Laluan AG-UI rasmi yang sama dengan descriptor pelayan (`aguiRunRoute`). */
export const COPILOT_AGUI_RUN_ENDPOINT = `/api/copilotkit/agent/${COPILOTKIT_AGENT_ID}/run`;

/**
 * Nama lama untuk laluan runtime Copilot.
 *
 * Nilai kini ialah laluan AG-UI rasmi — bukan facade kata kunci legasi
 * `/api/platform/copilot/v2`.
 */
export const COPILOT_RUNTIME_ENDPOINT = COPILOT_AGUI_RUN_ENDPOINT;

/**
 * Nama event AG-UI rasmi yang boleh dilihat oleh klien ini.
 *
 * R-stream ini hanya menerima event AG-UI rasmi; frame terakhir yang sah
 * mesti `RUN_FINISHED` atau `RUN_ERROR`. Event lain diabaikan.
 */
export const AGUI_OFFICIAL_EVENT_NAMES = [
  'RUN_STARTED',
  'TEXT_MESSAGE_START',
  'TEXT_MESSAGE_CONTENT',
  'TEXT_MESSAGE_END',
  'RUN_FINISHED',
  'RUN_ERROR',
] as const;

export type AguiOfficialEventName = typeof AGUI_OFFICIAL_EVENT_NAMES[number];

export interface CopilotRunHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotRunRequest {
  message: string;
  history?: CopilotRunHistoryEntry[];
  /**
   * Client-supplied correlation label for the shared thread. It is a label,
   * not an identity: the server stays the authority for the real thread.
   */
  threadId?: string;
  /**
   * Client-supplied correlation label for the shared run. It is a label,
   * not an identity: the server stays the authority for the real run.
   */
  runId?: string;
  /**
   * States that the identifiers above are client correlation labels only.
   * A receiver must never treat them as proof of identity or authority.
   */
  identityAuthority?: ClientIdentityAuthority;
  csrfToken?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

const MAX_TEXT_LENGTH = 20_000;
const MAX_IDENTIFIER_LENGTH = 200;

/**
 * Internal carriers that are NOT part of the AG-UI lifecycle: the A2UI
 * surfaces (`a2ui`, `gen_ui`) and the HITL prompt. They are parsed with the
 * shared parser in `aguiEvents.ts`, so the A2UI allowlist path is unchanged.
 */
const A2UI_CARRIER_EVENT_NAMES = ['a2ui', 'gen_ui', 'hitl_prompt'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maximum = 2_000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || text.length > maximum) return undefined;
  return text;
}

function isOfficialEventName(value: string): value is AguiOfficialEventName {
  return (AGUI_OFFICIAL_EVENT_NAMES as readonly string[]).includes(value);
}

interface RawFrame {
  /** The optional `event:` line. The official encoder does not send one. */
  event?: string;
  /** The concatenated `data:` payload. */
  data: string;
}

/**
 * Reads one raw SSE frame.
 *
 * The official AG-UI encoder writes `data:`-only frames, so the `event:` line
 * is optional here. Keep-alive comments (`: ...`) are ignored.
 */
function readRawFrame(frame: string): RawFrame | null {
  const normalized = frame.replace(/\r\n/g, '\n');
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of normalized.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (dataLines.length === 0) return null;
  const data = dataLines.join('\n');
  return event ? { event, data } : { data };
}

interface RunStreamState {
  /** True once a text message actually arrived. */
  sawText: boolean;
  /** The accumulated answer text. */
  text: string;
  /** True once the run reached a terminal state (finished or failed). */
  terminal: boolean;
}

function translateOfficialEvent(
  name: AguiOfficialEventName,
  payload: Record<string, unknown>,
  state: RunStreamState,
): AguiEvent[] {
  switch (name) {
    case 'RUN_STARTED':
      return [{ type: 'start' }];
    case 'TEXT_MESSAGE_CONTENT': {
      const content = boundedString(payload.delta, MAX_TEXT_LENGTH);
      if (!content) return [];
      state.sawText = true;
      state.text = `${state.text}${content}`.slice(0, MAX_TEXT_LENGTH);
      return [{ type: 'text_delta', content }];
    }
    case 'RUN_ERROR': {
      if (state.terminal) return [];
      state.terminal = true;
      const message = boundedString(payload.message, MAX_TEXT_LENGTH)
        ?? 'Ralat runtime Copilot tidak dinyatakan.';
      // Reason code pelayan WAJIB dikekalkan: sebelum ini `payload.code`
      // dibuang, jadi satu kawalan mati (kode hanya dicatatkan, tidak pernah
      // dipamerkai). Lihat `aguiEvents.ts` untuk bentuk `code`.
      const code = boundedString(payload.code, MAX_IDENTIFIER_LENGTH);
      return code ? [{ type: 'error', message, code }] : [{ type: 'error', message }];
    }
    case 'RUN_FINISHED': {
      // A failed run stays failed: `RUN_FINISHED` after `RUN_ERROR` must not
      // be rendered as a completed answer.
      if (state.terminal) return [];
      state.terminal = true;
      const result = isRecord(payload.result) ? payload.result : {};
      const status = boundedString(result.status);
      const providerUsed = boundedString(result.providerId, MAX_IDENTIFIER_LENGTH);
      const modelUsed = boundedString(result.model, MAX_IDENTIFIER_LENGTH);
      if (status && status !== 'completed' && status !== 'partial') {
        const reason = boundedString(result.reason)
          ?? boundedString(result.code, 120)
          ?? status;
        return [{ type: 'error', message: `Run Copilot tidak berjaya: ${reason}` }];
      }
      if (!state.sawText) {
        return [{
          type: 'error',
          message: 'Runtime Copilot tidak mengembalikan sebarang jawapan.',
        }];
      }
      return [{
        type: 'done',
        reply: state.text,
        ...(providerUsed ? { providerUsed } : {}),
        ...(modelUsed ? { modelUsed } : {}),
        payload,
      }];
    }
    default:
      // `TEXT_MESSAGE_START` / `TEXT_MESSAGE_END` carry no lifecycle meaning
      // for the workspace, so they are accepted and ignored.
      return [];
  }
}

/**
 * Translates one raw SSE frame into internal lifecycle events.
 *
 * Official AG-UI frames are recognised by the `type` field inside the JSON
 * payload. Frames that only carry an `event:` line are accepted for the A2UI
 * / HITL carriers ONLY — the legacy lifecycle names (`start`, `text_delta`,
 * `done`, `error`) belong to the retired project-local protocol and are
 * rejected, so the wrong protocol can never drive this client.
 */
function translateFrame(frame: string, state: RunStreamState): AguiEvent[] {
  const raw = readRawFrame(frame);
  if (!raw) return [];

  let payload: unknown;
  try {
    payload = JSON.parse(raw.data);
  } catch {
    return [];
  }
  if (!isRecord(payload)) return [];

  const type = typeof payload.type === 'string' ? payload.type : undefined;
  if (type && isOfficialEventName(type)) {
    return translateOfficialEvent(type, payload, state);
  }

  if (raw.event && (A2UI_CARRIER_EVENT_NAMES as readonly string[]).includes(raw.event)) {
    const event = parseAguiEvent(raw.event, raw.data);
    return event ? [event] : [];
  }

  return [];
}

/**
 * Reads the official AG-UI event stream and yields the internal lifecycle.
 */
async function* readAguiEventStream(response: Response): AsyncGenerator<AguiEvent> {
  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'Runtime Copilot tidak mengembalikan aliran yang boleh dibaca.' };
    return;
  }

  const decoder = new TextDecoder();
  const state: RunStreamState = { sawText: false, text: '', terminal: false };
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const event of translateFrame(frame, state)) yield event;
        boundary = buffer.indexOf('\n\n');
      }
    }
  } catch (error) {
    // A stream that dies mid-flight is a failure, never a completed answer.
    yield {
      type: 'error',
      message: `Aliran AG-UI terputus: ${error instanceof Error ? error.message : String(error)}`,
    };
    return;
  }

  const tail = readRawFrame(buffer);
  if (tail) {
    for (const event of translateFrame(buffer, state)) yield event;
  }

  if (!state.terminal) {
    yield {
      type: 'error',
      message: 'Aliran AG-UI berakhir tanpa peristiwa penutup; keputusan run tidak dapat disahkan.',
    };
  }
}

/**
 * Builds the official `messages` array of the run request.
 *
 * The history is carried as AG-UI messages; the new prompt is the last user
 * message. Message ids are client-side labels only.
 */
function buildMessages(request: CopilotRunRequest): Array<{ id: string; role: 'user' | 'assistant'; content: string }> {
  const history = Array.isArray(request.history) ? request.history : [];
  const messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }> = [];
  for (const entry of history) {
    if (!entry || (entry.role !== 'user' && entry.role !== 'assistant')) continue;
    const content = boundedString(entry.content, MAX_TEXT_LENGTH);
    if (!content) continue;
    messages.push({ id: `msg_hist_${messages.length}`, role: entry.role, content });
  }
  messages.push({ id: `msg_user_${messages.length}`, role: 'user', content: request.message });
  return messages;
}

/**
 * Reads a failure response as a failure — never as an answer.
 */
async function failureMessage(response: Response): Promise<string> {
  let detail = '';
  try {
    const body = await response.json();
    if (isRecord(body)) {
      const code = boundedString(body.code, 120);
      const message = boundedString(body.message, 1_000)
        ?? boundedString(body.error, 1_000)
        ?? boundedString(body.details, 1_000);
      if (message) detail = code ? `${code}: ${message}` : message;
    }
  } catch {
    detail = '';
  }
  return detail || `Permintaan ditolak oleh pelayan (HTTP ${response.status}).`;
}

/**
 * Streams one Copilot run from the official AG-UI route.
 */
export async function* streamCopilotRun(
  request: CopilotRunRequest,
): AsyncGenerator<AguiEvent> {
  const endpoint = request.endpoint ?? COPILOT_AGUI_RUN_ENDPOINT;
  const fetchImpl = request.fetchImpl ?? fetch;

  const threadId = boundedString(request.threadId, MAX_IDENTIFIER_LENGTH);
  const runId = boundedString(request.runId, MAX_IDENTIFIER_LENGTH);
  if (!threadId || !runId) {
    // The official contract requires the correlation labels. The client never
    // invents them — the shared run controller owns them.
    yield {
      type: 'error',
      message: 'Permintaan Copilot memerlukan threadId dan runId daripada pengawal identiti.',
    };
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (request.csrfToken) headers['X-CSRF-Token'] = request.csrfToken;

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
      body: JSON.stringify({
        threadId,
        runId,
        messages: buildMessages(request),
        ...(request.identityAuthority ? { identityAuthority: request.identityAuthority } : {}),
      }),
      ...(request.signal ? { signal: request.signal } : {}),
    });
  } catch (error) {
    yield {
      type: 'error',
      message: error instanceof Error
        ? error.message
        : 'Runtime Copilot tidak dapat dihubungi.',
    };
    return;
  }

  if (!response.ok) {
    yield { type: 'error', message: await failureMessage(response) };
    return;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('text/event-stream') || !response.body) {
    // The official route always answers with an AG-UI event stream. Anything
    // else is not an answer and is never rendered as one.
    yield {
      type: 'error',
      message: 'Runtime Copilot tidak mengembalikan aliran AG-UI (text/event-stream).',
    };
    return;
  }

  yield* readAguiEventStream(response);
}
