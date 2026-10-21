/**
 * BL-15 / CPK-02 — Storan thread AG-UI: history kanonikal + replay SSE.
 *
 * Ujian ini memalsukan "chat yang berfungsi" sahaja: ia memerlukan thread id
 * dalam respons, replay SSE yang benar-benar berasal daripada event yang
 * DISIMPAN, penapis `?after=` yang memutar hanya event selepas kursor, dan
 * penolakan thread milik tenant/pemilik lain SEBELUM satu event pun bocor.
 *
 * Negative case wajib: `hitl_prompt` tanpa resit tidak boleh menjadi
 * state-changing (ia cadangan kepada pengasas, bukan perubahan state).
 */

import { describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { createPlatformApp } from '../../server/platform/app';
import { FreeModelRouter } from '../../server/platform/freeModelRouter';
import { AguiThreadStore } from '../../server/platform/aguiThreads';
import { Auth } from '../../server/platform/auth';
import { PlatformStore } from '../../server/platform/store';
import { now } from '../../server/platform/store';
import { RECORD_KINDS } from '../../shared/intelligence-records';
import type { AguiThreadEvent, AguiThreadRecord } from '../../shared/founder-intelligence-contracts';

let sequence = 0;

function localRouter(): FreeModelRouter {
  const router = new FreeModelRouter();
  router.setMockHandler(async () => ({
    providerId: 'local_rules',
    model: 'local_rules',
    content: 'Jawapan ujian tempatan.',
    status: 'local_rules',
  }));
  return router;
}

interface AppHarness {
  app: ReturnType<typeof createPlatformApp>;
  root: string;
  founder: { cookie: string; csrf: string; id: string };
  customer: { cookie: string; csrf: string; id: string };
  cleanup: () => void;
}

async function harness(testId: string): Promise<AppHarness> {
  sequence += 1;
  const root = `var/lib/qa/thread-${testId}-${process.pid}-${sequence}`;
  mkdirSync(root, { recursive: true });
  const app = createPlatformApp({
    databasePath: `${root}/platform.sqlite`,
    bootstrapToken: 'bl15-bootstrap-token',
    origin: 'http://localhost:3000',
    allowedOrigins: ['http://localhost:3000'],
    freeModelRouter: localRouter(),
  });

  const boot = await app.fetch(
    new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({
        email: `founder-${testId}@test.local`,
        password: 'password123456',
        name: 'Founder BL-15',
        token: 'bl15-bootstrap-token',
      }),
    }),
  );
  expect(boot.status).toBe(200);
  const founderData = (await boot.clone().json()) as { data: { csrfToken: string; user: { id: string } } };

  const signup = await app.fetch(
    new Request('http://localhost:3000/api/platform/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({
        email: `customer-${testId}@test.local`,
        password: 'password123456',
        name: 'Customer BL-15',
      }),
    }),
  );
  expect(signup.status).toBe(200);
  const customerData = (await signup.clone().json()) as { data: { csrfToken: string; user: { id: string } } };

  return {
    app,
    root,
    founder: {
      cookie: boot.headers.get('set-cookie')!,
      csrf: founderData.data.csrfToken,
      id: founderData.data.user.id,
    },
    customer: {
      cookie: signup.headers.get('set-cookie')!,
      csrf: customerData.data.csrfToken,
      id: customerData.data.user.id,
    },
    cleanup: () => {
      app.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function chatRequest(session: { cookie: string; csrf: string }, message: string): Request {
  return new Request('http://localhost:3000/api/platform/copilot/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: session.cookie,
      'x-csrf-token': session.csrf,
    },
    body: JSON.stringify({ message }),
  });
}

function eventsResponse(session: { cookie: string }, threadId: string, after?: string): Request {
  const query = after ? `?after=${encodeURIComponent(after)}` : '';
  return new Request(
    `http://localhost:3000/api/platform/copilot/threads/${threadId}/events${query}`,
    { headers: { Cookie: session.cookie } },
  );
}

