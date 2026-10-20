import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import type { OrderRecord } from '../../shared/platform-contracts';

/**
 * REGRESSION: pembatalan oleh pelanggan sendiri.
 *
 * `server/platform/commerce.ts` pernah mempunyai cabang kosong:
 *
 *   if (next === 'cancelled' && order.customerId === actor.user.id && [...]) {}
 *
 * Branch itu membiarkan keputusan kebenaran "senang" tanpa sebarang kod —
 * tiada pengesahan, tiada rekod, tiada jejak audit. Kini branch tersebut
 * ialah keputusan kebenaran yang eksplisit, dan mutasi dijalankan dalam satu
 * transaksi atomik.
 */

function makePrincipal(id: string, role: 'founder' | 'staff' | 'customer'): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role,
        outletIds: ['hq'],
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  } as unknown as Principal;
}

function setup() {
  const store = new PlatformStore(':memory:');
  const auth = new Auth(store);
  const loyalty = new Loyalty(store, auth);
  const commerce = new Commerce(store, auth, loyalty);
  const founder = makePrincipal('founder-01', 'founder');
  const staff = makePrincipal('staff-01', 'staff');
  const customer = makePrincipal('cust-01', 'customer');
  const otherCustomer = makePrincipal('cust-02', 'customer');

  const product = commerce.saveProduct(founder, {
    name: 'Sambal Colek Klasik (Botol 250g)',
    description: 'Sambal warisan',
    priceSen: 1500,
    packSize: 1,
    publish: true,
  });

  store.save('lots', {
    id: 'lot-01',
    productId: product.id,
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'business',
    quantity: 100,
    status: 'available',
    revision: 1,
    expiryAt: new Date(Date.now() + 180 * 24 * 3600_000).toISOString(),
  });

  const submit = (actor: Principal, key: string) =>
    commerce.submitOrder(
      actor,
      {
        lines: [{ productId: product.id, quantity: 2 }],
        catalogueVersion: commerce.version(),
        fulfilment: 'delivery',
        contactRef: 'Ahmad Colek, No 12 Jalan Kebun, 50000 Kuala Lumpur, Tel: 0123456789',
        outletId: 'hq',
      },
      key
    );

  return { store, auth, loyalty, commerce, founder, staff, customer, otherCustomer, submit };
}

describe('REGRESSION: customer-initiated order cancellation actually cancels', () => {
  test('pelanggan membatalkan pesanan sendiri: pesanan dibatalkan, tempahan dilepaskan', () => {
    const { commerce, customer, submit, store } = setup();
    const order = submit(customer, 'idemp-cancel-01');

    expect(order.fulfilmentStatus).toBe('requested');
    const reservationsBefore = store.all<{ status: string; orderId: string }>('reservations').filter((r) => r.orderId === order.id);
    expect(reservationsBefore.length).toBe(1);
    expect(reservationsBefore[0].status).toBe('active');

    const cancelled = commerce.transition(customer, order.id, {
      expectedRevision: order.revision,
      next: 'cancelled',
    });

    // Pembatalan BENAR-BENAR berlaku.
    expect(cancelled.fulfilmentStatus).toBe('cancelled');
    expect(cancelled.revision).toBe(order.revision + 1);
    expect(store.get<OrderRecord>('orders', order.id)!.fulfilmentStatus).toBe('cancelled');

    // Tempahan stok dilepaskan.
    const reservationsAfter = store.all<{ status: string; orderId: string }>('reservations').filter((r) => r.orderId === order.id);
    expect(reservationsAfter.every((r) => r.status === 'released')).toBe(true);
  });

  test('pelanggan TIDAK boleh membatalkan pesanan orang lain (kebenaran ditolak)', () => {
    const { commerce, customer, otherCustomer, submit } = setup();
    const order = submit(customer, 'idemp-cancel-02');

    let code: string | undefined;
    try {
      commerce.transition(otherCustomer, order.id, {
        expectedRevision: order.revision,
        next: 'cancelled',
      });
    } catch (err: any) {
      code = err.code;
    }
    expect(code).toBe('FORBIDDEN');
  });

  test('pelanggan TIDAK boleh membatalkan pesanan yang sudah diproses (perlu keupayaan operasi)', () => {
    const { commerce, customer, staff, founder, submit, store } = setup();
    const order = submit(customer, 'idemp-cancel-03');
    const reviewed = commerce.transition(staff, order.id, {
      expectedRevision: order.revision,
      next: 'review',
    });
    // Pembayaran disahkan supaya pesanan boleh diterima (guratan platform).
    store.save('evidence', {
      id: 'ev-payment-cancel-03',
      entityId: reviewed.id,
      name: 'Bukti bayaran tunai',
      kind: 'file',
      sha256: 'a'.repeat(64),
      ownerId: founder.user.id,
    });
    const paid = commerce.payment(founder, reviewed.id, {
      expectedRevision: reviewed.revision,
      action: 'verify',
      amountSen: reviewed.amountSen,
      reference: 'REF-CANCEL-03',
      evidenceIds: ['ev-payment-cancel-03'],
      method: 'cash',
    }, 'idemp-cancel-03-pay');
    const accepted = commerce.transition(staff, paid.id, {
      expectedRevision: paid.revision,
      next: 'accepted',
    });

    // 'accepted' bukan dalam senarai pembatalan pelanggan sendiri.
    let code: string | undefined;
    try {
      commerce.transition(customer, accepted.id, {
        expectedRevision: accepted.revision,
        next: 'cancelled',
      });
    } catch (err: any) {
      code = err.code;
    }
    expect(code).toBe('FORBIDDEN');

    // Staff masih boleh membatalkan.
    const cancelled = commerce.transition(staff, accepted.id, {
      expectedRevision: accepted.revision,
      next: 'cancelled',
    });
    expect(cancelled.fulfilmentStatus).toBe('cancelled');
  });

  test('transisi tidak sah tidak meninggalkan perubahan separa (atomik)', () => {
    const { commerce, customer, submit, store } = setup();
    const order = submit(customer, 'idemp-cancel-04');

    let code: string | undefined;
    try {
      commerce.transition(customer, order.id, {
        expectedRevision: order.revision,
        next: 'dispatched',
      });
    } catch (err: any) {
      code = err.code;
    }
    expect(code).toBe('INVALID_TRANSITION');

    // Tiada perubahan separa: pesanan masih pada status asal.
    const reloaded = store.get<OrderRecord>('orders', order.id)!;
    expect(reloaded.fulfilmentStatus).toBe('requested');
    expect(reloaded.revision).toBe(order.revision);
    expect(store.all<{ status: string; orderId: string }>('reservations').filter((r) => r.orderId === order.id).every((r) => r.status === 'active')).toBe(true);
  });

  test('pembatalan pelanggan mencetuskan audit dan tidak membalikkan stok secara langsung', () => {
    const { commerce, customer, submit, store } = setup();
    const order = submit(customer, 'idemp-cancel-05');
    const cancelled = commerce.transition(customer, order.id, {
      expectedRevision: order.revision,
      next: 'cancelled',
    });

    expect(cancelled.fulfilmentStatus).toBe('cancelled');
    const audit = store.db
      .query<{ operation: string; entity_id: string }, [string, string]>(
        'SELECT operation, entity_id FROM audit WHERE operation=? AND entity_id=?'
      )
      .all('order.cancelled', order.id);
    expect(audit.length).toBe(1);
  });
});
