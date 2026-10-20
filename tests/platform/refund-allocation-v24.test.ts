import { describe, expect, test } from 'bun:test';
import { PlatformStore, DomainError, now } from '../../server/platform/store';
import {
  PaymentReconciler,
  allocateLargestRemainder,
  allocateCumulativeRefundAcrossLines,
  calculateCumulativeReversal,
  type AllocationItem,
} from '../../server/platform/paymentReconciliation';
import type { OrderRecord, PaymentRecord } from '../../shared/platform-contracts';

function createRefundTestHarness() {
  const store = new PlatformStore(':memory:');
  const reconciler = new PaymentReconciler(store, undefined, 'ABANGCOLEK-HQ-MERCHANT');
  return { store, reconciler };
}

function createPaidOrderWithThreeLines(store: PlatformStore, orderId = 'order-three-lines'): OrderRecord {
  // Order of RM 10.00 (1000 sen) with three lines having residual 1-cent
  // Line 1: 333 sen (weight 333)
  // Line 2: 333 sen (weight 333)
  // Line 3: 334 sen (weight 334)
  const order: OrderRecord = {
    id: orderId,
    customerId: 'cust-xyz-999',
    lines: [
      { productId: 'prod-A', name: 'Item A', quantity: 1, priceSen: 333, publishedVersion: 1 },
      { productId: 'prod-B', name: 'Item B', quantity: 1, priceSen: 333, publishedVersion: 1 },
      { productId: 'prod-C', name: 'Item C', quantity: 1, priceSen: 334, publishedVersion: 1 },
    ],
    amountSen: 1000,
    fulfilment: 'delivery',
    contactRef: 'Customer 999, Kuala Lumpur',
    outletId: 'hq',
    fulfilmentStatus: 'dispatched',
    revision: 2,
    paymentState: 'verified',
    paidAmountSen: 1000,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  store.save('orders', order);

  // Original payment record
  const initialPayment: PaymentRecord = {
    id: 'pay-initial-001',
    orderId: order.id,
    amountSen: 1000,
    method: 'bank',
    reference: 'TXN-INITIAL-1000',
    state: 'confirmed',
    confirmedBy: 'provider:webhook',
    createdAt: now(),
  };
  store.save('payments', initialPayment);

  return order;
}

describe('PAY-03 Refund Allocation & Largest Remainder Invariants (v2.4 - Rules Own The Money)', () => {
  describe('Algoritma Largest-Remainder (§5 Execution Contract)', () => {
    test('Agihan tepat jumlah integer sen: jumlah agihan mesti sentiasa bersamaan totalSen', () => {
      const items: AllocationItem[] = [
        { id: 'line-1', weight: 1 },
        { id: 'line-2', weight: 1 },
        { id: 'line-3', weight: 1 },
      ];

      // 100 sen dibahagi 3 item sama berat (33.333 sen setiap satu, residual 1 sen)
      const allocated = allocateLargestRemainder(100, items);

      expect(allocated.length).toBe(3);
      const total = allocated.reduce((sum, item) => sum + item.allocatedSen, 0);
      expect(total).toBe(100);

      // Tie-break menaik berdasarkan ID: line-1 menerima residual 1 sen tambahan
      expect(allocated.find(a => a.id === 'line-1')?.allocatedSen).toBe(34);
      expect(allocated.find(a => a.id === 'line-2')?.allocatedSen).toBe(33);
      expect(allocated.find(a => a.id === 'line-3')?.allocatedSen).toBe(33);
    });

    test('Zero weights dengan total bukan sifar ditolak (ZERO_WEIGHT_NONZERO_TOTAL)', () => {
      const items: AllocationItem[] = [
        { id: 'line-zero-1', weight: 0 },
        { id: 'line-zero-2', weight: 0 },
      ];

      expect(() => allocateLargestRemainder(500, items)).toThrow(RangeError);
    });

    test('Zero totalSen menghasilkan agihan sifar bagi semua item', () => {
      const items: AllocationItem[] = [
        { id: 'line-1', weight: 100 },
        { id: 'line-2', weight: 200 },
      ];

      const allocated = allocateLargestRemainder(0, items);
      expect(allocated.map(a => a.allocatedSen)).toEqual([0, 0]);
    });

    test('Pemberat negatif atau totalSen negatif ditolak serta-merta', () => {
      expect(() => allocateLargestRemainder(-50, [{ id: 'a', weight: 10 }])).toThrow(RangeError);
      expect(() => allocateLargestRemainder(50, [{ id: 'a', weight: -10 }])).toThrow(RangeError);
    });
  });

  describe('Kesetaraan Agihan Separa vs Agihan Tunggal (Partial Partition Equality)', () => {
    test('Tiga refund separa mempunyai jumlah tepat sama seperti satu refund tunggal (0-cent drift)', () => {
      const lines = [
        { productId: 'prod-A', priceSen: 333, quantity: 1 },
        { productId: 'prod-B', priceSen: 333, quantity: 1 },
        { productId: 'prod-C', priceSen: 334, quantity: 1 },
      ];
      const totalSen = 1000;

      // 1. Agihan Sekali Gus (Single full refund 1000 sen)
      const singleRefund = allocateCumulativeRefundAcrossLines(totalSen, 0, lines);
      const singleMap = new Map(singleRefund.map(r => [r.id, r.allocatedSen]));

      expect(singleMap.get('prod-A')).toBe(333);
      expect(singleMap.get('prod-B')).toBe(333);
      expect(singleMap.get('prod-C')).toBe(334);
      expect(singleRefund.reduce((sum, r) => sum + r.allocatedSen, 0)).toBe(1000);

      // 2. Tiga Pembahagian Separa (Partial refunds: 300 sen, 400 sen, 300 sen)
      // Bahagian 1: 300 sen (dari kumulatif 0 ke 300)
      const part1 = allocateCumulativeRefundAcrossLines(300, 0, lines);
      expect(part1.reduce((sum, r) => sum + r.allocatedSen, 0)).toBe(300);

      // Bahagian 2: 400 sen (dari kumulatif 300 ke 700)
      const part2 = allocateCumulativeRefundAcrossLines(400, 300, lines);
      expect(part2.reduce((sum, r) => sum + r.allocatedSen, 0)).toBe(400);

      // Bahagian 3: 300 sen (dari kumulatif 700 ke 1000)
      const part3 = allocateCumulativeRefundAcrossLines(300, 700, lines);
      expect(part3.reduce((sum, r) => sum + r.allocatedSen, 0)).toBe(300);

      // 3. Jumlahkan setiap baris merentas ketiga-tiga pembahagian separa
      const cumulativeSumA =
        part1.find(r => r.id === 'prod-A')!.allocatedSen +
        part2.find(r => r.id === 'prod-A')!.allocatedSen +
        part3.find(r => r.id === 'prod-A')!.allocatedSen;

      const cumulativeSumB =
        part1.find(r => r.id === 'prod-B')!.allocatedSen +
        part2.find(r => r.id === 'prod-B')!.allocatedSen +
        part3.find(r => r.id === 'prod-B')!.allocatedSen;

      const cumulativeSumC =
        part1.find(r => r.id === 'prod-C')!.allocatedSen +
        part2.find(r => r.id === 'prod-C')!.allocatedSen +
        part3.find(r => r.id === 'prod-C')!.allocatedSen;

      // Keputusan separa MESTI 100% sama dengan keputusan sekali gus
      expect(cumulativeSumA).toBe(singleMap.get('prod-A')!);
      expect(cumulativeSumB).toBe(singleMap.get('prod-B')!);
      expect(cumulativeSumC).toBe(singleMap.get('prod-C')!);

      expect(cumulativeSumA + cumulativeSumB + cumulativeSumC).toBe(1000);
    });
  });

  describe('Replay ID & Idempotency', () => {
    test('Replay ID yang sama menghasilkan no-op dan tidak mencipta posting berganda', () => {
      const { store, reconciler } = createRefundTestHarness();
      const order = createPaidOrderWithThreeLines(store);

      // Refund pertama 400 sen
      const res1 = reconciler.processRefund({
        refundId: 'REF-ID-400-A',
        orderId: order.id,
        amountSen: 400,
        reason: 'Barangan tidak memuaskan',
        actorId: 'founder-01',
      });

      expect(res1.isReplay).toBe(false);
      expect(res1.order.refundAmountSen).toBe(400);
      expect(res1.order.paymentState).toBe('part_refunded');

      const paymentsCount1 = store.all('payments').length;
      expect(paymentsCount1).toBe(2); // 1 initial + 1 refund

      // Replay panggil semula dengan refundId sama
      const res2 = reconciler.processRefund({
        refundId: 'REF-ID-400-A',
        orderId: order.id,
        amountSen: 400,
        reason: 'Panggilan semula rangkaian (network retry)',
        actorId: 'founder-01',
      });

      expect(res2.isReplay).toBe(true);
      expect(res2.order.refundAmountSen).toBe(400); // Tidak bertambah ke 800

      const paymentsCount2 = store.all('payments').length;
      expect(paymentsCount2).toBe(2); // Kekal 2, tiada posting kedua tercipta
    });
  });

  describe('Capping & Tiada Drifting Pembundaran pada Reversal Kumulatif', () => {
    test('Reversal kumulatif dihadkan kepada baki boleh bayar asal', () => {
      const { store, reconciler } = createRefundTestHarness();
      const order = createPaidOrderWithThreeLines(store); // paidAmountSen = 1000

      // Refund sebahagian 600 sen
      reconciler.processRefund({
        refundId: 'REF-PART-600',
        orderId: order.id,
        amountSen: 600,
        reason: 'Refund bahagian 1',
        actorId: 'founder-01',
      });

      // Cuba refund 500 sen lagi (600 + 500 = 1100 > 1000 baki asal)
      // Mesti ditolak serta-merta kerana melebihi baki boleh bayar
      expect(() => {
        reconciler.processRefund({
          refundId: 'REF-PART-EXCESS',
          orderId: order.id,
          amountSen: 500,
          reason: 'Refund berlebihan',
          actorId: 'founder-01',
        });
      }).toThrow(DomainError);

      try {
        reconciler.processRefund({
          refundId: 'REF-PART-EXCESS',
          orderId: order.id,
          amountSen: 500,
          reason: 'Refund berlebihan',
          actorId: 'founder-01',
        });
      } catch (e: any) {
        expect(e.code).toBe('REFUND_EXCEEDS_PAID_BALANCE');
      }

      const orderCurrent = store.require<OrderRecord>('orders', order.id);
      expect(orderCurrent.refundAmountSen).toBe(600); // Baki tidak terjejas
    });

    test('Reversal komisen kumulatif bebas drifting pembundaran (0-cent drift over multiple partial callbacks)', () => {
      // Senario: Komisen kadar 10% (1000 bps) ke atas RM 10.00 (1000 sen).
      // Komisen asal = 100 sen.
      // Diberi 3 partial refunds: 333 sen, 333 sen, 334 sen.
      // Jika dibundar berasingan: floor(33.3) + floor(33.3) + floor(33.4) = 33 + 33 + 33 = 99 sen (hilang 1 sen).
      // Dengan pengiraan kumulatif:
      // Callback 1 (333 sen): target = floor(333 * 0.1) = 33 sen. Delta = 33 sen.
      // Callback 2 (666 sen): target = floor(666 * 0.1) = 66 sen. Delta = 66 - 33 = 33 sen.
      // Callback 3 (1000 sen): target = floor(1000 * 0.1) = 100 sen. Delta = 100 - 66 = 34 sen.
      // Jumlah reversal = 33 + 33 + 34 = 100 sen tepat!

      const originalAmountSen = 100; // Komisen asal 100 sen
      const rateBasisPoints = 1000;  // 10%

      // Callback 1
      const rev1 = calculateCumulativeReversal({
        originalAmountSen,
        cumulativeRefundSen: 333,
        rateBasisPoints,
        previouslyReversedSen: 0,
      });
      expect(rev1.targetCumulativeReversalSen).toBe(33);
      expect(rev1.currentReversalDeltaSen).toBe(33);

      // Callback 2
      const rev2 = calculateCumulativeReversal({
        originalAmountSen,
        cumulativeRefundSen: 666,
        rateBasisPoints,
        previouslyReversedSen: 33,
      });
      expect(rev2.targetCumulativeReversalSen).toBe(66);
      expect(rev2.currentReversalDeltaSen).toBe(33);

      // Callback 3
      const rev3 = calculateCumulativeReversal({
        originalAmountSen,
        cumulativeRefundSen: 1000,
        rateBasisPoints,
        previouslyReversedSen: 66,
      });
      expect(rev3.targetCumulativeReversalSen).toBe(100);
      expect(rev3.currentReversalDeltaSen).toBe(34);

      const totalDelta = rev1.currentReversalDeltaSen + rev2.currentReversalDeltaSen + rev3.currentReversalDeltaSen;
      expect(totalDelta).toBe(100); // Tepat 100 sen tanpa drifting
    });
  });

  describe('Integriti Rollback Atomik', () => {
    test('Kegagalan dalam transaksi refund membatalkan semua kesan (Rollback All Domains)', () => {
      const { store, reconciler } = createRefundTestHarness();
      const order = createPaidOrderWithThreeLines(store);

      // Suntik fail dalam store atomic dengan merosakkan operasi sebelum commit
      let attempted = false;
      try {
        store.atomic(() => {
          reconciler.processRefund({
            refundId: 'REF-FAIL-TEST',
            orderId: order.id,
            amountSen: 500,
            reason: 'Ujian kegagalan atomik',
            actorId: 'founder-01',
          });
          attempted = true;
          // Sengaja baling ralat sebelum selesai
          throw new Error('SIMULATED_INTEGRATION_FAILURE');
        });
      } catch (err: any) {
        expect(err.message).toBe('SIMULATED_INTEGRATION_FAILURE');
      }

      expect(attempted).toBe(true);

      // Pastikan pesanan kekal dalam keadaan asal tanpa sebarang perubahan separa
      const orderRollback = store.require<OrderRecord>('orders', order.id);
      expect(orderRollback.refundAmountSen).toBe(0);
      expect(orderRollback.paymentState).toBe('verified');

      // Pastikan rekod refund tidak tersimpan dalam jadual payments
      const payments = store.all<PaymentRecord>('payments');
      expect(payments.length).toBe(1); // Hanya rekod asal
      expect(payments.some(p => p.id === 'REF-FAIL-TEST')).toBe(false);
    });
  });
});