describe('BL-15 — respons chat membawa thread id', () => {
  test('POST /copilot/chat => X-Thread-Id pada respons', async () => {
    const ctx = await harness('chat-thread-id');
    try {
      const response = await ctx.app.fetch(chatRequest(ctx.founder, 'Ringkaskan operasi hari ini.'));
      expect(response.status).toBe(200);
      const threadId = response.headers.get('x-thread-id');
      expect(threadId).toBeTruthy();
      expect(threadId!.length).toBeGreaterThan(0);

      // Thread itu benar-benar wujud di store kanonikal.
      const thread = ctx.app.store.get<AguiThreadRecord>(RECORD_KINDS.aguiThread, threadId!);
      expect(thread).not.toBeNull();
      expect(thread!.ownerId).toBe(ctx.founder.id);
    } finally {
      ctx.cleanup();
    }
  });
});

describe('BL-15 — replay SSE event yang disimpan', () => {
  test('GET /threads/<id>/events => SSE dengan X-Thread-Id / X-Last-Event-Id / X-Receipt-Count', async () => {
    const ctx = await harness('sse-replay');
    try {
      const chat = await ctx.app.fetch(chatRequest(ctx.founder, 'Ringkaskan operasi hari ini.'));
      const threadId = chat.headers.get('x-thread-id')!;

      const response = await ctx.app.fetch(eventsResponse(ctx.founder, threadId));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(response.headers.get('x-thread-id')).toBe(threadId);
      expect(response.headers.get('x-last-event-id')).toBeTruthy();
      expect(response.headers.get('x-receipt-count')).toBe('0');

      const body = await response.text();
      // Bingkai SSE berasal daripada event yang DISIMPAN, bukan daripada run baharu.
      expect(body).toContain('event: start');
      expect(body).toContain('event: done');
      expect(body).toContain('event: text_delta');

      // Bilangan bingkai sama dengan bilangan event yang disimpan.
      const stored = ctx.app.store
        .all<AguiThreadEvent>(RECORD_KINDS.aguiEvent)
        .filter((event) => event.threadId === threadId)
        // `store.all()` mengurutkan ikut `updated_at` (turun), dan semua event
        // satu thread berkongsi detik yang sama — jadi susunan array BUKAN
        // susunan sequence. Posteknik sort ikut `sequence` sebelum membanding.
        .sort((left, right) => left.sequence - right.sequence);
      expect(stored.length).toBeGreaterThanOrEqual(3);
      const frames = body.split('\n\n').filter((frame) => frame.trim().length > 0);
      expect(frames).toHaveLength(stored.length);
      expect(response.headers.get('x-last-event-id')).toBe(stored[stored.length - 1].id);
    } finally {
      ctx.cleanup();
    }
  });

  test('?after=<eventId> ⇒ hanya event SELEPAS kursor di replay', async () => {
    const ctx = await harness('sse-after');
    try {
      const chat = await ctx.app.fetch(chatRequest(ctx.founder, 'Ringkaskan operasi hari ini.'));
      const threadId = chat.headers.get('x-thread-id')!;

      const stored = ctx.app.store
        .all<AguiThreadEvent>(RECORD_KINDS.aguiEvent)
        .filter((event) => event.threadId === threadId)
        .sort((left, right) => left.sequence - right.sequence);
      expect(stored.length).toBeGreaterThanOrEqual(3);
      const cursor = stored[0].id;

      const response = await ctx.app.fetch(eventsResponse(ctx.founder, threadId, cursor));
      expect(response.status).toBe(200);
      const body = await response.text();
      const frames = body.split('\n\n').filter((frame) => frame.trim().length > 0);

      // Event pertama TIDAK diulang; yang selepasanya sahaja.
      expect(frames).toHaveLength(stored.length - 1);
      expect(body).not.toContain('event: start');
      expect(body).toContain('event: done');

      // Kursor yang tidak sebahagian sejarah ⇒ 409, bukan replay senyap.
      const unknown = await ctx.app.fetch(
        eventsResponse(ctx.founder, threadId, `${threadId}:9999`),
      );
      expect(unknown.status).toBe(409);
      const unknownBody = (await unknown.json()) as { ok: boolean; code: string };
      expect(unknownBody.ok).toBe(false);
      expect(unknownBody.code).toBe('RESUME_CURSOR_UNKNOWN');
    } finally {
      ctx.cleanup();
    }
  });
});

