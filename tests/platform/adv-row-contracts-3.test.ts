/**
 * Kontrak baris ADV-15 (audit_loyalty remediasi) dan ADV-26 (tiga operasi
 * reconcile_action yang berasingan).
 */
import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import type { LoyaltyLedgerEntry } from '../../shared/growth-contracts';

const FOUNDER_ID = 'usr-adv3-founder';
const CUSTOMER_ID = 'usr-adv3-customer';
const RECEIPT_ID = 'rcpt-adv3-001';

function addMembership(store: PlatformStore, userId: string, role: string): void {
  store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify([]), null, 'active', 1);
}

function buildHarness(): { store: PlatformStore; registry: ToolRegistry } {
  const store = new PlatformStore(':memory:');
  addMembership(store, FOUNDER_ID, 'founder');
  addMembership(store, CUSTOMER_ID, 'customer');
  const executors = new ExecutorRegistry();
  executors.register(new RefundExecutor());
  const runtime = createToolRuntime({ store, approvalStore: new MemoryApprovalStore(), executors });
  return { store, registry: new ToolRegistry(6, { runtime }) };
}

describe('ADV-15 — audit_loyalty boleh remediasi', () => {
  test('NEGATIF mata luput belum direkod ⇒ remediasi merekodkan luput dan tidak tinggal hangus', async () => {
    const { store, registry } = buildHarness();
    try {
      // Mata yang telah CHF kungtif tetapi tiada rekod luput dalam lejar.
      const entries: LoyaltyLedgerEntry[] = [
        {
          id: 'loy-1',
          userId: CUSTOMER_ID,
          pointsDelta: 100,
          monetaryEquivalentSen: 100,
          eventType: 'earned',
          sourceOrderId: 'ord-adv3-001',
          // Mata CHF kungtif tetapi TIDAK ada rekod luput dalam lejar.
          expiryAt: new Date(Date.now() - 86_400_000).toISOString(),
          description: 'Mata diperoleh',
          createdAt: now(),
        },
      ];
      for (const entry of entries) store.save('loyalty_ledger', entry);

      const audited = await registry.dispatchTool(
        'audit_loyalty',
        { userId: CUSTOMER_ID },
        { actorId: FOUNDER_ID, role: 'founder', runId: 'run-adv-15-audit' },
      );
      expect(audited.ok, JSON.stringify(audited)).toBe(true);
      if (!audited.ok) return;
      // Audit sahaja TIDAK menulis apa-apa: tiada rekod luput dicipta.
      expect(store.all('loyalty_ledger').filter((entry) => (entry as { eventType?: string }).eventType === 'expired')).toHaveLength(0);

      const remediated = await registry.dispatchTool(
        'audit_loyalty',
        { userId: CUSTOMER_ID, remediate: true },
        { actorId: FOUNDER_ID, role: 'founder', runId: 'run-adv-15-remediate' },
      );
      expect(remediated.ok, JSON.stringify(remediated)).toBe(true);
      if (!remediated.ok) return;
      const data = remediated.result as {
        mutated?: boolean;
        remediationOutcomes?: { code?: string }[];
      };
      expect(data.mutated).toBe(true);
      expect((data.remediationOutcomes ?? []).map((outcome) => outcome.code)).toContain('LOYALTY_EXPIRY_RECORDED');
      // Selepas remediasi, rekod luput wujud dalam lejar.
      expect(store.all('loyalty_ledger').filter((entry) => (entry as { eventType?: string }).eventType === 'expired')).toHaveLength(1);
    } finally {
      store.close();
    }
  });
});
