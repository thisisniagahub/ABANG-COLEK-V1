/**
 * CPK-02 — AG-UI thread persistence, replay/resume and re-authorisation.
 *
 * The local half of AG-UI Streams is implemented here:
 *  - a thread's event history is stored canonically and replayed in order;
 *  - a reconnecting client resumes from the last event id it holds, without a
 *    gap and without a duplication;
 *  - the session and the thread's tenancy/ownership are re-verified on
 *    restore, so a client from another tenant can never resume a thread;
 *  - the number of state-changing receipts is identical before and after a
 *    reconnect, because a replay is a read and never re-executes.
 */

import { describe, expect, test } from 'bun:test';
import { EventType } from '@ag-ui/core';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth, hash, type Principal } from '../../server/platform/auth';
import { AguiThreadStore } from '../../server/agents/intelligence/threads';

interface Harness {
  store: PlatformStore;
  threads: AguiThreadStore;
  principalFor: (userId: string) => Principal;
}

function makeUser(
  store: PlatformStore,
  userId: string,
  role: string,
  dealerOrgId: string | null = null,
): { principal: Principal; token: string } {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(['hq']), dealerOrgId, 'active', 1);
  const token = `token-${userId}`;
  store.db
    .query('INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at,revoked,csrf_token) VALUES(?,?,?,?,0,?)')
    .run(hash(token), userId, hash('csrf'), new Date(Date.now() + 3_600_000).toISOString(), 'csrf');
  const auth = new Auth(store);
  return {
    principal: {
      user: { id: userId, email: `${userId}@example.test`, name: userId },
      memberships: auth.memberships(userId),
      sessionHash: hash(token),
      csrfHash: hash('csrf'),
      csrfToken: 'csrf',
    },
    token,
  };
}

function build(): Harness {
  const store = new PlatformStore(':memory:');
  const threads = new AguiThreadStore({ store });
  const principals = new Map<string, Principal>();
  return {
    store,
    threads,
    principalFor: (userId: string) => {
      const cached = principals.get(userId);
      if (cached) return cached;
      const role = userId.startsWith('dealer') ? 'staff' : 'founder';
      const dealerOrgId = userId.startsWith('dealer') ? 'dealer-org-9' : null;
      const created = makeUser(store, userId, role, dealerOrgId);
      principals.set(userId, created.principal);
      return created.principal;
    },
  };
}

function seedThread(harness: Harness, ownerId = 'founder-a') {
  const owner = harness.principalFor(ownerId);
  const thread = harness.threads.createThread(owner);
  harness.threads.appendEvent(owner, {
    threadId: thread.id,
    type: EventType.RUN_STARTED,
    event: { threadId: thread.id, runId: 'run-1' },
  });
  harness.threads.appendEvent(owner, {
    threadId: thread.id,
    type: EventType.TEXT_MESSAGE_CONTENT,
    event: { delta: 'Semakan' },
  });
  harness.threads.appendEvent(owner, {
    threadId: thread.id,
    type: EventType.TOOL_CALL_RESULT,
    event: { toolCallId: 'call-1' },
    stateChanging: true,
    receiptId: 'rcpt-1',
  });
  return thread;
}