describe('BL-15 — thread milik orang lain tidak boleh dibaca', () => {
  test('Thread milik pengguna lain ⇒ 403 bertyped, tiada event bocor', async () => {
    const ctx = await harness('foreign-thread');
    try {
      const chat = await ctx.app.fetch(chatRequest(ctx.founder, 'Ringkaskan operasi hari ini.'));
      const threadId = chat.headers.get('x-thread-id')!;

      const response = await ctx.app.fetch(eventsResponse(ctx.customer, threadId));
      expect(response.status).toBe(403);
      const body = (await response.json()) as { ok: boolean; code: string };
      expect(body.ok).toBe(false);
      expect(['THREAD_TENANT_FORBIDDEN', 'THREAD_OWNER_FORBIDDEN']).toContain(body.code);

      // Tiada data thread dalam badan penolakan.
      expect(JSON.stringify(body)).not.toContain('text_delta');
    } finally {
      ctx.cleanup();
    }
  });
});

describe('BL-15 — hitl_prompt tanpa resit TIDAK state-changing', () => {
  test('Chat yang mencadangkan refund ⇒ hitl_prompt tanpa receiptId, receipt count 0', async () => {
    const ctx = await harness('hitl-no-receipt');
    try {
      // Rekod pesanan SEBENAR perlu ada: laluan HITL hanya boleh masuk bila
      // pesanan itu boleh diselesaikan (id exists dalam store) — selain itu
      // tiada `hitlAction` langsung, jadi tiada `hitl_prompt` untuk diuji.
      const stamp = now();
      ctx.app.store.save('orders', {
        id: 'ord-alpha-001',
        customerId: 'cust-thread-001',
        lines: [],
        amountSen: 7000,
        fulfilment: 'delivery',
        contactRef: 'Ahmad Colek, 0123456789',
        outletId: 'hq',
        fulfilmentStatus: 'dispatched',
        revision: 1,
        paymentState: 'verified',
        paidAmountSen: 7000,
        refundAmountSen: 0,
        createdAt: stamp,
        updatedAt: stamp,
      } as unknown as Parameters<typeof ctx.app.store.save>[1]);

      const chat = await ctx.app.fetch(
        chatRequest(
          ctx.founder,
          'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-alpha-001',
        ),
      );
      expect(chat.status).toBe(200);
      const threadId = chat.headers.get('x-thread-id')!;

      const events = ctx.app.store
        .all<AguiThreadEvent>(RECORD_KINDS.aguiEvent)
        .filter((event) => event.threadId === threadId)
        .sort((left, right) => left.sequence - right.sequence);
      const hitlEvent = events.find((event) => {
        const payload = event.event as { name?: unknown };
        return payload.name === 'hitl_prompt';
      });
      expect(hitlEvent).toBeDefined();
      // Tiada resit ⇒ peristiwa ini bukan state-changing.
      expect(hitlEvent!.stateChanging).toBe(false);
      expect(hitlEvent!.receiptId).toBeUndefined();

      const thread = ctx.app.store.get<AguiThreadRecord>(RECORD_KINDS.aguiThread, threadId)!;
      expect(thread.receiptIds).toEqual([]);

      const response = await ctx.app.fetch(eventsResponse(ctx.founder, threadId));
      expect(response.headers.get('x-receipt-count')).toBe('0');
    } finally {
      ctx.cleanup();
    }
  });

  test('NEGATIF: appendEvent stateChanging tanpa receiptId ⇒ tiada event ditulis', () => {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const threads = new AguiThreadStore({ store, auth });
    const actor = {
      user: { id: 'usr-hitl-01', email: 'usr-hitl-01@test.local', name: 'Hitl' },
      memberships: [
        {
          id: 'mem-hitl-01',
          userId: 'usr-hitl-01',
          workspaceId: 'business',
          role: 'founder' as const,
          outletIds: ['hq'],
          status: 'active' as const,
          version: 1,
        },
      ],
      sessionHash: 'hash-hitl-01',
      csrfHash: 'csrf-hitl-01',
    };
    const thread = threads.createThread(actor as never);

    let thrown: { code?: string; status?: number } | null = null;
    try {
      threads.appendEvent(actor as never, {
        threadId: thread.id,
        type: 'CUSTOM',
        event: { name: 'hitl_prompt', data: { id: 'hitl-01' } },
        stateChanging: true,
      });
    } catch (error) {
      thrown = error as { code?: string; status?: number };
    }
    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe('RECEIPT_ID_REQUIRED');
    expect(thrown!.status).toBe(400);

    // Tiada event ditulis, tiada resit direkodkan.
    expect(threads.listEvents(thread.id)).toHaveLength(0);
    expect(threads.receiptIds(thread.id)).toEqual([]);
    store.close();
  });
});
