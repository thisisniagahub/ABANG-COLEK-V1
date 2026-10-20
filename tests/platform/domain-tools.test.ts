import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { Dealers } from '../../server/platform/dealers';
import { Operations } from '../../server/platform/operations';
import { Work } from '../../server/platform/work';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { validateA2UIComponent } from '../../shared/copilot-contracts';
import { evaluateMarginContribution, loyaltyPointsToDiscountSen } from '../../shared/growth-contracts';
import type { CommissionTransaction } from '../../shared/dealer-contracts';

function makePrincipal(
  id: string,
  role: 'founder' | 'staff' | 'dealer' | 'customer',
  dealerOrgId?: string
): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role: role === 'dealer' ? 'customer' : role,
        outletIds: ['hq'],
        ...(dealerOrgId ? { dealerOrgId } : {}),
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  } as unknown as Principal;
}

interface Fixture {
  registry: DomainToolRegistry;
  ctx: ToolContext;
  store: PlatformStore;
  founder: Principal;
  customer: Principal;
  dealer: Principal;
  productId: string;
  orderId: string;
  orderAmountSen: number;
}

function setup(): Fixture {
  const store = new PlatformStore(':memory:');
  const auth = new Auth(store);
  const loyalty = new Loyalty(store, auth);
  const commerce = new Commerce(store, auth, loyalty);
  const work = new Work(store, auth, commerce);
  const dealers = new Dealers(store, auth, commerce);
  const operations = new Operations(store, auth, commerce, work);
  const registry = new DomainToolRegistry();

  const founder = makePrincipal('founder-01', 'founder');
  const customer = makePrincipal('cust-01', 'customer');
  const dealer = makePrincipal('dealer-01', 'dealer', 'org-alpha');

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

  const order = commerce.submitOrder(
    customer,
    {
      lines: [{ productId: product.id, quantity: 2 }],
      catalogueVersion: commerce.version(),
      fulfilment: 'delivery',
      contactRef: 'Ahmad Colek, No 12 Jalan Kebun, 50000 Kuala Lumpur, Tel: 0123456789',
      outletId: 'hq',
    },
    'idemp-domain-tools-01'
  );

  // Komisen ejen direkodkan dalam lejar kanonikal.
  const commission: CommissionTransaction = {
    id: 'comm-01',
    orderId: order.id,
    dealerOrgId: 'org-alpha',
    agentUserId: dealer.user.id,
    amountSen: 18500,
    status: 'approved',
    eligibleAt: new Date().toISOString(),
    policyVersion: 1,
    createdAt: new Date().toISOString(),
  };
  store.save('commission_ledger', commission);

  loyalty.awardPoints(customer.user.id, 420, undefined, 'Ganjaran pendaftaran');

  const ctx: ToolContext = { actor: founder, store, commerce, dealers, loyalty, operations, auth };
  return {
    registry,
    ctx,
    store,
    founder,
    customer,
    dealer,
    productId: product.id,
    orderId: order.id,
    orderAmountSen: order.amountSen,
  };
}

