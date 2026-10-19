import { afterEach, describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { Dealers, VALID_COMMISSION_TRANSITIONS } from '../../server/platform/dealers';
import type { Principal } from '../../server/platform/auth';
import type { CommissionTransaction, DealerCommissionSummary } from '../../shared/dealer-contracts';
import type { OrderRecord } from '../../shared/platform-contracts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const fn of cleanups.splice(0)) fn(); });

function createHarness() {
  const directory = mkdtempSync(join(tmpdir(), 'dealer-commission-test-'));
  const app = createPlatformApp({ databasePath: join(directory, 'test.sqlite'), bootstrapToken: 'commission-bootstrap-token', origin: 'http://localhost:3000' });
  cleanups.push(() => { app.close(); rmSync(directory, { recursive: true, force: true }); });
  return { app, directory };
}

async function apiCall(app: ReturnType<typeof createPlatformApp>, path: string, body?: unknown, session?: { cookie: string; csrf: string }, extra: Record<string, string> = {}) {
  const response = await app.fetch(new Request(`http://localhost:3010/api/platform${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', 'Idempotency-Key': crypto.randomUUID() }),
      ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  return { response, json: await response.json() };
}

async function createUser(app: ReturnType<typeof createPlatformApp>, name: string, founder = false) {
  const result = await apiCall(app, founder ? '/auth/bootstrap' : '/auth/signup', {
    email: `${name}@example.test`,
    name,
    password: 'secure test password 123',
    ...(founder ? { token: 'commission-bootstrap-token' } : {}),
  });
  expect(result.response.status).toBe(200);
  return { cookie: result.response.headers.get('set-cookie')!.split(';')[0], csrf: result.json.data.csrfToken, userId: result.json.data.user.id };
}

async function setupDealerContext() {
  const { app } = createHarness();
  const founderSession = await createUser(app, 'founder', true);
  const dealerSession = await createUser(app, 'dealer');
  const otherDealerSession = await createUser(app, 'other-dealer');
  const outsiderSession = await createUser(app, 'outsider');

  const founderPrincipal = await app.auth.resolve(new Request('http://localhost', { headers: { Cookie: founderSession.cookie } }));
  const dealerPrincipal = await app.auth.resolve(new Request('http://localhost', { headers: { Cookie: dealerSession.cookie } }));
  const otherDealerPrincipal = await app.auth.resolve(new Request('http://localhost', { headers: { Cookie: otherDealerSession.cookie } }));
  const outsiderPrincipal = await app.auth.resolve(new Request('http://localhost', { headers: { Cookie: outsiderSession.cookie } }));

  const dealers = new Dealers(app.store, app.auth, app.commerce);

  // Approve dealer terms
  app.store.save('settings', {
    id: 'business',
    version: 1,
    approvedPolicies: {
      dealer: {
        version: 1,
        minimumQuantity: 1,
        packMultiple: 1,
        priceBasisPoints: 7500,
        ownership: 'consigned',
        returnRules: 'Founder verification required',
        approvedAt: new Date().toISOString(),
      },
    },
    locale: 'ms-MY',
    timezone: 'Asia/Kuala_Lumpur',
  });

  // Apply and approve dealer membership
  const application = dealers.apply(dealerPrincipal, { organization: 'Dealer A Enterprise', description: 'Authorized Dealer' });
  const approved = dealers.decide(founderPrincipal, application.id, { expectedRevision: 1 }, true);
  dealerPrincipal.memberships = app.auth.memberships(dealerPrincipal.user.id);

  // Apply and approve other dealer membership
  const otherApp = dealers.apply(otherDealerPrincipal, { organization: 'Dealer B Enterprise', description: 'Second Dealer' });
  const otherApproved = dealers.decide(founderPrincipal, otherApp.id, { expectedRevision: 1 }, true);
  otherDealerPrincipal.memberships = app.auth.memberships(otherDealerPrincipal.user.id);

  // Create published product
  const product = app.commerce.saveProduct(founderPrincipal, {
    name: 'Kuah Colek Ori 350g',
    description: 'Kuah Colek Buah Ori',
    priceSen: 1000,
    packSize: 1,
    publish: true,
  });

  // Approve commission policy (10% = 1000 basis points)
  dealers.saveCommissionPolicy(founderPrincipal, {
    expectedVersion: 0,
    eligibleProductIds: [product.id],
    rateBasisPoints: 1000,
  });

  // Add stock to HQ
  app.commerce.receive(founderPrincipal, {
    productId: product.id,
    quantity: 100,
    ownerId: 'business',
    locationId: 'hq',
    status: 'available',
    reason: 'Initial stock',
  }, 'opening-stock-comm-01');

  return {
    app,
    dealers,
    founder: founderPrincipal,
    dealer: dealerPrincipal,
    otherDealer: otherDealerPrincipal,
    outsider: outsiderPrincipal,
    founderSession,
    dealerSession,
    otherDealerSession,
    outsiderSession,
    dealerOrgId: approved.dealerOrgId!,
    otherDealerOrgId: otherApproved.dealerOrgId!,
    product,
  };
}

describe('Dealer Commission Ledger & Post-Payout Contra Adjustments (State Machine 5 & PAY-03)', () => {
  test('handles 6 commission statuses: pending -> eligible -> approved -> paid -> disputed -> resolved', async () => {
    const ctx = await setupDealerContext();

    // 1. Create order attributed to dealer
    const order = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 2 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Counter pickup',
    }, 'order-comm-lifecycle-01');

    // Initial state: record commission as pending
    const comm = ctx.dealers.recordCommission(ctx.founder, {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 200, // 10% of RM20 (2000 sen)
      policyVersion: 1,
      status: 'pending',
    });

    expect(comm.status).toBe('pending');
    expect(comm.amountSen).toBe(200);

    // 2. Transition pending -> eligible
    const eligible = ctx.dealers.transitionCommission(ctx.founder, comm.id, { next: 'eligible' });
    expect(eligible.status).toBe('eligible');
    expect(eligible.eligibleAt).toBeTruthy();

    // 3. Transition eligible -> approved
    const approved = ctx.dealers.transitionCommission(ctx.founder, comm.id, { next: 'approved' });
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeTruthy();

    // 4. Transition approved -> paid
    const paid = ctx.dealers.transitionCommission(ctx.founder, comm.id, { next: 'paid' });
    expect(paid.status).toBe('paid');
    expect(paid.paidAt).toBeTruthy();

    // 5. Dealer disputes paid commission
    const disputed = ctx.dealers.transitionCommission(ctx.dealer, comm.id, {
      next: 'disputed',
      reason: 'Agent pertikai komisen sepatutnya mengambil kira promosi khas',
    });
    expect(disputed.status).toBe('disputed');
    expect(disputed.contraReason).toBe('Agent pertikai komisen sepatutnya mengambil kira promosi khas');

    // 6. Dispute resolved back to paid
    const resolved = ctx.dealers.transitionCommission(ctx.founder, comm.id, { next: 'paid' });
    expect(resolved.status).toBe('paid');
  });

  test('blocks invalid direct transition from paid to reversed (POST_PAYOUT_CONTRA_REQUIRED)', async () => {
    const ctx = await setupDealerContext();

    const order = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 1 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Counter pickup',
    }, 'order-comm-direct-rev-01');

    const comm = ctx.dealers.recordCommission(ctx.founder, {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 100,
      policyVersion: 1,
      status: 'paid',
    });

    // Attempting to directly switch paid -> reversed must fail with POST_PAYOUT_CONTRA_REQUIRED
    try {
      ctx.dealers.transitionCommission(ctx.founder, comm.id, {
        next: 'reversed',
        reason: 'Cuba padam terus status paid',
      });
      expect.unreachable('Should have thrown POST_PAYOUT_CONTRA_REQUIRED');
    } catch (e: any) {
      expect(e.code).toBe('POST_PAYOUT_CONTRA_REQUIRED');
      expect(e.status).toBe(409);
    }

    // Verify record in store is still paid and not reversed
    const current = ctx.dealers.commission(ctx.founder, comm.id);
    expect(current.status).toBe('paid');
  });

  test('PAY-03: post-payout refund creates negative contra adjustment without modifying or deleting original history', async () => {
    const ctx = await setupDealerContext();

    // Create and fulfill order
    let order: OrderRecord = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 10 }], // RM 100 (10,000 sen)
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Counter pickup 10 units',
    }, 'order-pay03-01');

    const evidence = ctx.app.work.createEvidence(ctx.founder, {
      entityId: order.id,
      name: 'Receipt note',
      mimeType: 'text/plain',
      size: 0,
    });

    order = ctx.app.commerce.payment(ctx.founder, order.id, {
      expectedRevision: order.revision,
      action: 'verify',
      amountSen: 10000,
      method: 'cash',
      reference: 'PAY-03-CASH-REC-01',
      evidenceIds: [evidence.id],
    }, 'payment-pay03-01');

    for (const next of ['review', 'accepted', 'packing', 'packed', 'dispatched', 'received'] as const) {
      order = ctx.app.commerce.transition(ctx.founder, order.id, {
        expectedRevision: order.revision,
        next,
        evidenceIds: [evidence.id],
      });
    }

    // Commission: RM 10.00 (1,000 sen)
    const paidCommission = ctx.dealers.recordCommission(ctx.founder, {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 1000,
      policyVersion: 1,
      status: 'paid',
    });

    expect(paidCommission.status).toBe('paid');
    expect(paidCommission.amountSen).toBe(1000);

    // Apply refund contra via applyRefundContra
    const contra = ctx.dealers.applyRefundContra(ctx.founder, order.id, {
      amountSen: 1000,
      reason: 'Pelarasan kontra pembatalan pesanan selepas bayaran komisen (PAY-03)',
    });

    expect(contra.amountSen).toBe(-1000); // Negative adjustment!
    expect(contra.status).toBe('reversed');
    expect(contra.contraOfId).toBe(paidCommission.id);
    expect(contra.contraReason).toContain('PAY-03');

    // Crucial check: History is preserved! Original paid record still exists with status 'paid'
    const originalInStore = ctx.dealers.commission(ctx.founder, paidCommission.id);
    expect(originalInStore.status).toBe('paid');
    expect(originalInStore.amountSen).toBe(1000);

    // All ledger commissions for this dealer
    const allDealerComms = ctx.dealers.commissions(ctx.dealer);
    expect(allDealerComms).toHaveLength(2);
    expect(allDealerComms.find(c => c.id === paidCommission.id)).toBeTruthy();
    expect(allDealerComms.find(c => c.id === contra.id)).toBeTruthy();

    // Duplicate contra when already 100% reversed is blocked
    try {
      ctx.dealers.applyRefundContra(ctx.founder, order.id, { amountSen: 100 });
      expect.unreachable('Should have thrown ALREADY_FULLY_CONTRAD');
    } catch (e: any) {
      expect(e.code).toBe('ALREADY_FULLY_CONTRAD');
      expect(e.status).toBe(409);
    }
  });

  test('deficit balance tracking and automatic deduction from next payout cycle', async () => {
    const ctx = await setupDealerContext();

    // Order 1: Commission RM 10.00 (1000 sen) already paid
    const order1 = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 10 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Pickup order 1',
    }, 'order-cycle-01');

    ctx.dealers.recordCommission(ctx.founder, {
      orderId: order1.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 1000,
      policyVersion: 1,
      status: 'paid',
    });

    // Refund occurs post-payout: Contra adjustment created for RM 10.00
    ctx.dealers.applyRefundContra(ctx.founder, order1.id, {
      amountSen: 1000,
      reason: 'Refund order 1 post-payout',
    });

    // Summary at this point:
    // paid: 1000, contra: -1000, approved: 0
    // Net balance = 0 - 1000 = -1000
    // netPayable = 0, unsettledDeficit = 1000 sen
    let summary = ctx.dealers.commissionSummary(ctx.dealer, ctx.dealerOrgId);
    expect(summary.paidSen).toBe(1000);
    expect(summary.reversedContraSen).toBe(-1000);
    expect(summary.netPayableSen).toBe(0);
    expect(summary.unsettledDeficitSen).toBe(1000);

    // Order 2: New order generates RM 15.00 (1500 sen) approved commission
    const order2 = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 15 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Pickup order 2',
    }, 'order-cycle-02');

    ctx.dealers.recordCommission(ctx.founder, {
      orderId: order2.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 1500,
      policyVersion: 1,
      status: 'approved',
    });

    // Summary now:
    // approved: 1500, contra: -1000
    // Net balance = 1500 - 1000 = +500 sen (RM 5.00)
    // The previous 1000 sen deficit was automatically absorbed by the next payout cycle!
    summary = ctx.dealers.commissionSummary(ctx.dealer, ctx.dealerOrgId);
    expect(summary.approvedSen).toBe(1500);
    expect(summary.reversedContraSen).toBe(-1000);
    expect(summary.netPayableSen).toBe(500);
    expect(summary.unsettledDeficitSen).toBe(0);
  });

  test('Commerce.payment refund triggers contra adjustment automatically on paid commission', async () => {
    const ctx = await setupDealerContext();

    let order: OrderRecord = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 5 }], // RM 50.00 (5000 sen)
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Pickup order 5 units',
    }, 'order-auto-contra-01');

    const evidence = ctx.app.work.createEvidence(ctx.founder, {
      entityId: order.id,
      name: 'Payment receipt',
      mimeType: 'text/plain',
      size: 0,
    });

    order = ctx.app.commerce.payment(ctx.founder, order.id, {
      expectedRevision: order.revision,
      action: 'verify',
      amountSen: 5000,
      method: 'cash',
      reference: 'PAY-AUTO-01',
      evidenceIds: [evidence.id],
    }, 'payment-auto-01');

    // Commission of RM 5.00 (500 sen) is paid
    const paidComm = ctx.dealers.recordCommission(ctx.founder, {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 500,
      policyVersion: 1,
      status: 'paid',
    });

    // Now founder processes full refund of order via Commerce.payment
    order = ctx.app.commerce.payment(ctx.founder, order.id, {
      expectedRevision: order.revision,
      action: 'refund',
      amountSen: 5000,
      method: 'cash',
      reference: 'REFUND-AUTO-01',
      evidenceIds: [evidence.id],
    }, 'refund-auto-01');

    expect(order.paymentState).toBe('refunded');

    // Verify contra entry was automatically created in commission_ledger
    const all = ctx.dealers.commissions(ctx.founder, ctx.dealerOrgId);
    const contra = all.find(c => c.orderId === order.id && c.amountSen < 0);
    expect(contra).toBeDefined();
    expect(contra?.amountSen).toBe(-500);
    expect(contra?.status).toBe('reversed');
    expect(contra?.contraReason).toContain('REFUND-AUTO-01');

    // Original paid commission still exists unmodified
    const original = all.find(c => c.id === paidComm.id);
    expect(original?.status).toBe('paid');
  });

  test('pre-payout refund transitions pending/eligible/approved commission directly to reversed', async () => {
    const ctx = await setupDealerContext();

    let order: OrderRecord = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 2 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Pickup order 2 units',
    }, 'order-pre-payout-01');

    const evidence = ctx.app.work.createEvidence(ctx.founder, {
      entityId: order.id,
      name: 'Evidence',
      mimeType: 'text/plain',
      size: 0,
    });

    order = ctx.app.commerce.payment(ctx.founder, order.id, {
      expectedRevision: order.revision,
      action: 'verify',
      amountSen: 2000,
      method: 'cash',
      reference: 'PAY-PRE-01',
      evidenceIds: [evidence.id],
    }, 'payment-pre-01');

    // Commission recorded as eligible (not paid)
    const comm = ctx.dealers.recordCommission(ctx.founder, {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 200,
      policyVersion: 1,
      status: 'eligible',
    });

    // Refund order
    ctx.app.commerce.payment(ctx.founder, order.id, {
      expectedRevision: order.revision,
      action: 'refund',
      amountSen: 2000,
      method: 'cash',
      reference: 'REFUND-PRE-01',
      evidenceIds: [evidence.id],
    }, 'refund-pre-01');

    // Should transition directly to reversed
    const updated = ctx.dealers.commission(ctx.founder, comm.id);
    expect(updated.status).toBe('reversed');
    expect(updated.contraReason).toContain('Pembatalan/refund pesanan sebelum komisen dibayar');
  });

  test('security and scoping: unauthorized dealer and outsider cannot access or mutate commissions', async () => {
    const ctx = await setupDealerContext();

    const order = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 1 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'Test order',
    }, 'order-sec-comm-01');

    const comm = ctx.dealers.recordCommission(ctx.founder, {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 100,
      policyVersion: 1,
      status: 'pending',
    });

    // Outsider cannot access commissions
    try {
      ctx.dealers.commissions(ctx.outsider);
      expect.unreachable('Should fail DEALER_SCOPE');
    } catch (e: any) {
      expect(e.code).toBe('DEALER_SCOPE');
    }

    try {
      ctx.dealers.commission(ctx.outsider, comm.id);
      expect.unreachable('Should fail DEALER_SCOPE');
    } catch (e: any) {
      expect(e.code).toBe('DEALER_SCOPE');
    }

    try {
      ctx.dealers.commissionSummary(ctx.outsider);
      expect.unreachable('Should fail DEALER_SCOPE');
    } catch (e: any) {
      expect(e.code).toBe('DEALER_SCOPE');
    }

    // Other dealer cannot access Dealer A's commission
    try {
      ctx.dealers.commission(ctx.otherDealer, comm.id);
      expect.unreachable('Should fail DEALER_SCOPE');
    } catch (e: any) {
      expect(e.code).toBe('DEALER_SCOPE');
    }

    try {
      ctx.dealers.commissions(ctx.otherDealer, ctx.dealerOrgId);
      expect.unreachable('Should fail DEALER_SCOPE');
    } catch (e: any) {
      expect(e.code).toBe('DEALER_SCOPE');
    }

    try {
      ctx.dealers.commissionSummary(ctx.otherDealer, ctx.dealerOrgId);
      expect.unreachable('Should fail DEALER_SCOPE');
    } catch (e: any) {
      expect(e.code).toBe('DEALER_SCOPE');
    }

    // Dealer cannot approve or pay commissions (founder only)
    try {
      ctx.dealers.transitionCommission(ctx.dealer, comm.id, { next: 'approved' });
      expect.unreachable('Should fail FORBIDDEN');
    } catch (e: any) {
      expect(e.code).toBe('FORBIDDEN');
    }

    try {
      ctx.dealers.transitionCommission(ctx.dealer, comm.id, { next: 'paid' });
      expect.unreachable('Should fail FORBIDDEN');
    } catch (e: any) {
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  test('HTTP Platform API endpoints for dealer commission ledger and contra adjustments', async () => {
    const ctx = await setupDealerContext();

    const order = ctx.app.commerce.submitOrder(ctx.dealer, {
      lines: [{ productId: ctx.product.id, quantity: 2 }],
      catalogueVersion: 1,
      fulfilment: 'pickup',
      contactRef: 'API test order',
    }, 'order-api-comm-01');

    // POST /api/platform/dealer/commissions (Record new commission)
    const recordRes = await apiCall(ctx.app, '/dealer/commissions', {
      orderId: order.id,
      dealerOrgId: ctx.dealerOrgId,
      agentUserId: ctx.dealer.user.id,
      amountSen: 200,
      policyVersion: 1,
      status: 'pending',
    }, ctx.founderSession);

    expect(recordRes.response.status).toBe(200);
    const commId = recordRes.json.data.id;
    expect(commId).toBeDefined();

    // GET /api/platform/dealer/commissions (Dealer gets their commissions)
    const listRes = await apiCall(ctx.app, '/dealer/commissions', undefined, ctx.dealerSession);
    expect(listRes.response.status).toBe(200);
    expect(listRes.json.data).toHaveLength(1);
    expect(listRes.json.data[0].id).toBe(commId);

    // POST /api/platform/dealer/commissions/:id/transition (Transition to eligible, then approved, then paid)
    await apiCall(ctx.app, `/dealer/commissions/${commId}/transition`, { next: 'eligible' }, ctx.founderSession);
    await apiCall(ctx.app, `/dealer/commissions/${commId}/transition`, { next: 'approved' }, ctx.founderSession);
    const paidRes = await apiCall(ctx.app, `/dealer/commissions/${commId}/transition`, { next: 'paid' }, ctx.founderSession);
    expect(paidRes.response.status).toBe(200);
    expect(paidRes.json.data.status).toBe('paid');

    // POST /api/platform/dealer/commissions/:id/contra (Apply post-payout contra via API)
    const contraRes = await apiCall(ctx.app, `/dealer/commissions/${commId}/contra`, {
      amountSen: 200,
      reason: 'Post-payout refund via API route test',
    }, ctx.founderSession);

    expect(contraRes.response.status).toBe(200);
    expect(contraRes.json.data.amountSen).toBe(-200);
    expect(contraRes.json.data.status).toBe('reversed');

    // GET /api/platform/dealer/commissions/summary (Check deficit and payable summary via API)
    const summaryRes = await apiCall(ctx.app, '/dealer/commissions/summary', undefined, ctx.dealerSession);
    expect(summaryRes.response.status).toBe(200);
    expect(summaryRes.json.data).toMatchObject({
      dealerOrgId: ctx.dealerOrgId,
      paidSen: 200,
      reversedContraSen: -200,
      netPayableSen: 0,
      unsettledDeficitSen: 200,
    });

    // Dealer ledger includes commissions array
    const ledgerRes = await apiCall(ctx.app, '/dealer/ledger', undefined, ctx.dealerSession);
    expect(ledgerRes.response.status).toBe(200);
    expect(ledgerRes.json.data.commissions).toHaveLength(2);
  });
});
