import { describe, expect, test } from 'bun:test';
import { PlatformStore, DomainError, id, now } from '../../server/platform/store';
import { PaymentReconciler, type ProviderCallbackPayload } from '../../server/platform/paymentReconciliation';
import type { OrderRecord, InventoryReservation, StockLot, CatalogueProduct } from '../../shared/platform-contracts';

function createTestHarness() {
  const store = new PlatformStore(':memory:');
  const reconciler = new PaymentReconciler(store, undefined, 'ABANGCOLEK-HQ-MERCHANT');

  // Seed sample catalogue product & available stock
  const product: CatalogueProduct = {
    id: 'prod-colek-500g',
    name: 'Colek Buah Segar 500g',
    description: 'Colek Buah Segar Tradisional',
    priceSen: 1500, // RM 15.00
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 10,
    revision: 1,
    status: 'published',
  };
  store.save('catalogue', product);

  const lot: StockLot = {
    id: 'lot-001',
    productId: product.id,
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'business',
    quantity: 10,
    status: 'available',
    revision: 1,
  };
  store.save('lots', lot);

  return { store, reconciler, product, lot };
}

function createSampleOrder(
  store: PlatformStore,
  override: Partial<OrderRecord> = {},
  reservationStatus: 'active' | 'released' | 'expired' = 'active'
): { order: OrderRecord; reservation: InventoryReservation } {
  const orderId = override.id ?? id();
  const order: OrderRecord = {
    id: orderId,
    customerId: 'cust-ali-123',
    lines: [
      {
        productId: 'prod-colek-500g',
        name: 'Colek Buah Segar 500g',
        quantity: 2,
        priceSen: 1500,
        publishedVersion: 1,
      },
    ],
    amountSen: 3000, // RM 30.00
    fulfilment: 'pickup',
    contactRef: 'Ali (0123456789), Johor Bahru',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'pending',
    paidAmountSen: 0,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
    ...override,
  };
  store.save('orders', order);

  const reservation: InventoryReservation = {
    id: `res-${orderId}`,
    orderId,
    productId: 'prod-colek-500g',
    ownerId: 'business',
    locationId: 'hq',
    quantity: 2,
    status: reservationStatus,
    expiresAt: reservationStatus === 'expired'
      ? new Date(Date.now() - 3600_000).toISOString()
      : new Date(Date.now() + 86400_000).toISOString(),
    revision: 1,
  };
  store.save('reservations', reservation);

  return { order, reservation };
}

