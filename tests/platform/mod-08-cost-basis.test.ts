import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { PlatformStore } from '../../server/platform/store';
import { readCanonicalCostBasis } from '../../server/platform/costLedger';
import { COGS_NOT_RECORDED, COST_BASIS_UNAVAILABLE } from '../../shared/mod-contracts';
import type { ExpenseRecord, PaymentRecord } from '../../shared/platform-contracts';

/**
 * MOD-08 — asas kos kanonikal.
 *
 * Setiap nilai di sini mesti datang daripada rekod store yang SEBENAR; tiada
 * satu pun angka yang boleh datang daripada pemalar dalam kod.
 */

const STAMP = '2026-10-20T02:00:00.000Z';

function payment(id: string, amountSen: number, state: PaymentRecord['state'] = 'confirmed'): PaymentRecord {
  return {
    id,
    orderId: `order-${id}`,
    amountSen,
    method: 'cash',
    reference: `ref-${id}`,
    state,
    confirmedBy: 'user-1',
    createdAt: STAMP,
  };
}

function expense(id: string, amountSen: number, status: ExpenseRecord['status'] = 'approved'): ExpenseRecord {
  return {
    id,
    outletId: 'hq',
    amountSen,
    category: 'cogs',
    evidenceIds: [],
    status,
    revision: 1,
    ownerId: 'user-1',
    createdAt: STAMP,
  };
}

function hashOf(record: unknown): string {
  return createHash('sha256').update(JSON.stringify(record ?? null)).digest('hex');
}

describe('MOD-08 — asas kos kanonikal daripada state sebenar', () => {
  test('store ber Wiring ⇒ jualan bersih, kos, margin INTEGER SEN dan margin dalam basis points', () => {
    const store = new PlatformStore(':memory:');
    try {
      store.save('payments', payment('pay-1', 100000));
      store.save('expenses', expense('exp-1', 75000));

      const basis = readCanonicalCostBasis(store, { period: 'all' });
      expect(basis.available).toBe(true);
      if (!basis.available) return;
      expect(basis.grossRevenueSen).toBe(100000);
      expect(basis.netSalesSen).toBe(100000);
      expect(basis.costSen).toBe(75000);
      expect(basis.marginSen).toBe(25000);
      // 25000 / 100000 = 25.000% = 2500 basis points (10000 = 100.000%).
      expect(basis.netOperatingMarginBasisPoints).toBe(2500);
      expect(Number.isInteger(basis.netOperatingMarginBasisPoints)).toBe(true);
      // COGS tidak direkod ⇒ null + reason code. TIDAK pernah dianggak.
      expect(basis.cogsSen).toBeNull();
      expect(basis.cogsReasonCode).toBe(COGS_NOT_RECORDED);
      // Sitiran sumber menyokong angka.
      expect(basis.citations.map((citation) => citation.id).sort()).toEqual(['exp-1', 'pay-1']);
    } finally {
      store.close();
    }
  });

  test('NEGATIF wang: margin 24.996% mesti TIDAK dilaporkan sebagai 25%', () => {
    const store = new PlatformStore(':memory:');
    try {
      store.save('payments', payment('pay-1', 100000));
      store.save('expenses', expense('exp-1', 75004));

      const basis = readCanonicalCostBasis(store, { period: 'all' });
      expect(basis.available).toBe(true);
      if (!basis.available) return;
      expect(basis.marginSen).toBe(24996);
      // 24996 * 10000 / 100000 = 2499 (potong, bukan bulat ke atas) ⇒ 24.99%
      expect(basis.netOperatingMarginBasisPoints).toBe(2499);
      expect(basis.netOperatingMarginBasisPoints).not.toBe(2500);
    } finally {
      store.close();
    }
  });

  test('NEGATIF tanpa store ⇒ unavailable dengan detail yang boleh dibaca mesin', () => {
    const basis = readCanonicalCostBasis(null, { period: 'all' });
    expect(basis.available).toBe(false);
    if (basis.available) return;
    expect(basis.reasonCode).toBe(COST_BASIS_UNAVAILABLE);
    expect(basis.detail).toBe('PLATFORM_STORE_NOT_WIRED');
    expect(basis.cogsSen).toBeNull();
  });

  test('NEGATIF tiada kos diluluskan ⇒ NO_APPROVED_COST_RECORDS (bukan margin 0%)', () => {
    const store = new PlatformStore(':memory:');
    try {
      store.save('payments', payment('pay-1', 100000));
      store.save('expenses', expense('exp-1', 75000, 'draft'));

      const basis = readCanonicalCostBasis(store, { period: 'all' });
      expect(basis.available).toBe(false);
      if (basis.available) return;
      expect(basis.reasonCode).toBe(COST_BASIS_UNAVAILABLE);
      expect(basis.detail).toBe('NO_APPROVED_COST_RECORDS');
    } finally {
      store.close();
    }
  });

  test('NEGATIF tiada jualan bersih ⇒ ZERO_REVENUE_BASIS', () => {
    const store = new PlatformStore(':memory:');
    try {
      store.save('payments', payment('pay-1', 100000, 'refunded'));
      store.save('expenses', expense('exp-1', 75000));

      const basis = readCanonicalCostBasis(store, { period: 'all' });
      expect(basis.available).toBe(false);
      if (basis.available) return;
      expect(basis.detail).toBe('ZERO_REVENUE_BASIS');
    } finally {
      store.close();
    }
  });

  test('NEGATIV sumber lejar berubah ⇒ COST_BASIS_SOURCE_CHANGED (fail tertutup, bukan angka lama)', () => {
    const store = new PlatformStore(':memory:');
    try {
      const paid = payment('pay-1', 100000);
      const spent = expense('exp-1', 75000);
      store.save('payments', paid);
      store.save('expenses', spent);
      store.save('reconciliations', {
        id: 'rec-1',
        period: '2026-10',
        paymentRefs: ['pay-1'],
        expenseRefs: ['exp-1'],
        discrepancies: [],
        status: 'approved',
        revision: 1,
        sourceHashes: {
          'payments:pay-1': hashOf(paid),
          'expenses:exp-1': hashOf(spent),
        },
      });

      // Lejar sepadan dengan sumbernya ⇒ asas boleh dikira.
      const matched = readCanonicalCostBasis(store, { period: '2026-10' });
      expect(matched.available).toBe(true);
      if (!matched.available) return;
      expect(matched.reconciliationId).toBe('rec-1');
      expect(matched.netSalesSen).toBe(100000);

      // Sumber berubah selepas lejar ⇒ fail tertutup.
      store.save('payments', { ...paid, amountSen: 999999 });
      const changed = readCanonicalCostBasis(store, { period: '2026-10' });
      expect(changed.available).toBe(false);
      if (changed.available) return;
      expect(changed.detail).toBe('COST_BASIS_SOURCE_CHANGED');
    } finally {
      store.close();
    }
  });
});
