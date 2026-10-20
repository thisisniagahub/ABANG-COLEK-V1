/**
 * EXT-01 / EXT-02 / EXT-04 / EXT-05 — the locally implemented halves.
 *
 * Every live activation stays explicitly unavailable with an exact reason:
 *   - EXT-01 inspector : local development only, never in production
 *   - EXT-02 memories  : local gated path; the hosted feature needs an
 *                        Intelligence account, privacy consent and terms
 *   - EXT-04 channels  : synthetic transport only; the live provider needs an
 *                        account, an app, a signature and channel permission
 *   - EXT-05 WebMCP    : own-app surface only, with explicit user grants
 */

import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import {
  LocalInspector,
  LocalRunRecorder,
  isLocalInspectorAllowed,
  redactValue,
} from '../../server/agents/intelligence/inspector';
import { UserMemoryStore, isSensitiveMemoryField } from '../../server/agents/intelligence/memories';
import {
  SyntheticChannelTransport,
  createLiveChannelAdapter,
  assertSyntheticOnly,
} from '../../server/agents/intelligence/channels';
import { McpGrantStore } from '../../server/agents/intelligence/webmcp';
import {
  cloudAguiStreamsAvailability,
  cloudAutomaticLearningAvailability,
  cloudUserMemoriesAvailability,
  liveChannelAvailability,
  visionInferenceAvailability,
  webMcpAvailability,
} from '../../server/agents/intelligence/availability';
import { IntelligenceError } from '../../server/agents/intelligence/errors';

function makeUser(store: PlatformStore, userId: string, role: string): Principal {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(['hq']), null, 'active', 1);
  const auth = new Auth(store);
  return {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    memberships: auth.memberships(userId),
    sessionHash: '',
    csrfHash: '',
  };
}

