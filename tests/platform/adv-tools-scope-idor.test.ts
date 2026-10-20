/**
 * Cross-tenant / IDOR protection and real-state behaviour of the query and
 * simulation tools. Every assertion below reads a canonical record — nothing
 * is fabricated.
 */

import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import type { CatalogueProduct, OrderRecord, StockLot } from '../../shared/platform-contracts';

const FOUNDER_ID = 'usr-founder-idor';
const STAFF_HQ_ID = 'usr-staff-hq';
const STAFF_OTHER_ID = 'usr-staff-other';
const DEALER_X = 'usr-dealer-x';
const DEALER_Y = 'usr-dealer-y';
const ORG_X = 'dealer-org-x';
const ORG_Y = 'dealer-org-y';

function addMembership(
  store: PlatformStore,
  userId: string,
  role: string,
  outlets: string[] = [],
  dealerOrgId: string | null = null,
): void {
  store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), dealerOrgId, 'active', 1);
}

function buildHarness(): { store: PlatformStore; registry: ToolRegistry } {
  const store = new PlatformStore(':memory:');
  addMembership(store, FOUNDER_ID, 'founder', ['hq', 'outlet-2']);
  addMembership(store, STAFF_HQ_ID, 'staff', ['hq']);
  addMembership(store, STAFF_OTHER_ID, 'staff', ['outlet-2']);
  addMembership(store, DEALER_X, 'customer', [], ORG_X);
  addMembership(store, DEALER_Y, 'customer', [], ORG_Y);

  const product: CatalogueProduct = {
    id: 'prod-idor',
    name: 'Colek IDOR',
    description: 'Produk ujian',
    priceSen: 1500,
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 4,
    revision: 1,
    status: 'published',
  };
  store.save('catalogue', product);
  store.setMetadata('catalogue_version', '1');

  const lot: StockLot = {
    id: 'lot-idor-hq',
    productId: product.id,
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'business',
    quantity: 4,
    status: 'available',
    revision: 1,
  };
  store.save('lots', lot);

  const orderA: OrderRecord = {
    id: 'ord-idor-a',
    customerId: DEALER_X,
    lines: [{ productId: product.id, name: product.name, quantity: 2, priceSen: 1500, publishedVersion: 1 }],
    amountSen: 3000,
    fulfilment: 'pickup',
    contactRef: 'Dealer X',
    outletId: 'hq',
    dealerOrgId: ORG_X,
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'verified',
    paidAmountSen: 3000,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  store.save('orders', orderA);

  const orderB: OrderRecord = {
    ...orderA,
    id: 'ord-idor-b',
    customerId: DEALER_Y,
    dealerOrgId: ORG_Y,
    contactRef: 'Dealer Y',
  };
  store.save('orders', orderB);

  // A multi-line order so the largest-remainder allocation is non-trivial.
  const productB: CatalogueProduct = { ...product, id: 'prod-idor-b', name: 'Colek IDOR B', priceSen: 1000 };
  const productC: CatalogueProduct = { ...product, id: 'prod-idor-c', name: 'Colek IDOR C', priceSen: 500 };
  store.save('catalogue', productB);
  store.save('catalogue', productC);
  for (const extra of [productB, productC]) {
    store.save('lots', {
      id: `lot-${extra.id}`,
      productId: extra.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 5,
      status: 'available',
      revision: 1,
    } satisfies StockLot);
  }
  store.save('orders', {
    ...orderA,
    id: 'ord-idor-multi',
    lines: [
      { productId: product.id, name: product.name, quantity: 1, priceSen: 1500, publishedVersion: 1 },
      { productId: productB.id, name: productB.name, quantity: 1, priceSen: 1000, publishedVersion: 1 },
      { productId: productC.id, name: productC.name, quantity: 1, priceSen: 500, publishedVersion: 1 },
    ],
    amountSen: 3000,
  } satisfies OrderRecord);

  const executors = new ExecutorRegistry();
  executors.register(new RefundExecutor());
  const runtime = createToolRuntime({ store, approvalStore: new MemoryApprovalStore(), executors });
  return { store, registry: new ToolRegistry(6, { runtime }) };
}

let counter = 0;
function ctxFor(actorId: string, role: 'customer' | 'staff' | 'founder' | 'developer'): { actorId: string; role: any; runId: string } {
  counter += 1;
  return { actorId, role, runId: `run-idor-${counter}` };
}

describe('Perlindungan Cross-Tenant / IDOR', () => {
  test('search_records hanya memulangkan rekod dalam skop pemeran', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('search_records', { kind: 'orders' }, ctxFor(DEALER_X, 'customer'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const ids = (res.result.records as Array<{ id: string }>).map((record) => record.id);
    expect(ids).toContain('ord-idor-a');
    expect(ids).not.toContain('ord-idor-b');
  });

  test('Dealer tidak boleh membaca pesanan dealer lain (CROSS_TENANT_FORBIDDEN)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('build_context_bundle', { entityId: 'ord-idor-b' }, ctxFor(DEALER_X, 'customer'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('CROSS_TENANT_FORBIDDEN');
  });

  test('Dealer tidak boleh diterangkan pesanan dealer lain (CROSS_TENANT_FORBIDDEN)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('explain_record', { entityId: 'ord-idor-b' }, ctxFor(DEALER_X, 'customer'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('CROSS_TENANT_FORBIDDEN');
  });

  test('Kakitangan outlet lain tidak boleh membaca pesanan outlet ini (FORBIDDEN)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('explain_record', { entityId: 'ord-idor-a' }, ctxFor(STAFF_OTHER_ID, 'staff'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('FORBIDDEN');
  });

  test('Founder mempunyai akses silang (dibenarkan)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('explain_record', { entityId: 'ord-idor-b' }, ctxFor(FOUNDER_ID, 'founder'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.recordType).toBe('order');
  });

  test('Pencarian tanpa padanan memulangkan 0, bukan rekod rekaan', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('search_records', { kind: 'orders', query: 'tiada-rekod-langsung' }, ctxFor(FOUNDER_ID, 'founder'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.count).toBe(0);
    expect(res.result.records).toEqual([]);
  });

  test('Rekod tidak wujud => RECORD_NOT_FOUND', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('explain_record', { entityId: 'ord-hilang' }, ctxFor(FOUNDER_ID, 'founder'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('RECORD_NOT_FOUND');
  });
});

