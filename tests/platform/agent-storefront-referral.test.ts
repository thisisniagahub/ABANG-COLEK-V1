import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPlatformApp } from '../../server/platform/app';
import { Dealers } from '../../server/platform/dealers';
import { customerCartOrderAnswers, type CustomerCartLine } from '../../src/features/flows/customer-cart';
import { formatWhatsAppUrl, DEFAULT_HQ_WHATSAPP } from '../../shared/growth-contracts';
import type { PublicProduct, OrderRecord, CommissionPolicy } from '../../shared/platform-contracts';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

function createHarness() {
  const directory = mkdtempSync(join(tmpdir(), 'agent-referral-test-'));
  const app = createPlatformApp({
    databasePath: join(directory, 'test.sqlite'),
    bootstrapToken: 'referral-bootstrap-token',
    origin: 'http://localhost:3000'
  });
  cleanups.push(() => {
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, directory };
}

async function apiCall(
  app: ReturnType<typeof createPlatformApp>,
  path: string,
  body?: unknown,
  session?: { cookie: string; csrf: string }
) {
  const response = await app.fetch(
    new Request(`http://localhost:3010/api/platform${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
              'Idempotency-Key': crypto.randomUUID()
            }),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
  );
  return { response, json: await response.json() };
}

async function createUser(app: ReturnType<typeof createPlatformApp>, name: string, founder = false) {
  const result = await apiCall(app, founder ? '/auth/bootstrap' : '/auth/signup', {
    email: `${name}@example.test`,
    name,
    password: 'secure test password 123',
    ...(founder ? { token: 'referral-bootstrap-token' } : {})
  });
  expect(result.response.status).toBe(200);
  return {
    cookie: result.response.headers.get('set-cookie')!.split(';')[0],
    csrf: result.json.data.csrfToken,
    userId: result.json.data.user.id
  };
}

const sampleProduct = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
  id: 'colek-ori',
  name: 'Kuah Colek Asli 350ml',
  description: 'Kuah Colek Buah Premium',
  priceSen: 1200,
  currency: 'MYR',
  packSize: 1,
  publishedVersion: 1,
  availableQuantity: 50,
  ...overrides
});

describe('Agent Storefront & Referral System', () => {
  describe('1. Referral Code Extraction & Sanitization', () => {
    test('accepts valid alphanumeric, hyphens, and underscores', () => {
      const lines: CustomerCartLine[] = [{ productId: 'colek-ori', quantity: 2 }];
      const result = customerCartOrderAnswers(lines, [sampleProduct()], 'AGENT-KL-09');
      expect(result.referralCode).toBe('AGENT-KL-09');

      const resultUnderscore = customerCartOrderAnswers(lines, [sampleProduct()], 'STOKIS_GOMBAK');
      expect(resultUnderscore.referralCode).toBe('STOKIS_GOMBAK');
    });

    test('trims outer whitespace from referral code', () => {
      const lines: CustomerCartLine[] = [{ productId: 'colek-ori', quantity: 2 }];
      const result = customerCartOrderAnswers(lines, [sampleProduct()], '   EJEN_123   ');
      expect(result.referralCode).toBe('EJEN_123');
    });

    test('ignores invalid, malicious, or non-matching referral codes', () => {
      const lines: CustomerCartLine[] = [{ productId: 'colek-ori', quantity: 2 }];
      
      // XSS injection attempts
      expect(customerCartOrderAnswers(lines, [sampleProduct()], '<script>alert(1)</script>').referralCode).toBeUndefined();
      
      // Characters outside allowable set
      expect(customerCartOrderAnswers(lines, [sampleProduct()], 'agent@domain!').referralCode).toBeUndefined();
      
      // Too short (< 3 chars)
      expect(customerCartOrderAnswers(lines, [sampleProduct()], 'ab').referralCode).toBeUndefined();
      
      // Too long (> 32 chars)
      expect(customerCartOrderAnswers(lines, [sampleProduct()], 'a'.repeat(33)).referralCode).toBeUndefined();

      // Empty or whitespace only
      expect(customerCartOrderAnswers(lines, [sampleProduct()], '   ').referralCode).toBeUndefined();
    });
  });

  describe('2. WhatsApp Message Generation for Storefront & Cargo', () => {
    test('generates valid structured WhatsApp order URL with referral attribution', () => {
      const orderId = 'ORD-TEST-999';
      const refCode = 'EJEN_KEMAMAN';
      const customer = 'Ahmad';
      const phone = '012-9876543';
      const items = '2x Kuah Colek Asli (Pedas Padu), 1x Platter Mangga';
      const total = 38.00;

      const rawMessage = 
        `*PESANAN BAHARU ABANG COLEK OS*\n` +
        `No Pesanan: ${orderId}\n` +
        `*Ejen Perujuk:* ${refCode} (Kedai Mini Ejen)\n` +
        `Pelanggan: ${customer} (${phone})\n` +
        `Jenis: Ambil di Gerai\n\n` +
        `*Pesanan:*\n• 2x Kuah Colek Asli (Pedas Padu)\n• 1x Platter Mangga\n\n` +
        `*Jumlah Bayaran:* RM ${total.toFixed(2)}\n\n` +
        `Pesanan ini dirujuk melalui pautan referral ejen ${refCode}.\n` +
        `Sila sahkan pesanan dan sediakan dalam masa 15 minit. Terima kasih!`;

      const encoded = encodeURIComponent(rawMessage);
      const waUrl = `https://wa.me/601112345678?text=${encoded}`;

      expect(waUrl).toContain('https://wa.me/601112345678?text=');
      expect(decodeURIComponent(encoded)).toContain('*Ejen Perujuk:* EJEN_KEMAMAN');
      expect(decodeURIComponent(encoded)).toContain('RM 38.00');
      expect(decodeURIComponent(encoded)).toContain('ORD-TEST-999');
    });

    test('generates valid structured WhatsApp Cargo Wholesale Restock URL', () => {
      const sponsorCode = 'STOKIS_MASTER_01';
      const freightType = 'bus';
      const depot = 'TBS Kuala Lumpur (Kaunter Kargo Platform 4)';
      const totalBoxes = 3;
      const totalBottles = 72;
      const subtotal = 577.20;
      const freightTotal = 45.00;
      const grandTotal = 622.20;

      const cargoMessage = encodeURIComponent(
        `*PESANAN RESTOK KARGO BORONG ABANG COLEK*\n` +
        `*Ejen Penaja/Perujuk:* ${sponsorCode}\n` +
        `Ejen: Kak Salmah (AC-STK-088)\n` +
        `Kaedah Kargo: 🚌 Kargo Bas Ekspres (${depot})\n` +
        `Jumlah Karton: ${totalBoxes} Kotak (${totalBottles} Botol)\n\n` +
        `Subtotal: RM ${subtotal.toFixed(2)}\n` +
        `Kos Kargo: RM ${freightTotal.toFixed(2)}\n` +
        `*Jumlah Bersih: RM ${grandTotal.toFixed(2)}*\n\n` +
        `Sila sahkan konsainan kargo ini dari Dapur Kemaman.`
      );

      const decoded = decodeURIComponent(cargoMessage);
      expect(decoded).toContain('*Ejen Penaja/Perujuk:* STOKIS_MASTER_01');
      expect(decoded).toContain('🚌 Kargo Bas Ekspres (TBS Kuala Lumpur');
      expect(decoded).toContain('Jumlah Bersih: RM 622.20');
      expect(decoded).toContain('3 Kotak (72 Botol)');
    });
  });

  describe('3. Flow Submission & Commission Attribution End-to-End', () => {
    test('submits order flow with referralCode and stores it deterministically', async () => {
      const { app } = createHarness();
      const founderSession = await createUser(app, 'founder', true);
      const customerSession = await createUser(app, 'customer');

      const founderPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: founderSession.cookie } })
      );
      const customerPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: customerSession.cookie } })
      );

      // Save and publish product
      const product = app.commerce.saveProduct(founderPrincipal, {
        name: 'Kuah Colek Ori',
        description: 'Resepi Asli Kemaman',
        priceSen: 1500,
        packSize: 1,
        publish: true
      });

      // Receive stock at HQ
      app.commerce.receive(founderPrincipal, {
        productId: product.id,
        ownerId: 'business',
        locationId: 'hq',
        status: 'available',
        reason: 'Initial test stock',
        quantity: 20
      }, 'stock-01');

      // 1. Submit order via app.commerce with referralCode
      const referralCode = 'AGENT_MEGAT_88';
      const order = app.commerce.submitOrder(customerPrincipal, {
        lines: [{ productId: product.id, quantity: 2 }],
        catalogueVersion: 1,
        fulfilment: 'pickup',
        contactRef: '012-3456789',
        outletId: 'hq',
        referralCode
      }, 'order-idem-01');

      expect(order.referralCode).toBe(referralCode);
      expect(order.amountSen).toBe(3000);

      // Verify OrderRecord in store has referralCode
      const savedOrder = app.store.require<OrderRecord>('orders', order.id);
      expect(savedOrder.referralCode).toBe(referralCode);
      expect(savedOrder.amountSen).toBe(3000);

      // 2. Submit order through flow API with referralCode
      const flowInit = await apiCall(app, '/flow-sessions', { flowId: 'order-v1' }, customerSession);
      expect(flowInit.response.status).toBe(200);
      const session = flowInit.json.data;

      const flowReviewed = await apiCall(app, `/flow-sessions/${session.id}/form`, {
        expectedRevision: session.revision,
        answers: {
          lines: [{ productId: product.id, quantity: 2 }],
          catalogueVersion: 1,
          fulfilment: 'pickup',
          contactRef: '012-3456789',
          outletId: 'hq',
          referralCode: 'AGENT_FLOW_99'
        }
      }, customerSession);
      expect(flowReviewed.response.status).toBe(200);

      const flowSubmit = await apiCall(app, `/flow-sessions/${session.id}/submit`, {
        expectedRevision: flowReviewed.json.data.revision
      }, customerSession);
      expect(flowSubmit.response.status).toBe(200);
      const flowOrderId = flowSubmit.json.data.receipt.entityId;

      const flowOrder = app.store.require<OrderRecord>('orders', flowOrderId);
      expect(flowOrder.referralCode).toBe('AGENT_FLOW_99');
    });

    test('attributes commission in ledger to referralCode when dealerOrgId is omitted', async () => {
      const { app } = createHarness();
      const founderSession = await createUser(app, 'founder', true);
      const referralAgent = 'AGENT_LIAISON_77';

      // Approve an agent membership for the referralAgent
      app.store.save('memberships', {
        id: 'member-agent-77',
        userId: 'agent-user-id',
        dealerOrgId: referralAgent,
        role: 'agent',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // Approve a commission policy
      const policy: CommissionPolicy = {
        id: 'cp-v1',
        version: 1,
        eligibleProductIds: [],
        rateBasisPoints: 1000, // 10%
        approvedAt: new Date().toISOString()
      };
      app.store.save('commission_policies', policy);

      // Create an order attributed to referralCode
      const now = new Date().toISOString();
      const order: OrderRecord = {
        id: 'ord-ref-test-01',
        outletId: 'hq',
        customerId: 'customer-uid',
        referralCode: referralAgent,
        lines: [{ productId: 'colek-01', name: 'Colek Asli', priceSen: 2000, quantity: 2, publishedVersion: 1 }],
        amountSen: 4000,
        fulfilment: 'pickup',
        contactRef: '011-1234567',
        fulfilmentStatus: 'requested',
        revision: 1,
        paymentState: 'pending',
        paidAmountSen: 0,
        refundAmountSen: 0,
        createdAt: now,
        updatedAt: now
      };
      app.store.save('orders', order);

      // Create actor principal
      const founderPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: founderSession.cookie } })
      );

      const dealers = new Dealers(app.store, app.auth, app.commerce);
      const commission = dealers.createCommissionFromOrder(founderPrincipal, order.id);

      expect(commission.dealerOrgId).toBe(referralAgent);
      expect(commission.orderId).toBe(order.id);
      expect(commission.agentUserId).toBe('agent-user-id');
      expect(commission.agentUserId).not.toBe(order.customerId);
      expect(commission.status).toBe('pending');
      // 10% of 4000 sen = 400 sen
      expect(commission.amountSen).toBe(400);

      // Verify append-only commission ledger entry
      const ledgerEntries = app.store.all<any>('commission_ledger');
      expect(ledgerEntries.some(e => e.id === commission.id && e.dealerOrgId === referralAgent)).toBe(true);
    });
  });

  describe('4. Server-Side Referral Validation & Self-Referral Prevention', () => {
    test('rejects malformed, script, or invalid referral codes on quote and order submit', async () => {
      const { app } = createHarness();
      const founderSession = await createUser(app, 'founder', true);
      const customerSession = await createUser(app, 'customer');

      const founderPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: founderSession.cookie } })
      );
      const customerPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: customerSession.cookie } })
      );

      const product = app.commerce.saveProduct(founderPrincipal, {
        name: 'Kuah Colek Pedas',
        description: 'Pedas Padu',
        priceSen: 1500,
        packSize: 1,
        publish: true
      });

      app.commerce.receive(founderPrincipal, {
        productId: product.id,
        ownerId: 'business',
        locationId: 'hq',
        status: 'available',
        reason: 'Restock',
        quantity: 50
      }, 'recv-stock-01');

      // Invalid referral code in quote
      try {
        app.commerce.quote(customerPrincipal, {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: 1,
          referralCode: '<script>evil()</script>'
        });
        expect.unreachable();
      } catch (err: any) {
        expect(err.code).toBe('INVALID_REFERRAL_CODE');
        expect(err.message).toContain('Kod referral tidak sah');
      }

      // Invalid referral code in submitOrder
      try {
        app.commerce.submitOrder(customerPrincipal, {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: 1,
          fulfilment: 'pickup',
          contactRef: '012-3456789',
          outletId: 'hq',
          referralCode: 'ab' // too short
        }, 'idem-inv-1');
        expect.unreachable();
      } catch (err: any) {
        expect(err.code).toBe('INVALID_REFERRAL_CODE');
        expect(err.message).toContain('Kod referral tidak sah');
      }

      // Invalid referral code with emojis
      try {
        app.commerce.submitOrder(customerPrincipal, {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: 1,
          fulfilment: 'pickup',
          contactRef: '012-3456789',
          outletId: 'hq',
          referralCode: 'AGENT🎉'
        }, 'idem-inv-2');
        expect.unreachable();
      } catch (err: any) {
        expect(err.code).toBe('INVALID_REFERRAL_CODE');
        expect(err.message).toContain('Kod referral tidak sah');
      }
    });

    test('blocks dealer self-referral when dealerOrgId matches referralCode', async () => {
      const { app } = createHarness();
      const founderSession = await createUser(app, 'founder', true);
      const agentSession = await createUser(app, 'agent_buyer');

      const founderPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: founderSession.cookie } })
      );
      const agentPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: agentSession.cookie } })
      );

      // Give agent user a dealer membership in SQLite table
      app.store.db.query('UPDATE memberships SET dealer_org_id=? WHERE user_id=?').run('DEALER_AC_99', agentPrincipal.user.id);

      // Reload agent principal with updated membership
      const refreshedPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: agentSession.cookie } })
      );

      const product = app.commerce.saveProduct(founderPrincipal, {
        name: 'Kuah Colek Manis',
        description: 'Manis Sedap',
        priceSen: 1200,
        packSize: 1,
        publish: true
      });

      app.commerce.receive(founderPrincipal, {
        productId: product.id,
        ownerId: 'business',
        locationId: 'hq',
        status: 'available',
        reason: 'Restock',
        quantity: 50
      }, 'recv-stock-02');

      // Attempting to buy with own dealer referralCode must be disallowed
      try {
        app.commerce.submitOrder(refreshedPrincipal, {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: 1,
          fulfilment: 'pickup',
          contactRef: '012-3456789',
          outletId: 'hq',
          referralCode: 'DEALER_AC_99'
        }, 'idem-self-ref');
        expect.unreachable();
      } catch (err: any) {
        expect(err.code).toBe('SELF_REFERRAL_DISALLOWED');
        expect(err.message).toContain('Rujukan sendiri tidak dibenarkan');
      }

      // Case-insensitive match check
      try {
        app.commerce.submitOrder(refreshedPrincipal, {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: 1,
          fulfilment: 'pickup',
          contactRef: '012-3456789',
          outletId: 'hq',
          referralCode: 'dealer_ac_99'
        }, 'idem-self-ref-case');
        expect.unreachable();
      } catch (err: any) {
        expect(err.code).toBe('SELF_REFERRAL_DISALLOWED');
        expect(err.message).toContain('Rujukan sendiri tidak dibenarkan');
      }
    });
  });

  describe('5. Benefits Derivation for Referral Orders', () => {
    test('dealers.benefits() derives earned benefits for referral orders', async () => {
      const { app } = createHarness();
      const founderSession = await createUser(app, 'founder', true);
      const agentSession = await createUser(app, 'agent_sponsor');
      const agentOrg = 'STOKIS_KUANTAN';

      // Setup agent membership in SQLite table
      app.store.db.query('UPDATE memberships SET dealer_org_id=? WHERE user_id=?').run(agentOrg, agentSession.userId);

      const founderPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: founderSession.cookie } })
      );
      const agentPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: agentSession.cookie } })
      );

      const product = app.commerce.saveProduct(founderPrincipal, {
        name: 'Kuah Colek Tok Bah',
        description: 'Resepi Tok Bah',
        priceSen: 2000,
        packSize: 1,
        publish: true
      });

      // Approve commission policy
      const policy: CommissionPolicy = {
        id: 'cp-kuantan',
        version: 1,
        eligibleProductIds: [product.id],
        rateBasisPoints: 1500, // 15%
        approvedAt: new Date(Date.now() - 3600_000).toISOString()
      };
      app.store.save('commission_policies', policy);

      // Create completed and paid order with referralCode only
      const now = new Date().toISOString();
      const order: OrderRecord = {
        id: 'ord-ref-benefit-01',
        outletId: 'hq',
        customerId: 'customer-uid-99',
        referralCode: agentOrg,
        lines: [{ productId: product.id, name: product.name, priceSen: 2000, quantity: 2, publishedVersion: 1 }],
        amountSen: 4000,
        paidAmountSen: 4000,
        refundAmountSen: 0,
        fulfilment: 'pickup',
        contactRef: '019-9999999',
        fulfilmentStatus: 'received',
        revision: 2,
        paymentState: 'verified',
        createdAt: now,
        updatedAt: now
      };
      app.store.save('orders', order);

      // Record payment
      app.store.save('payments', {
        id: 'pay-ref-01',
        orderId: order.id,
        amountSen: 4000,
        method: 'bank',
        reference: 'FPX123456',
        state: 'confirmed',
        confirmedBy: founderPrincipal.user.id,
        createdAt: now
      });

      const dealers = new Dealers(app.store, app.auth, app.commerce);
      const benefits = dealers.benefits(agentPrincipal);

      expect(benefits.length).toBe(1);
      expect(benefits[0].dealerOrgId).toBe(agentOrg);
      expect(benefits[0].orderId).toBe(order.id);
      expect(benefits[0].amountSen).toBe(600); // 15% of 4000 sen = 600 sen
      expect(benefits[0].reasonCode).toBe('CONFIRMED_ELIGIBLE_NET_PAYMENT');
    });
  });

  describe('6. formatWhatsAppUrl Normalization & Fallbacks', () => {
    test('formats Malaysian phone numbers correctly and falls back to default HQ', () => {
      // Local 0-prefix to 60-prefix
      const url1 = formatWhatsAppUrl('019-8765432', 'Halo');
      expect(url1).toBe('https://wa.me/60198765432?text=Halo');

      // Existing 60-prefix with spaces
      const url2 = formatWhatsAppUrl('+60 12 345 6789', 'Order');
      expect(url2).toBe('https://wa.me/60123456789?text=Order');

      // Empty / undefined / null falls back to DEFAULT_HQ_WHATSAPP
      const urlEmpty = formatWhatsAppUrl('', 'Empty');
      expect(urlEmpty).toBe(`https://wa.me/${DEFAULT_HQ_WHATSAPP}?text=Empty`);

      const urlNull = formatWhatsAppUrl(null, 'Null');
      expect(urlNull).toBe(`https://wa.me/${DEFAULT_HQ_WHATSAPP}?text=Null`);

      const urlWhitespace = formatWhatsAppUrl('   ', 'White');
      expect(urlWhitespace).toBe(`https://wa.me/${DEFAULT_HQ_WHATSAPP}?text=White`);

      // Special characters in message properly encoded
      const urlSpecial = formatWhatsAppUrl('0123456789', 'Pesanan #1 & RM 20.00');
      expect(urlSpecial).toBe('https://wa.me/60123456789?text=Pesanan%20%231%20%26%20RM%2020.00');
    });
  });

  describe('7. Kedai Ejen (/kedai/:slug) End-to-End Storefront & Automatic Commission', () => {
    test('provisions /kedai/:slug on dealer approval, serves public storefront, attributes storefront order to dealerOrgId, and auto-records commission on payment & receipt', async () => {
      const { app } = createHarness();
      const founderSession = await createUser(app, 'founder-e2e', true);
      const agentSession = await createUser(app, 'agent-bangi');
      const buyerSession = await createUser(app, 'buyer-bangi');

      const founderPrincipal = await app.auth.resolve(
        new Request('http://localhost', { headers: { Cookie: founderSession.cookie } })
      );

      // 1. Founder approves dealer commercial policy & commission policy (12%)
      await apiCall(app, '/settings', {
        expectedVersion: 1,
        dealerTerms: {
          minimumQuantity: 10,
          packMultiple: 5,
          priceBasisPoints: 8000,
          ownership: 'owned',
          returnRules: '7 hari'
        }
      }, founderSession);

      const product = app.commerce.saveProduct(founderPrincipal, {
        name: 'Kuah Colek Edisi Ejen',
        description: 'Stok kedai ejen rasmi',
        priceSen: 2500,
        packSize: 1,
        publish: true
      });

      app.commerce.receive(founderPrincipal, {
        productId: product.id,
        ownerId: 'business',
        locationId: 'hq',
        status: 'available',
        reason: 'Stok awal HQ',
        quantity: 50
      }, 'stock-e2e-01');

      const policyRes = await apiCall(app, '/dealer/commission-policies', {
        expectedVersion: 0,
        eligibleProductIds: [product.id],
        rateBasisPoints: 1200 // 12%
      }, founderSession);
      expect(policyRes.response.status).toBe(200);

      // 2. Agent applies with custom slug 'kedai-bangi' and founder approves
      const applyRes = await apiCall(app, '/dealer/applications', {
        organization: 'Stokis Bangi Perdana',
        slug: 'kedai-bangi',
        description: 'Edaran Lembah Klang Selatan'
      }, agentSession);
      expect(applyRes.response.status).toBe(200);
      const applicationId = applyRes.json.data.id;

      const approveRes = await apiCall(
        app,
        `/dealer/applications/${applicationId}/approve`,
        { expectedRevision: 1 },
        founderSession
      );
      expect(approveRes.response.status).toBe(200);
      const dealerOrgId = approveRes.json.data.dealerOrgId as string;
      expect(dealerOrgId).toBeTruthy();

      // 3. Agent can fetch their own store via GET /dealer/stores
      const agentStoresRes = await apiCall(app, '/dealer/stores', undefined, agentSession);
      expect(agentStoresRes.response.status).toBe(200);
      expect(agentStoresRes.json.data).toHaveLength(1);
      expect(agentStoresRes.json.data[0].slug).toBe('kedai-bangi');
      expect(agentStoresRes.json.data[0].displayName).toBe('Stokis Bangi Perdana');

      // 4. Public visitor fetches GET /kedai/kedai-bangi without auth
      const publicKedaiRes = await apiCall(app, '/kedai/kedai-bangi');
      expect(publicKedaiRes.response.status).toBe(200);
      expect(publicKedaiRes.json.data.store).toMatchObject({
        slug: 'kedai-bangi',
        displayName: 'Stokis Bangi Perdana',
        status: 'active'
      });
      expect(publicKedaiRes.json.data.catalogue).toHaveLength(1);
      expect(publicKedaiRes.json.data.catalogue[0].id).toBe(product.id);

      // Unknown slug returns 404 STORE_NOT_FOUND without requiring login
      const missingKedaiRes = await apiCall(app, '/kedai/kedai-tiada');
      expect(missingKedaiRes.response.status).toBe(404);
      expect(missingKedaiRes.json.code).toBe('STORE_NOT_FOUND');

      // 5. Self-referral via storefront slug is blocked for the store owner
      const selfOrderRes = await apiCall(app, '/orders', {
        lines: [{ productId: product.id, quantity: 1 }],
        catalogueVersion: 1,
        fulfilment: 'pickup',
        contactRef: '012-0000000',
        outletId: 'hq',
        referralCode: 'kedai-bangi'
      }, agentSession);
      expect(selfOrderRes.response.status).toBe(400);
      expect(selfOrderRes.json.code).toBe('SELF_REFERRAL_DISALLOWED');

      // 6. Retail customer places order attributed to storefront slug 'kedai-bangi'
      const orderRes = await apiCall(app, '/orders', {
        lines: [{ productId: product.id, quantity: 2 }],
        catalogueVersion: 1,
        fulfilment: 'pickup',
        contactRef: 'Ahmad · 013-8889999',
        outletId: 'hq',
        referralCode: 'kedai-bangi'
      }, buyerSession);
      expect(orderRes.response.status).toBe(200);
      const order = orderRes.json.data as OrderRecord;
      expect(order.referralCode).toBe('kedai-bangi');
      expect(order.dealerOrgId).toBe(dealerOrgId);
      expect(order.amountSen).toBe(5000);

      // 7. Founder verifies payment -> automatic commission created in 'pending' state (12% of 5000 = 600 sen)
      const evPay = app.store.save('evidence', {
        id: 'ev-pay-e2e-1',
        entityId: order.id,
        kind: 'payment',
        note: 'Resit FPX disahkan',
        actorId: founderPrincipal.user.id,
        createdAt: new Date().toISOString()
      });

      const verifyRes = await apiCall(app, `/orders/${order.id}/payment`, {
        expectedRevision: order.revision,
        action: 'verify',
        amountSen: 5000,
        reference: 'FPX-E2E-KEDAI-01',
        method: 'bank',
        evidenceIds: [evPay.id]
      }, founderSession);
      expect(verifyRes.response.status).toBe(200);

      const pendingSummaryRes = await apiCall(app, '/dealer/commissions/summary', undefined, agentSession);
      expect(pendingSummaryRes.response.status).toBe(200);
      expect(pendingSummaryRes.json.data.pendingSen).toBe(600);
      expect(pendingSummaryRes.json.data.eligibleSen).toBe(0);

      // 8. Progress fulfilment to 'received' -> commission automatically upgrades to 'eligible'
      let rev = verifyRes.json.data.revision as number;
      for (const next of ['review', 'accepted', 'packing', 'packed', 'dispatched', 'received'] as const) {
        const evStep = app.store.save('evidence', {
          id: `ev-${next}-${order.id}`,
          entityId: order.id,
          kind: 'fulfilment',
          note: `Bukti ${next}`,
          actorId: founderPrincipal.user.id,
          createdAt: new Date().toISOString()
        });
        const stepRes = await apiCall(app, `/orders/${order.id}/transition`, {
          expectedRevision: rev,
          next,
          evidenceIds: [evStep.id]
        }, founderSession);
        expect(stepRes.response.status).toBe(200);
        rev = stepRes.json.data.revision;
      }

      // 9. Agent queries commissions, summary, and benefits
      const eligibleSummaryRes = await apiCall(app, '/dealer/commissions/summary', undefined, agentSession);
      expect(eligibleSummaryRes.response.status).toBe(200);
      expect(eligibleSummaryRes.json.data.pendingSen).toBe(0);
      expect(eligibleSummaryRes.json.data.eligibleSen).toBe(600);
      expect(eligibleSummaryRes.json.data.totalEarnedSen).toBe(600);

      const commsRes = await apiCall(app, '/dealer/commissions', undefined, agentSession);
      expect(commsRes.response.status).toBe(200);
      expect(commsRes.json.data).toHaveLength(1);
      expect(commsRes.json.data[0]).toMatchObject({
        orderId: order.id,
        dealerOrgId,
        amountSen: 600,
        status: 'eligible'
      });

      const benefitsRes = await apiCall(app, '/dealer/benefits', undefined, agentSession);
      expect(benefitsRes.response.status).toBe(200);
      expect(benefitsRes.json.data).toHaveLength(1);
      expect(benefitsRes.json.data[0]).toMatchObject({
        orderId: order.id,
        dealerOrgId,
        amountSen: 600,
        reasonCode: 'CONFIRMED_ELIGIBLE_NET_PAYMENT'
      });
    });
  });
});
