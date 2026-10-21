import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { ReconnectRevalidation } from '../../server/platform/reconnectRevalidation';
import type { OrderRecord } from '../../shared/platform-contracts';

const CUSTOMER_ID = 'cust-opt-001';

function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = []): void {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), null, 'active', 1);
}

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const stamp = now();
  return {
    id: 'ord-opt-001',
    customerId: CUSTOMER_ID,
    lines: [],
    amountSen: 4200,
    fulfilment: 'delivery',
    contactRef: 'Ahmad Colek, 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'dispatched',
    revision: 5,
    paymentState: 'verified',
    paidAmountSen: 4200,
    refundAmountSen: 0,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

describe('OFF-01 — revalidate-on-reconnect', () => {
  test('rekod sepadan (revision + medan) ⇒ TIDAK ada konflik', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      const auth = new Auth(store);
      store.save('orders', order({ customerId: CUSTOMER_ID }));

      const outcome = new ReconnectRevalidation(store, auth).revalidate(
        { user: { id: CUSTOMER_ID }, memberships: [{ role: 'customer', status: 'active', outletIds: [] }] } as never,
        {
          kind: 'orders',
          recordId: 'ord-opt-001',
          expectedRevision: 5,
          submitted: { amountSen: 4200, fulfilment: 'delivery' },
        },
      );
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.conflicts).toEqual([]);
      expect(outcome.serverRevision).toBe(5);
    } finally {
      store.close();
    }
  });

  test('NEGATIF medan berubah ⇒ REVALIDATION_CONFLICT dengan medan yang tepat', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      const auth = new Auth(store);
      store.save('orders', order({ customerId: CUSTOMER_ID }));

      const outcome = new ReconnectRevalidation(store, auth).revalidate(
        { user: { id: CUSTOMER_ID }, memberships: [{ role: 'customer', status: 'active', outletIds: [] }] } as never,
        {
          kind: 'orders',
          recordId: 'ord-opt-001',
          expectedRevision: 5,
          submitted: { amountSen: 9999, fulfilment: 'delivery' },
        },
      );
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('REVALIDATION_CONFLICT');
      expect(outcome.retryable).toBe(false);
      expect(outcome.conflicts.map((conflict) => conflict.field)).toContain('amountSen');
      expect(outcome.conflicts[0]).toMatchObject({ field: 'amountSen', expected: 9999, actual: 4200 });
    } finally {
      store.close();
    }
  });

  test('NEGATIF revision lapuk ⇒ konflik juga (revision dik banding)', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      const auth = new Auth(store);
      store.save('orders', order({ customerId: CUSTOMER_ID }));

      const outcome = new ReconnectRevalidation(store, auth).revalidate(
        { user: { id: CUSTOMER_ID }, memberships: [{ role: 'customer', status: 'active', outletIds: [] }] } as never,
        { kind: 'orders', recordId: 'ord-opt-001', expectedRevision: 1, submitted: {} },
      );
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('REVALIDATION_CONFLICT');
      expect(outcome.serverRevision).toBe(5);
    } finally {
      store.close();
    }
  });
});
