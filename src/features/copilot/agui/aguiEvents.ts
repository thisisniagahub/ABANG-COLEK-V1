/**
 * ABANGCOLEK Sovereign GrowthOS — AG-UI event contract (frontend binding)
 *
 * The event names and payload shapes mirror the server implementation that
 * already exists in this repository:
 *  - server/platform/app.ts (POST /copilot/v2 with `accept: text/event-stream`)
 *      events: start | text_delta | a2ui | gen_ui | hitl_prompt | done | error
 *  - server/agents/copilot/runtime.ts (JSON fallback shape)
 *
 * Nothing here invents an event: unknown event names and malformed payloads are
 * rejected so the UI can never render an unverified lifecycle state.
 */

export const AGUI_EVENT_NAMES = [
  'start',
  'text_delta',
  'a2ui',
  'gen_ui',
  'hitl_prompt',
  'done',
  'error',
] as const;

export type AguiEventName = typeof AGUI_EVENT_NAMES[number];

export type AguiEvent =
  | {
      type: 'start';
      providerId?: string;
      model?: string;
      runtime?: string;
      schemaVersion?: string;
    }
  | { type: 'text_delta'; content: string }
  | { type: 'a2ui'; payload: unknown }
  | { type: 'gen_ui'; componentName: string; props: Record<string, unknown> }
  | { type: 'hitl_prompt'; payload: unknown }
  | {
      type: 'done';
      reply?: string;
      providerUsed?: string;
      modelUsed?: string;
      payload: unknown;
    }
  | {
      type: 'error';
      message: string;
      /**
       * Reason code asal daripada pelayan. Sebelum ini ia dibuang ⇒ satu
       * kawalan mati: pelayan menghantar `payload.code` yang boleh dibaca mesin
       * (contoh `PROVIDER_QUOTA_EXHAUSTED`, `VISION_INFERENCE_UNAVAILABLE`)
       * tetapi pengguna hanya nampak teks sahaja. Docs CopilotKit: "Critical
       * error codes … are alerted on, not just logged" — kod mesti kekal
       * sehingga ke lapisan pemerksamai.
       */
      code?: string;
    };

const MAX_TEXT_LENGTH = 20_000;
const MAX_IDENTIFIER_LENGTH = 160;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maximum = MAX_IDENTIFIER_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || text.length > maximum) return undefined;
  return text;
}

function isAguiEventName(value: string): value is AguiEventName {
  return (AGUI_EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Parses one server-sent event into a typed AG-UI event.
 * Returns null when the event is unknown or malformed.
 */
export function parseAguiEvent(name: string, rawData: string): AguiEvent | null {
  if (!isAguiEventName(name)) return null;

  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  switch (name) {
    case 'start': {
      const providerId = boundedString(data.activeProvider);
      const model = boundedString(data.model);
      const runtime = boundedString(data.runtime);
      const schemaVersion = boundedString(data.schemaVersion);
      return {
        type: 'start',
        ...(providerId ? { providerId } : {}),
        ...(model ? { model } : {}),
        ...(runtime ? { runtime } : {}),
        ...(schemaVersion ? { schemaVersion } : {}),
      };
    }
    case 'text_delta': {
      const content = boundedString(data.content, MAX_TEXT_LENGTH);
      if (!content) return null;
      return { type: 'text_delta', content };
    }
    case 'a2ui':
      return { type: 'a2ui', payload: data };
    case 'gen_ui': {
      const componentName = boundedString(data.name);
      if (!componentName) return null;
      const props = isRecord(data.props) ? data.props : {};
      return { type: 'gen_ui', componentName, props };
    }
    case 'hitl_prompt':
      return { type: 'hitl_prompt', payload: data };
    case 'done': {
      const reply = boundedString(data.reply, MAX_TEXT_LENGTH);
      const providerUsed = boundedString(data.providerUsed);
      const modelUsed = boundedString(data.modelUsed);
      return {
        type: 'done',
        ...(reply ? { reply } : {}),
        ...(providerUsed ? { providerUsed } : {}),
        ...(modelUsed ? { modelUsed } : {}),
        payload: data,
      };
    }
    case 'error': {
      const message = boundedString(data.message, MAX_TEXT_LENGTH)
        ?? 'Ralat coping tidak dinyatakan.';
      return { type: 'error', message };
    }
    default:
      return null;
  }
}

export interface SseFrame {
  name: string;
  data: string;
}

/**
 * Parses a raw SSE frame block (`event: x` / `data: {...}` lines).
 */
export function parseSseFrame(frame: string): SseFrame | null {
  const normalized = frame.replace(/\r\n/g, '\n');
  let name = '';
  const dataLines: string[] = [];

  for (const line of normalized.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      name = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (!name || dataLines.length === 0) return null;
  return { name, data: dataLines.join('\n') };
}
