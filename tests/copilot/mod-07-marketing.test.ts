import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { Work } from '../../server/platform/work';
import { Operations } from '../../server/platform/operations';
import { Marketing } from '../../server/platform/marketing';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { evaluateMarginContribution, type MarginSimulationInput } from '../../shared/growth-contracts';

function makePrincipal(
  id: string,
  role: 'founder' | 'staff' | 'dealer' | 'customer',
  outletIds = ['hq']
): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role,
        outletIds,
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  } as unknown as Principal;
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

/**
 * Input simulasi yang PATUH FIN-01: nisbah sumbangan 37.5% (>= 25%) dan
 * sumbangan tunai 6000 sen (>= minimum 2000 sen). Nilai 37.5% sengaja dipilih
 * supaya ia TIDAK sama dengan 28.5% — ujian ini tidak boleh lullus sekiranya
 * margin masih dipalsukan.
 */
const COMPLIANT_SIMULATION: MarginSimulationInput = {
  netSalesExTaxSen: 16000,
  cogsSen: 10000,
  packagingSen: 0,
  paymentFeesSen: 0,
  fulfilmentVariableCostSen: 0,
  deliverySubsidySen: 0,
  agentCommissionSen: 0,
  rewardCostSen: 0,
  expectedReturnLossSen: 0,
  minimumContributionSen: 2000,
  minimumContributionMarginPct: 25,
};

/** Nisbah di bawah 25% tetapi sumbangan tunai masih mencukupi. */
const LOW_RATIO_SIMULATION: MarginSimulationInput = {
  ...COMPLIANT_SIMULATION,
  netSalesExTaxSen: 10000,
  cogsSen: 8000,
};

/** Sumbangan tunai di bawah minimum (walaupun nisbah dinaikkan). */
const LOW_CASH_SIMULATION: MarginSimulationInput = {
  ...COMPLIANT_SIMULATION,
  netSalesExTaxSen: 10000,
  cogsSen: 9000,
};