describe('CPK-02 — AG-UI thread persistence, replay and resume', () => {
  test('a thread stores its event history canonically and without gaps', () => {
    const harness = build();
    const thread = seedThread(harness);
    const events = harness.threads.listEvents(thread.id);
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.type)).toEqual([
      'RUN_STARTED',
      'TEXT_MESSAGE_CONTENT',
      'TOOL_CALL_RESULT',
    ]);
    expect(harness.threads.getThread(thread.id)?.eventCount).toBe(3);
  });

  test('a reconnecting client resumes from its last event id without a gap or a duplication', () => {
    const harness = build();
    const thread = seedThread(harness);
    const owner = harness.principalFor('founder-a');
    const first = harness.threads.resume(owner, { threadId: thread.id });
    expect(first.events).toHaveLength(3);
    expect(first.lastEventId).toBe(`${thread.id}:3`);
    expect(first.caughtUp).toBe(false);

    // The client already holds the first two events.
    const second = harness.threads.resume(owner, { threadId: thread.id, afterEventId: `${thread.id}:2` });
    expect(second.events).toHaveLength(1);
    expect(second.events[0].id).toBe(`${thread.id}:3`);
    expect(second.events.map((event) => event.sequence)).toEqual([3]);

    // A client that is already up to date receives nothing.
    const third = harness.threads.resume(owner, { threadId: thread.id, afterEventId: `${thread.id}:3` });
    expect(third.events).toHaveLength(0);
    expect(third.caughtUp).toBe(true);
  });

  test('a resume with a cursor that is not part of the history is refused', () => {
    const harness = build();
    const thread = seedThread(harness);
    const owner = harness.principalFor('founder-a');
    let code = '';
    try {
      harness.threads.resume(owner, { threadId: thread.id, afterEventId: 'thr_unknown:9' });
    } catch (error) {
      code = (error as { code?: string }).code ?? '';
    }
    expect(code).toBe('RESUME_CURSOR_UNKNOWN');
  });

  test('a client from another tenant cannot resume the thread', () => {
    const harness = build();
    const thread = seedThread(harness);
    const dealer = harness.principalFor('dealer-user');
    let code = '';
    try {
      harness.threads.resume(dealer, { threadId: thread.id });
    } catch (error) {
      code = (error as { code?: string }).code ?? '';
    }
    expect(code).toBe('THREAD_TENANT_FORBIDDEN');
  });

  test('another user in the same tenant cannot resume a thread it does not own', () => {
    const harness = build();
    const thread = seedThread(harness, 'founder-a');
    const other = harness.principalFor('founder-b');
    let code = '';
    try {
      harness.threads.resume(other, { threadId: thread.id });
    } catch (error) {
      code = (error as { code?: string }).code ?? '';
    }
    expect(code).toBe('THREAD_OWNER_FORBIDDEN');
  });

  test('a revoked session cannot resume a thread', () => {
    const harness = build();
    const thread = seedThread(harness);
    const owner = harness.principalFor('founder-a');
    harness.store.db.query('UPDATE sessions SET revoked=1 WHERE token_hash=?').run(owner.sessionHash);
    let code = '';
    try {
      harness.threads.resume(owner, { threadId: thread.id });
    } catch (error) {
      code = (error as { code?: string }).code ?? '';
    }
    expect(code).toBe('SESSION_EXPIRED');
  });

  test('the receipt count is identical before and after a reconnect', () => {
    const harness = build();
    const thread = seedThread(harness);
    const owner = harness.principalFor('founder-a');
    const before = harness.threads.getThread(thread.id);
    expect(before?.receiptIds).toEqual(['rcpt-1']);

    const resumed = harness.threads.resume(owner, { threadId: thread.id });
    expect(resumed.receiptCount).toBe(1);
    const replayedReceipts = resumed.events
      .filter((event) => event.stateChanging)
      .map((event) => event.receiptId);
    expect(replayedReceipts).toEqual(['rcpt-1']);

    // A second reconnect does not duplicate the side effect either.
    const again = harness.threads.resume(owner, { threadId: thread.id });
    expect(again.receiptCount).toBe(1);
    const after = harness.threads.getThread(thread.id);
    expect(after?.receiptIds).toEqual(['rcpt-1']);
    expect(after?.eventCount).toBe(3);
  });

  test('appending the same receipt twice does not double count it', () => {
    const harness = build();
    const thread = seedThread(harness);
    const owner = harness.principalFor('founder-a');
    harness.threads.appendEvent(owner, {
      threadId: thread.id,
      type: EventType.TOOL_CALL_RESULT,
      event: { toolCallId: 'call-2' },
      stateChanging: true,
      receiptId: 'rcpt-1',
    });
    expect(harness.threads.getThread(thread.id)?.receiptIds).toEqual(['rcpt-1']);
  });
});
