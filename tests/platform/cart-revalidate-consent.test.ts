import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { prepareCartDraft } from '../../server/platform/cartDraft';
import { ReconnectRevalidation } from '../../server/platform/reconnectRevalidation';
import { evaluateDispatchConsent, readAssetConsent, recordAssetConsent } from '../../server/platform/dispatchConsent';
import type { CatalogueProduct, OrderRecord } from '../../shared/platform-contracts';

/**
 * MOD-01 (draf troli) · OFF-01 (revalidate-on-reconnect) · PD-01 (kebenaran aset).
 *
 * Tiga kontrak ini semuanyaVersions: "tidak dikira" bukan sifar, dan tiada
 * kesan sampingan berlaku tanpa kebenaran yang dinyatakan.
 */

const CUSTOMER_ID = 'cust-opt-001';
const FOUNDER_ID = 'user-opt-founder';
const STAFF_ID = 'user-opt-staff';

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

describe('PD-01 — kebenaran aset berstruktur', () => {
  test('NEGATIF tiada rekod kebenaran ⇒ ASSET_CONSENT_NOT_GRANTED (unknown ≠ kebenaran)', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      addMembership(store, STAFF_ID, 'staff', ['hq']);
      const auth = new Auth(store);
      const stamp = now();
      store.save('campaigns', {
        id: 'camp-1',
        title: 'Kempen',
        objective: 'Ujian',
        copy: 'Teks',
        status: 'approved',
        ownerId: FOUNDER_ID,
        revision: 1,
        assets: [{ id: 'asset-1', name: 'Nota', rights: 'Business-owned', consent: 'No people depicted' }],
        productIds: [],
        catalogueVersion: 0,
        createdAt: stamp,
        updatedAt: stamp,
      } as never);

      const outcome = evaluateDispatchConsent(
        store,
        auth,
        { user: { id: STAFF_ID }, memberships: [{ role: 'staff', status: 'active', outletIds: ['hq'] }] } as never,
        { campaignId: 'camp-1', assetId: 'asset-1', recipientId: CUSTOMER_ID, channel: 'in_app' },
      );
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('ASSET_CONSENT_NOT_GRANTED');
    } finally {
      store.close();
    }
  });

  test('rekod kebenaran `granted` dibaca semula sebagai `granted` (bukan teks bebas)', () => {
    const store = new PlatformStore(':memory:');
    try {
      const consent = {
        assetId: 'asset-1',
        state: 'granted' as const,
        scope: 'in_app:orders',
        evidenceId: 'ev-1',
        recordedAt: now(),
        recordedBy: FOUNDER_ID,
      };
      store.save('asset_consents', { ...consent, id: consent.assetId });
      expect(readAssetConsent(store, 'asset-1')?.state).toBe('granted');
      expect(readAssetConsent(store, 'asset-tiada')).toBeNull();
    } finally {
      store.close();
    }
  });
});
