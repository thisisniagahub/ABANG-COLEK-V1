import { describe, expect, test } from 'bun:test';
import { evaluateMarginContribution } from '../../server/platform/marginGuardian';
import type { MarginSimulationInput } from '../../shared/growth-contracts';
import { call, harness, user } from './backend-security.test';

describe('Margin Guardian Deterministik (P0 Separation: RM vs %)', () => {
  const baseInput: MarginSimulationInput = {
    netSalesExTaxSen: 10000, // RM 100.00
    cogsSen: 4000,           // RM 40.00
    packagingSen: 500,       // RM 5.00
    paymentFeesSen: 200,     // RM 2.00
    fulfilmentVariableCostSen: 300, // RM 3.00
    deliverySubsidySen: 500, // RM 5.00
    agentCommissionSen: 1000,// RM 10.00
    rewardCostSen: 500,      // RM 5.00
    expectedReturnLossSen: 200, // RM 2.00
    minimumContributionSen: 2000, // Min RM 20.00
    minimumContributionMarginPct: 20, // Min 20%
  };

  test('passes when both contributionSen and marginPct meet thresholds', () => {
    // Total variable costs = 4000 + 500 + 200 + 300 + 500 + 1000 + 500 + 200 = 7200 sen (RM 72.00)
    // Contribution = 10000 - 7200 = 2800 sen (RM 28.00) >= 2000 sen (PASS)
    // Margin Pct = (2800 / 10000) * 100 = 28% >= 20% (PASS)
    const res = evaluateMarginContribution(baseInput);
    expect(res.allowed).toBe(true);
    expect(res.reasonCode).toBe('PASS');
    expect(res.contributionSen).toBe(2800);
    expect(res.contributionMarginPct).toBe(28);
    expect(res.isContributionPass).toBe(true);
    expect(res.isMarginPctPass).toBe(true);
  });

  test('blocks when contribution cash is high enough in RM but fails percentage margin threshold (FIN-01 scenario)', () => {
    // Large order: RM 1,000, variable cost = RM 900. Contribution = RM 100 (10,000 sen)
    // Meets minimumContributionSen (2000 sen = RM 20), but margin pct is 10% < 20%
    const input: MarginSimulationInput = {
      ...baseInput,
      netSalesExTaxSen: 100000, // RM 1,000
      cogsSen: 70000,
      packagingSen: 5000,
      paymentFeesSen: 2000,
      fulfilmentVariableCostSen: 3000,
      deliverySubsidySen: 5000,
      agentCommissionSen: 2000,
      rewardCostSen: 2000,
      expectedReturnLossSen: 1000,
      minimumContributionSen: 5000, // RM 50 min
      minimumContributionMarginPct: 15, // 15% min required
    };
    // Total cost = 70+5+2+3+5+2+2+1 = 90,000 sen (RM 900)
    // Contribution = 100,000 - 90,000 = 10,000 sen (RM 100) >= 5,000 sen
    // Margin pct = 10% < 15% (FAIL)
    const res = evaluateMarginContribution(input);
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');
    expect(res.isContributionPass).toBe(true);
    expect(res.isMarginPctPass).toBe(false);
  });

  test('blocks when percentage is high but absolute cash contribution is too low to cover fixed cost allocations', () => {
    // Small order: RM 5.00 (500 sen), variable costs RM 1.00 (100 sen)
    // Margin pct = (400 / 500) * 100 = 80% (high), but contribution is only RM 4.00 (400 sen) < RM 10.00 min
    const input: MarginSimulationInput = {
      ...baseInput,
      netSalesExTaxSen: 500,
      cogsSen: 50,
      packagingSen: 20,
      paymentFeesSen: 10,
      fulfilmentVariableCostSen: 10,
      deliverySubsidySen: 0,
      agentCommissionSen: 10,
      rewardCostSen: 0,
      expectedReturnLossSen: 0,
      minimumContributionSen: 1000, // RM 10.00 min required
      minimumContributionMarginPct: 20,
    };
    const res = evaluateMarginContribution(input);
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe('INSUFFICIENT_CASH_MARGIN');
    expect(res.isContributionPass).toBe(false);
    expect(res.isMarginPctPass).toBe(true);
  });
});