describe('MOD-07: Marketing & Margin Guardian (FIN-01) Copilot Integration Suite', () => {
  function setupMarketing() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const work = new Work(store, auth, commerce);
    const marketing = new Marketing(store, auth, commerce, work);
    const domainRegistry = new DomainToolRegistry();

    const founder = makePrincipal('founder-01', 'founder');
    const staff = makePrincipal('staff-01', 'staff');
    const customer = makePrincipal('cust-01', 'customer');

    seedPrincipal(store, founder);
    seedPrincipal(store, staff);
    seedPrincipal(store, customer);

    store.save('locations', {
      id: 'hq',
      name: 'Pusat Operasi Utama HQ',
      address: 'Kuala Lumpur',
      hours: '08:00 - 22:00',
      verifiedAt: new Date().toISOString(),
    });

    const product = commerce.saveProduct(founder, {
      name: 'Sambal Colek Klasik (Botol 250g)',
      description: 'Sambal warisan',
      priceSen: 1500,
      packSize: 1,
      publish: true,
    });

    const ctx: ToolContext = {
      actor: founder,
      store,
      commerce,
      loyalty,
      operations: new Operations(store, auth, commerce, work),
      auth,
    };

    return { store, auth, loyalty, commerce, work, marketing, domainRegistry, founder, staff, customer, product, ctx };
  }

  function saveCampaign(
    marketing: Marketing,
    staff: Principal,
    simulation: MarginSimulationInput,
    title = 'Kempen Ujian FIN-01'
  ) {
    return marketing.save(
      staff,
      {
        title,
        objective: 'Meningkatkan jualan sambal colek',
        copy: 'Sambal Colek Klasik — côrecek sahaja. Disediakan oleh AbangColek.',
        assets: [],
        productIds: [],
        catalogueVersion: marketing.commerce.version(),
        marginSimulation: simulation,
      },
      undefined
    );
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Compliant Campaign Passes FIN-01)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Kempen Patuh FIN-01 Diluluskan', () => {
    test('Kempen dengan nisbah >= 25% dan sumbangan >= minimum diluluskan oleh Founder', () => {
      const { marketing, staff, founder } = setupMarketing();
      const campaign = saveCampaign(marketing, staff, COMPLIANT_SIMULATION);

      // Margin dikira oleh penilai kanonikal — bukan literal.
      const expected = evaluateMarginContribution(COMPLIANT_SIMULATION);
      expect(campaign.marginResult).toBeDefined();
      expect(campaign.marginResult!.contributionSen).toBe(expected.contributionSen);
      expect(campaign.marginResult!.contributionMarginPct).toBe(expected.contributionMarginPct);
      expect(campaign.marginResult!.contributionMarginPct).not.toBe(28.5);
      expect(campaign.marginResult!.contributionMarginPct).toBe(37.5);
      expect(campaign.marginResult!.isContributionPass).toBe(true);
      expect(campaign.marginResult!.isMarginPctPass).toBe(true);
      expect(campaign.marginResult!.reasonCode).toBe('PASS');

      const approved = marketing.approve(founder, campaign.id, {
        expectedRevision: campaign.revision,
        approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      });
      expect(approved.status).toBe('approved');
      expect(approved.marginResult!.contributionMarginPct).toBe(37.5);
    });

    test('Alatan draft_marketing_copy_spec mengira margin yang sama dengan penilai kanonikal', async () => {
      const { domainRegistry, ctx } = setupMarketing();
      const res = await domainRegistry.executeTool('draft_marketing_copy_spec', ctx, {
        discountPercent: 10,
        marginSimulation: COMPLIANT_SIMULATION,
      });

      const expected = evaluateMarginContribution(COMPLIANT_SIMULATION);
      expect(res.ok).toBe(true);
      expect(res.data.simulationPerformed).toBe(true);
      expect(res.data.contributionSen).toBe(expected.contributionSen);
      expect(res.data.projectedMargin).toBe(expected.contributionMarginPct);
      expect(res.data.projectedMargin).not.toBe(28.5);
      expect(res.data.marginGuardianPassed).toBe(true);
      expect(res.a2ui?.component).toBe('MarginSimulator');
      expect(res.a2ui?.provenance.source).toBe('canonical_evaluator');
    });

    test('Tanpa input komersial, alatan margin menyatakan simulasi tidak dijalankan', async () => {
      const { domainRegistry, ctx } = setupMarketing();
      const res = await domainRegistry.executeTool('draft_marketing_copy_spec', ctx, { discountPercent: 10 });
      expect(res.ok).toBe(true);
      expect(res.data.simulationPerformed).toBe(false);
      expect(res.data.projectedMargin).toBeNull();
      expect(res.data.reasonCode).toBe('MARGIN_INPUTS_NOT_PROVIDED');
      expect(res.a2ui?.provenance.source).not.toBe('canonical_evaluator');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Negative / FIN-01 Gate (Campaign Blocked for Real)
  // --------------------------------------------------------------------------
  describe('Dimension 2: Negative — Gerbang FIN-01 Menyekat Kempen', () => {
    test('Kempen dengan nisbah sumbangan di bawah 25% disekat dan memerlukan Founder Override', () => {
      const { marketing, staff, founder } = setupMarketing();
      const campaign = saveCampaign(marketing, staff, LOW_RATIO_SIMULATION);

      const expected = evaluateMarginContribution(LOW_RATIO_SIMULATION);
      expect(campaign.marginResult!.isMarginPctPass).toBe(false);
      expect(campaign.marginResult!.contributionMarginPct).toBe(expected.contributionMarginPct);
      expect(campaign.marginResult!.contributionMarginPct).toBeLessThan(25);

      expectDomainError(
        () =>
          marketing.approve(founder, campaign.id, {
            expectedRevision: campaign.revision,
            approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          }),
        'FOUNDER_OVERRIDE_REQUIRED'
      );
    });

    test('Kempen dengan sumbangan tunai di bawah minimum disekat sepenuhnya', () => {
      const { marketing, staff, founder } = setupMarketing();
      const campaign = saveCampaign(marketing, staff, LOW_CASH_SIMULATION);

      const expected = evaluateMarginContribution(LOW_CASH_SIMULATION);
      expect(campaign.marginResult!.isContributionPass).toBe(false);
      expect(campaign.marginResult!.contributionSen).toBe(expected.contributionSen);
      expect(campaign.marginResult!.contributionSen).toBeLessThan(LOW_CASH_SIMULATION.minimumContributionSen);

      expectDomainError(
        () =>
          marketing.approve(founder, campaign.id, {
            expectedRevision: campaign.revision,
            approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          }),
        'INSUFFICIENT_CASH_MARGIN'
      );
    });

    test('Founder Override yang diluluskan membuka pintu peratus rendah dengan reason code audit', () => {
      const { marketing, staff, founder } = setupMarketing();
      const campaign = saveCampaign(marketing, staff, LOW_RATIO_SIMULATION);

      const withOverride = marketing.save(
        founder,
        {
          expectedRevision: campaign.revision,
          title: campaign.title,
          objective: campaign.objective,
          copy: campaign.copy,
          assets: [],
          productIds: [],
          catalogueVersion: marketing.commerce.version(),
          marginSimulation: LOW_RATIO_SIMULATION,
          founderOverride: {
            approved: true,
            reason: 'Justifikasi pengasas untuk pelancaran perasmian pertama',
          },
        },
        campaign.id
      );
      expect(withOverride.founderOverride?.approved).toBe(true);

      const approved = marketing.approve(founder, withOverride.id, {
        expectedRevision: withOverride.revision,
        approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      });
      expect(approved.status).toBe('approved');
      expect(approved.marginResult!.reasonCode).toBe('EXCEPTION_OVERRIDE_REQUIRED');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Reporting Honesty (no fabricated campaign metrics)
  // --------------------------------------------------------------------------
  describe('Dimension 3: Pelaporan Yang Jujur — Tiada Metrik Kempen Rekaan', () => {
    test('get_campaign_performance mengira kempen sebenar dan tidak memalsukan kadar bacaan', async () => {
      const { marketing, staff, domainRegistry, ctx } = setupMarketing();
      saveCampaign(marketing, staff, COMPLIANT_SIMULATION, 'Kempen A');

      const res = await domainRegistry.executeTool('get_campaign_performance', ctx, {});
      expect(res.ok).toBe(true);
      expect(res.data.observation).toBe('observed');
      expect(res.data.campaignsObserved).toBe(1);
      expect(res.data.campaignsByStatus.draft).toBe(1);
      // Tiada rekod penghantaran → kadar bacaan TIDAK dipalsukan.
      expect(res.data.readRatePercent).toBeNull();
      expect(res.data.conversionOrders).toBeNull();
      expect(res.data.metricsUnavailableReasonCode).toBe('PUBLISH_CHANNEL_NOT_CONFIGURED');
    });
  });
});
