import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { buildVersionedSourceCitation } from '../../shared/mod-contracts';
import type { OrderRecord } from '../../shared/platform-contracts';

/**
 * MOD-09 — kontrak sitiran / versi / luput pada setiap hasil yang dikembalikan.
 *
 * Regel: TIDAK ADA hasil yang boleh muncul tanpa sitirannya; dan sitiran yang
 * tidak tahu luputnya mesti活下去 `null` + reason code — TIDAK pernah tarikh reka.
 */

const ORDER_ID = 'ord-cite-001';

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const stamp = now();
  return {
    id: ORDER_ID,
    customerId: 'cust-cite-001',
    lines: [],
    amountSen: 4200,
    fulfilment: 'delivery',
    contactRef: 'Ahmad Colek, 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'dispatched',
    revision: 3,
    paymentState: 'verified',
    paidAmountSen: 4200,
    refundAmountSen: 0,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function harness() {
  const store = new PlatformStore(':memory:');
  // KeTIFFaran aktif diperlukan: alat menolak dengan `AUTHORITY_UNRESOLVED`
  // bila keahlian belum ada.
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run('cust-cite-001', 'cust-cite-001@example.test', 'Customer Cite', 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), 'cust-cite-001', 'customer', JSON.stringify([]), null, 'active', 1);
  const executors = new ExecutorRegistry();
  executors.register(new RefundExecutor());
  const runtime = createToolRuntime({ store, approvalStore: new MemoryApprovalStore(), executors });
  return { store, registry: new ToolRegistry(6, { runtime }) };
}

describe('MOD-09 — sitiran dibina daripada rekod sebenar', () => {
  test('rekod dengan versi + luput ⇒ sitiran membawa kedua-duanya', () => {
    const observedAt = '2026-10-20T02:00:00.000Z';
    const citation = buildVersionedSourceCitation({
      sourceKind: 'knowledge_entry',
      sourceId: 'kn-1',
      version: 4,
      revision: 7,
      observedAt,
      expiresAt: '2026-11-01T00:00:00.000Z',
    });
    expect(citation.sourceKind).toBe('knowledge_entry');
    expect(citation.sourceId).toBe('kn-1');
    expect(citation.version).toBe('4');
    expect(citation.revision).toBe(7);
    expect(citation.observedAt).toBe(observedAt);
    expect(citation.expiresAt).toBe('2026-11-01T00:00:00.000Z');
    expect(citation.expiryReasonCode).toBe('EXPIRY_ACTIVE');
  });

  test('NEGATIF tiada luput direkod ⇒ null + EXPIRY_NOT_RECORDED (bukan tarikh reka)', () => {
    const citation = buildVersionedSourceCitation({
      sourceKind: 'order',
      sourceId: ORDER_ID,
      revision: 3,
      observedAt: '2026-10-20T02:00:00.000Z',
    });
    expect(citation.expiresAt).toBeNull();
    expect(citation.expiryReasonCode).toBe('EXPIRY_NOT_RECORDED');
  });

  test('NEGATIF luput sudah lepas ⇒ EXPIRED (bukan EXPIRY_ACTIVE)', () => {
    const citation = buildVersionedSourceCitation({
      sourceKind: 'knowledge_entry',
      sourceId: 'kn-1',
      observedAt: '2026-10-20T02:00:00.000Z',
      expiresAt: '2026-10-01T00:00:00.000Z',
    });
    expect(citation.expiryReasonCode).toBe('EXPIRED');
    expect(citation.expiresAt).toBe('2026-10-01T00:00:00.000Z');
  });

  test('NEGATIF tiada versi direkod ⇒ version null (bukan 0 atau "1")', () => {
    const citation = buildVersionedSourceCitation({
      sourceKind: 'order',
      sourceId: ORDER_ID,
      observedAt: '2026-10-20T02:00:00.000Z',
    });
    expect(citation.version).toBeNull();
    expect(citation.versionReasonCode).toBe('VERSION_NOT_RECORDED');
  });
});

describe('MOD-09 — setiap hasil search_records / build_context_bundle / explain_record mesti bersitasi', () => {
  test('search_records: setiap rekod Hasil membawa sitiran + senarai citations', async () => {
    const { store, registry } = harness();
    try {
      store.save('orders', order());

      const result = await registry.dispatchTool(
        'search_records',
        { kind: 'orders' },
        { actorId: 'cust-cite-001', role: 'customer', runId: `run-cite-${id()}` },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const payload = result as unknown as {
        result: {
          records?: { id?: string; citation?: { sourceId?: string; sourceKind?: string } }[];
          citations?: { sourceId?: string }[];
          citationContract?: string;
        };
      };
      const records = payload.result.records ?? [];
      expect(records.length).toBeGreaterThan(0);
      for (const row of records) {
        expect(row.citation).toBeDefined();
        expect(row.citation!.sourceId).toBe(row.id);
        expect(row.citation!.sourceKind).toBe('order');
      }
      // Senarai citations sejajar dengan rekod yang dipulangkan.
      expect(payload.result.citations?.length).toBe(records.length);
      expect(payload.result.citationContract).toBeTruthy();
    } finally {
      store.close();
    }
  });

  test('build_context_bundle: rekod terbenam ikut resit sitiran', async () => {
    const { store, registry } = harness();
    try {
      store.save('orders', order());

      const result = await registry.dispatchTool(
        'build_context_bundle',
        { entityId: ORDER_ID },
        { actorId: 'cust-cite-001', role: 'customer', runId: `run-cite-${id()}` },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const payload = result as unknown as {
        result: { citations?: { sourceId?: string }[]; bundle?: { citations?: unknown[] } };
      };
      expect(payload.result.citations?.length ?? 0).toBeGreaterThan(0);
      for (const citation of payload.result.citations ?? []) {
        expect(citation.sourceId).toBeTruthy();
      }
    } finally {
      store.close();
    }
  });
});
