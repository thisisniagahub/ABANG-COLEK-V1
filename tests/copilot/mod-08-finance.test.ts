import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce, type PaymentRecord } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { Work } from '../../server/platform/work';
import { Operations } from '../../server/platform/operations';
import { PaymentReconciler } from '../../server/platform/paymentReconciliation';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import type { DayCloseRecord, OrderRecord, ShiftRecord, InventoryReservation } from '../../shared/platform-contracts';

function makePrincipal(
  id: string,
  role: 'founder' | 'staff' | 'dealer' | 'customer',
  dealerOrgId?: string,
  outletIds = ['hq']
): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role: role === 'dealer' ? 'customer' : role,
        outletIds,
        ...(dealerOrgId ? { dealerOrgId } : {}),
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  };
}

function seedPrincipal(store: PlatformStore, principal: Principal) {
  store.db.query('INSERT OR IGNORE INTO users VALUES (?,?,?,?,?)').run(
    principal.user.id,
    principal.user.email,
    principal.user.name,
    'hash',
    new Date().toISOString()
  );
  for (const m of principal.memberships) {
    store.db.query('INSERT OR IGNORE INTO memberships VALUES (?,?,?,?,?,?,?)').run(
      m.id,
      m.userId,
      m.role,
      JSON.stringify(m.outletIds),
      m.dealerOrgId ?? null,
      m.status,
      m.version
    );
  }
}

function expectDomainError(fn: () => unknown, expectedCode: string) {
  try {
    fn();
    expect.unreachable(`Expected function to throw DomainError with code ${expectedCode}`);
  } catch (err: any) {
    expect(err.code).toBe(expectedCode);
  }
}