describe('PAY-01 & PAY-02 Payment Reconciliation Invariants (v2.4)', () => {
  test('Deduplikasi: Callback berulang dengan transaction ID sama tidak menjana entri berganda', () => {
    const { store, reconciler } = createTestHarness();
    const { order } = createSampleOrder(store);

    const payload: ProviderCallbackPayload = {
      transactionId: 'TXN-BILLPLZ-998877',
      orderId: order.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
      provider: 'billplz',
    };

    // Percubaan Pertama (First attempt)
    const res1 = reconciler.processProviderCallback(payload);
    expect(res1.outcome).toBe('verified');
    expect(res1.isDuplicate).toBe(false);
    expect(res1.receiptId).toBe('TXN-BILLPLZ-998877');

    const updatedOrder1 = store.require<OrderRecord>('orders', order.id);
    expect(updatedOrder1.paymentState).toBe('verified');
    expect(updatedOrder1.paidAmountSen).toBe(3000);

    const paymentsFirst = store.all('payments');
    expect(paymentsFirst.length).toBe(1);

    const receiptsFirst = store.all('provider_receipts');
    expect(receiptsFirst.length).toBe(1);

    // Percubaan Kedua (Replay / duplicate callback with identical transaction ID)
    const res2 = reconciler.processProviderCallback(payload);
    expect(res2.outcome).toBe('duplicate_ignored');
    expect(res2.isDuplicate).toBe(true);
    expect(res2.receiptId).toBe('TXN-BILLPLZ-998877');

    // Pastikan tiada entri kedua ditambah
    const updatedOrder2 = store.require<OrderRecord>('orders', order.id);
    expect(updatedOrder2.paidAmountSen).toBe(3000); // Tidak berganda menjadi 6000

    const paymentsSecond = store.all('payments');
    expect(paymentsSecond.length).toBe(1); // Kekal 1 rekod

    const receiptsSecond = store.all('provider_receipts');
    expect(receiptsSecond.length).toBe(1); // Kekal 1 rekod
  });

  test('Penolakan amaun: Callback dengan amountSen tidak sepadan ditolak serta-merta', () => {
    const { store, reconciler } = createTestHarness();
    const { order } = createSampleOrder(store, { amountSen: 3000 });

    const payload: ProviderCallbackPayload = {
      transactionId: 'TXN-MISMATCH-AMT',
      orderId: order.id,
      amountSen: 2500, // Sebenar 3000 sen, dihantar 2500 sen
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
    };

    expect(() => reconciler.processProviderCallback(payload)).toThrow(DomainError);

    try {
      reconciler.processProviderCallback(payload);
    } catch (e: any) {
      expect(e.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    }

    const unverifiedOrder = store.require<OrderRecord>('orders', order.id);
    expect(unverifiedOrder.paymentState).toBe('pending');
    expect(unverifiedOrder.paidAmountSen).toBe(0);
    expect(store.all('payments').length).toBe(0);
  });

  test('Penolakan mata wang: Callback dengan currency bukan MYR ditolak', () => {
    const { store, reconciler } = createTestHarness();
    const { order } = createSampleOrder(store);

    const payload: ProviderCallbackPayload = {
      transactionId: 'TXN-MISMATCH-CURR',
      orderId: order.id,
      amountSen: 3000,
      currency: 'USD', // Bukan MYR
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
    };

    expect(() => reconciler.processProviderCallback(payload)).toThrow(DomainError);

    try {
      reconciler.processProviderCallback(payload);
    } catch (e: any) {
      expect(e.code).toBe('PAYMENT_CURRENCY_MISMATCH');
    }

    const orderAfter = store.require<OrderRecord>('orders', order.id);
    expect(orderAfter.paymentState).toBe('pending');
  });

  test('Penolakan akaun: Callback dengan merchantAccount tidak sepadan ditolak', () => {
    const { store, reconciler } = createTestHarness();
    const { order } = createSampleOrder(store);

    const payload: ProviderCallbackPayload = {
      transactionId: 'TXN-MISMATCH-ACC',
      orderId: order.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'WRONG-ACCOUNT-999', // Akaun salah
      status: 'paid',
    };

    expect(() => reconciler.processProviderCallback(payload)).toThrow(DomainError);

    try {
      reconciler.processProviderCallback(payload);
    } catch (e: any) {
      expect(e.code).toBe('PAYMENT_ACCOUNT_MISMATCH');
    }

    const orderAfter = store.require<OrderRecord>('orders', order.id);
    expect(orderAfter.paymentState).toBe('pending');
  });

  test('Late paid handling: Bayaran tiba selepas order cancelled/expired direkod bawah review tanpa resurrect stok (STK-01)', () => {
    const { store, reconciler } = createTestHarness();
    // Cipta pesanan yang telah terbatal dengan tempahan stok telah dilepaskan
    const { order } = createSampleOrder(
      store,
      { fulfilmentStatus: 'cancelled' },
      'released'
    );

    const payload: ProviderCallbackPayload = {
      transactionId: 'TXN-LATE-PAID-001',
      orderId: order.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
    };

    const res = reconciler.processProviderCallback(payload);

    // 1. Keputusan mestilah 'payment_exception_review'
    expect(res.outcome).toBe('payment_exception_review');
    expect(res.exception?.reason).toBe('LATE_PAYMENT_AFTER_CANCELLATION');

    // 2. Fakta kewangan direkodkan (wang diterima tidak dinafikan)
    const payments = store.all('payments');
    expect(payments.length).toBe(1);
    expect((payments[0] as any).reference).toBe('TXN-LATE-PAID-001');
    expect((payments[0] as any).amountSen).toBe(3000);
    expect((payments[0] as any).state).toBe('confirmed');

    // 3. Status pesanan kekal cancelled, JANGAN ubah ke accepted atau auto-fulfill
    const orderAfter = store.require<OrderRecord>('orders', order.id);
    expect(orderAfter.fulfilmentStatus).toBe('cancelled');
    expect(orderAfter.paidAmountSen).toBe(3000);

    // 4. Tempahan stok TIDAK dihidupkan semula (STK-01 Invariant)
    const reservations = store.all<InventoryReservation>('reservations').filter(r => r.orderId === order.id);
    expect(reservations.length).toBe(1);
    expect(reservations[0].status).toBe('released'); // Kekal released, tiada status 'active' baru
  });

  test('Callback tiba selepas baki stok diagihkan kepada pesanan pelanggan lain: tiada oversell', () => {
    const { store, reconciler } = createTestHarness();

    // Pesanan pertama A dibatalkan
    const { order: orderA } = createSampleOrder(
      store,
      { id: 'order-A', fulfilmentStatus: 'cancelled' },
      'released'
    );

    // Pesanan kedua B mengambil stok yang dilepaskan
    const { order: orderB } = createSampleOrder(
      store,
      { id: 'order-B', fulfilmentStatus: 'requested' },
      'active'
    );

    // Bayaran lewat tiba bagi Pesanan A
    const payloadLate: ProviderCallbackPayload = {
      transactionId: 'TXN-LATE-REALLOCATED',
      orderId: orderA.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
    };

    const resLate = reconciler.processProviderCallback(payloadLate);
    expect(resLate.outcome).toBe('payment_exception_review');

    // Pesanan B kekal memiliki tempahan aktif
    const resB = store.all<InventoryReservation>('reservations').find(r => r.orderId === orderB.id);
    expect(resB?.status).toBe('active');

    // Pesanan A kekal terbatal tanpa tempahan aktif
    const resA = store.all<InventoryReservation>('reservations').find(r => r.orderId === orderA.id);
    expect(resA?.status).toBe('released');
  });

  test('Pertindihan bayaran: Dua transaksi berbeza untuk satu pesanan yang sama dipegang bawah review', () => {
    const { store, reconciler } = createTestHarness();
    const { order } = createSampleOrder(store);

    // Bayaran pertama berjaya
    const payload1: ProviderCallbackPayload = {
      transactionId: 'TXN-ATTEMPT-01',
      orderId: order.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
    };
    const res1 = reconciler.processProviderCallback(payload1);
    expect(res1.outcome).toBe('verified');

    // Bayaran kedua dengan ID berbeza tiba untuk pesanan yang telah dibayar penuh
    const payload2: ProviderCallbackPayload = {
      transactionId: 'TXN-ATTEMPT-02',
      orderId: order.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'paid',
    };
    const res2 = reconciler.processProviderCallback(payload2);
    expect(res2.outcome).toBe('payment_exception_review');
    expect(res2.exception?.reason).toBe('PAYMENT_CONFLICT_HELD');

    // Amaun bayaran pesanan tidak digandakan
    const orderFinal = store.require<OrderRecord>('orders', order.id);
    expect(orderFinal.paidAmountSen).toBe(3000);
  });

  test('Callback status gagal tidak merosakkan pesanan yang sedia sah', () => {
    const { store, reconciler } = createTestHarness();
    const { order } = createSampleOrder(store);

    const failPayload: ProviderCallbackPayload = {
      transactionId: 'TXN-FAILED-CALLBACK',
      orderId: order.id,
      amountSen: 3000,
      currency: 'MYR',
      merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
      status: 'failed',
    };

    const res = reconciler.processProviderCallback(failPayload);
    expect(res.outcome).toBe('rejected');

    const orderFinal = store.require<OrderRecord>('orders', order.id);
    expect(orderFinal.paymentState).toBe('pending');
    expect(orderFinal.paidAmountSen).toBe(0);
  });
});
