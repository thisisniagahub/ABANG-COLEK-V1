/**
 * CPK-09 — the Pet companion and the Copilot workspace share ONE run/thread
 * identity.
 *
 * These tests prove the sharing itself, not merely that a controller is
 * imported:
 *  - a run opened in the Pet and continued in the workspace resolves to the
 *    same run id and the same thread id;
 *  - a run opened in the workspace and continued in the Pet resolves to the
 *    same;
 *  - two independent sessions do NOT share an identity;
 *  - the identity that leaves the browser is the controller's, and it is
 *    declared as a client correlation label.
 *
 * The identity owner is `src/features/intelligence/copilotRunController.ts`.
 * The bridge that both surfaces use is `src/features/copilot/runIdentity.ts`.
 */

import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopilotRunController } from '../../src/features/intelligence/copilotRunController';
import {
  CLIENT_IDENTITY_AUTHORITY,
  attachCopilotRunIdentity,
  resolveCopilotRun,
} from '../../src/features/copilot/runIdentity';
import { buildCopilotRunRequest } from '../../src/features/copilot/agui/copilotRunRequest';
import { streamCopilotRun } from '../../src/features/copilot/agui/aguiClient';
import CopilotWorkspace from '../../src/features/workspaces/CopilotWorkspace';

describe('CPK-09 — one shared run / thread identity across the Pet and the workspace', () => {
  test('a run started in the Pet and continued in the workspace resolves to the same run id and thread id', () => {
    const controller = new CopilotRunController();

    // The Pet opens the run. A voice transcript is untrusted input.
    const petBody = attachCopilotRunIdentity(
      controller,
      { message: 'Semak stok botol kuah' },
      { surface: 'pet', inputTrust: 'untrusted' },
    );

    // The Copilot workspace continues that same run.
    const { request, identity, continued } = buildCopilotRunRequest(controller, {
      message: 'Teruskan laporan kebocoran',
    });

    expect(continued).toBe(true);
    expect(request.runId).toBe(petBody.runId);
    expect(request.threadId).toBe(petBody.threadId);
    expect(identity.runId).toBe(petBody.runId);
    expect(identity.threadId).toBe(petBody.threadId);
    // The run still belongs to the surface that opened it.
    expect(identity.surface).toBe('pet');
    // A run that started from voice stays untrusted even when it is continued
    // from typed chat.
    expect(identity.inputTrust).toBe('untrusted');
  });

  test('a run started in the workspace and continued in the Pet resolves to the same run id and thread id', () => {
    const controller = new CopilotRunController();

    const { request, continued } = buildCopilotRunRequest(controller, {
      message: 'Semak margin promosi',
    });
    expect(continued).toBe(false);

    // The Pet continues the open run instead of opening a second one.
    const petBody = attachCopilotRunIdentity(
      controller,
      { message: 'Teruskan draf emel' },
      { surface: 'pet', inputTrust: 'untrusted' },
    );

    expect(petBody.runId).toBe(request.runId);
    expect(petBody.threadId).toBe(request.threadId);
    expect(controller.getIdentity()?.runId).toBe(request.runId);
    expect(controller.getThreadId()).toBe(request.threadId);
  });

  test('the Pet and the workspace never open two runs for one shared scope', () => {
    const controller = new CopilotRunController();

    attachCopilotRunIdentity(
      controller,
      { message: 'Satu' },
      { surface: 'pet', inputTrust: 'untrusted' },
    );
    const first = buildCopilotRunRequest(controller, { message: 'Dua' });
    const second = buildCopilotRunRequest(controller, { message: 'Tiga' });

    expect(first.request.runId).toBe(second.request.runId);
    expect(first.request.threadId).toBe(second.request.threadId);
    expect(first.continued).toBe(true);
    expect(second.continued).toBe(true);
  });

  test('two independent sessions do not share a thread or a run', () => {
    const sessionA = new CopilotRunController();
    const sessionB = new CopilotRunController();

    const a = buildCopilotRunRequest(sessionA, { message: 'Sesi A' });
    const b = buildCopilotRunRequest(sessionB, { message: 'Sesi B' });

    expect(a.request.threadId).not.toBe(b.request.threadId);
    expect(a.request.runId).not.toBe(b.request.runId);
    expect(sessionA.getThreadId()).not.toBe(sessionB.getThreadId());
  });

  test('a voice transcript that joins an open run downgrades the run to untrusted', () => {
    const controller = new CopilotRunController();
    buildCopilotRunRequest(controller, { message: 'Teks taip' });

    const { identity, continued } = resolveCopilotRun(controller, {
      surface: 'pet',
      inputTrust: 'untrusted',
    });

    expect(continued).toBe(true);
    expect(identity.inputTrust).toBe('untrusted');
  });
});