describe('Campaign Creation & Margin Guardian Integration (FIN-01 Lifecycle)', () => {
  test('evaluates margin simulation, blocks unapproved FIN-01 campaigns, and enforces founder override gate', async () => {
    const { app } = harness();
    const founder = await user(app, 'mg-founder', true);
    const staff = await user(app, 'mg-staff');
    await call(app, '/people/grants', { userId: staff.userId, role: 'staff', outletIds: ['hq'], expectedVersion: 0 }, founder);

    // 1. Create campaign with FIN-01 scenario (cash passes, % margin fails)
    const fin01Sim: MarginSimulationInput = {
      netSalesExTaxSen: 100000, // RM 1,000
      cogsSen: 70000,
      packagingSen: 5000,
      paymentFeesSen: 2000,
      fulfilmentVariableCostSen: 3000,
      deliverySubsidySen: 5000,
      agentCommissionSen: 2000,
      rewardCostSen: 2000,
      expectedReturnLossSen: 1000,
      minimumContributionSen: 5000, // RM 50 min
      minimumContributionMarginPct: 15, // 15% min required, actual is 10%
    };

    const campRes = await call(app, '/campaigns', {
      title: 'Kempen Diskaun Pukal FIN-01',
      objective: 'Clearance',
      copy: 'Diskaun istimewa pembelian pukal sambal colek.',
      assets: [],
      productIds: [],
      catalogueVersion: 0,
      marginSimulation: fin01Sim,
    }, staff);
    expect(campRes.response.status).toBe(200);
    const campaign = campRes.json.data;
    expect(campaign.marginResult.isContributionPass).toBe(true);
    expect(campaign.marginResult.isMarginPctPass).toBe(false);
    expect(campaign.marginResult.allowed).toBe(false);
    expect(campaign.marginResult.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');

    // 2. Staff cannot provide founderOverride
    const staffOverrideRes = await call(app, `/campaigns/${campaign.id}/update`, {
      title: 'Kempen Diskaun Pukal FIN-01',
      objective: 'Clearance',
      copy: 'Diskaun istimewa pembelian pukal sambal colek.',
      assets: [],
      productIds: [],
      catalogueVersion: 0,
      expectedRevision: campaign.revision,
      marginSimulation: fin01Sim,
      founderOverride: { approved: true, reason: 'Staff cuba override' },
    }, staff);
    expect(staffOverrideRes.response.status).toBe(403);

    // 3. Founder approval without override is blocked with 409 FOUNDER_OVERRIDE_REQUIRED
    const blockedApprove = await call(app, `/campaigns/${campaign.id}/approve`, {
      expectedRevision: campaign.revision,
      approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    }, founder);
    expect(blockedApprove.response.status).toBe(409);
    expect(blockedApprove.json.code).toBe('FOUNDER_OVERRIDE_REQUIRED');

    // 4. Founder approval with explicit Founder Override succeeds
    const approved = await call(app, `/campaigns/${campaign.id}/approve`, {
      expectedRevision: campaign.revision,
      approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      founderOverride: { approved: true, reason: 'Pengecualian pelancaran kelompok pertama dipersetujui Founder.' },
    }, founder);
    expect(approved.response.status).toBe(200);
    expect(approved.json.data.status).toBe('approved');
    expect(approved.json.data.founderOverride.approved).toBe(true);
    expect(approved.json.data.founderOverride.reason).toContain('Pengecualian pelancaran');

    // 5. Campaign with failing cash margin cannot be approved even by founder
    const cashFailSim: MarginSimulationInput = {
      ...fin01Sim,
      minimumContributionSen: 50000, // RM 500 min, actual is RM 100 -> FAILS CASH
    };
    const cashFailCamp = (await call(app, '/campaigns', {
      title: 'Kempen Rugi Tunai',
      objective: 'Clearance',
      copy: 'Rugi tunai melampau.',
      assets: [],
      productIds: [],
      catalogueVersion: 0,
      marginSimulation: cashFailSim,
    }, founder)).json.data;

    expect(cashFailCamp.marginResult.isContributionPass).toBe(false);
    const cashFailApprove = await call(app, `/campaigns/${cashFailCamp.id}/approve`, {
      expectedRevision: cashFailCamp.revision,
      approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      founderOverride: { approved: true, reason: 'Founder override' },
    }, founder);
    expect(cashFailApprove.response.status).toBe(409);
    expect(cashFailApprove.json.code).toBe('INSUFFICIENT_CASH_MARGIN');
  });

  test('edge case: zero net sales handles division safely without NaN or infinite margin', () => {
    const zeroSalesInput: MarginSimulationInput = {
      netSalesExTaxSen: 0,
      cogsSen: 500,
      packagingSen: 100,
      paymentFeesSen: 0,
      fulfilmentVariableCostSen: 50,
      deliverySubsidySen: 0,
      agentCommissionSen: 0,
      rewardCostSen: 0,
      expectedReturnLossSen: 0,
      minimumContributionSen: 0,
      minimumContributionMarginPct: 10,
    };
    const res = evaluateMarginContribution(zeroSalesInput);
    expect(res.contributionSen).toBe(-650);
    expect(res.contributionMarginPct).toBe(0);
    expect(res.isContributionPass).toBe(false);
    expect(res.isMarginPctPass).toBe(false);
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe('INSUFFICIENT_CASH_MARGIN');
  });

  test('postiz-publish gate enforces FIN-01 founder override requirement', async () => {
    const { app } = harness();
    const founder = await user(app, 'postiz-founder', true);

    const fin01Sim: MarginSimulationInput = {
      netSalesExTaxSen: 100000,
      cogsSen: 70000,
      packagingSen: 5000,
      paymentFeesSen: 2000,
      fulfilmentVariableCostSen: 3000,
      deliverySubsidySen: 5000,
      agentCommissionSen: 2000,
      rewardCostSen: 2000,
      expectedReturnLossSen: 1000,
      minimumContributionSen: 5000,
      minimumContributionMarginPct: 15,
    };

    // Create FIN-01 campaign
    const camp = (await call(app, '/campaigns', {
      title: 'Kempen Auto Postiz',
      objective: 'Brand Awareness',
      copy: 'Auto postiz test copy',
      assets: [],
      productIds: [],
      catalogueVersion: 0,
      marginSimulation: fin01Sim,
    }, founder)).json.data;

    // Approve with Founder Override
    const approved = (await call(app, `/campaigns/${camp.id}/approve`, {
      expectedRevision: camp.revision,
      approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      founderOverride: { approved: true, reason: 'Diluluskan untuk auto-post pilot.' },
    }, founder)).json.data;

    expect(approved.founderOverride?.approved).toBe(true);

    // Call publish endpoint (since no remote Postiz transport configured, fails with REMOTE_PUBLISH_DISABLED after passing margin checks)
    const pubRes = await call(app, `/campaigns/${approved.id}/postiz-publish`, {
      expectedRevision: approved.revision,
      channel: 'instagram',
    }, founder, { 'Idempotency-Key': 'postiz-idem-key-1' });

    // Status 200 because Postiz returns outcome record with status 'blocked' / REMOTE_PUBLISH_DISABLED,
    // which proves it passed the 409 FOUNDER_OVERRIDE_REQUIRED / INSUFFICIENT_CASH_MARGIN guard!
    expect(pubRes.response.status).toBe(200);
    expect(pubRes.json.data.reasonCode).toBe('REMOTE_PUBLISH_DISABLED');
  });
});

