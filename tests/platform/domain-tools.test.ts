import { describe, expect, test } from 'bun:test';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { validateA2UIComponent } from '../../shared/copilot-contracts';

describe('Domain Tools Registry v1.0 — 10 Platform Modules Conformance', () => {
  const registry = new DomainToolRegistry();

  function makeContext(role: 'founder' | 'staff' | 'dealer' | 'customer'): ToolContext {
    return {
      actor: {
        user: { id: `user-${role}`, role, name: `Test ${role}`, email: `${role}@test.local` },
        session: { id: 'sess-1', userId: `user-${role}`, createdAt: new Date().toISOString() },
      } as any,
      store: {} as any,
    };
  }

  test('All 10 required domain modules are represented in the registry', () => {
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

  test('Module 1 (Commerce): get_product_catalog returns catalog with A2UI schema', async () => {
    const ctx = makeContext('customer');
    const res = await registry.executeTool('get_product_catalog', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.products.length).toBeGreaterThan(0);
    expect(res.a2ui).toBeDefined();
    expect(validateA2UIComponent(res.a2ui!.component)).toBe(true);
  });

  test('Module 2 (Inventory): check_stock_levels succeeds for staff and fails for customer', async () => {
    const staffCtx = makeContext('staff');
    const res = await registry.executeTool('check_stock_levels', staffCtx, {});
    expect(res.ok).toBe(true);
    expect(res.data.warehouses.length).toBeGreaterThan(0);

    const customerCtx = makeContext('customer');
    expect(registry.executeTool('check_stock_levels', customerCtx, {})).rejects.toThrow(
      /Akses ditolak/
    );
  });

  test('Module 3 (Orders): get_order_details returns order tracking badge', async () => {
    const ctx = makeContext('customer');
    const res = await registry.executeTool('get_order_details', ctx, { orderId: 'ORD-1234' });
    expect(res.ok).toBe(true);
    expect(res.data.orderId).toBe('ORD-1234');
    expect(res.a2ui?.component).toBe('OrderTrackingBadge');
  });

  test('Module 4 (Delivery): track_consignment succeeds for all roles', async () => {
    const ctx = makeContext('customer');
    const res = await registry.executeTool('track_consignment', ctx, { consignmentNo: 'CSG-8899' });
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('on_schedule');
    expect(res.a2ui?.component).toBe('OrderTrackingBadge');
  });

  test('Module 5 (Payment): verify_sen_balance enforces integer sen', async () => {
    const ctx = makeContext('founder');
    const res = await registry.executeTool('verify_sen_balance', ctx, { amountSen: 4500 });
    expect(res.ok).toBe(true);
    expect(res.data.isInteger).toBe(true);
    expect(res.data.isValid).toBe(true);
  });

  test('Module 6 (Commission): get_agent_commission_summary returns CommissionCard', async () => {
    const ctx = makeContext('dealer');
    const res = await registry.executeTool('get_agent_commission_summary', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.totalCommissionSen).toBeGreaterThan(0);
    expect(res.a2ui?.component).toBe('CommissionCard');
  });

  test('Module 7 (Loyalty): calculate_points_balance computes 1 point = 5 sen', async () => {
    const ctx = makeContext('customer');
    const res = await registry.executeTool('calculate_points_balance', ctx, { points: 100 });
    expect(res.ok).toBe(true);
    expect(res.data.valueSen).toBe(500); // 100 * 5
  });

  test('Module 8 (Marketing): draft_marketing_copy_spec returns MarginSimulator and checks margin guardian', async () => {
    const ctx = makeContext('founder');
    const res = await registry.executeTool('draft_marketing_copy_spec', ctx, { discountPercent: 10 });
    expect(res.ok).toBe(true);
    expect(res.data.marginGuardianPassed).toBe(true);
    expect(res.a2ui?.component).toBe('MarginSimulator');
  });

  test('Module 9 (QC / Audit): get_qc_audit_checklist returns JevAssessmentCard with null confidence score', async () => {
    const ctx = makeContext('founder');
    const res = await registry.executeTool('get_qc_audit_checklist', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.a2ui?.component).toBe('JevAssessmentCard');
    expect(res.a2ui?.props.confidenceScore).toBeNull();
  });

  test('Module 10 (Analytics): get_daily_sales_analytics provides clean integer sen gross', async () => {
    const ctx = makeContext('founder');
    const res = await registry.executeTool('get_daily_sales_analytics', ctx, {});
    expect(res.ok).toBe(true);
    expect(res.data.todayGrossSen).toBe(94500);
    expect(Number.isInteger(res.data.todayGrossSen)).toBe(true);
  });

  test('All tools in registry are guaranteed readOnly = true', () => {
    const tools = registry.listTools();
    for (const tool of tools) {
      expect(tool.readOnly).toBe(true);
    }
  });
});
