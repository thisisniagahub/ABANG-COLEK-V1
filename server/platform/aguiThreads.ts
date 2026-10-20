/**
 * AbangColek Sovereign GrowthOS — CPK-02 AG-UI thread persistence (local half)
 *
 * A thread's event history is stored canonically inside the platform store.
 * A reconnecting client resumes from the last event id it has seen and
 * receives the remaining events in order — without a gap and without a
 * duplication.
 *
 * Two properties are enforced here and are not optional:
 *
 *  1. Re-authorisation on restore. Resuming re-verifies the live session and
 *     the thread's ownership/tenancy. A client from another tenant can never
 *     resume a thread it does not own.
 *  2. Receipt parity across a reconnect. The number of state-changing receipts
 *     in a thread is identical before and after a replay, because a replay is
 *     a read: it never re-executes and never appends a receipt.
 *
 * The live/cloud half of AG-UI Streams (saved runs, cross-device resume,
 * Intelligence entitlement) is externally gated and is NOT claimed here. See
 * `shared/intelligence-availability.ts`.
 *
 * Why it lives here (and not under `server/agents/intelligence`):
 *
 *  The thread store reads and writes the platform store and re-verifies the
 *  session through the platform's `Auth`, so it IS platform persistence. The
 *  platform layer is the base layer of the server: modules may depend on it,
 *  but it must never depend on a module. `server/agents/intelligence/threads.ts`
 *  re-exports this implementation so the historical import path keeps working.
 *
 * The platform app mounts it in `server/platform/app.ts`:
 *  - construction: `new AguiThreadStore({ store, auth })`
 *  - chat run: `createThread` / `getThread` / `appendEvent`
 *  - resume route: `resume(actor, { threadId, afterEventId })`
 */

import { EventType } from '@ag-ui/core';
import { Auth, type Principal } from './auth';
import { fail } from './store';
import type { PlatformStore } from './store';
import { resolveTenantId, resolveTenantIds } from './tenancy';
import { RECORD_KINDS } from '../../shared/intelligence-records';
import type { AguiResumeResult, AguiThreadEvent, AguiThreadRecord } from '../../shared/founder-intelligence-contracts';

export interface AguiThreadStoreOptions {
  store: PlatformStore;
  /** Used to re-verify the session on restore. */
  auth?: Auth;
  clock?: () => string;
}

export interface AppendEventInput {
  threadId: string;
  type: EventType | string;
  event: Record<string, unknown>;
  /** True when the event carries a state-changing side effect. */
  stateChanging?: boolean;
  /** The receipt id of the state change, when there is one. */
  receiptId?: string;
}

export interface ResumeInput {
  threadId: string;
  /** The last event id the client already holds. `null` replays everything. */
  afterEventId?: string | null;
}

export class AguiThreadStore {
  private readonly auth: Auth;

  constructor(private readonly options: AguiThreadStoreOptions) {
    this.auth = options.auth ?? new Auth(options.store);
  }

  private now(): string {
    return this.options.clock ? this.options.clock() : new Date().toISOString();
  }

  getThread(threadId: string): AguiThreadRecord | null {
    return this.options.store.get<AguiThreadRecord>(RECORD_KINDS.aguiThread, threadId);
  }

  listThreads(tenantId?: string): AguiThreadRecord[] {
    const all = this.options.store.all<AguiThreadRecord>(RECORD_KINDS.aguiThread);
    return tenantId ? all.filter((thread) => thread.tenantId === tenantId) : all;
  }

  /** Creates a thread owned by the actor. */
  createThread(actor: Principal, threadId?: string): AguiThreadRecord {
    const id = threadId ?? `thr_${crypto.randomUUID()}`;
    const existing = this.getThread(id);
    if (existing) {
      fail('THREAD_EXISTS', 409, 'Thread ini telah wujud.');
    }
    const at = this.now();
    const thread: AguiThreadRecord = {
      id,
      tenantId: resolveTenantId(actor),
      ownerId: actor.user.id,
      lastEventId: null,
      eventCount: 0,
      receiptIds: [],
      createdAt: at,
      updatedAt: at,
      revision: 1,
    };
    this.options.store.save(RECORD_KINDS.aguiThread, thread);
    this.options.store.audit(actor.user.id, 'agui.thread.create', thread.id, 1);
    return thread;
  }

