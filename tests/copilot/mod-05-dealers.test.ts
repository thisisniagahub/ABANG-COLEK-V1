import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { Dealers, calculateEarnedBenefit, VALID_COMMISSION_TRANSITIONS } from '../../server/platform/dealers';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import type { CommissionPolicy, EligiblePaidOrder } from '../../shared/platform-contracts';
import type { CommissionTransaction } from '../../shared/dealer-contracts';

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

describe('MOD-05: Dealers & Commission Copilot Integration Suite', () => {
  function setupDealers() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const dealers = new Dealers(store, auth, commerce);
    const domainRegistry = new DomainToolRegistry();
    const toolRegistry = new ToolRegistry(6);

    const founder = makePrincipal('founder-01', 'founder');
    const staff = makePrincipal('staff-01', 'staff');
    const dealerAlpha = makePrincipal('dealer-a', 'dealer', 'org-alpha');
    const dealerBeta = makePrincipal('dealer-b', 'dealer', 'org-beta');
    const customer = makePrincipal('cust-01', 'customer');

    // Create a product
    const product = commerce.saveProduct(founder, {
      name: 'Sambal Colek Premium',
      description: 'Sambal berkualiti tinggi',
      priceSen: 2000,
      packSize: 1,
      publish: true,
    });

    return {
      store,
      auth,
      loyalty,
      commerce,
      dealers,
      domainRegistry,
      toolRegistry,
      founder,
      staff,
      dealerAlpha,
      dealerBeta,
      customer,
      product,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Commission Accrual & Summary Reporting)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Akruan Komisen & Ringkasan Lejar Ejen', () => {
    test('Alatan get_agent_commission_summary mengira ringkasan komisen daripada lejar sebenar dan memulangkan kad CommissionCard A2UI', async () => {
      // WHY CHANGED: the old assertion expected a hardcoded 18500 sen from a
      // ToolContext with NO store — a fabricated constant that the v1.1 tool
      // can no longer produce. The tool now reads the REAL commission ledger
      // (server/platform/domainTools.ts:1057), so a real ledger is seeded and
      // the COMPUTED summary is asserted — including that another org's ledger
      // never leaks into this dealer's view.
      const { store, domainRegistry, dealerAlpha } = setupDealers();

      const earned: CommissionTransaction = {
        id: 'tx-comm-alpha-1',
        orderId: 'ord-alpha-01',
        dealerOrgId: 'org-alpha',
        agentUserId: 'dealer-a',
        amountSen: 18500,
        status: 'approved',
        eligibleAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        policyVersion: 1,
        createdAt: new Date().toISOString(),
      };
      const otherOrg: CommissionTransaction = {
        id: 'tx-comm-beta-1',
        orderId: 'ord-beta-01',
        dealerOrgId: 'org-beta',
        agentUserId: 'dealer-b',
        amountSen: 99000,
        status: 'approved',
        eligibleAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        policyVersion: 1,
        createdAt: new Date().toISOString(),
      };
      store.save('commission_ledger', earned);
      store.save('commission_ledger', otherOrg);

      const ctx: ToolContext = { actor: dealerAlpha, store };
      const res = await domainRegistry.executeTool('get_agent_commission_summary', ctx, {});
      expect(res.ok).toBe(true);

      // Nilai DIKIRA daripada lejar sebenar (bukan pemalar)
      expect(res.data.totalCommissionSen).toBe(18500);
      expect(res.data.contraReversalSen).toBe(0);
      expect(res.data.netPayableSen).toBe(18500);
      expect(res.data.status).toBe('audited_clean');
      expect(res.data.observation).toBe('observed');
      expect(res.data.entriesObserved).toBe(1);

      // A2UI Fixed Schema validation
      expect(res.a2ui).toBeDefined();
      expect(res.a2ui?.component).toBe('CommissionCard');
      expect(res.a2ui?.props.totalCommissionSen).toBe(18500);
      expect(res.a2ui?.props.netPayableSen).toBe(18500);
      expect(res.a2ui?.props.status).toBe('audited_clean');

      // Lejar org-beta TIDAK bocor ke paparan ejen org-alpha
      expect(JSON.stringify(res.data)).not.toContain('org-beta');
      expect(JSON.stringify(res.data)).not.toContain('99000');
    });

    test('Alatan get_agent_commission_summary menolak kontra-pembalikan dalam baki bersih yang dikira', async () => {
      // WHY ADDED: nilai asal (18500 / 0 / 18500) hanya terbukti untuk lejar
      // yang bersih. Ini membuktikan pengiraan sebenar: kontra-pembalikan
      // negatif ditolak daripada baki bersih dan status bertukar kepada
      // 'contra_adjusted' — sesuatu yang tidak dapat dilakukan oleh
      // pemalar rekaan.
      const { store, domainRegistry, dealerAlpha } = setupDealers();

      const earned: CommissionTransaction = {
        id: 'tx-comm-alpha-2',
        orderId: 'ord-alpha-02',
        dealerOrgId: 'org-alpha',
        agentUserId: 'dealer-a',
        amountSen: 18500,
        status: 'approved',
        eligibleAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        policyVersion: 1,
        createdAt: new Date().toISOString(),
      };
      const contra: CommissionTransaction = {
        id: 'tx-comm-alpha-contra-1',
        orderId: 'ord-alpha-02',
        dealerOrgId: 'org-alpha',
        agentUserId: 'dealer-a',
        amountSen: -2000,
        status: 'reversed',
        eligibleAt: new Date().toISOString(),
        reversedAt: new Date().toISOString(),
        contraOfId: earned.id,
        contraReason: 'PEMULANGAN_PESANAN',
        policyVersion: 1,
        createdAt: new Date().toISOString(),
      };
      store.save('commission_ledger', earned);
      store.save('commission_ledger', contra);

      const ctx: ToolContext = { actor: dealerAlpha, store };
      const res = await domainRegistry.executeTool('get_agent_commission_summary', ctx, {});
      expect(res.ok).toBe(true);

      expect(res.data.totalCommissionSen).toBe(18500);
      expect(res.data.contraReversalSen).toBe(-2000);
      // Persamaan baki bersih: netPayableSen = earned + contra
      expect(res.data.netPayableSen).toBe(18500 - 2000);
      expect(res.data.netPayableSen).toBe(16500);
      expect(res.data.status).toBe('contra_adjusted');
      expect(res.data.entriesObserved).toBe(2);

      // Kad A2UI membawa nilai yang SAMA dengan data
      expect(res.a2ui?.props.netPayableSen).toBe(16500);
      expect(res.a2ui?.props.status).toBe('contra_adjusted');
    });

    test('Pengiraan komisen berkadar (basis points) mengira jumlah sen tepat mengikut formula kanonikal', () => {
      const { product } = setupDealers();

      const policy: CommissionPolicy = {
        id: 'pol-10pct',
        version: 1,
        eligibleProductIds: [product.id],
        rateBasisPoints: 1000, // 10.00%
        approvedAt: new Date(Date.now() - 3600_000).toISOString(),
      };

      const order: EligiblePaidOrder = {
        orderId: 'ord-deal-101',
        paidAmountSen: 20000, // RM 200.00
        refundAmountSen: 0,
        paymentConfirmedAt: new Date().toISOString(),
        productIds: [product.id],
      };

      const benefit = calculateEarnedBenefit(order, policy);
      expect(benefit.amountSen).toBe(2000); // RM 20.00 (10% daripada RM 200.00)
      expect(benefit.reasonCode).toBe('CONFIRMED_ELIGIBLE_NET_PAYMENT');
      expect(benefit.policyVersion).toBe(1);
    });

    test('Pengasas boleh meluluskan dasar komisen baharu dengan kadar basis points sah', () => {
      const { dealers, founder, product } = setupDealers();

      const policy = dealers.saveCommissionPolicy(founder, {
        expectedVersion: 0,
        eligibleProductIds: [product.id],
        rateBasisPoints: 1500, // 15.00%
      });

      expect(policy.version).toBe(1);
      expect(policy.rateBasisPoints).toBe(1500);
      expect(policy.eligibleProductIds).toContain(product.id);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Return Contra-Reversal & Ledger Balance Consistency
  // --------------------------------------------------------------------------
  describe('Dimension 2: Pembalikan Kontra (Contra-Reversal) & Imbangan Lejar', () => {
    test('Pemulangan sebahagian pesanan mengurangkan akruan komisen secara automatik mengikut baki bersih', () => {
      const { product } = setupDealers();

      const policy: CommissionPolicy = {
        id: 'pol-10pct',
        version: 1,
        eligibleProductIds: [product.id],
        rateBasisPoints: 1000, // 10.00%
        approvedAt: new Date(Date.now() - 3600_000).toISOString(),
      };

      // Pesanan RM 200.00 dengan refund RM 50.00 (5,000 sen)
      const orderPartialRefund: EligiblePaidOrder = {
        orderId: 'ord-deal-102',
        paidAmountSen: 20000,
        refundAmountSen: 5000,
        paymentConfirmedAt: new Date().toISOString(),
        productIds: [product.id],
      };

      const benefit = calculateEarnedBenefit(orderPartialRefund, policy);
      // Net paid: 15,000 sen * 10% = 1,500 sen (RM 15.00)
      expect(benefit.amountSen).toBe(1500);
    });

    test('Lejar kontra mengekalkan persamaan imbangan bersih (Net Balance Equation)', () => {
      const { store, dealers, dealerAlpha } = setupDealers();

      // Rekod transaksi komisen asal (RM 50.00 diluluskan)
      const tx1: CommissionTransaction = {
        id: 'tx-comm-1',
        dealerOrgId: 'org-alpha',
        orderId: 'ord-alpha-01',
        agentUserId: dealerAlpha.user.id,
        eligibleAt: new Date(Date.now() - 7200_000).toISOString(),
        policyVersion: 1,
        amountSen: 5000,
        status: 'approved',
        createdAt: new Date(Date.now() - 7200_000).toISOString(),
      };
      store.save('commission_ledger', tx1);

      // Rekod entri pembalikan kontra kerana pemulangan pesanan (RM -20.00)
      const txContra: CommissionTransaction = {
        id: 'tx-comm-contra-1',
        dealerOrgId: 'org-alpha',
        orderId: 'ord-alpha-01',
        agentUserId: dealerAlpha.user.id,
        eligibleAt: new Date().toISOString(),
        policyVersion: 1,
        amountSen: -2000,
        status: 'reversed',
        createdAt: new Date().toISOString(),
      };
      store.save('commission_ledger', txContra);

      const summary = dealers.commissionSummary(dealerAlpha, 'org-alpha');
      expect(summary.approvedSen).toBe(5000);
      expect(summary.reversedContraSen).toBe(-2000);
      expect(summary.totalEarnedSen).toBe(5000);

      // Persamaan baki bersih mesti tepat: netPayableSen = approvedSen + reversedContraSen
      const expectedNetPayable = summary.approvedSen + summary.reversedContraSen;
      expect(expectedNetPayable).toBe(3000); // RM 30.00
    });

    test('Alatan verify_contra_reversal mengesahkan integriti lejar kontra tanpa entri yatim', async () => {
      const { domainRegistry, founder } = setupDealers();
      const ctx: ToolContext = { actor: founder };

      const res = await domainRegistry.executeTool('verify_contra_reversal', ctx, { disputeId: 'disp-01' });
      expect(res.ok).toBe(true);
      expect(res.data.contraLedgerBalanced).toBe(true);
      expect(res.data.orphanEntries).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Multi-Tenant Cross-Org Isolation & Role Gates
  // --------------------------------------------------------------------------
  describe('Dimension 3: Pengasingan Data Silang Organisasi (Cross-Org Multi-Tenant Isolation)', () => {
    test('Ejen Org A tidak boleh mengakses atau melihat lejar komisen Org B', () => {
      const { dealers, dealerAlpha } = setupDealers();

      // Dealer Alpha cuba melihat komisen Org Beta
      expectDomainError(() => {
        dealers.commissions(dealerAlpha, 'org-beta');
      }, 'DEALER_SCOPE');

      // Dealer Alpha cuba melihat ringkasan Org Beta
      expectDomainError(() => {
        dealers.commissionSummary(dealerAlpha, 'org-beta');
      }, 'DEALER_SCOPE');
    });

    test('Pengguna peranan customer tanpa keahlian dealer ditolak daripada mengakses lejar komisen', () => {
      const { dealers, customer } = setupDealers();

      expectDomainError(() => {
        dealers.commissions(customer);
      }, 'DEALER_SCOPE');

      expectDomainError(() => {
        dealers.commissionSummary(customer);
      }, 'DEALER_SCOPE');
    });

    test('Alatan verify_contra_reversal menyekat capaian daripada peranan bukan founder', async () => {
      const { domainRegistry, staff, dealerAlpha } = setupDealers();

      // Kakitangan (staff) cuba menjalankan alatan semakan lejar kontra
      await expect(
        domainRegistry.executeTool('verify_contra_reversal', { actor: staff }, {})
      ).rejects.toThrow();

      // Ejen niaga cuba menjalankan alatan semakan lejar kontra
      await expect(
        domainRegistry.executeTool('verify_contra_reversal', { actor: dealerAlpha }, {})
      ).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: Malformed Input Rejection & Non-Existent Records
  // --------------------------------------------------------------------------
  describe('Dimension 4: Penolakan Input Pincang & Ralat Rekod Tidak Ditemui', () => {
    test('Meminta rekod komisen dengan ID tidak wujud melontar ralat NOT_FOUND', () => {
      const { dealers, dealerAlpha } = setupDealers();

      expectDomainError(() => {
        dealers.commission(dealerAlpha, 'comm-id-that-does-not-exist');
      }, 'NOT_FOUND');
    });

    test('Menolak dasar komisen dengan peratusan basis points melebihi had (10000 bps) atau negatif', () => {
      const { dealers, founder, product } = setupDealers();

      // Lebih 10,000 bps (lebih 100%)
      expectDomainError(() => {
        dealers.saveCommissionPolicy(founder, {
          expectedVersion: 0,
          eligibleProductIds: [product.id],
          rateBasisPoints: 12000,
        });
      }, 'INVALID_INPUT');

      // Nilai negatif
      expectDomainError(() => {
        dealers.saveCommissionPolicy(founder, {
          expectedVersion: 0,
          eligibleProductIds: [product.id],
          rateBasisPoints: -500,
        });
      }, 'INVALID_INPUT');
    });

    test('Menolak dasar komisen tanpa sebarang senarai produk layak', () => {
      const { dealers, founder } = setupDealers();

      expectDomainError(() => {
        dealers.saveCommissionPolicy(founder, {
          expectedVersion: 0,
          eligibleProductIds: [],
          rateBasisPoints: 1000,
        });
      }, 'ELIGIBLE_PRODUCTS_REQUIRED');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Empty Ledger Handling for New Dealers
  // --------------------------------------------------------------------------
  describe('Dimension 5: Pengendalian Lejar Kosong (Empty Ledger) Ejen Baharu', () => {
    test('Ejen baharu tanpa sebarang transaksi memulangkan nilai sifar secara selamat', () => {
      const { dealers, dealerAlpha } = setupDealers();

      const comms = dealers.commissions(dealerAlpha, 'org-alpha');
      expect(comms).toBeArray();
      expect(comms.length).toBe(0);

      const summary = dealers.commissionSummary(dealerAlpha, 'org-alpha');
      expect(summary.totalEarnedSen).toBe(0);
      expect(summary.pendingSen).toBe(0);
      expect(summary.eligibleSen).toBe(0);
      expect(summary.approvedSen).toBe(0);
      expect(summary.paidSen).toBe(0);
      expect(summary.reversedContraSen).toBe(0);
      expect(summary.unsettledDeficitSen).toBe(0);
      expect(summary.netPayableSen).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Unconfirmed Payment Handling & Valid State Transitions
  // --------------------------------------------------------------------------
  describe('Dimension 6: Penolakan Pembayaran Belum Sah & Transisi Status Komisen', () => {
    test('Pesanan yang belum disahkan pembayaran tidak menghasilkan akruan komisen', () => {
      const { product } = setupDealers();

      const policy: CommissionPolicy = {
        id: 'pol-10pct',
        version: 1,
        eligibleProductIds: [product.id],
        rateBasisPoints: 1000,
        approvedAt: new Date(Date.now() - 3600_000).toISOString(),
      };

      const unconfirmedOrder: EligiblePaidOrder = {
        orderId: 'ord-unpaid',
        paidAmountSen: 10000,
        refundAmountSen: 0,
        paymentConfirmedAt: undefined, // Belum disahkan bayaran
        productIds: [product.id],
      };

      const benefit = calculateEarnedBenefit(unconfirmedOrder, policy);
      expect(benefit.amountSen).toBe(0);
      expect(benefit.reasonCode).toBe('PAYMENT_OR_POLICY_UNCONFIRMED');
    });

    test('Transisi status komisen mematuhi VALID_COMMISSION_TRANSITIONS dengan ketat', () => {
      // Status 'reversed' ialah keadaan terminal (terminal state) tanpa transisi seterusnya
      expect(VALID_COMMISSION_TRANSITIONS.reversed).toBeArray();
      expect(VALID_COMMISSION_TRANSITIONS.reversed.length).toBe(0);

      // Status 'pending' hanya boleh beralih ke eligible, reversed, atau disputed
      expect(VALID_COMMISSION_TRANSITIONS.pending).toEqual(['eligible', 'reversed', 'disputed']);

      // Status 'paid' tidak boleh terus kembali ke pending secara senyap, hanya boleh dipertikaikan (disputed)
      expect(VALID_COMMISSION_TRANSITIONS.paid).toEqual(['disputed']);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Tool Execution Budget Enforcement (Max 6 Dispatches)
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Panggilan Alatan Copilot', () => {
    test('Panggilan alatan ke-7 disekat dengan TOOL_BUDGET_EXCEEDED', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'dealer-budget-actor',
        role: 'founder',
        runId: 'run-dealers-budget',
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