describe('Domain Tools Registry v1.1 — 10 Platform Modules Conformance (real canonical data)', () => {
  test('All 10 required domain modules are represented in the registry', () => {
    const { registry } = setup();
    const tools = registry.listTools();
    const domains = new Set(tools.map((t) => t.domain));

    expect(domains.has('commerce')).toBe(true);
    expect(domains.has('inventory')).toBe(true);
    expect(domains.has('orders')).toBe(true);
    expect(domains.has('delivery')).toBe(true);
    expect(domains.has('payment')).toBe(true);
    expect(domains.has('commission')).toBe(true);
    expect(domains.has('loyalty')).toBe(true);
    expect(domains.has('marketing')).toBe(true);
    expect(domains.has('qc')).toBe(true);
    expect(domains.has('analytics')).toBe(true);
  });

  test('Module 1 (Commerce): get_product_catalog reads the real published catalogue', async () => {
    const { registry, ctx, productId } = setup();
    const res = await registry.executeTool('get_product_catalog', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.observation).toBe('observed');
    expect(res.data.products.map((p: any) => p.id)).toContain(productId);
    expect(res.a2ui).toBeDefined();
    expect(validateA2UIComponent(res.a2ui!.component)).toBe(true);
    expect(res.a2ui!.provenance.source).toBe('database');
  });

  test('Module 2 (Inventory): check_stock_levels succeeds for staff and fails for customer', async () => {
    const { registry, ctx, customer, productId } = setup();
    const res = await registry.executeTool('check_stock_levels', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.observation).toBe('observed');
    expect(res.data.warehouses.length).toBeGreaterThan(0);
    const hq = res.data.warehouses.find((w: any) => w.id === 'hq');
    expect(hq).toBeDefined();
    // 100 unit dalam lot, 2 unit ditempah oleh pesanan sebenar → 98 boleh guna.
    expect(hq.skus.find((s: any) => s.productId === productId).availableUnits).toBe(98);

    const customerCtx: ToolContext = { ...ctx, actor: customer };
    // REGRESSION: assertion ini MESTI benar-benar dijalankan (await) supaya
    // penafian akses benar-benar diuji.
    await expect(registry.executeTool('check_stock_levels', customerCtx, {})).rejects.toThrow(
      /Akses ditolak/
    );
  });

  test('Module 3 (Orders): get_order_details returns the real order and a database-backed tracking badge', async () => {
    const { registry, ctx, orderId, store } = setup();
    const res = await registry.executeTool('get_order_details', ctx, { orderId });
    expect(res.ok).toBe(true);
    expect(res.data.found).toBe(true);
    expect(res.data.orderId).toBe(orderId);
    expect(res.data.totalSen).toBe(store.get<any>('orders', orderId)!.amountSen);
    expect(res.a2ui?.component).toBe('OrderTrackingBadge');
    expect(res.a2ui?.provenance.source).toBe('database');
    expect(res.a2ui?.provenance.revision).toBe(store.get<any>('orders', orderId)!.revision);
  });

  test('Module 3b (Orders): an unknown order id yields an explicit NOT_FOUND, never a fabricated order', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('get_order_details', ctx, { orderId: 'ORD-DOES-NOT-EXIST' });
    expect(res.ok).toBe(true);
    expect(res.data.found).toBe(false);
    expect(res.data.recordReasonCode).toBe('RECORD_NOT_FOUND');
    expect(res.a2ui?.component).toBe('OrderTrackingCard');
    expect(res.a2ui?.props.reasonCode).toBe('RECORD_NOT_FOUND');
  });

  test('Module 4 (Delivery): track_consignment reports NOT_FOUND instead of a fabricated schedule', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('track_consignment', ctx, { consignmentNo: 'CSG-8899' });
    expect(res.ok).toBe(true);
    expect(res.data.found).toBe(false);
    expect(res.data.status).toBe('NOT_FOUND');
    expect(res.data.recordReasonCode).toBe('RECORD_NOT_FOUND');
    expect(res.a2ui?.props.reasonCode).toBe('RECORD_NOT_FOUND');
  });

  test('Module 5 (Payment): verify_sen_balance enforces integer sen', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('verify_sen_balance', ctx, { amountSen: 4500 });
    expect(res.ok).toBe(true);
    expect(res.data.isInteger).toBe(true);
    expect(res.data.isValid).toBe(true);
  });

  test('Module 6 (Commission): get_agent_commission_summary reads the real commission ledger', async () => {
    const { registry, ctx, dealer } = setup();
    const dealerCtx: ToolContext = { ...ctx, actor: dealer };
    const res = await registry.executeTool('get_agent_commission_summary', dealerCtx, {});
    expect(res.ok).toBe(true);
    expect(res.data.observation).toBe('observed');
    expect(res.data.totalCommissionSen).toBe(18500);
    expect(res.data.netPayableSen).toBe(18500);
    expect(res.a2ui?.component).toBe('CommissionCard');
    expect(res.a2ui?.provenance.source).toBe('database');
  });

  test('Module 6b (Commission): verify_contra_reversal is computed from the ledger, not asserted', async () => {
    const { registry, ctx, store } = setup();
    const res = await registry.executeTool('verify_contra_reversal', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.entriesChecked).toBe(store.all('commission_ledger').length);
    expect(res.data.orphanEntries).toBe(0);
    expect(res.data.contraLedgerBalanced).toBe(true);

    // Contra yatim (rujukan ke rekod yang tiada) mesti dikesan sebagai conflict.
    store.save('commission_ledger', {
      id: 'comm-orphan',
      orderId: 'order-x',
      dealerOrgId: 'org-alpha',
      agentUserId: 'dealer-01',
      amountSen: -500,
      status: 'reversed',
      eligibleAt: new Date().toISOString(),
      contraOfId: 'comm-does-not-exist',
      policyVersion: 1,
      createdAt: new Date().toISOString(),
    });
    const after = await registry.executeTool('verify_contra_reversal', ctx, {});
    expect(after.data.orphanEntries).toBe(1);
    expect(after.data.contraLedgerBalanced).toBe(false);
  });

  test('Module 7 (Loyalty): calculate_points_balance uses the canonical point value', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('calculate_points_balance', ctx, { points: 100 });
    expect(res.ok).toBe(true);
    expect(res.data.valueSen).toBe(loyaltyPointsToDiscountSen(100));
    expect(res.data.valueSen).toBe(100);
    expect(res.data.isSenInteger).toBe(true);
  });

  test('Module 7b (Loyalty): get_loyalty_tier_status reads the real loyalty ledger', async () => {
    const { registry, ctx, customer } = setup();
    const customerCtx: ToolContext = { ...ctx, actor: customer };
    const res = await registry.executeTool('get_loyalty_tier_status', customerCtx, { customerId: customer.user.id });
    expect(res.ok).toBe(true);
    expect(res.data.observation).toBe('observed');
    expect(res.data.pointsBalance).toBe(420);
    expect(res.data.redemptionValueSen).toBe(loyaltyPointsToDiscountSen(420));
    expect(res.data.tier).toBe('Emas');
  });

  test('Module 8 (Marketing): draft_marketing_copy_spec evaluates the canonical margin evaluator', async () => {
    const { registry, ctx } = setup();
    const marginSimulation = {
      netSalesExTaxSen: 10000,
      cogsSen: 6000,
      packagingSen: 200,
      paymentFeesSen: 0,
      fulfilmentVariableCostSen: 0,
      deliverySubsidySen: 0,
      agentCommissionSen: 0,
      rewardCostSen: 0,
      expectedReturnLossSen: 0,
      minimumContributionSen: 2000,
      minimumContributionMarginPct: 25,
    };
    const expected = evaluateMarginContribution(marginSimulation);
    const res = await registry.executeTool('draft_marketing_copy_spec', ctx, {
      discountPercent: 10,
      marginSimulation,
    });
    expect(res.ok).toBe(true);
    expect(res.data.simulationPerformed).toBe(true);
    expect(res.data.contributionSen).toBe(expected.contributionSen);
    expect(res.data.projectedMargin).toBe(expected.contributionMarginPct);
    expect(res.data.marginGuardianPassed).toBe(expected.allowed);
    expect(res.a2ui?.component).toBe('MarginSimulator');
    expect(res.a2ui?.provenance.source).toBe('canonical_evaluator');
    // LAMA: `expect(res.a2ui?.props.evaluator).toBe('evaluateMarginContribution')`
    // — kontrak lama itu mengekod PEPIJAT: `evaluator` tiada dalam allowlist
    // renderer A2UI, jadi ia menjadikan kad MarginSimulator "insufficient-data".
    // Kontrak BARU: props MENGANDUNGI HANYA medan yang dibenarkan renderer.
    expect(res.a2ui?.props).not.toHaveProperty('evaluator');
    expect(Object.keys(res.a2ui?.props ?? {}).sort()).toEqual([
      'contributionMarginPct',
      'contributionSen',
      'requiredContributionSen',
      'requiredMarginPct',
      'status',
    ]);
    expect(res.a2ui?.props).toMatchObject({
      contributionSen: expected.contributionSen,
      contributionMarginPct: expected.contributionMarginPct,
      requiredContributionSen: 2000,
      requiredMarginPct: 25,
      status: 'PASSED',
    });
  });

  test('Module 8b (Marketing): without commercial inputs the tool states it cannot simulate', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('draft_marketing_copy_spec', ctx, { discountPercent: 10 });
    expect(res.ok).toBe(true);
    expect(res.data.simulationPerformed).toBe(false);
    expect(res.data.projectedMargin).toBeNull();
    expect(res.data.marginGuardianPassed).toBeNull();
    expect(res.data.reasonCode).toBe('MARGIN_INPUTS_NOT_PROVIDED');
    expect(res.a2ui?.component).toBe('MarginSummaryCard');
    expect(res.a2ui?.props.status).toBe('NOT_SIMULATED');
    expect(res.a2ui?.provenance.source).not.toBe('canonical_evaluator');
  });

  test('Module 9 (QC / Audit): get_qc_audit_checklist returns JevAssessmentCard with null confidence score', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('get_qc_audit_checklist', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.inspections.length).toBeGreaterThanOrEqual(3);
    expect(res.data.rootCausePolicy).toBe('UNDETERMINED_UNTIL_VERIFIED');
    expect(res.a2ui?.component).toBe('JevAssessmentCard');
    expect(res.a2ui?.props.confidenceScore).toBeNull();
  });

  test('Module 10 (Analytics): get_daily_sales_analytics derives gross from the real orders', async () => {
    const { registry, ctx, orderAmountSen } = setup();
    const res = await registry.executeTool('get_daily_sales_analytics', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.observation).toBe('observed');
    expect(res.data.todayOrdersCount).toBe(1);
    expect(res.data.todayGrossSen).toBe(orderAmountSen);
    expect(Number.isInteger(res.data.todayGrossSen)).toBe(true);
  });

  test('Module 11 (Operations): get_operations_brief is computed from real store state', async () => {
    const { registry, ctx } = setup();
    const res = await registry.executeTool('get_operations_brief', ctx, { type: 'daily' });
    expect(res.ok).toBe(true);
    expect(res.data.observation).toBe('observed');
    expect(res.data.metrics.totalOrdersToday).toBe(1);
    expect(res.data.metrics.pendingHitlApprovals).toBe(0);
    expect(res.a2ui?.provenance.source).toBe('database');
  });

  test('No store wired: tools report an explicit unavailable observation instead of constants', async () => {
    const { registry, founder } = setup();
    const bareCtx: ToolContext = { actor: founder };
    const catalog = await registry.executeTool('get_product_catalog', bareCtx, {});
    expect(catalog.data.observation).toBe('unavailable');
    expect(catalog.data.reasonCode).toBe('PLATFORM_STORE_NOT_WIRED');
    expect(catalog.data.count).toBe(0);

    const ledger = await registry.executeTool('get_payment_ledger_summary', bareCtx, {});
    expect(ledger.data.observation).toBe('unavailable');
    expect(ledger.data.reasonCode).toBe('PLATFORM_STORE_NOT_WIRED');
    expect(ledger.data.totalGrossSen).toBe(0);

    const kpi = await registry.executeTool('get_operational_kpi', bareCtx, {});
    expect(kpi.data.avgDeliveryHours).toBeNull();
    expect(kpi.data.netOperatingMarginPercent).toBeNull();
    expect(kpi.data.netOperatingMarginReasonCode).toBe('COST_BASIS_UNAVAILABLE');
  });

  test('All tools in registry are guaranteed readOnly = true', () => {
    const { registry } = setup();
    const tools = registry.listTools();
    for (const tool of tools) {
      expect(tool.readOnly).toBe(true);
    }
  });
});
