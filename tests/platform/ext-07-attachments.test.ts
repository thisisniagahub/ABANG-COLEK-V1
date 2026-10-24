/**
 * EXT-07 — attachment references.
 *
 * An uploaded evidence file may be referenced by a copilot/agent request.
 * The reference carries the hash, the permission state and the revocation
 * state. A revoked attachment must never be referenceable, and vision
 * inference is explicitly NOT available.
 */

import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Work } from '../../server/platform/work';
import { EvidenceFiles } from '../../server/platform/evidenceFiles';
import type { EvidenceRecord } from '../../shared/platform-contracts';
import { CopilotV2Runtime } from '../../server/agents/copilot/runtime';
import { STRICT_FREE_CANDIDATE_SEQUENCE } from '../../shared/copilot-contracts';
import type { ModelAdapter, ModelAdapterRegistry } from '../../server/agents/providers/model-adapters';

function buildHarness() {
  const directory = mkdtempSync(join(tmpdir(), 'abangcolek-attach-'));
  const store = new PlatformStore(join(directory, 'test.sqlite'));
  const auth = new Auth(store);
  const commerce = new Commerce(store, auth);
  const work = new Work(store, auth, commerce);
  const evidenceFiles = new EvidenceFiles(store, work, join(directory, 'test.sqlite'));

  const makeUser = (userId: string, role: string): Principal => {
    store.db
      .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
      .run(userId, `${userId}@example.test`, userId, 'hash', now());
    store.db
      .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
      .run(id(), userId, role, JSON.stringify(['hq']), null, 'active', 1);
    return {
      user: { id: userId, email: `${userId}@example.test`, name: userId },
      memberships: auth.memberships(userId),
      sessionHash: '',
      csrfHash: '',
    };
  };

  const founder = makeUser('usr-attach-founder', 'founder');
  const customer = makeUser('usr-attach-customer', 'customer');

  const orderId = 'ord-attach-001';
  store.save('orders', {
    id: orderId,
    customerId: customer.user.id,
    lines: [],
    amountSen: 0,
    fulfilment: 'pickup',
    contactRef: 'HQ',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'pending',
    paidAmountSen: 0,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  });

  const evidenceId = id();
  const record: EvidenceRecord = {
    id: evidenceId,
    entityId: orderId,
    ownerId: customer.user.id,
    mimeType: 'text/plain',
    size: 12,
    storageRef: 'metadata-only',
    visibility: 'case',
    createdAt: now(),
    name: 'proof.txt',
    sha256: 'a'.repeat(64),
    kind: 'metadata',
  };
  store.save('evidence', record);

  return { store, work, evidenceFiles, founder, customer, evidenceId, orderId, directory };
}

