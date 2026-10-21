/**
 * Kontrak baris ADV (part 2): remediasi ledger kesetiaan, remediasi day-close,
 * remediasi kes (proposal refund) dan idempotensi reconcile action.
 */
import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import type { CaseRecord, DayCloseRecord, OrderRecord } from '../../shared/platform-contracts';

const FOUNDER_ID = 'usr-adv2-founder';
const STAFF_ID = 'usr-adv2-staff';
const CUSTOMER_ID = 'usr-adv2-customer';
const ORDER_ID = 'ord-adv2-001';

function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = []): void {
  store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), null, 'active', 1);
}

function buildHarness(): { store: PlatformStore; registry: ToolRegistry } {
  const store = new PlatformStore(':memory:');
  addMembership(store, FOUNDER_ID, 'founder', ['hq']);
  addMembership(store, STAFF_ID, 'staff', ['hq']);
  addMembership(store, CUSTOMER_ID, 'customer');

  const order: OrderRecord = {
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
    lines: [{ productId: 'prod-adv2', name: 'Colek', quantity: 2, priceSen: 1500, publishedVersion: 1 }],
    amountSen: 3000,
    fulfilment: 'pickup',
    contactRef: 'Pelajar 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'refund_requested',
    paidAmountSen: 3000,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  store.save('orders', order);

  const executors = new ExecutorRegistry();
  executors.register(new RefundExecutor());
  const runtime = createToolRuntime({ store, approvalStore: new MemoryApprovalStore(), executors });
  return { store, registry: new ToolRegistry(6, { runtime }) };
}

describe('ADV-21 — triage_case: remediasi mencadangkan proposal refund', () => {
  test('NEGATIF proposalkedua ⇒ CASE_REFUND_PROPOSAL_EXISTS (tidak ada proposal berganda)', async () => {
    const { store, registry } = buildHarness();
    try {
      store.save('cases', {
        id: 'case-adv2-001',
        orderId: ORDER_ID,
        customerId: CUSTOMER_ID,
        status: 'open',
        subject: 'Refund diminta',
        description: 'Botol pecah',
        revision: 1,
        createdAt: now(),
      } satisfies CaseRecord);

      const first = await registry.dispatchTool(
        'triage_case',
        { caseId: 'case-adv2-001', remediate: true },
        { actorId: FOUNDER_ID, role: 'founder', runId: 'run-adv-21-first' },
      );
      expect(first.ok, JSON.stringify(first)).toBe(true);

      const second = await registry.dispatchTool(
        'triage_case',
        { caseId: 'case-adv2-001', remediate: true },
        { actorId: FOUNDER_ID, role: 'founder', runId: 'run-adv-21-second' },
      );
      expect(second.ok, JSON.stringify(second)).toBe(true);
      if (!second.ok) throw new Error(second.code);
      const data = second.result as { remediationOutcomes?: { code?: string }[] };
      expect((data.remediationOutcomes ?? []).map((outcome) => outcome.code)).toContain('CASE_REFUND_PROPOSAL_EXISTS');
    } finally {
      store.close();
    }
  });
});

describe('ADV-17 — reconcile_dayclose: remediasi memerlukan founder', () => {
  test('NEGATIF day close diluluskan + bukan founder ⇒ DAY_CLOSE_REMEDIATION_REQUIRES_FOUNDER', async () => {
    const { store, registry } = buildHarness();
    try {
      const dayClose: DayCloseRecord = {
        id: 'dc-adv2-001',
        outletId: 'hq',
        date: '2026-10-20',
        // DiskrepansiSebenar: tanpa itu rekod sudah selaras dan tiada
        // remediasi dicuba (DAY_CLOSE_ALREADY_ALIGNED).
        expectedCashSen: 5000,
        countCashSen: 4000,
        paymentRefs: [],
        discrepancySen: 1000,
        status: 'approved',
        revision: 1,
      };
      store.save('dayclose', dayClose);

      const result = await registry.dispatchTool(
        'reconcile_dayclose',
        { dayCloseId: 'dc-adv2-001', remediate: true },
        { actorId: STAFF_ID, role: 'staff', runId: 'run-adv-17-nonfounder' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      const data = result.result as { remediationOutcome?: { code?: string } };
      expect(data.remediationOutcome?.code).toBe('DAY_CLOSE_REMEDIATION_REQUIRES_FOUNDER');
      // Rekod TIDAK boleh dipinda oleh bukan founder.
      const stored = store.get<DayCloseRecord>('dayclose', 'dc-adv2-001');
      expect(stored?.status).toBe('approved');
      expect(stored?.discrepancySen).toBe(1000);
      expect(stored?.revision).toBe(1);
    } finally {
      store.close();
    }
  });
});