describe('Diagnos Checkout Yang Dikira (ADV-05)', () => {
  test('Stok mencukupi => valid dikira TRUE', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('diagnose_checkout', { orderId: 'ord-idor-a' }, ctxFor(STAFF_HQ_ID, 'staff'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.valid).toBe(true);
    expect(res.result.lines[0].sufficient).toBe(true);
    expect(res.result.mutated).toBe(false);
  });

  test('Stok tidak mencukupi => valid dikira FALSE dengan isu sebenar', async () => {
    const { registry, store } = buildHarness();
    store.save('lots', {
      id: 'lot-idor-hq',
      productId: 'prod-idor',
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 0,
      status: 'available',
      revision: 2,
    } satisfies StockLot);
    const res = await registry.dispatchTool('diagnose_checkout', { orderId: 'ord-idor-a' }, ctxFor(STAFF_HQ_ID, 'staff'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.valid).toBe(false);
    expect((res.result.issues as string[]).some((issue) => issue.startsWith('STOK_MENCUKUPI'))).toBe(true);
  });

  test('Pesanan tidak wujud => ORDER_NOT_FOUND', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('diagnose_checkout', { orderId: 'ord-hilang' }, ctxFor(STAFF_HQ_ID, 'staff'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('ORDER_NOT_FOUND');
  });
});

describe('Diagnos Bakul (ADV-05 mod(lines))', () => {
  test('Bakul dengan stok mencukupi => valid dikira TRUE, needsReprice dikira dari katalog', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'diagnose_checkout',
      { lines: [{ productId: 'prod-idor', quantity: 2 }] },
      ctxFor(DEALER_X, 'customer'),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.mode).toBe('cart');
    expect(res.result.valid).toBe(true);
    expect(res.result.requiresReprice).toBe(false);
    expect(res.result.estimatedTotalSen).toBe(3000);
    expect(res.result.mutated).toBe(false);
  });

  test('Bakul melebihi stok => valid dikira FALSE dengan isu sebenar', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'diagnose_checkout',
      { lines: [{ productId: 'prod-idor', quantity: 999 }] },
      ctxFor(DEALER_X, 'customer'),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.valid).toBe(false);
    expect((res.result.issues as string[]).some((issue) => issue.startsWith('STOK_MENCUKUPI'))).toBe(true);
  });

  test('Bakul dengan produk tidak wujud => valid dikira FALSE', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'diagnose_checkout',
      { lines: [{ productId: 'prod-hilang', quantity: 1 }] },
      ctxFor(DEALER_X, 'customer'),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.valid).toBe(false);
    expect((res.result.issues as string[]).some((issue) => issue.startsWith('PRODUKT_TIDAK_DITEMUI'))).toBe(true);
  });

  test('Bakul yang draf pada versi katalog lapuk memerlukan reprice (dikira)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'diagnose_checkout',
      { lines: [{ productId: 'prod-idor', quantity: 2 }], catalogueVersion: 0 },
      ctxFor(DEALER_X, 'customer'),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.requiresReprice).toBe(true);
    expect((res.result.issues as string[]).some((issue) => issue.startsWith('KATALOG_UFUK'))).toBe(true);
  });

  test('Tanpa stor platform, diagnos gagal tertutup (PLATFORM_STORE_UNAVAILABLE)', async () => {
    const registry = new ToolRegistry(6);
    const res = await registry.dispatchTool(
      'diagnose_checkout',
      { lines: [{ productId: 'prod-idor', quantity: 1 }] },
      ctxFor(DEALER_X, 'customer'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('PLATFORM_STORE_UNAVAILABLE');
  });
});

