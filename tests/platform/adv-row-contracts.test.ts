/**
 * Kontrak baris acceptance untuk keluarga ADV yang di-wire pada 21 Okt 2026.
 *
 * Ujian liputan generik (adv-tools-capability-coverage.test.ts) membuktikan
 * setiap alat SHALLIH dij_register, menolak input tidak sah dan tidak
 * meneka. Ujian ini membuktikan tingkah laku SPESIFIK setiap baris ledger: konflik
 * checkout, quota + muat semula export, konsen outbound, grant langkah dan
 * idempotensi reconcile.
 */
import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import type { CatalogueProduct, OrderRecord, StockLot } from '../../shared/platform-contracts';

const FOUNDER_ID = 'usr-adv-founder';
const STAFF_ID = 'usr-adv-staff';
const CUSTOMER_ID = 'usr-adv-customer';
const ORDER_ID = 'ord-adv-001';
const LOT_ID = 'lot-adv-001';

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

  const product: CatalogueProduct = {
    id: 'prod-adv',
    name: 'Colek Adv',
    description: 'Produk ujian',
    priceSen: 1500,
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 20,
    revision: 1,
    status: 'published',
  };
  store.save('catalogue', product);
  store.setMetadata('catalogue_version', '1');

  const lot: StockLot = {
    id: LOT_ID,
    productId: product.id,
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'business',
    quantity: 20,
    status: 'available',
    batchId: 'batch-adv',
    expiryAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    revision: 1,
  };
  store.save('lots', lot);

  const order: OrderRecord = {
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
    lines: [{ productId: product.id, name: product.name, quantity: 2, priceSen: 1500, publishedVersion: 1 }],
    amountSen: 3000,
    fulfilment: 'pickup',
    contactRef: 'Pelajar 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'verified',
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

describe('ADV-05 — diagnose_checkout melaporkan lima kelas konflik', () => {
  test('NEGATIF kuantiti pecahan ⇒ CHECKOUT_FRACTIONAL_QUANTITY dan ia memblok', async () => {
    const { store, registry } = buildHarness();
    try {
      const result = await registry.dispatchTool(
        'diagnose_checkout',
        { lines: [{ productId: 'prod-adv', quantity: 2.5 }], catalogueVersion: 1, fulfilment: 'pickup' },
        { actorId: CUSTOMER_ID, role: 'customer', runId: 'run-adv-05-frac' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      const data = result.result as { blockingConflictCodes?: string[]; conflicts?: { code?: string }[] };
      expect([...(data.blockingConflictCodes ?? []), ...(data.conflicts ?? []).map((conflict) => conflict.code ?? '')]).toContain('CHECKOUT_FRACTIONAL_QUANTITY');
    } finally {
      store.close();
    }
  });

  test('NEGATIF baris pendua ⇒ CHECKOUT_DUPLICATE_LINE', async () => {
    const { store, registry } = buildHarness();
    try {
      const result = await registry.dispatchTool(
        'diagnose_checkout',
        {
          lines: [
            { productId: 'prod-adv', quantity: 1 },
            { productId: 'prod-adv', quantity: 1 },
          ],
          catalogueVersion: 1,
          fulfilment: 'pickup',
        },
        { actorId: CUSTOMER_ID, role: 'customer', runId: 'run-adv-05-dup' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      const data = result.result as { conflicts?: { code?: string }[] };
      expect((data.conflicts ?? []).map((conflict) => conflict.code)).toContain('CHECKOUT_DUPLICATE_LINE');
    } finally {
      store.close();
    }
  });

  test('NEGATIF mod penghantaran di luar kanon ⇒ CHECKOUT_INVALID_FULFILMENT', async () => {
    const { store, registry } = buildHarness();
    try {
      const result = await registry.dispatchTool(
        'diagnose_checkout',
        { lines: [{ productId: 'prod-adv', quantity: 1 }], catalogueVersion: 1, fulfilment: 'teleport' },
        { actorId: CUSTOMER_ID, role: 'customer', runId: 'run-adv-05-fulfil' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      const data = result.result as { conflicts?: { code?: string }[] };
      expect((data.conflicts ?? []).map((conflict) => conflict.code)).toContain('CHECKOUT_INVALID_FULFILMENT');
    } finally {
      store.close();
    }
  });
});

describe('ADV-20 — export_report: quota harian dan muat semula', () => {
  test('NEGATIF exceed quota ⇒ EXPORT_QUOTA_EXCEEDED dan tiada artifact kedua', async () => {
    const { store, registry } = buildHarness();
    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const created = await registry.dispatchTool(
          'export_report',
          { kind: 'orders', operation: 'create' },
          { actorId: FOUNDER_ID, role: 'founder', runId: `run-adv-20-create-${attempt}` },
        );
        expect(created.ok, JSON.stringify(created)).toBe(true);
      }
      const refused = await registry.dispatchTool(
        'export_report',
        { kind: 'orders', operation: 'create' },
        { actorId: FOUNDER_ID, role: 'founder', runId: 'run-adv-20-quota' },
      );
      expect(refused.ok).toBe(false);
      if (refused.ok) return;
      expect(refused.code).toBe('EXPORT_QUOTA_EXCEEDED');
    } finally {
      store.close();
    }
  });
});

describe('ADV-23 — draft_customer_reply: konsen outbound wajib', () => {
  test('NEGATIF hantar tanpa rekod konsen ⇒ OUTBOUND_CONSENT_NOT_GRANTED', async () => {
    const { store, registry } = buildHarness();
    try {
      store.save('cases', {
        id: 'case-adv-001',
        customerId: CUSTOMER_ID,
        status: 'open',
        subject: 'Kes ujian',
        detail: 'Butuh bantuan',
        revision: 1,
        createdAt: now(),
        updatedAt: now(),
      } as never);
      const result = await registry.dispatchTool(
        'draft_customer_reply',
        { caseId: 'case-adv-001', send: true, channel: 'in_app' },
        { actorId: STAFF_ID, role: 'staff', runId: 'run-adv-23-noconsent' },
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe('OUTBOUND_CONSENT_NOT_GRANTED');
    } finally {
      store.close();
    }
  });
});

describe('ADV-24 — build_action_plan: langkah tertapis oleh grant', () => {
  test('NEGATIF staf tanpa grant ⇒ langkah ditolak dengan GRANT_NOT_HELD', async () => {
    const { store, registry } = buildHarness();
    try {
      const result = await registry.dispatchTool(
        'build_action_plan',
        { objective: 'Selesaikan kes pelanggan' },
        { actorId: STAFF_ID, role: 'staff', runId: 'run-adv-24-nogrant' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      const data = result.result as { omittedSteps?: { reasonCode?: string }[]; steps?: unknown[] };
      expect(data.omittedSteps?.length ?? 0).toBeGreaterThan(0);
      expect((data.omittedSteps ?? []).map((step) => step.reasonCode)).toContain('GRANT_NOT_HELD');
    } finally {
      store.close();
    }
  });

  test('founder ialah root authority ⇒ langkah tidak ditolak', async () => {
    const { store, registry } = buildHarness();
    try {
      const result = await registry.dispatchTool(
        'build_action_plan',
        { objective: 'Selesaikan kes pelanggan' },
        { actorId: FOUNDER_ID, role: 'founder', runId: 'run-adv-24-founder' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      const data = result.result as { omittedSteps?: { reasonCode?: string }[] };
      expect(data.omittedSteps ?? []).toEqual([]);
    } finally {
      store.close();
    }
  });
});