describe('EXT-01 — local inspector', () => {
  test('the inspector refuses to run in a production build', () => {
    const recorder = new LocalRunRecorder();
    const inspector = new LocalInspector(recorder, { nodeEnv: 'production' });
    expect(isLocalInspectorAllowed({ nodeEnv: 'production' })).toBe(false);
    let code = '';
    try {
      inspector.snapshot();
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION');
  });

  test('the inspector is available on a local development machine', () => {
    const inspector = new LocalInspector(new LocalRunRecorder(), { nodeEnv: 'development' });
    const snapshot = inspector.snapshot();
    expect(snapshot.locality).toBe('local');
    expect(snapshot.persistence).toBe('in_memory');
    expect(snapshot.threads).toEqual([]);
  });

  test('secrets and PII are redacted in the snapshot', () => {
    const recorder = new LocalRunRecorder();
    recorder.recordState('thr-1', 'email', 'ali@example.com');
    recorder.recordState('thr-1', 'phone', '012-345 6789');
    recorder.recordState('thr-1', 'apiKey', 'sk-abcdefghijklmnopqrstuvwxyz');
    recorder.recordState('thr-1', 'ic', '900101-14-5678');
    recorder.recordToolCall('thr-1', {
      toolName: 'bus_freight_schedule',
      durationMs: 210,
      outcome: 'success',
    });
    const snapshot = new LocalInspector(recorder, { nodeEnv: 'development' }).snapshot();
    const state = snapshot.threads[0].state;
    expect(state.email).toBe('[REDACTED:email]');
    expect(state.phone).toBe('[REDACTED:phone]');
    expect(state.apiKey).toBe('[REDACTED:api-key]');
    expect(state.ic).toBe('[REDACTED:ic]');
    expect(snapshot.totals.toolCalls).toBe(1);
  });

  test('the inspector writes no telemetry anywhere', () => {
    const store = new PlatformStore(':memory:');
    const recorder = new LocalRunRecorder();
    recorder.recordEvent('thr-1');
    recorder.recordToolCall('thr-1', { toolName: 'x', durationMs: 1, outcome: 'success' });
    const before = store.db.query<{ count: number }, []>('SELECT count(*) as count FROM records').get()!.count;
    new LocalInspector(recorder, { nodeEnv: 'development' }).snapshot();
    const after = store.db.query<{ count: number }, []>('SELECT count(*) as count FROM records').get()!.count;
    expect(after).toBe(before);
  });

  test('the redaction rules cover the common secret shapes', () => {
    expect(redactValue('token AKIAIOSFODNN7EXAMPLE')).toContain('[REDACTED:api-key]');
    expect(redactValue('Bearer abcdefghijklmnop')).toContain('[REDACTED:bearer-token]');
  });
});

describe('EXT-02 — user memories (local gated path)', () => {
  function build() {
    const store = new PlatformStore(':memory:');
    const actor = makeUser(store, 'usr-memory', 'customer');
    const other = makeUser(store, 'usr-memory-other', 'customer');
    return { store, actor, other, memories: new UserMemoryStore({ store }) };
  }

  test('ingestion is off until the user consents', () => {
    const { memories, actor } = build();
    expect(memories.hasConsent()).toBe(false);
    let code = '';
    try {
      memories.record(actor, {
        key: 'ui.language',
        value: 'ms-MY',
        provenance: { source: 'explicit_user_statement', recordedAt: now() },
      });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('MEMORY_CONSENT_REQUIRED');
  });

  test('a memory records where it came from', () => {
    const { memories, actor } = build();
    memories.setConsent(true, actor.user.id);
    const memory = memories.record(actor, {
      key: 'ui.language',
      value: 'ms-MY',
      provenance: {
        source: 'explicit_user_statement',
        excerpt: 'Saya guna bahasa Melayu',
        recordedAt: now(),
      },
    });
    expect(memory.provenance.source).toBe('explicit_user_statement');
    expect(memory.provenance.recordedAt.length).toBeGreaterThan(0);
    expect(memory.permission).toBe('persistent');
    expect(memory.expiresAt > memory.createdAt).toBe(true);
  });

  test('a memory is never created from a sensitive field', () => {
    const { memories, actor } = build();
    memories.setConsent(true, actor.user.id);
    let code = '';
    try {
      memories.record(actor, {
        key: 'user.role',
        value: 'founder',
        provenance: { source: 'explicit_user_statement', recordedAt: now() },
      });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('MEMORY_SENSITIVE_FIELD_REFUSED');
    expect(isSensitiveMemoryField('api_token', 'abc')).toBe(true);
    expect(isSensitiveMemoryField('ui.language', 'ms-MY')).toBe(false);
  });

  test('a memory can be deleted by its owner, and one user cannot delete another user\'s memory', () => {
    const { memories, actor, other } = build();
    memories.setConsent(true, actor.user.id);
    const memory = memories.record(actor, {
      key: 'ui.theme',
      value: 'dark',
      provenance: { source: 'explicit_user_statement', recordedAt: now() },
    });
    let code = '';
    try {
      memories.delete(other, memory.id);
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('MEMORY_NOT_OWNED');
    memories.delete(actor, memory.id);
    expect(memories.list(actor)).toHaveLength(0);
  });

  test('every memory of one user can be deleted at once', () => {
    const { memories, actor } = build();
    memories.setConsent(true, actor.user.id);
    for (let index = 0; index < 3; index += 1) {
      memories.record(actor, {
        key: `ui.item${index}`,
        value: String(index),
        provenance: { source: 'explicit_user_statement', recordedAt: now() },
      });
    }
    expect(memories.list(actor)).toHaveLength(3);
    expect(memories.deleteAll(actor)).toBe(3);
    expect(memories.list(actor)).toHaveLength(0);
  });

  test('an expired memory is never returned', () => {
    const store = new PlatformStore(':memory:');
    const actor = makeUser(store, 'usr-memory-exp', 'customer');
    let clock = new Date('2026-01-01T00:00:00.000Z');
    const memories = new UserMemoryStore({ store, clock: () => clock.toISOString() });
    memories.setConsent(true, actor.user.id);
    memories.record(actor, {
      key: 'ui.language',
      value: 'ms-MY',
      provenance: { source: 'explicit_user_statement', recordedAt: clock.toISOString() },
      retentionDays: 1,
    });
    expect(memories.list(actor)).toHaveLength(1);
    clock = new Date('2026-01-03T00:00:00.000Z');
    expect(memories.list(actor)).toHaveLength(0);
  });
});

describe('EXT-04 — channel adapter surface and synthetic transport', () => {
  test('the synthetic transport sends, maps the thread and checks the permission', async () => {
    const transport = new SyntheticChannelTransport('secret');
    transport.registerConversation('C-1', 'thr-1', ['user-1']);
    const sent = await transport.send({
      conversationId: 'C-1',
      threadId: 'thr-ignored',
      authorId: 'user-1',
      text: 'Status pesanan',
    });
    expect(sent.ok).toBe(true);
    if (sent.ok) {
      expect(sent.value.threadId).toBe('thr-1');
      expect(sent.value.direction).toBe('outbound');
    }
    const denied = await transport.send({
      conversationId: 'C-1',
      threadId: 'thr-1',
      authorId: 'user-2',
      text: 'Status pesanan',
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe('CHANNEL_PERMISSION_DENIED');
  });

  test('an inbound event with a bad signature or a stale timestamp is refused', () => {
    const transport = new SyntheticChannelTransport('secret');
    transport.registerConversation('C-1', 'thr-1');
    const base = {
      conversationId: 'C-1',
      authorId: 'user-1',
      text: 'Hello',
      sentAt: new Date().toISOString(),
    };
    const bad = transport.receive({ ...base, signature: 'not-a-signature' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('CHANNEL_SIGNATURE_INVALID');

    const stale = transport.receive({
      ...base,
      sentAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      signature: transport.sign({ ...base, sentAt: new Date(Date.now() - 10 * 60_000).toISOString() }),
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.code).toBe('CHANNEL_EVENT_STALE');

    const good = transport.receive({
      ...base,
      signature: transport.sign(base),
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.value.threadId).toBe('thr-1');
  });

  test('the live provider adapter is explicitly unavailable', async () => {
    const slack = createLiveChannelAdapter('slack');
    const result = await slack.send({
      conversationId: 'C-1',
      threadId: 'thr-1',
      authorId: 'user-1',
      text: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CHANNEL_PROVIDER_ACCOUNT_REQUIRED');
      expect(result.reason).toContain('akaun provider');
    }
    let code = '';
    try {
      assertSyntheticOnly(slack);
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('CHANNEL_LIVE_ACTIVATION_BLOCKED');
  });
});

describe('EXT-05 — WebMCP own-app surface', () => {
  function build() {
    const store = new PlatformStore(':memory:');
    const actor = makeUser(store, 'usr-webmcp', 'customer');
    const grants = new McpGrantStore({
      store,
      toolSurface: { has: (toolName: string) => toolName === 'operations_brief' },
    });
    return { store, actor, grants };
  }

  test('a tool outside the own-app surface cannot be granted', () => {
    const { actor, grants } = build();
    let code = '';
    try {
      grants.grant(actor, { toolName: 'read_arbitrary_website', action: 'read_context' });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('WEBMCP_TOOL_NOT_IN_OWN_APP_SURFACE');
  });

  test('an action outside the bounded scope cannot be granted', () => {
    const { actor, grants } = build();
    let code = '';
    try {
      grants.grant(actor, { toolName: 'operations_brief', action: 'run_shell' as never });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('WEBMCP_ACTION_NOT_ALLOWED');
  });

  test('a call without a grant is refused, and a granted call is allowed', () => {
    const { actor, grants } = build();
    const denied = grants.authorize(actor, { toolName: 'operations_brief', action: 'read_context' });
    expect(denied.allowed).toBe(false);
    expect(denied.reasonCode).toBe('WEBMCP_GRANT_REQUIRED');

      const grant = grants.grant(actor, { toolName: 'operations_brief', action: 'read_context' });
      const allowed = grants.authorize(actor, { toolName: 'operations_brief', action: 'read_context' });
      expect(allowed.allowed).toBe(true);
      expect(allowed.grantId).toBe(grant.id);

    grants.revoke(actor, grant.id);
    const afterRevoke = grants.authorize(actor, { toolName: 'operations_brief', action: 'read_context' });
    expect(afterRevoke.allowed).toBe(false);
    expect(afterRevoke.reasonCode).toBe('WEBMCP_GRANT_REQUIRED');
  });
});

describe('external gates are typed and explicit', () => {
  test('every externally gated capability reports unavailable with a reason code', () => {
    const gates = [
      cloudAutomaticLearningAvailability(),
      cloudAguiStreamsAvailability(),
      cloudUserMemoriesAvailability(),
      liveChannelAvailability(),
      webMcpAvailability(),
      visionInferenceAvailability(),
    ];
    for (const gate of gates) {
      expect(gate.available).toBe(false);
      expect(gate.reasonCode.length).toBeGreaterThan(0);
      expect(gate.reason.length).toBeGreaterThan(0);
      expect(gate.locality).toBe('remote');
    }
  });
});
