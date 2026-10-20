/**
 * AbangColek Sovereign GrowthOS — Python ADK Bridge Types (Writer B)
 *
 * Kontrak untuk jambatan TypeScript ↔ microservis Python Google ADK
 * (`agents/google-adk/**`, Writer D1). Skema ini diturunkan daripada
 * sumber perkhidmatan itu sendiri:
 *
 *   GET  /health                     → payload kesihatan yang jujur
 *   POST /agent/abangcolek_ops       → { ok, data }
 *   POST /agent/abangcolek_ops/stream → SSE dengan event protokol AG-UI
 *
 * PRINSIP KESELAMPAAN:
 * - Tiada rahsia dalam jambatan. Kunci API diselesaikan oleh perkhidmatan
 *   sendiri daripada persekitarannya (`ABANGCOLEK_ADK_API_KEY` >
 *   `GEMINI_API_KEY` > `GOOGLE_API_KEY`); jambatan tidak pernah membaca,
 *   log atau echoing kunci.
 * - Identiti hanya datang daripada actor server. Field identiti yang dihantar
 *   pelayar tidak pernah dihantar sebagai tuntutan keutamaan.
 * - Server-to-server sahaja: hanya bind loopback dibenarkan.
 */

/** Nama event protokol AG-UI yang dipancarkan oleh perkhidmatan. */
export const AGUI_EVENT_NAMES = [
  'RUN_STARTED',
  'TOOL_CALL_START',
  'TOOL_CALL_ARGS',
  'TOOL_CALL_END',
  'TOOL_CALL_RESULT',
  'TEXT_MESSAGE_START',
  'TEXT_MESSAGE_CONTENT',
  'TEXT_MESSAGE_END',
  'STATE_SNAPSHOT',
  'STATE_DELTA',
  'RUN_FINISHED',
  'RUN_ERROR',
] as const;

export type AguiEventName = (typeof AGUI_EVENT_NAMES)[number];

export interface AguiEvent {
  type: AguiEventName | string;
  [key: string]: unknown;
}

export interface AguiToolCall {
  toolCallId?: string;
  name?: string;
  args?: unknown;
  result?: unknown;
  started: boolean;
  argsComplete: boolean;
  hasResult: boolean;
}

export interface AguiStreamResult {
  /** events: urutan penuh event AG-UI yang dibaca. */
  events: AguiEvent[];
  /** text: gabungan semua delta TEXT_MESSAGE_CONTENT. */
  text: string;
  /** toolCalls: rungunan panggilan alat yang direkod. */
  toolCalls: AguiToolCall[];
  /** stateSnapshot: snapshot akhir jika dipancarkan. */
  stateSnapshot?: Record<string, unknown>;
  /** runId / threadId: daripada RUN_STARTED / RUN_FINISHED. */
  runId?: string;
  threadId?: string;
  /** finished: true jika RUN_FINISHED dipancarkan. */
  finished: boolean;
  /** error: mesej RUN_ERROR jika ada. */
  error?: string;
  /** errorCode: kod ralat AG-UI jika ada. */
  errorCode?: string;
}

/** Payload `GET /health` (subset yang digunakan jambatan). */
export interface AdkHealthModel {
  kind?: string;
  provider?: string;
  model?: string;
  credentialsConfigured?: boolean;
  credentialSource?: string;
  live?: boolean;
  reason?: string;
}

export interface AdkHealthPayload {
  status?: string;
  service?: string;
  version?: string;
  runtime?: string;
  runtimeAvailable?: boolean;
  runtimeDetails?: {
    available?: boolean;
    version?: string | null;
    modulePath?: string | null;
    importError?: string | null;
    pythonVersion?: string;
    fastapiVersion?: string | null;
  };
  model?: AdkHealthModel;
  specialists?: string[];
  agents?: string[];
  aguiEvents?: string[];
  schemaVersion?: string;
  zeroPaidSpend?: boolean;
  persistence?: string;
  checkedAt?: string;
}

export interface AdkAgentResponse {
  ok: boolean;
  data?: {
    status?: string;
    reasonCode?: string;
    reply?: string;
    specialist?: string;
    delegatedAgent?: string | null;
    schemaVersion?: string;
    a2ui?: unknown;
    provenance?: unknown;
    adk?: { agent?: string; tool?: string; sessionId?: string; runStatus?: string };
  };
  code?: string;
  message?: string;
}

/** Reason code jambatan — stabil, boleh dikawal oleh TS tanpa meneka teks. */
export type AdkBridgeReason =
  | 'ADK_BRIDGE_NOT_CONFIGURED'
  | 'ADK_BRIDGE_HOST_NOT_ALLOWED'
  | 'ADK_BRIDGE_UNAVAILABLE'
  | 'ADK_BRIDGE_RUNTIME_UNAVAILABLE'
  | 'ADK_BRIDGE_RUN_ERROR'
  | 'ADK_BRIDGE_UNRESOLVED'
  | 'ADK_BRIDGE_NO_TEXT'
  | 'ADK_BRIDGE_TIMEOUT';

export class AdkBridgeError extends Error {
  readonly reason: AdkBridgeReason;
  readonly httpStatus?: number;

  constructor(reason: AdkBridgeReason, message: string, httpStatus?: number) {
    super(message);
    this.name = 'AdkBridgeError';
    this.reason = reason;
    if (httpStatus !== undefined) this.httpStatus = httpStatus;
  }
}

export type AdkBridgeOutcome =
  | {
      ok: true;
      /** health: payload kesihatan sebenar yang digunakan. */
      health: AdkHealthPayload;
      /** reply: teks jawapan daripada specialist ADK. */
      reply: string;
      /** text: teks penuh daripada stream (jika stream digunakan). */
      text?: string;
      /** toolCalls: rungunan panggilan alat yang direkod. */
      toolCalls?: AguiToolCall[];
      /** stateSnapshot: snapshot akhir ADK. */
      stateSnapshot?: Record<string, unknown>;
      /** modelLive: true hanya jika perkhidmatan sendiri melaporkan model live. */
      modelLive: boolean;
      /** modelLabel: label model yang jujur (contoh 'local_policy'). */
      modelLabel: string;
      /** events: event AG-UI yang diparse (untuk bukti / jejak). */
      events?: AguiEvent[];
      /** runId / threadId: id yang dijana perkhidmatan. */
      runId?: string;
      threadId?: string;
    }
  | { ok: false; error: AdkBridgeError; health?: AdkHealthPayload };
