import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { OperationsBriefMcpApp } from '../../server/platform/mcp/operationsBrief';
import type { HitlActionRequest } from '../../shared/copilot-contracts';

function makePrincipal(id: string, role: 'founder' | 'customer'): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role,
        outletIds: ['hq'],
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  } as unknown as Principal;
}

function setup() {
  const store = new PlatformStore(':memory:');
  const auth = new Auth(store);
  const loyalty = new Loyalty(store, auth);
  const commerce = new Commerce(store, auth, loyalty);
  const founder = makePrincipal('founder-01', 'founder');
  const customer = makePrincipal('cust-01', 'customer');

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
    'idemp-mcp-brief-01'
  );

  return { store, commerce, founder, customer, product, order };
}

describe('Operations Brief First-Party Read-Only MCP App (computed from the canonical store)', () => {
  test('Daily brief metrics are computed from real store state', () => {
    const { store, order } = setup();
    const app = new OperationsBriefMcpApp(store);

    const { data, a2ui } = app.getDailyBrief();

    expect(data.period).toBe('daily');
    expect(data.readOnly).toBe(true);
    expect(data.observation).toBe('observed');
    expect(data.metrics.totalOrdersToday).toBe(1);
    expect(data.metrics.grossSalesSen).toBe(order.amountSen - order.refundAmountSen);
    expect(data.metrics.activeShipmentsInTransit).toBe(0);
    expect(data.metrics.pendingHitlApprovals).toBe(0);
    expect(a2ui.provenance.source).toBe('database');
  });

  test('Urgent brief names a REAL pending HITL action and never a fictional order id', () => {
    const { store, order } = setup();
    const hitl: HitlActionRequest = {
      id: 'hitl-real-001',
      actionType: 'refund',
      entity: { type: 'order', id: order.id },
      amountSen: order.amountSen,
      revision: order.revision,
      reason: 'Aduan kualiti sebenar',
      expiry: new Date(Date.now() + 3600_000).toISOString(),
      status: 'pending_approval',
      description: 'Permintaan ganti rugi sebenar',
      payload: {},
      createdAt: new Date().toISOString(),
    };
    store.save('hitl_actions', hitl);

    const app = new OperationsBriefMcpApp(store);
    const { data, a2ui } = app.getUrgentBrief();

    expect(data.period).toBe('urgent');
    expect(data.observation).toBe('observed');
    expect(data.metrics.pendingHitlApprovals).toBe(1);
    expect(data.pendingHitlActionIds).toEqual(['hitl-real-001']);
    expect(data.highlights.join(' ')).toContain('hitl-real-001');
    expect(data.highlights.join(' ')).not.toContain('ORD-9988');
    expect(a2ui.provenance.source).toBe('database');
    expect(a2ui.props.status).toBe('ATTENTION_REQUIRED');
  });

  test('Without a store the brief reports unavailable instead of plausible constants', () => {
    const app = new OperationsBriefMcpApp();
    const { data, a2ui } = app.getDailyBrief();

    expect(data.observation).toBe('unavailable');
    expect(data.reasonCode).toBe('PLATFORM_STORE_NOT_WIRED');
    expect(data.metrics.totalOrdersToday).toBeNull();
    expect(data.metrics.grossSalesSen).toBeNull();
    expect(data.metrics.pendingHitlApprovals).toBeNull();
    expect(data.highlights).toEqual([]);
    expect(a2ui.provenance.source).toBe('local_authoritative');
    expect(a2ui.props.status).toBe('DATA_UNAVAILABLE');
  });

  test('MCP resources resolve to the computed brief payload', () => {
    const { store, order } = setup();
    const app = new OperationsBriefMcpApp(store);

    const dailyRes = app.resolveResource('operations://brief/daily');
    expect(dailyRes.contents.length).toBe(1);
    const daily = JSON.parse(dailyRes.contents[0].text);
    expect(daily.metrics.totalOrdersToday).toBe(1);
    expect(daily.metrics.grossSalesSen).toBe(order.amountSen - order.refundAmountSen);

    const urgentRes = app.resolveResource('operations://brief/urgent');
    expect(urgentRes.contents.length).toBe(1);
    const urgent = JSON.parse(urgentRes.contents[0].text);
    expect(urgent.period).toBe('urgent');

    expect(() => app.resolveResource('operations://unknown/resource')).toThrow(
      /tidak ditemui/
    );
  });

  test('get_operations_brief returns the same computed payload for daily and urgent', () => {
    const { store } = setup();
    const app = new OperationsBriefMcpApp(store);
    expect(app.getOperationsBrief({ type: 'daily' }).data.period).toBe('daily');
    expect(app.getOperationsBrief({ type: 'urgent' }).data.period).toBe('urgent');
    expect(app.getOperationsBrief({}).data.period).toBe('daily');
  });
});
