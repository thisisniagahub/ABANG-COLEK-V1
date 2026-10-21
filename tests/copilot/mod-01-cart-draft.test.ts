import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { prepareCartDraft } from '../../server/platform/cartDraft';
import type { CatalogueProduct } from '../../shared/platform-contracts';

const CUSTOMER_ID = 'cust-opt-001';
const FOUNDER_ID = 'user-opt-founder';

function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = []): void {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), null, 'active', 1);
}

function product(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    id: 'prod-1',
    name: 'Sambal Cili Padi 200g',
    description: 'Sambal isi rumah',
    priceSen: 1200,
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 50,
    revision: 1,
    status: 'published',
    ...overrides,
  };
}

describe('MOD-01 — draf troli BELUM dihantar', () => {
  test('draf dibina daripada katalog yang DITERBITKAN; tiada pesanan atau tempahan disimpan', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      addMembership(store, FOUNDER_ID, 'founder', ['hq']);
      const auth = new Auth(store);
      const commerce = new Commerce(store, auth);
      store.save('catalogue', product());
      // Resolusi aktor daripada keanggotaan (bukan daripada input klien).
      const actorPrincipal = {
        user: { id: CUSTOMER_ID },
        memberships: [{ role: 'customer', status: 'active', outletIds: [] }],
      } as never;

      const outcome = prepareCartDraft(commerce, actorPrincipal, {
        lines: [{ productId: 'prod-1', quantity: 2 }],
        catalogueVersion: commerce.version(),
      });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.draft.status).toBe('unsent');
      expect(outcome.draft.persisted).toBe(false);
      expect(outcome.draft.orderId).toBeNull();
      expect(outcome.draft.reservationIds).toEqual([]);
      // Wang integer sen.
      expect(outcome.draft.totalSen).toBe(2400);
      expect(Number.isInteger(outcome.draft.totalSen)).toBe(true);
      // Tiada apa-apa disimpan ke store.
      expect(store.all('orders')).toHaveLength(0);
      expect(store.all('reservations')).toHaveLength(0);
    } finally {
      store.close();
    }
  });

  test('NEGATIF versi katalog bergerak ⇒ requiresReprice = true', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      const auth = new Auth(store);
      const commerce = new Commerce(store, auth);
      store.save('catalogue', product());
      const actorPrincipal = {
        user: { id: CUSTOMER_ID },
        memberships: [{ role: 'customer', status: 'active', outletIds: [] }],
      } as never;

      const outcome = prepareCartDraft(commerce, actorPrincipal, {
        lines: [{ productId: 'prod-1', quantity: 1 }],
        catalogueVersion: commerce.version() + 99,
      });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.draft.requiresReprice).toBe(true);
    } finally {
      store.close();
    }
  });

  test('NEGATIF produk tidak diterbitkan ⇒ CART_DRAFT_UNKNOWN_PRODUCT', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      const auth = new Auth(store);
      const commerce = new Commerce(store, auth);
      store.save('catalogue', product({ id: 'prod-draft', status: 'draft' }));
      const actorPrincipal = {
        user: { id: CUSTOMER_ID },
        memberships: [{ role: 'customer', status: 'active', outletIds: [] }],
      } as never;

      const outcome = prepareCartDraft(commerce, actorPrincipal, {
        lines: [{ productId: 'prod-draft', quantity: 1 }],
        catalogueVersion: commerce.version(),
      });
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('CART_DRAFT_UNKNOWN_PRODUCT');
      expect(outcome.conflicts.length).toBeGreaterThan(0);
    } finally {
      store.close();
    }
  });
});