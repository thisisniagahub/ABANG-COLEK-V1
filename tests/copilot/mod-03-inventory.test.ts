import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
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

describe('MOD-03: Inventory & Quarantine Copilot Integration Suite', () => {
  function setupInventory() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const domainRegistry = new DomainToolRegistry();

    const founder = makePrincipal('founder-01', 'founder');
    const staff = makePrincipal('staff-01', 'staff', undefined, ['hq']);
    const customer = makePrincipal('cust-01', 'customer');

    const product = commerce.saveProduct(founder, {
      name: 'Sambal Colek Premium',
      description: 'Sambal berkualiti tinggi',
      priceSen: 2000,
      packSize: 1,
      publish: true,
    });

    // Create 3 lots:
    // Lot 1: FEFO early expiry (30 days from now)
    const lotEarly: StockLot = {
      id: 'lot-early-01',
      productId: product.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 50,
      status: 'available',
      revision: 1,
      batchId: 'BATCH-EARLY-30D',
      expiryAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    };
    store.save('lots', lotEarly);

    // Lot 2: FEFO late expiry (120 days from now)
    const lotLate: StockLot = {
      id: 'lot-late-02',
      productId: product.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 150,
      status: 'available',
      revision: 1,
      batchId: 'BATCH-LATE-120D',
      expiryAt: new Date(Date.now() + 120 * 24 * 3600_000).toISOString(),
    };
    store.save('lots', lotLate);

    // Lot 3: Already expired lot
    const lotExpired: StockLot = {
      id: 'lot-expired-03',
      productId: product.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 20,
      status: 'available',
      revision: 1,
      batchId: 'BATCH-EXPIRED',
      expiryAt: new Date(Date.now() - 24 * 3600_000).toISOString(), // 1 day ago
    };
    store.save('lots', lotExpired);

    return { store, auth, commerce, domainRegistry, founder, staff, customer, product, lotEarly, lotLate, lotExpired };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (FEFO Ordering & Available Count)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Penentuan Stok Sedia Ada & Susunan FEFO', () => {
    test('Mengira kuantiti sedia ada dengan mengecualikan stok luput secara automatik', () => {
      const { commerce, product } = setupInventory();

      // Lot early (50) + Lot late (150) = 200 unit sedia ada. Lot expired (20) dikecualikan.
      const availableUnits = commerce.available(product.id, 'business', 'hq');
      expect(availableUnits).toBe(200);
    });

    test('Memastikan susunan FEFO (First-Expired, First-Out) mendahulukan tarikh luput terawal', () => {
      const { store, product } = setupInventory();

      const lots = store
        .all<StockLot>('lots')
        .filter((l) => l.productId === product.id && l.status === 'available' && (!l.expiryAt || l.expiryAt > new Date().toISOString()))
        .sort((a, b) => (a.expiryAt || '').localeCompare(b.expiryAt || ''));

      expect(lots.length).toBe(2);
      expect(lots[0].id).toBe('lot-early-01'); // 30 hari dahulu
      expect(lots[1].id).toBe('lot-late-02');  // 120 hari kemudian
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Quarantine Isolation Invariant
  // --------------------------------------------------------------------------
  describe('Dimension 2: Pengasingan Kuarantin (Quarantine Isolation)', () => {
    test('Menolak lot yang dikuarantin daripada jumlah stok jualan (available)', () => {
      const { commerce, staff, product, lotEarly } = setupInventory();

      // Sebelum kuarantin: 200 unit sedia ada
      expect(commerce.available(product.id)).toBe(200);

      // Kakitangan kuarantin lotEarly (50 unit) kerana isu pembungkusan
      const quarantined = commerce.quarantine(staff, lotEarly.id, {
        expectedRevision: lotEarly.revision,
        status: 'quarantine',
        reason: 'Pemeriksaan botol mendapati penutup retak',
      });

      expect(quarantined.status).toBe('quarantine');
      expect(quarantined.revision).toBe(lotEarly.revision + 1);

      // Selepas kuarantin: 200 - 50 = 150 unit sahaja yang sedia ada
      const updatedAvailable = commerce.available(product.id);
      expect(updatedAvailable).toBe(150);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Role Authorization (Customer Rejection for Mutations)
  // --------------------------------------------------------------------------
  describe('Dimension 3: Keselamatan Peranan — Penolakan Akses Pelanggan untuk Mutasi Stok', () => {
    test('Pelanggan dilarang mengkuarantin stok atau meminda inventori (FORBIDDEN)', () => {
      const { commerce, customer, lotEarly } = setupInventory();

      expectDomainError(() => {
        commerce.quarantine(customer, lotEarly.id, {
          expectedRevision: lotEarly.revision,
          status: 'quarantine',
          reason: 'Customer trying to quarantine lot',
        });
      }, 'FORBIDDEN');
    });

    test('Alatan check_stock_levels menolak peranan customer', async () => {
      const { domainRegistry, customer, staff } = setupInventory();

      // Kakitangan dibenarkan
      const staffCtx: ToolContext = { actor: staff };
      const staffRes = await domainRegistry.executeTool('check_stock_levels', staffCtx, {});
      expect(staffRes.ok).toBe(true);

      // Pelanggan ditolak dengan mesej akses ditolak
      const custCtx: ToolContext = { actor: customer };
      expect(domainRegistry.executeTool('check_stock_levels', custCtx, {})).rejects.toThrow(
        /Akses ditolak/
      );
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: CAS Revision Conflict Detection
  // --------------------------------------------------------------------------
  describe('Dimension 4: Pengesanan Konflik Versi CAS (Compare-And-Swap)', () => {
    test('Cubaan mutasi kuarantin dengan expectedRevision basi ditolak dengan ralat CONCURRENT_MODIFICATION (409)', () => {
      const { commerce, staff, lotEarly } = setupInventory();

      // Versi semasa ialah lotEarly.revision (1). Cuba hantar dengan expectedRevision yang salah (99).
      expectDomainError(() => {
        commerce.quarantine(staff, lotEarly.id, {
          expectedRevision: 99,
          status: 'quarantine',
          reason: 'Stale revision mutation attempt',
        });
      }, 'REVISION_CONFLICT');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Empty / Zero Stock Handling
  // --------------------------------------------------------------------------
  describe('Dimension 5: Pengendalian Produk Tanpa Baki Stok', () => {
    test('Produk tanpa sebarang lot memulangkan 0 unit tanpa ralat', () => {
      const { commerce, founder } = setupInventory();

      const newProd = commerce.saveProduct(founder, {
        name: 'Sambal Colek Habis Stok',
        description: 'Belum diproses',
        priceSen: 1200,
        packSize: 1,
        publish: true,
      });

      expect(commerce.available(newProd.id)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Stale / Missing Lot Rejection
  // --------------------------------------------------------------------------
  describe('Dimension 6: Penolakan Lot Tidak Wujud atau Dipadam', () => {
    test('Cubaan kuarantin pada ID lot tidak wujud ditolak dengan NOT_FOUND', () => {
      const { commerce, staff } = setupInventory();

      expectDomainError(() => {
        commerce.quarantine(staff, 'lot-non-existent-xyz', {
          expectedRevision: 1,
          status: 'quarantine',
          reason: 'Unknown lot quarantine',
        });
      }, 'NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Tool Execution Budget Enforcement
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Panggilan Alatan Inventori', () => {
    test('Panggilan melebihi had 6 diskaun disekat oleh registri alatan', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'staff-inv-01',
        role: 'staff',
        runId: 'run-inv-budget',
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
    });
  });
});
