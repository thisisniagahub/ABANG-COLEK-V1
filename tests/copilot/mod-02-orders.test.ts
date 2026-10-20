import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import type { OrderRecord } from '../../shared/platform-contracts';

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

describe('MOD-02: Orders & Tracking Copilot Integration Suite', () => {
  function setupOrders() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const domainRegistry = new DomainToolRegistry();

    const founder = makePrincipal('founder-01', 'founder');
    const customerA = makePrincipal('cust-A', 'customer');
    const customerB = makePrincipal('cust-B', 'customer');

    // Create a product and stock
    const p1 = commerce.saveProduct(founder, {
      name: 'Sambal Colek Klasik (Botol 250g)',
      description: 'Sambal warisan',
      priceSen: 1500,
      packSize: 1,
      publish: true,
    });

    store.save('lots', {
      id: 'lot-01',
      productId: p1.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 100,
      status: 'available',
      revision: 1,
      expiryAt: new Date(Date.now() + 180 * 24 * 3600_000).toISOString(),
    });

    // Customer A submits an order
    const orderInput = {
      lines: [{ productId: p1.id, quantity: 2 }],
      catalogueVersion: commerce.version(),
      fulfilment: 'delivery' as const,
      contactRef: 'Ahmad Colek, No 12 Jalan Kebun, 50000 Kuala Lumpur, Tel: 0123456789',
      outletId: 'hq',
    };

    const orderA = commerce.submitOrder(customerA, orderInput, 'idemp-order-A-01');

    return { store, auth, loyalty, commerce, domainRegistry, founder, customerA, customerB, p1, orderA };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Order Status & Tracking)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Penjejakan Pesanan & Status Konsainan', () => {
    test('Pelanggan boleh menjejak pesanan sendiri dengan token penjejakan yang sah', () => {
      const { commerce, orderA } = setupOrders();

      expect(orderA.id).toBeDefined();
      expect(orderA.trackingToken).toBeDefined();

      const tracked = commerce.trackOrder(orderA.trackingToken);
      // WHY CHANGED: the public tracking route now returns a PUBLIC PROJECTION
      // (MOD-02). The old assertion `tracked.id === orderA.id` encoded the leak
      // of the private order id into an unauthenticated endpoint — that was the
      // defect. The private order id must NOT be present; an opaque publicRef
      // is exposed instead.
      expect((tracked as { id?: string }).id).toBeUndefined();
      expect((tracked as { orderId?: string }).orderId).toBeUndefined();
      expect(tracked.publicRef).toBeDefined();
      expect(tracked.status).toBe('requested');
      expect(tracked.fulfilment).toBe('delivery');
      expect(tracked.city).toBe('Kuala Lumpur');
    });

    test('Alatan domain track_consignment memulangkan status konsainan sebenar dan tidak memalsukan status', async () => {
      // WHY CHANGED: the old assertion ran the tool on a ToolContext with NO
      // platform store and expected a hardcoded 'on_schedule'. Since the v1.1
      // domain tools, `track_consignment` reads the REAL `bus_shipments`
      // record (server/platform/domainTools.ts:869) and refuses to invent a
      // status. The test now seeds a real shipment, asserts the COMPUTED
      // status/props, and proves the tool reports NOT_FOUND (never a
      // fabricated status) for a consignment that does not exist.
      const { store, domainRegistry, customerA } = setupOrders();

      store.save('bus_shipments', {
        id: 'SHP-001',
        reference: 'CSG-KB-2026-99',
        consignmentNo: 'CSG-KB-2026-99',
        status: 'on_schedule',
        routeId: 'RTE-KL-01',
        cartonCount: 12,
        totalWeightKg: 145.5,
        scheduledDeparture: new Date(Date.now() + 3600_000).toISOString(),
        revision: 3,
      });

      const ctx: ToolContext = { actor: customerA, store };

      const res = await domainRegistry.executeTool('track_consignment', ctx, {
        consignmentNo: 'CSG-KB-2026-99',
      });

      expect(res.ok).toBe(true);
      expect(res.data.found).toBe(true);
      expect(res.data.status).toBe('on_schedule');
      expect(res.data.routeId).toBe('RTE-KL-01');
      expect(res.data.cartonCount).toBe(12);
      expect(res.data.totalWeightKg).toBe(145.5);
      expect(res.data.revision).toBe(3);
      expect(res.data.observation).toBe('observed');
      expect(res.data.recordReasonCode).toBeUndefined();

      // A2UI Fixed Schema validation
      expect(res.a2ui).toBeDefined();
      expect(res.a2ui!.component).toBe('OrderTrackingBadge');
      expect(res.a2ui!.props.consignmentNo).toBe('CSG-KB-2026-99');
      expect(res.a2ui!.props.status).toBe('on_schedule');
      expect(res.a2ui!.props.routeId).toBe('RTE-KL-01');
      expect(res.a2ui!.provenance.source).toBe('database');

      // Tiada status rekaan untuk konsainan yang tidak wujud
      const missing = await domainRegistry.executeTool('track_consignment', ctx, {
        consignmentNo: 'CSG-TIDAK-WUJUD-99',
      });
      expect(missing.ok).toBe(true);
      expect(missing.data.found).toBe(false);
      expect(missing.data.status).toBe('NOT_FOUND');
      expect(missing.data.recordReasonCode).toBe('RECORD_NOT_FOUND');
      expect(missing.data.observation).toBe('observed');
      expect(missing.a2ui).toBeDefined();
      expect(missing.a2ui!.component).toBe('OrderTrackingCard');
      expect(missing.a2ui!.props.reasonCode).toBe('RECORD_NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: IDOR Protection & PII Sanitization
  // --------------------------------------------------------------------------
  describe('Dimension 2: Perlindungan IDOR & Penapisan Data Peribadi PII', () => {
    test('Pelanggan B dilarang mengakses pesanan milik Pelanggan A (IDOR defense)', () => {
      const { store, auth, customerB, orderA } = setupOrders();

      // Semakan kebenaran akses rekod pesanan secara peribadi
      expectDomainError(() => {
        auth.own(customerB, orderA.customerId, orderA.outletId);
      }, 'FORBIDDEN');
    });

    test('Unjuran penjejakan awam (trackOrder) tidak mendedahkan nombor telefon atau token rahsia', () => {
      const { commerce, orderA } = setupOrders();

      const tracked = commerce.trackOrder(orderA.trackingToken);

      // Pastikan maklumat PII seperti nombor telefon dan hash token tidak terdedah
      expect((tracked as any).trackingTokenHash).toBeUndefined();
      expect((tracked as any).phone).toBeUndefined();
      expect((tracked as any).contactRef).toBeUndefined();
      expect((tracked as any).customerId).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Malformed Input Rejection
  // --------------------------------------------------------------------------
  describe('Dimension 3: Penolakan Input Pincang & Token Tidak Sah', () => {
    test('Menolak token kosong, mengandungi bait nol, bukan rentetan teks, atau terlampau panjang', () => {
      const { commerce } = setupOrders();

      // Token kosong
      expectDomainError(() => commerce.trackOrder(''), 'INVALID_TOKEN');

      // Token dengan aksara nol \0
      expectDomainError(() => commerce.trackOrder('bad\0token'), 'INVALID_TOKEN');

      // Token melebihi had 2048 aksara
      expectDomainError(() => commerce.trackOrder('a'.repeat(2049)), 'INVALID_TOKEN');

      // Bukan string
      expectDomainError(() => commerce.trackOrder(null), 'INVALID_TOKEN');
      expectDomainError(() => commerce.trackOrder(12345), 'INVALID_TOKEN');
    });

    test('Alatan get_order_details menolak input tanpa orderId yang diperlukan mengikut skema', async () => {
      const { domainRegistry, customerA } = setupOrders();
      const ctx: ToolContext = { actor: customerA };

      expect(domainRegistry.executeTool('get_order_details', ctx, {})).rejects.toThrow(
        /Medan 'orderId' diperlukan/
      );
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: Token Expiry & Revocation
  // --------------------------------------------------------------------------
  describe('Dimension 4: Semakan Token Penjejakan Luput (Expiry / Revocation)', () => {
    test('Token penjejakan yang telah tamat tempoh ditolak dengan kod TRACKING_TOKEN_EXPIRED (410)', () => {
      const { store, commerce, orderA } = setupOrders();

      // Kemas kini tarikh luput token ke masa lalu
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const updatedOrder: OrderRecord = {
        ...store.require<OrderRecord>('orders', orderA.id),
        trackingTokenExpiresAt: expiredAt,
      };
      store.save('orders', updatedOrder);

      expectDomainError(() => commerce.trackOrder(orderA.trackingToken), 'TRACKING_TOKEN_EXPIRED');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Non-existent Record / Not-Found Handling
  // --------------------------------------------------------------------------
  describe('Dimension 5: Pengendalian Rekod Tidak Wujud Secara Selamat', () => {
    test('Token rawak atau tidak wujud memulangkan ORDER_NOT_FOUND tanpa crash', () => {
      const { commerce } = setupOrders();
      expectDomainError(() => commerce.trackOrder('random-non-existent-token-xyz-12345'), 'ORDER_NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Stale & Cancelled Order Status Handling
  // --------------------------------------------------------------------------
  describe('Dimension 6: Pengendalian Status Pesanan Dibatalkan', () => {
    test('Pesanan yang telah dibatalkan mengekalkan status cancelled yang tepat', () => {
      const { store, commerce, orderA } = setupOrders();

      const cancelledOrder: OrderRecord = {
        ...store.require<OrderRecord>('orders', orderA.id),
        fulfilmentStatus: 'cancelled',
        revision: orderA.revision + 1,
      };
      store.save('orders', cancelledOrder);

      const tracked = commerce.trackOrder(orderA.trackingToken);
      expect(tracked.status).toBe('cancelled');
      expect(tracked.fulfilmentStatus).toBe('cancelled');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Budget Enforcement
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Alatan Pesanan Copilot', () => {
    test('Memastikan semakan status alatan tertakluk kepada had 6 panggilan per sesi', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'cust-orders-01',
        role: 'customer',
        runId: 'run-orders-budget-1',
        dispatchesCount: 0,
        maxDispatches: 6,
      };

      for (let i = 0; i < 6; i++) {
        const res = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res.ok).toBe(true);
      }

      const overBudget = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
      expect(overBudget.ok).toBe(false);
      if (!overBudget.ok) {
        expect(overBudget.code).toBe('TOOL_BUDGET_EXCEEDED');
      }
    });
  });
});