describe('CPK-09 — the workspace uses the shared controller, not a local string', () => {
  test('the workspace renders the identity of the controller it was given', () => {
    const controller = new CopilotRunController();
    const identity = controller.beginRun({ surface: 'pet', inputTrust: 'untrusted' });

    const html = renderToStaticMarkup(<CopilotWorkspace controller={controller} />);

    expect(html).toContain(identity.threadId);
    expect(html).toContain(identity.runId);
    // The old local `thread-<uuid>` generator is gone.
    expect(html).not.toContain('thread-');
  });

  test('a second, independent workspace session does not inherit the first session identity', () => {
    const first = new CopilotRunController();
    first.beginRun({ surface: 'copilot' });
    const second = new CopilotRunController();
    second.beginRun({ surface: 'copilot' });

    const firstHtml = renderToStaticMarkup(<CopilotWorkspace controller={first} />);
    const secondHtml = renderToStaticMarkup(<CopilotWorkspace controller={second} />);

    expect(firstHtml).not.toContain(second.getThreadId() as string);
    expect(secondHtml).not.toContain(first.getThreadId() as string);
  });
});

describe('CPK-09 — the identity that leaves the browser', () => {
  test('the request body carries the controller thread and run, declared as a client label', async () => {
    const controller = new CopilotRunController();
    const { request } = buildCopilotRunRequest(controller, { message: 'Semak stok' });

    let body: Record<string, unknown> | null = null;
    // The official AG-UI route answers with `text/event-stream` frames whose
    // event type lives INSIDE the JSON payload (aguiClient.ts:15-21,66-73).
    // The old fixture answered `application/json`, which the client correctly
    // refuses (aguiClient.ts:410-419) — it produced `['error']`, not an answer.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(encoder.encode(
          'data: {"type":"RUN_STARTED","threadId":"thread-1","runId":"run-1"}\n\n',
        ));
        streamController.enqueue(encoder.encode(
          'data: {"type":"TEXT_MESSAGE_CONTENT","delta":"ok"}\n\n',
        ));
        streamController.enqueue(encoder.encode(
          'data: {"type":"RUN_FINISHED","result":{"status":"completed"}}\n\n',
        ));
        streamController.close();
      },
    });
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }) as unknown as typeof fetch;

    const events = [];
    for await (const event of streamCopilotRun({ ...request, fetchImpl })) {
      events.push(event);
    }

    // OLD: ['text_delta','done'] — encoded the retired legacy JSON-answer
    // fallback. NEW: the official AG-UI lifecycle the client really emits.
    expect(events.map((event) => event.type)).toEqual(['start', 'text_delta', 'done']);
    const sent = body as unknown as Record<string, unknown>;
    expect(sent.threadId).toBe(controller.getThreadId());
    expect(sent.runId).toBe(controller.getIdentity()?.runId);
    expect(sent.identityAuthority).toBe(CLIENT_IDENTITY_AUTHORITY);
    expect(sent.identityAuthority).toBe('client_correlation_label');
  });

  test('a JSON (non-SSE) answer is refused and never becomes a completed answer', async () => {
    const controller = new CopilotRunController();
    const { request } = buildCopilotRunRequest(controller, { message: 'Semak stok' });

    const fetchImpl = (async () => new Response(
      JSON.stringify({ ok: true, data: { reply: 'ok' } }),
      { headers: { 'Content-Type': 'application/json' } },
    )) as unknown as typeof fetch;

    const events = [];
    for await (const event of streamCopilotRun({ ...request, fetchImpl })) {
      events.push(event);
    }

    // Fail closed: exactly one error, and never a 'done'.
    expect(events.map((event) => event.type)).toEqual(['error']);
    expect(events[0]?.type === 'error' ? events[0].message : '').toContain('text/event-stream');
  });

  test('the workspace never sends an identifier the controller did not issue', () => {
    const controller = new CopilotRunController();
    const { request } = buildCopilotRunRequest(controller, { message: 'Semak stok' });

    expect(request.threadId).toBe(controller.getThreadId());
    expect(request.runId).toBe(controller.getIdentity()?.runId);
    expect(request.threadId).toMatch(/^thr_/);
    expect(request.runId).toMatch(/^run_/);
  });
});
