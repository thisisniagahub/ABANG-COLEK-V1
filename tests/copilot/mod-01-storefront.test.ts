import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { DomainToolRegistry, type ToolContext } from '../../server/platform/domainTools';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import {
  calculateCustomerCartTotals,
  customerCartOrderAnswers,
  validateCustomerCart,
} from '../../src/features/flows/customer-cart';
import type { InventoryReservation, OrderRecord, PublicProduct, StockLot } from '../../shared/platform-contracts';

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

describe('MOD-01: Storefront & Katalog Copilot Integration Suite', () => {
  function setupStorefront() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const domainRegistry = new DomainToolRegistry();

    const founder = makePrincipal('founder-01', 'founder');
    const customer = makePrincipal('cust-01', 'customer');

    // Seed initial products via founder (id is generated automatically if omitted)
    const p1 = commerce.saveProduct(founder, {
      name: 'Sambal Colek Klasik (Botol 250g)',
      description: 'Sambal colek cili padi asli warisan Kelantan',
      priceSen: 1500,
      packSize: 2,
      publish: true,
    });

    const p2 = commerce.saveProduct(founder, {
      name: 'Kicap Meletup Pedas (Botol 250g)',
      description: 'Kicap manis pedas berapi untuk colek buah',
      priceSen: 1800,
      packSize: 1,
      publish: true,
    });

    // Seed stock lots so availableQuantity > 0
    store.save('lots', {
      id: 'lot-sambal-01',
      productId: p1.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 100,
      status: 'available',
      revision: 1,
      batchId: 'BATCH-2026-01',
      expiryAt: new Date(Date.now() + 180 * 24 * 3600_000).toISOString(),
    });

    store.save('lots', {
      id: 'lot-kicap-01',
      productId: p2.id,
      ownerId: 'business',
      locationId: 'hq',
      custodyId: 'business',
      quantity: 50,
      status: 'available',
      revision: 1,
      batchId: 'BATCH-2026-02',
      expiryAt: new Date(Date.now() + 180 * 24 * 3600_000).toISOString(),
    });

    // The advanced tool registry resolves authority from the canonical
    // membership table (server/agents/tools/scope.ts), so the customer needs a
    // real active membership row — not only an in-memory Principal.
    store.db
      .query('INSERT INTO users VALUES(?,?,?,?,?)')
      .run('cust-01', 'cust-01@test.local', 'User cust-01', 'scrypt:00:00', new Date().toISOString());
    store.db
      .query('INSERT INTO memberships VALUES(?,?,?,?,?,?,?)')
      .run('mem-cust-01', 'cust-01', 'customer', JSON.stringify([]), null, 'active', 1);

    return { store, auth, loyalty, commerce, domainRegistry, founder, customer, p1, p2 };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Search & Compare Products)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Carian & Perbandingan Produk', () => {
    test('Pengguna boleh mencari produk aktif dan membandingkan ciri secara sahih', async () => {
      const { domainRegistry, commerce, customer, p1, p2 } = setupStorefront();
      const ctx: ToolContext = { actor: customer, commerce };

      const res = await domainRegistry.executeTool('get_product_catalog', ctx, {});
      expect(res.ok).toBe(true);
      expect(res.data.products.length).toBeGreaterThanOrEqual(2);

      const items: Array<{ id: string; name: string; priceSen: number; stock: number }> = res.data.products;
      const sambal = items.find((i) => i.id === p1.id);
      const kicap = items.find((i) => i.id === p2.id);

      expect(sambal).toBeDefined();
      expect(kicap).toBeDefined();
      expect(sambal!.priceSen).toBe(1500);
      expect(kicap!.priceSen).toBe(1800);
      expect(sambal!.stock).toBe(100);

      // Perbandingan produk side-by-side
      const diffPrice = kicap!.priceSen - sambal!.priceSen;
      expect(diffPrice).toBe(300); // Kicap lebih mahal 300 sen (RM 3.00)

      // Ciri tidak diketahui (e.g. data alahan yang tidak direkodkan) tidak direka-reka
      expect((sambal as any).allergenWarning).toBeUndefined();
      expect((kicap as any).allergenWarning).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Cart Draft Creation & Pricing Calculations
  // --------------------------------------------------------------------------
  describe('Dimension 2: Penyediaan Draf Bakul & Pengiraan Harga Integer Sen', () => {
    test('Penyediaan draf bakul mengira subtotal dan jumlah harga integer sen tepat', async () => {
      const { store, commerce, customer, p1, p2 } = setupStorefront();
      const catalogue = commerce.catalogue();

      const cartLines = [
        { productId: p1.id, quantity: 4 }, // 4 * 1500 = 6000
        { productId: p2.id, quantity: 2 }, // 2 * 1800 = 3600
      ];

      const validated = validateCustomerCart(cartLines, catalogue);
      expect(validated).toEqual(cartLines);

      const totals = calculateCustomerCartTotals(cartLines, catalogue);
      expect(totals.subtotalSen).toBe(9600); // RM 96.00
      expect(totals.totalSen).toBe(9600);

      // Quote kanonikal daripada commerce engine
      const quote = commerce.quote(customer, {
        lines: cartLines,
        catalogueVersion: commerce.version(),
        fulfilment: 'delivery',
        contactRef: 'Ahmad, Petaling Jaya',
      });

      expect(quote.subtotalSen).toBe(9600);
      expect(quote.totalSen).toBe(9600);
      expect(quote.priceVersion).toBe(commerce.version());
      expect(Number.isInteger(quote.totalSen)).toBe(true);

      // Diagnose checkout copilot tool.
      // WHY CHANGED: ADV-05 diagnoses a REAL ORDER by id (input schema
      // `{ orderId }` — server/agents/tools/capabilities/commerce.ts:75). The
      // old assertion dispatched the legacy `{ lines }` payload against a
      // registry with no platform store, so it could only ever prove that
      // validation passed. The intent — a genuine basket diagnosis is valid
      // and needs no reprice — is now proven against a real submitted order
      // inside the canonical store.
      const approvalStore = new MemoryApprovalStore();
      const runtime = createToolRuntime({ store, approvalStore });
      const toolReg = new ToolRegistry(6, { runtime });

      const submitted = commerce.submitOrder(
        customer,
        {
          lines: cartLines,
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Ahmad, Petaling Jaya',
          outletId: 'hq',
        },
        'idem-storefront-diagnose-1',
      );

      const orderBefore = store.require<OrderRecord>('orders', submitted.id);

      const dispatchCtx: ToolDispatchContext = {
        actorId: customer.user.id,
        role: 'customer',
        runId: 'run-diagnose-1',
        dispatchesCount: 0,
        maxDispatches: 6,
      };

      const diag = await toolReg.dispatchTool(
        'diagnose_checkout',
        { orderId: submitted.id },
        dispatchCtx,
      );
      expect(diag.ok).toBe(true);
      if (diag.ok) {
        expect(diag.result.valid).toBe(true);
        expect(diag.result.requiresReprice).toBe(false);
        expect(diag.result.orderId).toBe(submitted.id);
        expect(diag.result.itemCount).toBe(2);
        expect(diag.result.catalogueVersion).toBe(commerce.version());
        expect(diag.result.mutated).toBe(false);
        // Tiada konflik stok untuk pesanan yang disokong simpanan sebenar
        expect(diag.result.lines).toHaveLength(2);
        for (const line of diag.result.lines) {
          expect(line.sufficient).toBe(true);
          expect(line.coveredQuantity).toBeGreaterThanOrEqual(line.requestedQuantity);
        }
        expect(
          diag.result.issues.filter((issue: string) => issue.startsWith('STOK_MENCUKUPI')),
        ).toHaveLength(0);
        expect(
          diag.result.issues.filter((issue: string) => issue.startsWith('KATALOG_UFUK')),
        ).toHaveLength(0);
        // Bayaran belum disahkan — isu makluman, bukan blockade
        expect(diag.result.paymentState).toBe('pending');
        expect(diag.result.issues).toContain('BAYARAN_MENUNGGU_VERIFIKASI');
      }

      // Diagnosa tidak menulis apa-apa ke rekod pesanan
      expect(store.require<OrderRecord>('orders', submitted.id)).toEqual(orderBefore);
    });

    test('Diagnos checkout mengesan konflik stok sebenar pada pesanan yang benar-benar rosak', async () => {
      // WHY ADDED: the old test only ever asserted `valid === true`, which is
      // exactly what an unconditional facade would also return. ADV-05 must
      // prove it runs a REAL conflict detector: here the stock backing the
      // order is genuinely gone (lots emptied AND the order's own reservations
      // expired), so the diagnosis MUST report the shortfall and must NOT
      // claim the order is valid.
      const { store, commerce, customer, p1 } = setupStorefront();

      const approvalStore = new MemoryApprovalStore();
      const runtime = createToolRuntime({ store, approvalStore });
      const toolReg = new ToolRegistry(6, { runtime });

      const submitted = commerce.submitOrder(
        customer,
        {
          lines: [{ productId: p1.id, quantity: 4 }],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Ahmad, Petaling Jaya',
          outletId: 'hq',
        },
        'idem-storefront-diagnose-conflict-1',
      );

      // Kehilangan sebenar stok fizikal dan simpanan pesanan itu.
      for (const reservation of store.all<InventoryReservation>('reservations')) {
        if (reservation.orderId !== submitted.id) continue;
        store.save('reservations', {
          ...reservation,
          status: 'expired',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
          revision: reservation.revision + 1,
        });
      }
      for (const lot of store.all<StockLot>('lots')) {
        store.save('lots', { ...lot, quantity: 0, revision: lot.revision + 1 });
      }

      const dispatchCtx: ToolDispatchContext = {
        actorId: customer.user.id,
        role: 'customer',
        runId: 'run-diagnose-conflict-1',
        dispatchesCount: 0,
        maxDispatches: 6,
      };

      const diag = await toolReg.dispatchTool(
        'diagnose_checkout',
        { orderId: submitted.id },
        dispatchCtx,
      );
      expect(diag.ok).toBe(true);
      if (diag.ok) {
        expect(diag.result.orderId).toBe(submitted.id);
        expect(diag.result.itemCount).toBe(1);
        expect(diag.result.valid).toBe(false);
        const stockIssues = diag.result.issues.filter((issue: string) =>
          issue.startsWith('STOK_MENCUKUPI'),
        );
        expect(stockIssues).toHaveLength(1);
        expect(stockIssues[0]).toContain(p1.id);
        expect(stockIssues[0]).toContain('perlu 4');
        expect(stockIssues[0]).toContain('ada 0');

        // Butiran baris mesti menunjukkan kekurangan sebenar
        const line = diag.result.lines[0];
        expect(line.requestedQuantity).toBe(4);
        expect(line.reservedQuantity).toBe(0);
        expect(line.freeQuantity).toBe(0);
        expect(line.coveredQuantity).toBe(0);
        expect(line.sufficient).toBe(false);

        // Katalog tidak berubah, jadi tiada reprice — kekal blockade hanya dari stok
        expect(diag.result.requiresReprice).toBe(false);
        expect(diag.result.mutated).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Malformed Input / Negative Quantity Rejection
  // --------------------------------------------------------------------------
  describe('Dimension 3: Penolakan Input Pincang & Kuantiti Negatif', () => {
    test('Menolak kuantiti negatif, sifar, atau perpuluhan dalam quote dan bakul', () => {
      const { commerce, customer, p1 } = setupStorefront();

      // Kuantiti negatif
      expectDomainError(() => {
        commerce.quote(customer, {
          lines: [{ productId: p1.id, quantity: -2 }],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Ahmad, KL',
        });
      }, 'INVALID_INPUT');

      // Kuantiti sifar
      expectDomainError(() => {
        commerce.quote(customer, {
          lines: [{ productId: p1.id, quantity: 0 }],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Ahmad, KL',
        });
      }, 'INVALID_INPUT');

      // Kuantiti bukan gandaan pek (packSize sambal ialah 2, cuba beli 3)
      expectDomainError(() => {
        commerce.quote(customer, {
          lines: [{ productId: p1.id, quantity: 3 }],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Ahmad, KL',
        });
      }, 'INVALID_PACK_QUANTITY');

      // Senarai barisan kosong
      expectDomainError(() => {
        commerce.quote(customer, {
          lines: [],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Ahmad, KL',
        });
      }, 'INVALID_ORDER_LINES');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: IDOR / Cross-Org Isolation & Private Data Protection
  // --------------------------------------------------------------------------
  describe('Dimension 4: Perlindungan IDOR & Pengasingan Data Sulit Pembekal', () => {
    test('Produk tidak diterbitkan (draft) tersembunyi daripada pelanggan dan tidak boleh di-quote', () => {
      const { commerce, customer, founder } = setupStorefront();

      // Simpan produk draft
      const draft = commerce.saveProduct(founder, {
        name: 'Sambal Resipi Sulit Pembekal',
        description: 'Prototaip belum diluluskan',
        priceSen: 9900,
        packSize: 1,
        publish: false, // Draft!
      });

      const publicCatalogue = commerce.catalogue();
      expect(publicCatalogue.some((p) => p.id === draft.id)).toBe(false);

      // Pelanggan cuba memanggil quote bagi produk draft secara terus
      expectDomainError(() => {
        commerce.quote(customer, {
          lines: [{ productId: draft.id, quantity: 1 }],
          catalogueVersion: commerce.version(),
          fulfilment: 'delivery',
          contactRef: 'Intruder, KL',
        });
      }, 'PRODUCT_UNAVAILABLE');
    });

    test('Katalog awam tidak mendedahkan kos pembekal atau margin sulit dalam objek PublicProduct', () => {
      const { commerce } = setupStorefront();
      const catalogue = commerce.catalogue();
      for (const item of catalogue) {
        expect((item as any).cogsSen).toBeUndefined();
        expect((item as any).supplierId).toBeUndefined();
        expect((item as any).marginBps).toBeUndefined();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Empty Search Results Handling
  // --------------------------------------------------------------------------
  describe('Dimension 5: Pengendalian Carian Kosong Tanpa Ralat Crash', () => {
    test('Carian dengan SKU atau istilah tidak wujud memulangkan senarai kosong dengan selamat', () => {
      const { commerce } = setupStorefront();
      const all = commerce.catalogue();

      const queryTerm = 'rendang_tok_rare_non_existent';
      const filtered = all.filter((p) => p.name.toLowerCase().includes(queryTerm.toLowerCase()));

      expect(filtered).toBeArray();
      expect(filtered.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Stale Draft / Requote Required Rejection
  // --------------------------------------------------------------------------
  describe('Dimension 6: Penolakan Draf Basi Apabila Versi Katalog Berubah', () => {
    test('Draf pesanan dengan versi katalog lama ditolak dengan REQUOTE_REQUIRED', () => {
      const { commerce, customer, founder, p1 } = setupStorefront();
      const oldVersion = commerce.version();

      // Ubah harga produk oleh founder -> versi katalog meningkat
      commerce.saveProduct(founder, {
        id: p1.id,
        expectedRevision: p1.revision,
        name: p1.name,
        description: p1.description,
        priceSen: 1600, // Harga baharu RM 16.00
        packSize: p1.packSize,
        publish: true,
      });

      const newVersion = commerce.version();
      expect(newVersion).toBeGreaterThan(oldVersion);

      // Pelanggan hantar draf menggunakan oldVersion
      expectDomainError(() => {
        commerce.quote(customer, {
          lines: [{ productId: p1.id, quantity: 2 }],
          catalogueVersion: oldVersion, // Versi basi
          fulfilment: 'delivery',
          contactRef: 'Pembeli, Shah Alam',
        });
      }, 'REQUOTE_REQUIRED');

      // Hantar dengan newVersion berjaya
      const freshQuote = commerce.quote(customer, {
        lines: [{ productId: p1.id, quantity: 2 }],
        catalogueVersion: newVersion,
        fulfilment: 'delivery',
        contactRef: 'Pembeli, Shah Alam',
      });
      expect(freshQuote.subtotalSen).toBe(3200); // 2 * 1600
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Tool Execution Budget Enforcement (Max 6 Dispatches)
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Panggilan Alatan Copilot', () => {
    test('Panggilan alatan ke-7 disekat dengan kod TOOL_BUDGET_EXCEEDED', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'cust-budget-01',
        role: 'customer',
        runId: 'run-storefront-budget',
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
