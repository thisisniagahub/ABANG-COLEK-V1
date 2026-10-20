/**
 * AbangColek Sovereign GrowthOS — AG-UI SSE Parser (Writer B)
 *
 * Microservis Python ADK memancarkan event protokol AG-UI sebagai Server-Sent
 * Events, satu frame setiap event:
 *
 *   event: RUN_STARTED
 *   data: {"type":"RUN_STARTED","thread_id":"...","run_id":"..."}
 *
 * Parser ini setia kepada bentuk frame itu: ia membaca `event:` dan `data:`,
 * menukar JSON `data` kepada objek, dan tidak pernah meneka nama event
 * daripada kandungan. */

import type { AguiEvent, AguiStreamResult, AguiToolCall } from './types';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Memecahkan satu badan SSE (teks penuh) kepada senarai event AG-UI.
 * Frame dipisah oleh baris kosong; `data:` berbilang baris digabungkan.
 */
export function parseSseFrames(body: string): AguiEvent[] {
  const events: AguiEvent[] = [];
  for (const rawFrame of body.split(/\r?\n\r?\n/)) {
    const frame = rawFrame.trim();
    if (frame.length === 0) continue;

    let eventName: string | undefined;
    const dataLines: string[] = [];

    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).replace(/^ /, ''));
      }
    }

    if (dataLines.length === 0) continue;
    const data = dataLines.join('\n');
    if (data === '[DONE]') continue;

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      // Frame yang bukan JSON bukan event AG-UI — ia dilangkau, bukan diteka.
      continue;
    }

    const record = asRecord(payload);
    const type = readString(record?.type) ?? eventName;
    if (!type) continue;

    const event: AguiEvent = { ...(record ?? {}), type };
    if (eventName && eventName !== type) event.event = eventName;
    events.push(event);
  }
  return events;
}

/**
 * Membina hasil streaming daripada senarai event AG-UI: teks jawapan,
 * panggilan alat, snapshot state dan status run.
 */
export function summariseAguiEvents(events: AguiEvent[]): AguiStreamResult {
  let text = '';
  let stateSnapshot: Record<string, unknown> | undefined;
  let runId: string | undefined;
  let threadId: string | undefined;
  let finished = false;
  let error: string | undefined;
  let errorCode: string | undefined;

  const toolCalls = new Map<string, AguiToolCall>();
  const toolCallOrder: string[] = [];

  const toolCallFor = (id: string | undefined, name?: string): AguiToolCall => {
    const key = id ?? name ?? `tool-${toolCallOrder.length}`;
    const existing = toolCalls.get(key);
    if (existing) {
      if (name && !existing.name) existing.name = name;
      return existing;
    }
    const created: AguiToolCall = { started: false, argsComplete: false, hasResult: false };
    if (id) created.toolCallId = id;
    if (name) created.name = name;
    toolCalls.set(key, created);
    toolCallOrder.push(key);
    return created;
  };

  for (const event of events) {
    switch (event.type) {
      case 'RUN_STARTED': {
        runId = readString(event.run_id) ?? readString(event.runId) ?? runId;
        threadId = readString(event.thread_id) ?? readString(event.threadId) ?? threadId;
        break;
      }
      case 'TOOL_CALL_START': {
        const call = toolCallFor(
          readString(event.tool_call_id) ?? readString(event.toolCallId),
          readString(event.tool_call_name) ?? readString(event.toolCallName) ?? readString(event.name)
        );
        call.started = true;
        break;
      }
      case 'TOOL_CALL_ARGS': {
        const call = toolCallFor(
          readString(event.tool_call_id) ?? readString(event.toolCallId),
          readString(event.tool_call_name) ?? readString(event.toolCallName)
        );
        const delta = event.delta ?? event.args;
        call.args = mergeToolArgs(call.args, delta);
        break;
      }
      case 'TOOL_CALL_END': {
        const call = toolCallFor(readString(event.tool_call_id) ?? readString(event.toolCallId));
        call.argsComplete = true;
        break;
      }
      case 'TOOL_CALL_RESULT': {
        const call = toolCallFor(
          readString(event.tool_call_id) ?? readString(event.toolCallId),
          readString(event.name)
        );
        call.result = event.content ?? event.result ?? event.output;
        call.hasResult = true;
        break;
      }
      case 'TEXT_MESSAGE_START':
      case 'TEXT_MESSAGE_END': {
        break;
      }
      case 'TEXT_MESSAGE_CONTENT': {
        const delta = readString(event.delta) ?? readString(event.content) ?? readString(event.text);
        if (delta) text += delta;
        break;
      }
      case 'STATE_SNAPSHOT': {
        const snapshot = asRecord(event.snapshot);
        if (snapshot) stateSnapshot = snapshot;
        break;
      }
      case 'STATE_DELTA': {
        const delta = asRecord(event.delta);
        if (delta) stateSnapshot = { ...(stateSnapshot ?? {}), ...delta };
        break;
      }
      case 'RUN_FINISHED': {
        finished = true;
        runId = readString(event.run_id) ?? readString(event.runId) ?? runId;
        threadId = readString(event.thread_id) ?? readString(event.threadId) ?? threadId;
        break;
      }
      case 'RUN_ERROR': {
        error = readString(event.message) ?? 'ADK run gagal tanpa mesej.';
        errorCode = readString(event.code);
        break;
      }
      default:
        break;
    }
  }

  return {
    events,
    text,
    toolCalls: toolCallOrder.map(key => toolCalls.get(key)!).filter(Boolean),
    stateSnapshot,
    runId,
    threadId,
    finished,
    error,
    errorCode,
  };
}

/**
 * Argumen alat AG-UI dihantar sebagai delta JSON. Delta mungkin dipisah,
 * jadi setiap pecahan dicuba sebagai JSON penuh dan digabung sebagai objek.
 */
function mergeToolArgs(current: unknown, delta: unknown): unknown {
  if (typeof delta !== 'string') return delta ?? current;
  if (delta.length === 0) return current;
  try {
    return JSON.parse(delta);
  } catch {
    if (typeof current === 'string') return current + delta;
    return delta;
  }
}
