import { afterEach, describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { Loyalty, calculateLoyaltyPointsEarned, loyaltyPointsToDiscountSen, discountSenToLoyaltyPoints } from '../../server/platform/loyalty';
import { calculateCustomerCartTotals, customerCartOrderAnswers } from '../../src/features/flows/customer-cart';
import type { PublicProduct } from '../../shared/platform-contracts';
import { PlatformStore } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

function createHarness() {
  const directory = mkdtempSync(join(tmpdir(), 'loyalty-test-'));
  const app = createPlatformApp({
    databasePath: join(directory, 'test.sqlite'),
    bootstrapToken: 'loyalty-bootstrap-token',
    origin: 'http://localhost:3000',
  });
  cleanups.push(() => {
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, directory };
}

async function apiCall(
  app: ReturnType<typeof createPlatformApp>,
  path: string,
  body?: unknown,
  session?: { cookie: string; csrf: string },
  extra: Record<string, string> = {}
) {
  const response = await app.fetch(
    new Request(`http://localhost:3010/api/platform${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
              'Idempotency-Key': crypto.randomUUID(),
            }),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  );
  return { response, json: await response.json() };
}

async function createUser(app: ReturnType<typeof createPlatformApp>, name: string, founder = false) {
  const result = await apiCall(app, founder ? '/auth/bootstrap' : '/auth/signup', {
    email: `${name}@example.test`,
    name,
    password: 'secure test password 123',
    ...(founder ? { token: 'loyalty-bootstrap-token' } : {}),
  });
  expect(result.response.status).toBe(200);
  return {
    cookie: result.response.headers.get('set-cookie')!.split(';')[0],
    csrf: result.json.data.csrfToken,
    userId: result.json.data.user.id,
  };
}

describe('Loyalty Points Engine & Formulas', () => {
  test('calculates earned loyalty points: RM1 jualan = 1 mata', () => {
    expect(calculateLoyaltyPointsEarned(0)).toBe(0);
    expect(calculateLoyaltyPointsEarned(99)).toBe(0); // 99 sen < RM1 -> 0 mata
    expect(calculateLoyaltyPointsEarned(100)).toBe(1); // RM1.00 (100 sen) -> 1 mata
    expect(calculateLoyaltyPointsEarned(1500)).toBe(15); // RM15.00 -> 15 mata
    expect(calculateLoyaltyPointsEarned(2590)).toBe(25); // RM25.90 -> 25 mata
    expect(calculateLoyaltyPointsEarned(10000)).toBe(100); // RM100.00 -> 100 mata
  });

  test('calculates redemption discount: 100 mata = RM1 diskaun (100 sen)', () => {
    expect(loyaltyPointsToDiscountSen(0)).toBe(0);
    expect(loyaltyPointsToDiscountSen(1)).toBe(1); // 1 mata = 1 sen
    expect(loyaltyPointsToDiscountSen(100)).toBe(100); // 100 mata = 100 sen = RM1.00 diskaun
    expect(loyaltyPointsToDiscountSen(250)).toBe(250); // 250 mata = RM2.50 diskaun
    expect(loyaltyPointsToDiscountSen(1000)).toBe(1000); // 1000 mata = RM10.00 diskaun

    expect(discountSenToLoyaltyPoints(100)).toBe(100);
    expect(discountSenToLoyaltyPoints(250)).toBe(250);
  });
});

describe('Customer Cart Loyalty Integration', () => {
  const mockProduct: PublicProduct = {
    id: 'sambal-hijau',
    name: 'Sambal Hijau Padu',
    description: 'Sambal hijau',
    priceSen: 1500, // RM 15.00
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 50,
  };

  test('calculateCustomerCartTotals computes subtotal, discount, and remaining total', () => {
    const lines = [{ productId: 'sambal-hijau', quantity: 2 }]; // 3000 sen (RM 30.00)
    const result = calculateCustomerCartTotals(lines, [mockProduct], 200, 500);

    expect(result.subtotalSen).toBe(3000);
    expect(result.redeemPoints).toBe(200);
    expect(result.discountSen).toBe(200); // RM 2.00 diskaun
    expect(result.totalSen).toBe(2800); // RM 28.00 baki bayaran
    expect(result.estimatedPointsEarned).toBe(28); // RM 28 jualan = 28 mata diperoleh
  });

  test('calculateCustomerCartTotals prevents over-redemption beyond user balance', () => {
    const lines = [{ productId: 'sambal-hijau', quantity: 2 }];
    expect(() => calculateCustomerCartTotals(lines, [mockProduct], 600, 500)).toThrow(
      'Baki poin kesetiaan tidak mencukupi'
    );
  });

  test('calculateCustomerCartTotals prevents redemption exceeding cart subtotal', () => {
    const lines = [{ productId: 'sambal-hijau', quantity: 1 }]; // 1500 sen
    expect(() => calculateCustomerCartTotals(lines, [mockProduct], 2000, 5000)).toThrow(
      'Diskaun poin melebihi jumlah pesanan'
    );
  });

  test('customerCartOrderAnswers validates and packages redeemPoints', () => {
    const lines = [{ productId: 'sambal-hijau', quantity: 1 }];
    const answers = customerCartOrderAnswers(lines, [mockProduct], 'REF123', 100, 200);
    expect(answers.redeemPoints).toBe(100);
    expect(answers.referralCode).toBe('REF123');

    expect(() => customerCartOrderAnswers(lines, [mockProduct], undefined, 300, 200)).toThrow(
      'Baki poin kesetiaan tidak mencukupi'
    );

    expect(() => customerCartOrderAnswers(lines, [mockProduct], undefined, 2000, 5000)).toThrow(
      'Diskaun poin melebihi jumlah pesanan'
    );
  });
});

describe('Loyalty Ledger Unit Tests', () => {
  test('records earned points, tracks balance, and enforces idempotency', () => {
    const store = new PlatformStore(':memory:');
    try {
      const loyalty = new Loyalty(store);
      const userId = 'user-test-1';

      expect(loyalty.getBalance(userId)).toBe(0);

      const entry1 = loyalty.awardPoints(userId, 50, 'order-101', 'Pesanan pertama');
      expect(entry1.pointsDelta).toBe(50);
      expect(entry1.monetaryEquivalentSen).toBe(50);
      expect(entry1.eventType).toBe('earned');
      expect(loyalty.getBalance(userId)).toBe(50);

      // Idempotency check: pesanan sama tidak merekod berganda
      const duplicate = loyalty.awardPoints(userId, 50, 'order-101', 'Pesanan pertama pendua');
      expect(duplicate.id).toBe(entry1.id);
      expect(loyalty.getBalance(userId)).toBe(50);

      // Tambah pesanan kedua
      loyalty.awardPoints(userId, 100, 'order-102');
      expect(loyalty.getBalance(userId)).toBe(150);

      const summary = loyalty.getSummary(userId);
      expect(summary.balancePoints).toBe(150);
      expect(summary.totalEarnedPoints).toBe(150);
      expect(summary.totalRedeemedPoints).toBe(0);
      expect(summary.monetaryValueSen).toBe(150); // RM 1.50
    } finally {
      store.close();
    }
  });

  test('atomically redeems points and blocks overspending', () => {
    const store = new PlatformStore(':memory:');
    try {
      const loyalty = new Loyalty(store);
      const userId = 'user-test-2';

      loyalty.awardPoints(userId, 300);
      expect(loyalty.getBalance(userId)).toBe(300);

      // Penebusan berjaya
      const redeemEntry = loyalty.redeemPoints(userId, 200, 'order-checkout-1');
      expect(redeemEntry.pointsDelta).toBe(-200);
      expect(redeemEntry.monetaryEquivalentSen).toBe(200);
      expect(redeemEntry.eventType).toBe('redeemed');
      expect(loyalty.getBalance(userId)).toBe(100);

      // Penebusan melebihi baki semasa (150 > 100) mesti ditolak
      expect(() => loyalty.redeemPoints(userId, 150, 'order-checkout-2')).toThrow(
        'Baki mata kesetiaan (100) tidak mencukupi untuk penebusan 150 mata'
      );
      expect(loyalty.getBalance(userId)).toBe(100);

      // Summary selepas penebusan
      const summary = loyalty.getSummary(userId);
      expect(summary.balancePoints).toBe(100);
      expect(summary.totalEarnedPoints).toBe(300);
      expect(summary.totalRedeemedPoints).toBe(200);
    } finally {
      store.close();
    }
  });

  test('reverses earned and redeemed points on refund/cancellation', () => {
    const store = new PlatformStore(':memory:');
    try {
      const loyalty = new Loyalty(store);
      const userId = 'user-test-3';

      loyalty.awardPoints(userId, 500); // 500 baki awal

      // Pelanggan tebus 200 mata untuk pesanan order-cancel-1
      loyalty.redeemPoints(userId, 200, 'order-cancel-1');
      expect(loyalty.getBalance(userId)).toBe(300);

      // Pesanan dibatalkan -> mata ditebus dipulangkan
      const reversedEntries = loyalty.reversePointsForOrder(userId, 'order-cancel-1', 'Batal pesanan');
      expect(reversedEntries.length).toBe(1);
      expect(reversedEntries[0].eventType).toBe('reversed');
      expect(reversedEntries[0].pointsDelta).toBe(200);
      expect(loyalty.getBalance(userId)).toBe(500);

      // Idempotency: reverse kali kedua tidak menggandakan pemulangan
      const repeatReversal = loyalty.reversePointsForOrder(userId, 'order-cancel-1', 'Batal lagi');
      expect(loyalty.getBalance(userId)).toBe(500);
    } finally {
      store.close();
    }
  });

  test('FIFO point expiration preserves unexpired points when older expired points were already redeemed', () => {
    const store = new PlatformStore(':memory:');
    try {
      const loyalty = new Loyalty(store);
      const userId = 'user-fifo-test';

      const t0 = '2026-01-01T00:00:00.000Z';
      const t1 = '2026-01-10T00:00:00.000Z';
      const t2 = '2026-01-20T00:00:00.000Z';
      const tExpired = '2026-02-15T00:00:00.000Z'; // Batch 1 luput (31 Jan), Batch 2 sah (31 Mac)

      // Batch 1: Diterima 1 Jan, luput 31 Jan
      store.save('loyalty_ledger', {
        id: 'entry-b1',
        userId,
        pointsDelta: 100,
        monetaryEquivalentSen: 100,
        eventType: 'earned',
        expiryAt: '2026-01-31T00:00:00.000Z',
        description: 'Batch 1',
        createdAt: t0,
      });

      // Pelanggan tebus 100 mata pada 10 Jan (menghabiskan Batch 1 mengikut FIFO)
      store.save('loyalty_ledger', {
        id: 'entry-redeem',
        userId,
        pointsDelta: -100,
        monetaryEquivalentSen: 100,
        eventType: 'redeemed',
        description: 'Tebus Batch 1',
        createdAt: t1,
      });

      // Batch 2: Diterima 20 Jan, luput 31 Mac
      store.save('loyalty_ledger', {
        id: 'entry-b2',
        userId,
        pointsDelta: 100,
        monetaryEquivalentSen: 100,
        eventType: 'earned',
        expiryAt: '2026-03-31T00:00:00.000Z',
        description: 'Batch 2',
        createdAt: t2,
      });

      // Pada 15 Feb: Batch 1 yang telah ditebus tidak memotong baki Batch 2!
      const balanceOnFeb15 = loyalty.getBalance(userId, tExpired);
      expect(balanceOnFeb15).toBe(100);

      const expiredPoints = loyalty.getExpiredPoints(userId, tExpired);
      expect(expiredPoints).toBe(0);

      const summary = loyalty.getSummary(userId, tExpired);
      expect(summary.balancePoints).toBe(100);
      expect(summary.totalExpiredPoints).toBe(0);
    } finally {
      store.close();
    }
  });

  test('explicitly expires unspent points past expiry date using expirePoints', () => {
    const store = new PlatformStore(':memory:');
    try {
      const loyalty = new Loyalty(store);
      const userId = 'user-expire-unspent';

      // 80 mata diperoleh luput pada 2026-01-31
      store.save('loyalty_ledger', {
        id: 'entry-unspent',
        userId,
        pointsDelta: 80,
        monetaryEquivalentSen: 80,
        eventType: 'earned',
        expiryAt: '2026-01-31T00:00:00.000Z',
        description: 'Mata luput',
        createdAt: '2026-01-01T00:00:00.000Z',
      });

      const asOfFeb = '2026-02-15T00:00:00.000Z';
      expect(loyalty.getBalance(userId, asOfFeb)).toBe(0);
      expect(loyalty.getExpiredPoints(userId, asOfFeb)).toBe(80);

      // Jalankan expirePoints untuk menulis rekod lejar luput
      const expiredEntry = loyalty.expirePoints(userId, asOfFeb);
      expect(expiredEntry).not.toBeNull();
      expect(expiredEntry!.pointsDelta).toBe(-80);
      expect(expiredEntry!.eventType).toBe('expired');

      // Selepas ditulis, baki kekal 0 dan getExpiredPoints menjadi 0 (kerana sudah didebitkan)
      expect(loyalty.getBalance(userId, asOfFeb)).toBe(0);
      expect(loyalty.getExpiredPoints(userId, asOfFeb)).toBe(0);

      const summary = loyalty.getSummary(userId, asOfFeb);
      expect(summary.totalExpiredPoints).toBe(80);
    } finally {
      store.close();
    }
  });
});

describe('End-to-End Loyalty Checkout & Commerce Integration', () => {
  test('customer quotes cart with loyalty points discount, submits order atomically debiting ledger', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder', true);
    const customer = await createUser(app, 'customer');

    // 1. Founder wujudkan produk dalam katalog
    const productRes = await apiCall(app, '/catalogue', {
      name: 'Sambal Colek Asli',
      description: 'Sambal botol',
      priceSen: 2000, // RM 20.00
      packSize: 1,
      publish: true,
    }, founder);
    expect(productRes.response.status).toBe(200);
    const productId = productRes.json.data.id;

    // 2. Terima stok inventori
    const receiveRes = await apiCall(app, '/inventory/receive', {
      productId,
      ownerId: 'business',
      locationId: 'hq',
      quantity: 50,
      reason: 'Stok awal',
      status: 'available',
    }, founder);
    expect(receiveRes.response.status).toBe(200);

    // 3. Beri pelanggan 300 mata kesetiaan awal (RM 3.00)
    app.loyalty.awardPoints(customer.userId, 300, undefined, 'Mata pendaftaran');
    expect(app.loyalty.getBalance(customer.userId)).toBe(300);

    // 4. Semak sebut harga (Quote) dengan penebusan 200 mata
    const quoteRes = await apiCall(app, '/quotes', {
      lines: [{ productId, quantity: 2 }], // Subtotal: 4000 sen (RM 40.00)
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: '0123456789 (Ambil di HQ)',
      redeemPoints: 200,
    }, customer);

    expect(quoteRes.response.status).toBe(200);
    expect(quoteRes.json.data.subtotalSen).toBe(4000);
    expect(quoteRes.json.data.redeemPoints).toBe(200);
    expect(quoteRes.json.data.discountSen).toBe(200);
    expect(quoteRes.json.data.totalSen).toBe(3800); // 4000 - 200 = 3800 sen (RM 38.00)
    expect(quoteRes.json.data.estimatedPointsEarned).toBe(38); // RM 38 = 38 mata

    // 5. Cubaan sebut harga dengan poin melebihi baki (cth 500 mata) mesti gagal
    const overQuoteRes = await apiCall(app, '/quotes', {
      lines: [{ productId, quantity: 2 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: '0123456789',
      redeemPoints: 500,
    }, customer);
    expect(overQuoteRes.response.status).toBe(400);
    expect(overQuoteRes.json.code).toBe('INSUFFICIENT_LOYALTY_POINTS');

    // 6. Hantar pesanan checkout dengan penebusan 200 mata
    const orderRes = await apiCall(app, '/orders', {
      lines: [{ productId, quantity: 2 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: '0123456789',
      redeemPoints: 200,
    }, customer);

    expect(orderRes.response.status).toBe(200);
    const order = orderRes.json.data;
    expect(order.amountSen).toBe(3800);
    expect(order.redeemPoints).toBe(200);
    expect(order.loyaltyDiscountSen).toBe(200);

    // Baki mata kesetiaan pelanggan dalam lejar mesti didebitkan serta-merta: 300 - 200 = 100
    expect(app.loyalty.getBalance(customer.userId)).toBe(100);

    const summary = app.loyalty.getSummary(customer.userId);
    expect(summary.balancePoints).toBe(100);
    expect(summary.totalRedeemedPoints).toBe(200);

    // 7. Pengesahan Pembayaran (Payment Verify): Pelanggan memperoleh mata ganjaran (RM 38 = 38 mata)
    const evidence = (await apiCall(app, '/evidence', {
      entityId: order.id,
      name: 'Resit Bayaran Bank',
      mimeType: 'text/plain',
      size: 0,
    }, founder)).json.data;

    const verifyRes = await apiCall(app, `/orders/${order.id}/payment`, {
      expectedRevision: 1,
      action: 'verify',
      amountSen: 3800,
      reference: 'BANK-REF-998811',
      evidenceIds: [evidence.id],
      method: 'bank',
    }, founder);
    expect(verifyRes.response.status).toBe(200);
    expect(verifyRes.json.data.paymentState).toBe('verified');

    // Baki pelanggan bertambah dengan mata ganjaran baru: 100 + 38 = 138 mata
    expect(app.loyalty.getBalance(customer.userId)).toBe(138);

    // 8. Pembatalan/Refund pesanan: Mata ganjaran dilaraskan kembali
    const refundRes = await apiCall(app, `/orders/${order.id}/payment`, {
      expectedRevision: 2,
      action: 'refund',
      amountSen: 3800,
      reference: 'REFUND-REF-001',
      evidenceIds: [evidence.id],
      method: 'bank',
    }, founder);
    expect(refundRes.response.status).toBe(200);

    // Selepas refund penuh:
    // - 38 mata earned ditarik balik (-38)
    // - 200 mata redeemed dipulangkan semula (+200)
    // Baki akhir: 138 - 38 + 200 = 300 mata!
    expect(app.loyalty.getBalance(customer.userId)).toBe(300);
  });

  test('order cancellation restores redeemed points back to customer', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder-cancel', true);
    const customer = await createUser(app, 'customer-cancel');

    const productRes = await apiCall(app, '/catalogue', {
      name: 'Sambal Merah',
      description: 'Sambal botol merah',
      priceSen: 1000,
      packSize: 1,
      publish: true,
    }, founder);
    const productId = productRes.json.data.id;

    await apiCall(app, '/inventory/receive', {
      productId,
      ownerId: 'business',
      locationId: 'hq',
      quantity: 20,
      reason: 'Stok sambal merah',
      status: 'available',
    }, founder);

    // Pelanggan ada 200 mata
    app.loyalty.awardPoints(customer.userId, 200);
    expect(app.loyalty.getBalance(customer.userId)).toBe(200);

    // Hantar pesanan dengan 150 mata ditebus
    const orderRes = await apiCall(app, '/orders', {
      lines: [{ productId, quantity: 2 }], // 2000 sen
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: '01122334455',
      redeemPoints: 150,
    }, customer);
    expect(orderRes.response.status).toBe(200);
    const order = orderRes.json.data;

    // Baki tinggal 50 mata
    expect(app.loyalty.getBalance(customer.userId)).toBe(50);

    // Pelanggan batalkan pesanan
    const cancelRes = await apiCall(app, `/orders/${order.id}/transition`, {
      expectedRevision: 1,
      next: 'cancelled',
    }, customer);
    expect(cancelRes.response.status).toBe(200);

    // Poin 150 dipulangkan semula ke baki pelanggan: 50 + 150 = 200 mata
    expect(app.loyalty.getBalance(customer.userId)).toBe(200);
  });

  test('REST API routes /loyalty/summary and /loyalty/entries work as expected', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'admin-founder', true);
    const customer = await createUser(app, 'regular-customer');

    // Beri poin melalui founder adjustment
    const adjustRes = await apiCall(app, '/loyalty/adjust', {
      userId: customer.userId,
      pointsDelta: 250,
      reason: 'Bonus pelancaran sistem',
    }, founder);
    expect(adjustRes.response.status).toBe(200);
    expect(adjustRes.json.data.pointsDelta).toBe(250);

    // Pelanggan semak baki sendiri melalui /loyalty/summary
    const summaryRes = await apiCall(app, '/loyalty/summary', undefined, customer);
    expect(summaryRes.response.status).toBe(200);
    expect(summaryRes.json.data.balancePoints).toBe(250);
    expect(summaryRes.json.data.monetaryValueSen).toBe(250); // RM 2.50

    // Pelanggan semak senarai entri melalui /loyalty/entries
    const entriesRes = await apiCall(app, '/loyalty/entries', undefined, customer);
    expect(entriesRes.response.status).toBe(200);
    expect(entriesRes.json.data.length).toBe(1);
    expect(entriesRes.json.data[0].eventType).toBe('adjustment');

    // Founder pelarasan negatif (tolak 100 mata)
    const deductRes = await apiCall(app, '/loyalty/adjust', {
      userId: customer.userId,
      pointsDelta: -100,
      reason: 'Penalti penyalahgunaan kod promosi',
    }, founder);
    expect(deductRes.response.status).toBe(200);
    expect(deductRes.json.data.pointsDelta).toBe(-100);
    expect(app.loyalty.getBalance(customer.userId)).toBe(150);

    // Orang awam / customer biasa tidak boleh adjust poin
    const unauthorizedAdjust = await apiCall(app, '/loyalty/adjust', {
      userId: customer.userId,
      pointsDelta: 1000,
      reason: 'Hacking points',
    }, customer);
    expect(unauthorizedAdjust.response.status).toBe(403);
  });

  test('cancellation of paid order with 0 redeemed points claws back earned points', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder-clawback', true);
    const customer = await createUser(app, 'customer-clawback');

    const productRes = await apiCall(app, '/catalogue', {
      name: 'Sambal Colek Padu',
      description: 'Sambal pedas',
      priceSen: 2500, // RM 25.00
      packSize: 1,
      publish: true,
    }, founder);
    const productId = productRes.json.data.id;

    await apiCall(app, '/inventory/receive', {
      productId,
      ownerId: 'business',
      locationId: 'hq',
      quantity: 10,
      reason: 'Stok sambal padu',
      status: 'available',
    }, founder);

    // Pelanggan buat pesanan tanpa tebus mata (0 redeemPoints)
    const orderRes = await apiCall(app, '/orders', {
      lines: [{ productId, quantity: 2 }], // 5000 sen (RM 50.00)
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: '0198877665',
    }, customer);
    expect(orderRes.response.status).toBe(200);
    const order = orderRes.json.data;
    expect(order.subtotalSen).toBe(5000);
    expect(order.loyaltyDiscountSen).toBe(0);
    expect(order.loyaltyPointsEarned).toBe(50);

    // Sahkan pembayaran -> Pelanggan dapat 50 mata
    const evidence = (await apiCall(app, '/evidence', {
      entityId: order.id,
      name: 'Resit Bayaran Bank',
      mimeType: 'text/plain',
      size: 0,
    }, founder)).json.data;

    await apiCall(app, `/orders/${order.id}/payment`, {
      expectedRevision: 1,
      action: 'verify',
      amountSen: 5000,
      reference: 'BANK-CLAWBACK-1',
      evidenceIds: [evidence.id],
      method: 'bank',
    }, founder);
    expect(app.loyalty.getBalance(customer.userId)).toBe(50);

    // Pesanan dibatalkan (order cancelled) -> 50 mata earned ditarik balik
    const cancelRes = await apiCall(app, `/orders/${order.id}/transition`, {
      expectedRevision: 2,
      next: 'cancelled',
    }, founder);
    expect(cancelRes.response.status).toBe(200);

    // Baki mata pelanggan kembali ke 0
    expect(app.loyalty.getBalance(customer.userId)).toBe(0);
    const summary = app.loyalty.getSummary(customer.userId);
    expect(summary.totalReversedPoints).toBe(50);
  });

  test('partial refund does not reverse loyalty points until full refund', async () => {
    const { app } = createHarness();
    const founder = await createUser(app, 'founder-partial', true);
    const customer = await createUser(app, 'customer-partial');

    const productRes = await apiCall(app, '/catalogue', {
      name: 'Sambal Kicap',
      description: 'Sambal kicap',
      priceSen: 2000, // RM 20.00
      packSize: 1,
      publish: true,
    }, founder);
    const productId = productRes.json.data.id;

    await apiCall(app, '/inventory/receive', {
      productId,
      ownerId: 'business',
      locationId: 'hq',
      quantity: 10,
      reason: 'Stok sambal kicap',
      status: 'available',
    }, founder);

    // Beri pelanggan 100 mata awal
    app.loyalty.awardPoints(customer.userId, 100);
    expect(app.loyalty.getBalance(customer.userId)).toBe(100);

    // Buat pesanan dengan tebus 100 mata (RM 1.00 diskaun, bayar RM 39.00)
    const orderRes = await apiCall(app, '/orders', {
      lines: [{ productId, quantity: 2 }], // 4000 sen
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: '0188990011',
      redeemPoints: 100,
    }, customer);
    const order = orderRes.json.data;
    expect(order.amountSen).toBe(3900);
    expect(app.loyalty.getBalance(customer.userId)).toBe(0);

    // Sahkan bayaran RM 39.00 -> dapat 39 mata
    const evidence = (await apiCall(app, '/evidence', {
      entityId: order.id,
      name: 'Resit Bayaran Bank',
      mimeType: 'text/plain',
      size: 0,
    }, founder)).json.data;

    await apiCall(app, `/orders/${order.id}/payment`, {
      expectedRevision: 1,
      action: 'verify',
      amountSen: 3900,
      reference: 'BANK-PARTIAL-1',
      evidenceIds: [evidence.id],
      method: 'bank',
    }, founder);
    expect(app.loyalty.getBalance(customer.userId)).toBe(39);

    // Partial refund RM 10.00 (1000 sen < 3900 sen)
    const partRefundRes = await apiCall(app, `/orders/${order.id}/payment`, {
      expectedRevision: 2,
      action: 'refund',
      amountSen: 1000,
      reference: 'REF-PARTIAL-1000',
      evidenceIds: [evidence.id],
      method: 'bank',
    }, founder);
    expect(partRefundRes.response.status).toBe(200);
    expect(partRefundRes.json.data.paymentState).toBe('part_refunded');

    // Pada refund separa, mata kesetiaan belum dibatalkan
    expect(app.loyalty.getBalance(customer.userId)).toBe(39);

    // Full refund baki RM 29.00 (2900 sen)
    const fullRefundRes = await apiCall(app, `/orders/${order.id}/payment`, {
      expectedRevision: 3,
      action: 'refund',
      amountSen: 2900,
      reference: 'REF-FULL-2900',
      evidenceIds: [evidence.id],
      method: 'bank',
    }, founder);
    expect(fullRefundRes.response.status).toBe(200);
    expect(fullRefundRes.json.data.paymentState).toBe('refunded');

    // Selepas refund penuh: 39 mata earned ditarik balik, 100 mata ditebus dipulangkan
    // Baki akhir: 39 - 39 + 100 = 100 mata!
    expect(app.loyalty.getBalance(customer.userId)).toBe(100);
  });
});