describe('EXT-07 — attachment references', () => {
  test('the owner receives a permitted reference that carries the hash', () => {
    const harness = buildHarness();
    try {
      const reference = harness.evidenceFiles.attachmentReference(harness.customer, harness.evidenceId);
      expect(reference.evidenceId).toBe(harness.evidenceId);
      expect(reference.sha256).toBe('a'.repeat(64));
      expect(reference.permitted).toBe(true);
      expect(reference.revoked).toBe(false);
      expect(reference.refusalCode).toBeUndefined();
      expect(reference.vision.available).toBe(false);
      expect(reference.vision.reasonCode).toBe('QUALIFIED_VISION_MODEL_REQUIRED');
    } finally {
      harness.store.close(); rmSync(harness.directory, { recursive: true, force: true });
    }
  });

  test('an actor outside the entity scope may not reference the attachment', () => {
    const harness = buildHarness();
    try {
      const other = harness.store;
      other.db
        .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
        .run('usr-attach-other', 'other@example.test', 'other', 'hash', now());
      other.db
        .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
        .run(id(), 'usr-attach-other', 'customer', JSON.stringify([]), null, 'active', 1);
      const auth = new Auth(harness.store);
      const stranger: Principal = {
        user: { id: 'usr-attach-other', email: 'other@example.test', name: 'other' },
        memberships: auth.memberships('usr-attach-other'),
        sessionHash: '',
        csrfHash: '',
      };
      const reference = harness.evidenceFiles.attachmentReference(stranger, harness.evidenceId);
      expect(reference.permitted).toBe(false);
      expect(reference.refusalCode).toBe('ATTACHMENT_PERMISSION_DENIED');
      let code = '';
      try {
        harness.evidenceFiles.attachmentReferences(stranger, [harness.evidenceId]);
      } catch (error) {
        code = (error as { code?: string }).code ?? '';
      }
      expect(code).toBe('ATTACHMENT_PERMISSION_DENIED');
    } finally {
      harness.store.close(); rmSync(harness.directory, { recursive: true, force: true });
    }
  });

  test('a revoked attachment may not be referenced', () => {
    const harness = buildHarness();
    try {
      const revocation = harness.evidenceFiles.revokeAttachment(
        harness.customer,
        harness.evidenceId,
        'Bukti tidak lagi sah.',
      );
      expect(revocation.revokedBy).toBe(harness.customer.user.id);
      const reference = harness.evidenceFiles.attachmentReference(harness.customer, harness.evidenceId);
      expect(reference.revoked).toBe(true);
      expect(reference.permitted).toBe(false);
      expect(reference.refusalCode).toBe('ATTACHMENT_REVOKED');
      let code = '';
      try {
        harness.evidenceFiles.attachmentReferences(harness.customer, [harness.evidenceId]);
      } catch (error) {
        code = (error as { code?: string }).code ?? '';
      }
      expect(code).toBe('ATTACHMENT_REVOKED');
    } finally {
      harness.store.close(); rmSync(harness.directory, { recursive: true, force: true });
    }
  });

  test('the revocation is recorded and idempotent', () => {
    const harness = buildHarness();
    try {
      const first = harness.evidenceFiles.revokeAttachment(
        harness.customer,
        harness.evidenceId,
        'Bukti tidak lagi sah.',
      );
      const second = harness.evidenceFiles.revokeAttachment(
        harness.customer,
        harness.evidenceId,
        'Sebab lain.',
      );
      expect(second.revokedAt).toBe(first.revokedAt);
      expect(harness.evidenceFiles.revocation(harness.evidenceId)?.revokedBy).toBe(
        harness.customer.user.id,
      );
    } finally {
      harness.store.close(); rmSync(harness.directory, { recursive: true, force: true });
    }
  });

  test('a stranger may not revoke somebody else\'s attachment', () => {
    const harness = buildHarness();
    try {
      const other = new Auth(harness.store);
      harness.store.db
        .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
        .run('usr-attach-revoker', 'revoker@example.test', 'revoker', 'hash', now());
      harness.store.db
        .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
        .run(id(), 'usr-attach-revoker', 'customer', JSON.stringify([]), null, 'active', 1);
      const revoker: Principal = {
        user: { id: 'usr-attach-revoker', email: 'revoker@example.test', name: 'revoker' },
        memberships: other.memberships('usr-attach-revoker'),
        sessionHash: '',
        csrfHash: '',
      };
      let code = '';
      try {
        harness.evidenceFiles.revokeAttachment(revoker, harness.evidenceId, 'Cuba');
      } catch (error) {
        code = (error as { code?: string }).code ?? '';
      }
      expect(code).toBe('FORBIDDEN');
    } finally {
      harness.store.close(); rmSync(harness.directory, { recursive: true, force: true });
    }
  });

  test('CopilotV2Runtime passes permitted attachmentIds through and rejects revoked or unauthorized attachments', async () => {
    const harness = buildHarness();
    try {
      const candidate = STRICT_FREE_CANDIDATE_SEQUENCE[0];
      const mockAdapter: ModelAdapter = {
        candidate,
        transport: 'mock',
        isConfigured: () => true,
        credentialSource: () => 'MOCK_KEY',
        call: async () => ({
          content: 'Lampiran diterima sebagai rujukan metadata.',
          model: candidate.model,
          inputTokens: 32,
          outputTokens: 12,
        }),
      };
      const adapters: ModelAdapterRegistry = {
        get: c => (c.model === candidate.model ? mockAdapter : undefined),
        list: () => [mockAdapter],
      };

      const principalByUser = new Map<string, Principal>([
        [harness.customer.user.id, harness.customer],
        [harness.founder.user.id, harness.founder],
      ]);

      const runtime = new CopilotV2Runtime({
        adapters,
        attachmentResolver: (actor, ids) => {
          const p = principalByUser.get(actor.userId);
          if (!p) {
            const err = new Error('Akses lampiran ditolak.') as Error & { code: string; status: number };
            err.code = 'ATTACHMENT_PERMISSION_DENIED';
            err.status = 403;
            throw err;
          }
          return harness.evidenceFiles.attachmentReferences(p, ids);
        },
      });

      // 1. Permitted attachment passes through with sha256 and explicit vision.available === false
      const okReq = new Request('http://127.0.0.1:3000/api/platform/copilot/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Semak bukti pesanan' }],
          attachmentIds: [harness.evidenceId],
        }),
      });
      const okRes = await runtime.handleRequest(okReq, {
        userId: harness.customer.user.id,
        workspaceId: 'hq',
        membershipVersion: 1,
      });
      expect(okRes.status).toBe(200);
      const okJson = await okRes.json();
      expect(okJson.status).toBe('completed');
      expect(okJson.attachments).toHaveLength(1);
      expect(okJson.attachments[0].evidenceId).toBe(harness.evidenceId);
      expect(okJson.attachments[0].sha256).toBe('a'.repeat(64));
      expect(okJson.attachments[0].permitted).toBe(true);
      expect(okJson.attachments[0].revoked).toBe(false);
      expect(okJson.vision?.available).toBe(false);
      expect(okJson.vision?.reasonCode).toBe('QUALIFIED_VISION_MODEL_REQUIRED');

      // 2. Stranger actor is rejected with 403 ATTACHMENT_PERMISSION_DENIED
      const deniedReq = new Request('http://127.0.0.1:3000/api/platform/copilot/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Cuba baca lampiran orang lain' }],
          attachmentIds: [harness.evidenceId],
        }),
      });
      const deniedRes = await runtime.handleRequest(deniedReq, {
        userId: 'usr-stranger-999',
        workspaceId: 'hq',
        membershipVersion: 1,
      });
      expect(deniedRes.status).toBe(403);
      const deniedJson = await deniedRes.json();
      expect(deniedJson.code).toBe('ATTACHMENT_PERMISSION_DENIED');

      // 3. Revoked attachment is rejected with 409 ATTACHMENT_REVOKED
      harness.evidenceFiles.revokeAttachment(harness.customer, harness.evidenceId, 'Ditarik balik');
      const revokedReq = new Request('http://127.0.0.1:3000/api/platform/copilot/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Semak bukti yang telah ditarik balik' }],
          attachmentIds: [harness.evidenceId],
        }),
      });
      const revokedRes = await runtime.handleRequest(revokedReq, {
        userId: harness.customer.user.id,
        workspaceId: 'hq',
        membershipVersion: 1,
      });
      expect(revokedRes.status).toBe(409);
      const revokedJson = await revokedRes.json();
      expect(revokedJson.code).toBe('ATTACHMENT_REVOKED');
    } finally {
      harness.store.close(); rmSync(harness.directory, { recursive: true, force: true });
    }
  });
});