  /**
   * Appends one event to a thread. The event id is derived from the thread's
   * monotonic sequence number, so re-appending the same event is a no-op
   * instead of a duplicate.
   */
  appendEvent(actor: Principal, input: AppendEventInput): AguiThreadEvent {
    const thread = this.requireOwnedThread(actor, input.threadId);
    if (input.stateChanging && !input.receiptId) {
      fail('RECEIPT_ID_REQUIRED', 400, 'Peristiwa yang mengubah keadaan mesti membawa id resit.');
    }
    const sequence = thread.eventCount + 1;
    const eventId = `${thread.id}:${sequence}`;
    const duplicate = this.findEvent(thread.id, eventId);
    if (duplicate) return duplicate;

    const event: AguiThreadEvent = {
      id: eventId,
      threadId: thread.id,
      sequence,
      type: String(input.type),
      event: input.event,
      stateChanging: Boolean(input.stateChanging),
      ...(input.receiptId ? { receiptId: input.receiptId } : {}),
      createdAt: this.now(),
    };
    const receiptIds =
      input.stateChanging && input.receiptId && !thread.receiptIds.includes(input.receiptId)
        ? [...thread.receiptIds, input.receiptId]
        : thread.receiptIds;
    this.options.store.atomic(() => {
      this.options.store.save(RECORD_KINDS.aguiEvent, event);
      this.options.store.save(RECORD_KINDS.aguiThread, {
        ...thread,
        lastEventId: eventId,
        eventCount: sequence,
        receiptIds,
        updatedAt: event.createdAt,
        revision: thread.revision + 1,
      });
    });
    return event;
  }

  /**
   * Verifies the live session and the thread's tenancy/ownership WITHOUT
   * returning a single event.
   *
   * This is the authorisation gate a writer needs before it touches a thread:
   * a thread that belongs to another tenant or another owner is refused with a
   * typed error (`THREAD_TENANT_FORBIDDEN` / `THREAD_OWNER_FORBIDDEN`)
   * before any event is written into it.
   */
  requireOwned(actor: Principal, threadId: string): AguiThreadRecord {
    this.auth.revalidate(actor);
    return this.requireOwnedThread(actor, threadId);
  }

  /** Every event of a thread, in order. */
  listEvents(threadId: string): AguiThreadEvent[] {
    return this.options.store
      .all<AguiThreadEvent>(RECORD_KINDS.aguiEvent)
      .filter((event) => event.threadId === threadId)
      .sort((left, right) => left.sequence - right.sequence);
  }

  /**
   * Resumes a thread for the actor.
   *
   * The session is re-verified and the thread's tenancy/ownership is checked
   * before a single event is returned.
   */
  resume(actor: Principal, input: ResumeInput): AguiResumeResult {
    // 1. Re-verify the live session: a revoked/expired session cannot resume.
    this.auth.revalidate(actor);
    // 2. Re-verify the thread's tenancy and ownership.
    const thread = this.requireOwnedThread(actor, input.threadId);

    const all = this.listEvents(thread.id);
    let startIndex = 0;
    if (input.afterEventId) {
      const index = all.findIndex((event) => event.id === input.afterEventId);
      if (index === -1) {
        fail(
          'RESUME_CURSOR_UNKNOWN',
          409,
          'Kursor resume bukan sebahagian sejarah thread ini; history mungkin telah dipangkas.',
        );
      }
      startIndex = index + 1;
    }
    const events = all.slice(startIndex);
    return {
      threadId: thread.id,
      events,
      lastEventId: thread.lastEventId,
      receiptCount: thread.receiptIds.length,
      caughtUp: events.length === 0,
    };
  }

  /** The receipts recorded in a thread. A replay never changes this list. */
  receiptIds(threadId: string): string[] {
    return this.getThread(threadId)?.receiptIds ?? [];
  }

  private findEvent(threadId: string, eventId: string): AguiThreadEvent | null {
    return (
      this.options.store
        .all<AguiThreadEvent>(RECORD_KINDS.aguiEvent)
        .find((event) => event.threadId === threadId && event.id === eventId) ?? null
    );
  }

  private requireOwnedThread(actor: Principal, threadId: string): AguiThreadRecord {
    const thread = this.getThread(threadId);
    if (!thread) fail('THREAD_NOT_FOUND', 404, 'Thread tidak ditemui.');
    const tenantIds = resolveTenantIds(actor);
    if (!tenantIds.includes(thread.tenantId)) {
      fail('THREAD_TENANT_FORBIDDEN', 403, 'Thread ini milik tenant lain.');
    }
    if (thread.ownerId !== actor.user.id) {
      fail('THREAD_OWNER_FORBIDDEN', 403, 'Thread ini bukan milik sesi ini.');
    }
    return thread;
  }
}
