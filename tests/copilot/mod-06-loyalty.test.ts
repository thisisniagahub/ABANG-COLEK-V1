import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty, LOYALTY_POINT_VALUE_SEN, calculateLoyaltyPointsEarned, loyaltyPointsToDiscountSen } from '../../server/platform/loyalty';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import type { StockLot } from '../../shared/platform-contracts';

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

function expectDomainError(fn: () => unknown, expectedCode: string) {
  try {
    fn();
    expect.unreachable(`Expected function to throw DomainError with code ${expectedCode}`);
  } catch (err: any) {
    expect(err.code).toBe(expectedCode);
  }
}

describe('MOD-06: Loyalty & Referral Copilot Integration Suite', () => {
  function setupLoyalty() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const domainRegistry = new DomainToolRegistry();
    const toolRegistry = new ToolRegistry(6);

    const founder = makePrincipal('founder-01', 'founder');
    const customer = makePrincipal('cust-loyalty-01', 'customer');
    const dealerUser = makePrincipal('dealer-user-01', 'dealer', 'ORG-DEALER-99');

    // Seed product and stock lot
    const product = commerce.saveProduct(founder, {
      name: 'Sambal Colek Berapi',
      description: 'Sambal cili padi',
      priceSen: 1500,
      packSize: 1,
      publish: true,
    });

    const lot: StockLot = {
      id: 'lot-loyalty-01',
      productId: product.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 100,
      status: 'available',
      revision: 1,
      batchId: 'BATCH-LOYALTY-01',
      expiryAt: new Date(Date.now() + 180 * 24 * 3600_000).toISOString(),
    };
    store.save('lots', lot);

    return {
      store,
      auth,
      loyalty,
      commerce,
      domainRegistry,
      toolRegistry,
      founder,
      customer,
      dealerUser,
      product,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Exact Integer Formula 1 pt = 5 sen)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Formula Integer Tepat (1 pt = 5 sen) & Status Kesetiaan', () => {
    test('Alatan calculate_points_balance menukar mata kepada nilai ringgit sen integer tepat', async () => {
      // WHY CHANGED: the old assertion hardcoded "1 mata = 5 sen". The
      // canonical contract is shared/growth-contracts.ts:65-77 — 1 mata
      // diperoleh bagi RM 1.00 (LOYALTY_EARN_RATE_SEN_PER_POINT = 100) dan
      // 1 mata = 1 sen ditebus (LOYALTY_POINT_VALUE_SEN = 1). The test now
      // asserts the conversion against the CANONICAL constant and the
      // canonical helper, so it proves the tool COMPUTES from the contract
      // instead of returning a hardcoded literal.
      const { domainRegistry, loyalty, customer } = setupLoyalty();
      const ctx: ToolContext = { actor: customer };

      // 10 mata
      const res10 = await domainRegistry.executeTool('calculate_points_balance', ctx, { points: 10 });
      expect(res10.ok).toBe(true);
      expect(res10.data.points).toBe(10);
      expect(res10.data.valueSen).toBe(10 * LOYALTY_POINT_VALUE_SEN);
      expect(res10.data.valueSen).toBe(loyaltyPointsToDiscountSen(10));
      expect(res10.data.isSenInteger).toBe(true);
      expect(Number.isInteger(res10.data.valueSen)).toBe(true);

      // 100 mata
      const res100 = await domainRegistry.executeTool('calculate_points_balance', ctx, { points: 100 });
      expect(res100.ok).toBe(true);
      expect(res100.data.points).toBe(100);
      expect(res100.data.valueSen).toBe(100 * LOYALTY_POINT_VALUE_SEN);
      expect(res100.data.valueSen).toBe(loyaltyPointsToDiscountSen(100));
      expect(res100.data.isSenInteger).toBe(true);

      // Pengesahan formula integer tepat: nilai sentiasa titik * konstanta kontrak
      expect(res100.data.valueSen).toBe(res100.data.points * LOYALTY_POINT_VALUE_SEN);
      expect(Number.isInteger(res100.data.valueSen)).toBe(true);

      // Baki lejar SEBENAR mesti agrees dengan penukaran alatan
      loyalty.awardPoints(customer.user.id, 137, undefined, 'Ganjaran sebenar');
      const balance = loyalty.getBalance(customer.user.id);
      expect(balance).toBe(137);
      const resReal = await domainRegistry.executeTool('calculate_points_balance', ctx, {
        points: balance,
      });
      expect(resReal.data.points).toBe(137);
      expect(resReal.data.valueSen).toBe(loyalty.pointsToDiscountSen(balance));
      expect(resReal.data.valueSen).toBe(137 * LOYALTY_POINT_VALUE_SEN);
    });

    test('Pengiraan mata terakru mengikut perbelanjaan (RM 1.00 = 1 mata)', () => {
      // Perbelanjaan RM 15.00 (1500 sen)
      const points = calculateLoyaltyPointsEarned(1500);
      expect(points).toBe(15);

      // Perbelanjaan kurang RM 1.00 (cth: 80 sen) menghasilkan 0 mata
      const pointsUnderRm1 = calculateLoyaltyPointsEarned(80);
      expect(pointsUnderRm1).toBe(0);
    });

    test('Alatan get_loyalty_tier_status memulangkan taraf kesetiaan dan nilai penebusan', async () => {
      // WHY CHANGED: the old assertion expected a hardcoded tier 'Emas' with
      // 420 points while the tool was called with NO loyalty service and NO
      // store — the v1.1 tool (server/platform/domainTools.ts:1184) reads the
      // REAL loyalty ledger, so a real ledger is seeded and the computed
      // tier/balance/redemption value are asserted against it. A sibling
      // assertion proves the tool REFUSES to invent a tier when no ledger is
      // reachable.
      const { domainRegistry, loyalty, store, customer } = setupLoyalty();

      loyalty.awardPoints(customer.user.id, 420, undefined, 'Ganjaran pendaftaran');

      const ctx: ToolContext = { actor: customer, store, loyalty };
      const res = await domainRegistry.executeTool('get_loyalty_tier_status', ctx, {
        customerId: customer.user.id,
      });
      expect(res.ok).toBe(true);
      expect(res.data.observation).toBe('observed');
      expect(res.data.customerId).toBe(customer.user.id);
      expect(res.data.pointsBalance).toBe(420);
      expect(res.data.tier).toBe('Emas');
      expect(res.data.redemptionValueSen).toBe(loyaltyPointsToDiscountSen(420));
      expect(res.data.redemptionValueSen).toBe(420 * LOYALTY_POINT_VALUE_SEN);
      expect(res.data.totalEarnedPoints).toBe(420);
      expect(res.data.totalRedeemedPoints).toBe(0);
      expect(res.data.entriesCount).toBe(1);
      expect(Number.isInteger(res.data.pointsBalance)).toBe(true);
      expect(Number.isInteger(res.data.redemptionValueSen)).toBe(true);

      // Tanpa lejar boleh dicapai: alatan TIDAK memalsukan taraf kesetiaan
      const unavailableCtx: ToolContext = { actor: customer };
      const unavailable = await domainRegistry.executeTool(
        'get_loyalty_tier_status',
        unavailableCtx,
        { customerId: customer.user.id }
      );
      expect(unavailable.ok).toBe(true);
      expect(unavailable.data.tier).toBeNull();
      expect(unavailable.data.pointsBalance).toBeNull();
      expect(unavailable.data.redemptionValueSen).toBeNull();
      expect(unavailable.data.observation).toBe('unavailable');
      expect(unavailable.data.reasonCode).toBe('PLATFORM_STORE_NOT_WIRED');
      expect(unavailable.data.recordReasonCode).toBe('PLATFORM_STORE_NOT_WIRED');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Atomic Point Redemption (store.atomic) & Balance Maintenance
  // --------------------------------------------------------------------------
  describe('Dimension 2: Penebusan Mata Atomik & Integriti Baki', () => {
    test('Penebusan mata berjaya mengurangkan baki dan mencipta entri debit negatif sepadan', () => {
      const { loyalty, customer } = setupLoyalty();

      // 1. Berikan 500 mata kepada pelanggan
      loyalty.awardPoints(customer.user.id, 500, undefined, 'Ganjaran pendaftaran');
      expect(loyalty.getBalance(customer.user.id)).toBe(500);

      // 2. Tebus 200 mata
      const entry = loyalty.redeemPoints(customer.user.id, 200, 'ord-red-01', 'Penebusan diskaun');
      expect(entry.pointsDelta).toBe(-200);
      expect(entry.monetaryEquivalentSen).toBe(loyalty.pointsToDiscountSen(200));
      expect(Number.isInteger(entry.monetaryEquivalentSen)).toBe(true);
      expect(entry.eventType).toBe('redeemed');

      // 3. Baki akhir mestilah 300 mata
      expect(loyalty.getBalance(customer.user.id)).toBe(300);
    });

    test('Cubaan menebus lebih mata daripada baki sedia ada dilontar INSUFFICIENT_LOYALTY_POINTS secara atomik', () => {
      const { loyalty, customer } = setupLoyalty();

      loyalty.awardPoints(customer.user.id, 100, undefined, 'Kredit awal');
      expect(loyalty.getBalance(customer.user.id)).toBe(100);

      // Cuba tebus 150 mata apabila baki hanya 100
      expectDomainError(() => {
        loyalty.redeemPoints(customer.user.id, 150, 'ord-red-fail');
      }, 'INSUFFICIENT_LOYALTY_POINTS');

      // Baki akaun kekal 100 tanpa sebarang mutasi separuh jalan
      expect(loyalty.getBalance(customer.user.id)).toBe(100);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: REF-02 Self-Referral Rejection
  // --------------------------------------------------------------------------
  describe('Dimension 3: Penolakan Rujukan Diri REF-02 (Self-Referral Rejection)', () => {
    test('Ejen membuat pesanan menggunakan kod rujukan organisasinya sendiri ditolak secara mutlak', () => {
      const { commerce, dealerUser, product } = setupLoyalty();

      // Ejen berada dalam organisasi 'ORG-DEALER-99' dan cuba masukkan referralCode 'ORG-DEALER-99'
      expectDomainError(() => {
        commerce.submitOrder(
          dealerUser,
          {
            lines: [{ productId: product.id, quantity: 1 }],
            catalogueVersion: commerce.version(),
            fulfilment: 'delivery',
            contactRef: 'Self dealer buyer, PJ',
            referralCode: 'ORG-DEALER-99',
          },
          'idem-self-ref-1'
        );
      }, 'SELF_REFERRAL_DISALLOWED');

      // Semakan case-insensitive ('org-dealer-99' vs 'ORG-DEALER-99')
      expectDomainError(() => {
        commerce.submitOrder(
          dealerUser,
          {
            lines: [{ productId: product.id, quantity: 1 }],
            catalogueVersion: commerce.version(),
            fulfilment: 'delivery',
            contactRef: 'Self dealer buyer, PJ',
            referralCode: 'org-dealer-99',
          },
          'idem-self-ref-2'
        );
      }, 'SELF_REFERRAL_DISALLOWED');
    });

    test('Pelanggan menggunakan kod rujukan ejen berlainan diterima dengan ganjaran sah', () => {
      const { commerce, customer, product } = setupLoyalty();

      const order = commerce.submitOrder(
        customer,
        {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Customer regular, Shah Alam',
          referralCode: 'ORG-DEALER-99', // Ejen berlainan
        },
        'idem-valid-ref-1'
      );

      expect(order).toBeDefined();
      expect(order.referralCode).toBe('ORG-DEALER-99');
      expect(order.customerId).toBe(customer.user.id);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: Order Refund Reversal & FIFO Integrity
  // --------------------------------------------------------------------------
  describe('Dimension 4: Pembalikan Mata Semasa Refund Pesanan & Integriti FIFO', () => {
    test('Pembalikan pesanan menarik balik mata earned dan memulangkan mata redeemed secara berasingan', () => {
      const { loyalty, customer } = setupLoyalty();
      const orderId = 'ord-refund-reversal-1';

      // Pelanggan ada 200 mata awal
      loyalty.awardPoints(customer.user.id, 200, 'ord-old', 'Mata lama');
      // Pelanggan tebus 50 mata untuk pesanan orderId
      loyalty.redeemPoints(customer.user.id, 50, orderId, 'Tebus untuk orderId');
      // Pelanggan peroleh 30 mata daripada pesanan orderId
      loyalty.awardPoints(customer.user.id, 30, orderId, 'Peroleh daripada orderId');

      // Baki semasa: 200 - 50 + 30 = 180 mata
      expect(loyalty.getBalance(customer.user.id)).toBe(180);

      // Apabila pesanan dibatalkan/dipulangkan:
      const reversedEntries = loyalty.reversePointsForOrder(customer.user.id, orderId, 'Pesanan batal');
      expect(reversedEntries).toHaveLength(2);

      // 1. Poin yang diperoleh (30) ditarik balik (-30)
      const clawback = reversedEntries.find((e) => e.pointsDelta === -30);
      expect(clawback).toBeDefined();
      expect(clawback?.eventType).toBe('reversed');

      // 2. Poin yang ditebus (50) dipulangkan semula (+50)
      const restored = reversedEntries.find((e) => e.pointsDelta === 50);
      expect(restored).toBeDefined();
      expect(restored?.eventType).toBe('reversed');

      // Baki akhir selepas pembalikan: 180 - 30 + 50 = 200 mata
      expect(loyalty.getBalance(customer.user.id)).toBe(200);

      // Idempotensi: Panggilan ulangan reversePointsForOrder tidak menduplikasi pembalikan
      const idempotentReversal = loyalty.reversePointsForOrder(customer.user.id, orderId, 'Pesanan batal');
      expect(idempotentReversal).toHaveLength(2);
      expect(loyalty.getBalance(customer.user.id)).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Malformed Input Rejection & Float Rounding
  // --------------------------------------------------------------------------
  describe('Dimension 5: Penolakan Input Pincang & Pembundaran Float ke Integer Sen', () => {
    test('Input mata pecahan ditolak tanpa pembundaran senyap', async () => {
      // Kontrak integer ketat: pecahan ditolak, bukan dibundarkan kepada nilai wang lain.
      const { domainRegistry, loyalty, store, customer } = setupLoyalty();
      const ctx: ToolContext = { actor: customer };
      for (const points of [10.75, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        const res = await domainRegistry.executeTool('calculate_points_balance', ctx, { points });
        expect(res.ok).toBe(false);
        expect(res.data).toEqual({observation:'unavailable',reasonCode:'INVALID_POINTS'});
        expect(res.data).not.toHaveProperty('valueSen');
      }

      for (const points of [-1, Number.NaN]) {
        await expect(domainRegistry.executeTool('calculate_points_balance', ctx, { points })).rejects.toThrow('Input tidak sah');
      }

      // Baki lejar sebenar (integer) -> taraf + nilai penebusan integer
      loyalty.awardPoints(customer.user.id, 10, undefined, 'Ganjaran pecahan');
      const summary = loyalty.getSummary(customer.user.id);
      expect(summary.balancePoints).toBe(10);
      expect(Number.isInteger(summary.balancePoints)).toBe(true);

      const tierRes = await domainRegistry.executeTool(
        'get_loyalty_tier_status',
        { actor: customer, store, loyalty },
        { customerId: customer.user.id }
      );
      expect(tierRes.ok).toBe(true);
      expect(tierRes.data.pointsBalance).toBe(10);
      expect(tierRes.data.tier).toBe('Perak');
      expect(tierRes.data.redemptionValueSen).toBe(10 * LOYALTY_POINT_VALUE_SEN);
      expect(Number.isInteger(tierRes.data.redemptionValueSen)).toBe(true);
    });

    test('Menolak pelarasan mata dengan delta sifar (0)', () => {
      const { loyalty, founder, customer } = setupLoyalty();

      expectDomainError(() => {
        loyalty.adjustPoints(founder, customer.user.id, 0, 'Pelarasan sifar tidak sah');
      }, 'INVALID_DELTA');
    });

    test('Menolak pemberian atau penebusan mata dengan nilai negatif', () => {
      const { loyalty, customer } = setupLoyalty();

      expectDomainError(() => {
        loyalty.awardPoints(customer.user.id, -50);
      }, 'INVALID_INPUT');

      expectDomainError(() => {
        loyalty.redeemPoints(customer.user.id, -20);
      }, 'INVALID_INPUT');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Empty Account Handling & FIFO Points Expiry
  // --------------------------------------------------------------------------
  describe('Dimension 6: Pengendalian Akaun Kosong & Luput Tempoh FIFO', () => {
    test('Akaun pelanggan tanpa sebarang transaksi memulangkan baki sifar dan rekod kosong', () => {
      const { loyalty, customer } = setupLoyalty();

      expect(loyalty.getBalance(customer.user.id)).toBe(0);
      const summary = loyalty.getSummary(customer.user.id);
      expect(summary.balancePoints).toBe(0);
      expect(summary.totalEarnedPoints).toBe(0);
      expect(summary.totalRedeemedPoints).toBe(0);
      expect(summary.monetaryValueSen).toBe(0);
      expect(summary.entriesCount).toBe(0);
    });

    test('Pengiraan FIFO menolak mata yang telah melepasi tarikh luput secara tepat', () => {
      const { store, loyalty, customer } = setupLoyalty();

      // Kredit 1: 100 mata luput dalam 30 hari
      const expireSoonDate = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
      store.save('loyalty_ledger', {
        id: 'ent-soon',
        userId: customer.user.id,
        pointsDelta: 100,
        monetaryEquivalentSen: 500,
        eventType: 'earned',
        expiryAt: expireSoonDate,
        createdAt: new Date(Date.now() - 5 * 24 * 3600_000).toISOString(),
      });

      // Kredit 2: 200 mata luput dalam 365 hari
      const expireLateDate = new Date(Date.now() + 365 * 24 * 3600_000).toISOString();
      store.save('loyalty_ledger', {
        id: 'ent-late',
        userId: customer.user.id,
        pointsDelta: 200,
        monetaryEquivalentSen: 1000,
        eventType: 'earned',
        expiryAt: expireLateDate,
        createdAt: new Date().toISOString(),
      });

      // Pada hari ini: Kedua-dua kredit sah (100 + 200 = 300)
      expect(loyalty.getBalance(customer.user.id)).toBe(300);

      // Pada hari ke-60 (selepas Kredit 1 luput):
      const futureDate = new Date(Date.now() + 60 * 24 * 3600_000).toISOString();
      expect(loyalty.getBalance(customer.user.id, futureDate)).toBe(200);

      // Melaksanakan proses luput tempoh (expirePoints) pada tarikh masa depan
      const expiredEntry = loyalty.expirePoints(customer.user.id, futureDate);
      expect(expiredEntry).toBeDefined();
      expect(expiredEntry?.pointsDelta).toBe(-100);
      expect(expiredEntry?.eventType).toBe('expired');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Tool Execution Budget Enforcement (Max 6 Dispatches)
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Panggilan Alatan Copilot', () => {
    test('Panggilan alatan ke-7 disekat dengan TOOL_BUDGET_EXCEEDED', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'loyalty-budget-actor',
        role: 'customer',
        runId: 'run-loyalty-budget',
        dispatchesCount: 0,
        maxDispatches: 6,
      };

      for (let i = 0; i < 6; i++) {
        const res = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res.ok).toBe(true);
      }
      expect(ctx.dispatchesCount).toBe(6);

      // Panggilan ke-7 MESTI disekat
      const blocked = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.code).toBe('TOOL_BUDGET_EXCEEDED');
      }
      expect(ctx.dispatchesCount).toBe(6);
    });
  });
});