describe('MOD-08: Finance & Day-Close Copilot Integration Suite', () => {
  function setupFinance() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const work = new Work(store, auth, commerce);
    const operations = new Operations(store, auth, commerce, work);
    const reconciler = new PaymentReconciler(store, loyalty, 'ABANGCOLEK-HQ-MERCHANT');
    const domainRegistry = new DomainToolRegistry();

    const founder = makePrincipal('founder-01', 'founder');
    const staff = makePrincipal('staff-01', 'staff', undefined, ['hq']);
    const otherStaff = makePrincipal('staff-02', 'staff', undefined, ['outlet-b']);
    const customer = makePrincipal('cust-01', 'customer');

    // Seed into SQLite for membership verification queries
    seedPrincipal(store, founder);
    seedPrincipal(store, staff);
    seedPrincipal(store, otherStaff);
    seedPrincipal(store, customer);

    // Register test outlet
    store.save('locations', {
      id: 'hq',
      name: 'Pusat Operasi Utama HQ',
      address: 'Kuala Lumpur',
      hours: '08:00 - 22:00',
      verifiedAt: new Date().toISOString(),
    });

    return {
      store,
      auth,
      loyalty,
      commerce,
      work,
      operations,
      reconciler,
      domainRegistry,
      founder,
      staff,
      otherStaff,
      customer,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Day-Close & Payment Reconciliation)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Penyata Tutup Hari (Day-Close) & Penyelarasan Lejar Tunai', () => {
    test('Founder berjaya mencipta, menyemak dan meluluskan Day-Close dengan kiraan tunai seimbang', () => {
      const { store, operations, founder, staff } = setupFinance();
      const testDate = '2026-10-20';

      // 1. Sediakan pesanan dan bayaran tunai sah di HQ pada tarikh ujian
      const orderId = 'ord-cash-01';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 5000,
        paidAmountSen: 5000,
        paymentState: 'verified',
        fulfilmentStatus: 'received',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: `${testDate}T10:00:00.000Z`,
        updatedAt: `${testDate}T10:00:00.000Z`,
      });

      const paymentId = 'pay-cash-01';
      store.save<PaymentRecord>('payments', {
        id: paymentId,
        orderId,
        amountSen: 5000,
        method: 'cash',
        reference: 'CASH-REC-001',
        state: 'confirmed',
        confirmedBy: staff.user.id,
        createdAt: `${testDate}T10:00:00.000Z`,
      });

      // 2. Staff/Founder membuka rekod Day-Close dengan kiraan tunai fizikal 5000 sen (RM 50.00)
      const dayClose = operations.createDayClose(staff, {
        outletId: 'hq',
        date: testDate,
        countCashSen: 5000,
      });

      expect(dayClose.id).toBeDefined();
      expect(dayClose.expectedCashSen).toBe(5000);
      expect(dayClose.countCashSen).toBe(5000);
      expect(dayClose.discrepancySen).toBe(0);
      expect(dayClose.status).toBe('review');
      expect(dayClose.paymentRefs).toContain(paymentId);

      // 3. Founder meluluskan Day-Close
      const approved = operations.approveDayClose(founder, dayClose.id, {
        expectedRevision: 1,
        reason: 'Penyata tunai sepadan tepat dengan kutipan harian fizikal',
      });

      expect(approved.status).toBe('approved');
      expect(approved.revision).toBe(2);
      expect(approved.reason).toBe('Penyata tunai sepadan tepat dengan kutipan harian fizikal');
    });

    test('Alatan get_payment_ledger_summary mengesahkan integriti integer sen tanpa drift', async () => {
      const { domainRegistry, founder } = setupFinance();
      const ctx: ToolContext = { actor: founder };

      const res = await domainRegistry.executeTool('get_payment_ledger_summary', ctx, {
        date: '2026-10-20',
      });

      expect(res.ok).toBe(true);
      expect(res.data.currency).toBe('MYR');
      expect(res.data.integerSenVerified).toBe(true);
      expect(Number.isInteger(res.data.totalGrossSen)).toBe(true);
      expect(Number.isInteger(res.data.settledSen)).toBe(true);
      expect(Number.isInteger(res.data.pendingSen)).toBe(true);
      expect(res.data.settledSen + res.data.pendingSen).toBeLessThanOrEqual(res.data.totalGrossSen);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Cash Float Variance Reporting & Strict Reason Requirement
  // --------------------------------------------------------------------------
  describe('Dimension 2: Pelaporan Varians Apungan Tunai (Cash Float) & Syarat Sebab Wajib', () => {
    test('Varians apungan tunai direkodkan secara jelas dan memerlukan alasan bukan kosong untuk diluluskan', () => {
      const { store, operations, founder, staff } = setupFinance();
      const testDate = '2026-10-21';

      // Pesanan tunai RM 35.00 (3500 sen)
      const orderId = 'ord-cash-variance';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 3500,
        paidAmountSen: 3500,
        paymentState: 'verified',
        fulfilmentStatus: 'received',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: `${testDate}T12:00:00.000Z`,
        updatedAt: `${testDate}T12:00:00.000Z`,
      });

      store.save<PaymentRecord>('payments', {
        id: 'pay-cash-var-1',
        orderId,
        amountSen: 3500,
        method: 'cash',
        reference: 'CASH-REC-VAR',
        state: 'confirmed',
        confirmedBy: staff.user.id,
        createdAt: `${testDate}T12:00:00.000Z`,
      });

      // Kakitangan mengira RM 50.00 tunai (5000 sen), menghasilkan varians lebihan +RM 15.00 (+1500 sen)
      const dayClose = operations.createDayClose(staff, {
        outletId: 'hq',
        date: testDate,
        countCashSen: 5000,
      });

      expect(dayClose.expectedCashSen).toBe(3500);
      expect(dayClose.countCashSen).toBe(5000);
      expect(dayClose.discrepancySen).toBe(1500); // Varians RM 15.00

      // Percubaan meluluskan Day-Close yang mempunyai varians TANPA alasan ditolak
      expectDomainError(() => {
        operations.approveDayClose(founder, dayClose.id, {
          expectedRevision: 1,
          reason: '', // Alasan kosong!
        });
      }, 'DISCREPANCY_REASON_REQUIRED');

      // Percubaan meluluskan dengan alasan whitespace sahaja juga ditolak
      expectDomainError(() => {
        operations.approveDayClose(founder, dayClose.id, {
          expectedRevision: 1,
          reason: '   ',
        });
      }, 'DISCREPANCY_REASON_REQUIRED');

      // Meluluskan dengan alasan yang sah merekodkan audit varians dengan telus (tiada auto-balancing)
      const approved = operations.approveDayClose(founder, dayClose.id, {
        expectedRevision: 1,
        reason: 'Lebihan RM15 dikenal pasti daripada tip pelanggan tunai yang tidak diasingkan',
      });

      expect(approved.status).toBe('approved');
      expect(approved.discrepancySen).toBe(1500);
      expect(approved.reason).toContain('Lebihan RM15');
    });

    test('Aliran syif fizikal (createShift -> handoff -> acknowledgeShift) mengesan kiraan apungan tunai', () => {
      const { operations, founder, staff } = setupFinance();

      // Buka syif dengan apungan tunai RM 100.00 (10,000 sen)
      const shift = operations.createShift(staff, {
        outletId: 'hq',
        staffIds: [staff.user.id],
        openingCount: 10000,
      });

      expect(shift.status).toBe('open');
      expect(shift.openingCount).toBe(10000);

      // Handoff syif dengan kiraan akhir RM 250.00 (25,000 sen)
      const handedOff = operations.handoff(staff, shift.id, {
        expectedRevision: 1,
        closingCount: 25000,
        handoffNote: 'Selesai syif pagi; baki apungan tunai dan kutipan diserahkan',
      });

      expect(handedOff.status).toBe('handoff');
      expect(handedOff.closingCount).toBe(25000);

      // Pengesahan penutupan syif oleh founder
      const closed = operations.acknowledgeShift(founder, shift.id, {
        expectedRevision: 2,
      });

      expect(closed.status).toBe('closed');
      expect(closed.acknowledgedBy).toBe(founder.user.id);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Billplz Webhook Payment Reconciliation & Deduplication
  // --------------------------------------------------------------------------
  describe('Dimension 3: Penyelarasan Webhook Pembayaran Billplz & Deduplikasi Idempotent', () => {
    test('Webhook Billplz mengesahkan pembayaran pesanan dan mengabaikan panggilan pendua (idempotency)', () => {
      const { store, reconciler } = setupFinance();

      const orderId = 'ord-billplz-01';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 4500,
        paidAmountSen: 0,
        paymentState: 'pending',
        fulfilmentStatus: 'requested',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Live inventory reservation so order is active and not considered dead/cancelled
      store.save<InventoryReservation>('reservations', {
        id: 'res-bp-01',
        orderId,
        productId: 'product-01',
        ownerId: 'business',
        locationId: 'hq',
        revision: 1,
        quantity: 3,
        status: 'active',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });

      const payload = {
        transactionId: 'TX-BILLPLZ-99001',
        orderId,
        amountSen: 4500,
        currency: 'MYR',
        merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
        status: 'paid' as const,
        provider: 'billplz',
      };

      // 1. Panggilan pertama: Verifikasi berjaya
      const res1 = reconciler.processProviderCallback(payload);
      expect(res1.outcome).toBe('verified');
      expect(res1.isDuplicate).toBe(false);
      expect(res1.receiptId).toBe('TX-BILLPLZ-99001');

      const updatedOrder = store.require<OrderRecord>('orders', orderId);
      expect(updatedOrder.paidAmountSen).toBe(4500);
      expect(updatedOrder.paymentState).toBe('verified');

      // 2. Panggilan kedua dengan transactionId sama: Deduplikasi automatik (duplicate_ignored)
      const res2 = reconciler.processProviderCallback(payload);
      expect(res2.outcome).toBe('duplicate_ignored');
      expect(res2.isDuplicate).toBe(true);
      expect(res2.receiptId).toBe('TX-BILLPLZ-99001');

      // Lejar bayaran tidak menduplikasi rekod bayaran
      const payments = store.all<PaymentRecord>('payments').filter((p) => p.orderId === orderId);
      expect(payments.length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: Role-Based Authorization — Founder-Only Financial Actions
  // --------------------------------------------------------------------------
  describe('Dimension 4: Pengasingan Kuasa Kewangan & Penolakan Bukan-Founder', () => {
    test('Bukan-Founder (staff dan pelanggan) dilarang meluluskan Day-Close atau Rekonsiliasi Kewangan', () => {
      const { operations, staff, customer } = setupFinance();
      const testDate = '2026-10-22';

      const dayClose = operations.createDayClose(staff, {
        outletId: 'hq',
        date: testDate,
        countCashSen: 0,
      });

      // Staff cuba meluluskan Day-Close -> Ditolak (FORBIDDEN 403)
      expectDomainError(() => {
        operations.approveDayClose(staff, dayClose.id, {
          expectedRevision: 1,
          reason: 'Staff meluluskan sendiri',
        });
      }, 'FORBIDDEN');

      // Pelanggan cuba meluluskan Day-Close -> Ditolak (FORBIDDEN 403)
      expectDomainError(() => {
        operations.approveDayClose(customer, dayClose.id, {
          expectedRevision: 1,
          reason: 'Customer meluluskan',
        });
      }, 'FORBIDDEN');

      // Staff cuba mencipta rekonsiliasi lejar -> Ditolak (FORBIDDEN 403)
      expectDomainError(() => {
        operations.reconcile(staff, {
          period: '2026-10',
          paymentRefs: [],
          expenseRefs: [],
        });
      }, 'FORBIDDEN');
    });

    test('Alatan verify_contra_reversal menyekat capaian bukan founder', async () => {
      const { domainRegistry, staff, customer } = setupFinance();

      // Staff memanggil alatan verify_contra_reversal
      expect(
        domainRegistry.executeTool('verify_contra_reversal', { actor: staff }, { disputeId: 'disp-01' })
      ).rejects.toThrow(/Akses ditolak: Peranan 'staff' tidak dibenarkan/);

      // Pelanggan memanggil alatan get_payment_ledger_summary
      expect(
        domainRegistry.executeTool('get_payment_ledger_summary', { actor: customer }, {})
      ).rejects.toThrow(/Akses ditolak: Peranan 'customer' tidak dibenarkan/);
    });

    test('Kakitangan dari outlet lain dilarang memanipulasi Day-Close outlet bukan miliknya', () => {
      const { operations, otherStaff } = setupFinance();

      // Staff outlet-b cuba mencipta Day-Close untuk outlet hq
      expectDomainError(() => {
        operations.createDayClose(otherStaff, {
          outletId: 'hq',
          date: '2026-10-23',
          countCashSen: 1000,
        });
      }, 'FORBIDDEN');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Webhook Mismatch Rejection & Malformed Data Handling
  // --------------------------------------------------------------------------
  describe('Dimension 5: Penolakan Data Webhook Pincang & Ketidakpadanan Lejar', () => {
    test('Menolak callback pembayaran dengan mata wang selain MYR', () => {
      const { store, reconciler } = setupFinance();

      const orderId = 'ord-curr-mismatch';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 2000,
        paidAmountSen: 0,
        paymentState: 'pending',
        fulfilmentStatus: 'requested',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expectDomainError(() => {
        reconciler.processProviderCallback({
          transactionId: 'TX-CURR-FAIL',
          orderId,
          amountSen: 2000,
          currency: 'USD', // Mata wang haram!
          merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
          status: 'paid',
        });
      }, 'PAYMENT_CURRENCY_MISMATCH');
    });

    test('Menolak callback pembayaran dengan akaun peniaga tidak sepadan', () => {
      const { store, reconciler } = setupFinance();

      const orderId = 'ord-acct-mismatch';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 3000,
        paidAmountSen: 0,
        paymentState: 'pending',
        fulfilmentStatus: 'requested',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expectDomainError(() => {
        reconciler.processProviderCallback({
          transactionId: 'TX-ACCT-FAIL',
          orderId,
          amountSen: 3000,
          currency: 'MYR',
          merchantAccount: 'ROGUE-MERCHANT-ACCOUNT', // Akaun salah!
          status: 'paid',
        });
      }, 'PAYMENT_ACCOUNT_MISMATCH');
    });

    test('Menolak callback pembayaran dengan jumlah amaun sen tidak sepadan pesanan', () => {
      const { store, reconciler } = setupFinance();

      const orderId = 'ord-amt-mismatch';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 5000, // Dijangka 5000 sen
        paidAmountSen: 0,
        paymentState: 'pending',
        fulfilmentStatus: 'requested',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expectDomainError(() => {
        reconciler.processProviderCallback({
          transactionId: 'TX-AMT-FAIL',
          orderId,
          amountSen: 3500, // Bayar 3500 sen sahaja!
          currency: 'MYR',
          merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
          status: 'paid',
        });
      }, 'PAYMENT_AMOUNT_MISMATCH');
    });

    test('Format tarikh Day-Close yang tidak mematuhi YYYY-MM-DD ditolak', () => {
      const { operations, staff } = setupFinance();

      // Format bukan YYYY-MM-DD
      expectDomainError(() => {
        operations.createDayClose(staff, {
          outletId: 'hq',
          date: '20-10-2026',
          countCashSen: 1000,
        });
      }, 'INVALID_DATE');

      // Tarikh mustahil 99-99
      expectDomainError(() => {
        operations.createDayClose(staff, {
          outletId: 'hq',
          date: '2026-99-99',
          countCashSen: 1000,
        });
      }, 'INVALID_DATE');

      // Melebihi panjang medan teks
      expectDomainError(() => {
        operations.createDayClose(staff, {
          outletId: 'hq',
          date: 'tarikh_terlampau_panjang',
          countCashSen: 1000,
        });
      }, 'INVALID_INPUT');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Late Payment & Payment Conflict Exception Review (No Auto-Resurrection)
  // --------------------------------------------------------------------------
  describe('Dimension 6: Pengendalian Bayaran Lewat & Konflik Bertindih Tanpa Menghidupkan Stok', () => {
    test('Bayaran tiba selepas pesanan dibatalkan ditahan di bawah payment_exception_review tanpa memulihkan stok', () => {
      const { store, reconciler } = setupFinance();

      const orderId = 'ord-cancelled-late';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 6000,
        paidAmountSen: 0,
        paymentState: 'pending',
        fulfilmentStatus: 'cancelled', // Dibatalkan!
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Tempahan stok telah dilepaskan
      store.save<InventoryReservation>('reservations', {
        id: 'res-dead-01',
        orderId,
        productId: 'product-01',
        ownerId: 'business',
        locationId: 'hq',
        revision: 1,
        quantity: 2,
        status: 'released',
        expiresAt: new Date(Date.now() - 3600_000).toISOString(),
      });

      const res = reconciler.processProviderCallback({
        transactionId: 'TX-LATE-991',
        orderId,
        amountSen: 6000,
        currency: 'MYR',
        merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
        status: 'paid',
      });

      // Fakta kewangan direkodkan, tetapi status di bawah review manusia
      expect(res.outcome).toBe('payment_exception_review');
      expect(res.exception).toBeDefined();
      expect(res.exception!.reason).toBe('LATE_PAYMENT_AFTER_CANCELLATION');

      // Rekod pesanan mengekalkan fulfilmentStatus cancelled (tidak dihidupkan semula secara automatik)
      const afterOrder = store.require<OrderRecord>('orders', orderId);
      expect(afterOrder.fulfilmentStatus).toBe('cancelled');
      expect(afterOrder.paidAmountSen).toBe(6000);
    });

    test('Percubaan bayaran bertindih bagi pesanan yang telah lunas ditahan di bawah PAYMENT_CONFLICT_HELD', () => {
      const { store, reconciler } = setupFinance();

      const orderId = 'ord-conflict-paid';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 3000,
        paidAmountSen: 3000,
        paymentState: 'verified', // Telah disahkan bayar!
        fulfilmentStatus: 'packing',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = reconciler.processProviderCallback({
        transactionId: 'TX-SECOND-ATTEMPT-DIFF-ID',
        orderId,
        amountSen: 3000,
        currency: 'MYR',
        merchantAccount: 'ABANGCOLEK-HQ-MERCHANT',
        status: 'paid',
      });

      expect(res.outcome).toBe('payment_exception_review');
      expect(res.exception).toBeDefined();
      expect(res.exception!.reason).toBe('PAYMENT_CONFLICT_HELD');
    });

    test('Jika rekod kutipan tunai berubah selepas Day-Close dicipta, kelulusan ditolak dengan DAY_CLOSE_SOURCE_CHANGED', () => {
      const { store, operations, founder, staff } = setupFinance();
      const testDate = '2026-10-24';

      const orderId = 'ord-source-changed';
      store.save<OrderRecord>('orders', {
        id: orderId,
        customerId: 'cust-01',
        outletId: 'hq',
        amountSen: 2000,
        paidAmountSen: 2000,
        paymentState: 'verified',
        fulfilmentStatus: 'received',
        fulfilment: 'pickup',
        contactRef: 'fixture-customer-contact',
        refundAmountSen: 0,
        lines: [],
        revision: 1,
        createdAt: `${testDate}T09:00:00.000Z`,
        updatedAt: `${testDate}T09:00:00.000Z`,
      });

      store.save<PaymentRecord>('payments', {
        id: 'pay-sc-1',
        orderId,
        amountSen: 2000,
        method: 'cash',
        reference: 'CASH-SC-1',
        state: 'confirmed',
        confirmedBy: staff.user.id,
        createdAt: `${testDate}T09:00:00.000Z`,
      });

      const dayClose = operations.createDayClose(staff, {
        outletId: 'hq',
        date: testDate,
        countCashSen: 2000,
      });

      // Transaksi tunai baharu diselitkan sebelum founder sempat approve
      store.save<PaymentRecord>('payments', {
        id: 'pay-sc-2-late',
        orderId,
        amountSen: 1500,
        method: 'cash',
        reference: 'CASH-SC-2',
        state: 'confirmed',
        confirmedBy: staff.user.id,
        createdAt: `${testDate}T11:00:00.000Z`,
      });

      // Approve mesti gagal kerana sumber lejar telah berubah
      expectDomainError(() => {
        operations.approveDayClose(founder, dayClose.id, {
          expectedRevision: 1,
          reason: 'Luluskan sebelum semak rekod baharu',
        });
      }, 'DAY_CLOSE_SOURCE_CHANGED');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Tool Execution Budget Enforcement (Max 6 Dispatches)
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Alatan Kewangan Copilot', () => {
    test('Panggilan alatan kewangan disekat tepat pada panggilan ke-7 (TOOL_BUDGET_EXCEEDED)', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'founder-budget-01',
        role: 'founder',
        runId: 'run-finance-budget-01',
        dispatchesCount: 0,
        maxDispatches: 6,
      };

      for (let i = 0; i < 6; i++) {
        const res = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res.ok).toBe(true);
      }
      expect(ctx.dispatchesCount).toBe(6);

      const blocked = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.code).toBe('TOOL_BUDGET_EXCEEDED');
      }
      expect(ctx.dispatchesCount).toBe(6);
    });
  });
});