describe('Pratonton Refund Yang Dikira (ADV-07)', () => {
  test('Agihan Largest-Remainder menambah tepat amaun yang diminta', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('preview_refund', { orderId: 'ord-idor-multi', amountSen: 1000 }, ctxFor(STAFF_HQ_ID, 'staff'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.allocatedTotalSen).toBe(1000);
    expect(res.result.estimatedDriftSen).toBe(0);
    // The naive proportional rounding drift is genuinely computed (not hardcoded).
    expect(res.result.naiveFloorDriftSen).not.toBe(0);
    expect(res.result.status).toBe('preview_ready');
    expect(res.result.mutated).toBe(false);
  });

  test('Amaun melebihi baki dipulangkan ditolak', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('preview_refund', { orderId: 'ord-idor-a', amountSen: 999999 }, ctxFor(STAFF_HQ_ID, 'staff'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('REFUND_EXCEEDS_PAID_BALANCE');
  });

  test('Pratonton tidak mengubah pesanan', async () => {
    const { registry, store } = buildHarness();
    await registry.dispatchTool('preview_refund', { orderId: 'ord-idor-a', amountSen: 1000 }, ctxFor(STAFF_HQ_ID, 'staff'));
    const order = store.require<OrderRecord>('orders', 'ord-idor-a');
    expect(order.refundAmountSen).toBe(0);
    expect(order.revision).toBe(1);
  });
});

describe('Penyelarasan Bayaran Sebenar (ADV-06)', () => {
  test('Drift dikira apabila lejar bayaran tiada', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool('reconcile_payments', { orderId: 'ord-idor-a' }, ctxFor(STAFF_HQ_ID, 'staff'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.paymentRecordCount).toBe(0);
    expect(res.result.paidDriftSen).toBe(-3000);
    expect(res.result.status).toBe('drift_detected');
  });
});
