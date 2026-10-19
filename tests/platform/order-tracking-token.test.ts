import { afterEach, describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { hash } from '../../server/platform/auth';
import type { OrderRecord } from '../../shared/platform-contracts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const fn of cleanups.splice(0)) fn(); });

function harness() {
  const directory = mkdtempSync(join(tmpdir(), 'abangcolek-tracking-'));
  const app = createPlatformApp({
    databasePath: join(directory, 'test.sqlite'),
    bootstrapToken: 'test-bootstrap-token-long-enough',
    origin: 'http://localhost:3000',
  });
  cleanups.push(() => {
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, directory };
}

async function call(
  app: ReturnType<typeof createPlatformApp>,
  path: string,
  body?: unknown,
  session?: { cookie: string; csrf: string },
  extra: Record<string, string> = {}
) {
  const response = await app.fetch(
    new Request(`http://localhost:3010/api/platform${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', 'Idempotency-Key': crypto.randomUUID() }),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  );
  return { response, json: await response.json() };
}

async function user(app: ReturnType<typeof createPlatformApp>, name: string, founder = false) {
  const result = await call(
    app,
    founder ? '/auth/bootstrap' : '/auth/signup',
    {
      email: `${name}@example.test`,
      name,
      password: 'a strong local password 123',
      ...(founder ? { token: 'test-bootstrap-token-long-enough' } : {}),
    }
  );
  expect(result.response.status).toBe(200);
  return {
    cookie: result.response.headers.get('set-cookie')!.split(';')[0],
    csrf: result.json.data.csrfToken,
    userId: result.json.data.user.id,
  };
}

async function setupCatalogueAndStock(app: ReturnType<typeof createPlatformApp>, founder: { cookie: string; csrf: string }) {
  const productRes = await call(
    app,
    '/catalogue',
    { name: 'Colek Buah Padu', description: 'Sos colek buah asli', priceSen: 1500, packSize: 1, publish: true },
    founder
  );
  expect(productRes.response.status).toBe(200);
  const product = productRes.json.data;

  const stockRes = await call(
    app,
    '/inventory/receive',
    { productId: product.id, ownerId: 'business', locationId: 'hq', quantity: 100, reason: 'Initial batch', status: 'available' },
    founder,
    { 'Idempotency-Key': 'initial-stock-001' }
  );
  expect(stockRes.response.status).toBe(200);

  return product;
}

describe('SEC-01 Public Order Tracking with Random Cryptographic Token', () => {
  test('submitOrder generates 32-byte base64url tracking token, stores SHA-256 hash in DB, and returns token in response', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const orderRes = await call(
      app,
      '/orders',
      {
        lines: [{ productId: product.id, quantity: 2 }],
        catalogueVersion: product.publishedVersion,
        fulfilment: 'delivery',
        contactRef: 'Ali bin Ahmad, 012-3456789, Jalan Raja Chulan, Kuala Lumpur',
      },
      customer,
      { 'Idempotency-Key': 'order-token-sec01' }
    );

    expect(orderRes.response.status).toBe(200);
    const orderData = orderRes.json.data;

    // Token exists in response
    expect(orderData.trackingToken).toBeDefined();
    expect(typeof orderData.trackingToken).toBe('string');
    // 32 bytes base64url should be at least 43 characters
    expect(orderData.trackingToken.length).toBeGreaterThanOrEqual(43);
    expect(/^[A-Za-z0-9_-]+$/.test(orderData.trackingToken)).toBe(true);

    // Verify stored record in database
    const dbOrder = app.store.require<OrderRecord>('orders', orderData.id);
    expect(dbOrder.trackingTokenHash).toBe(hash(orderData.trackingToken));
    expect(dbOrder.trackingTokenExpiresAt).toBeDefined();

    // Plaintext token MUST NOT be stored in the database
    expect((dbOrder as any).trackingToken).toBeUndefined();

    // Expiry should be approximately 14 days in the future (within 1 hour tolerance)
    const expiresAt = new Date(dbOrder.trackingTokenExpiresAt!).getTime();
    const expectedExpiry = Date.now() + 14 * 24 * 3600_000;
    expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(60_000);
  });

  test('public GET /orders/track returns redacted order info without sensitive customer PII', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const sensitiveContact = 'Ahmad Albab, +6012-9876543, No 12 Jalan Sambal Padu, Batu Pahat';
    const orderRes = await call(
      app,
      '/orders',
      {
        lines: [{ productId: product.id, quantity: 1 }],
        catalogueVersion: product.publishedVersion,
        fulfilment: 'delivery',
        contactRef: sensitiveContact,
      },
      customer
    );
    expect(orderRes.response.status).toBe(200);
    const token = orderRes.json.data.trackingToken;

    // Unauthenticated public GET request
    const trackRes = await call(app, `/orders/track?token=${encodeURIComponent(token)}`);
    expect(trackRes.response.status).toBe(200);
    expect(trackRes.json.ok).toBe(true);

    const tracked = trackRes.json.data;

    // Expected public fields
    expect(tracked.status).toBe('requested');
    expect(tracked.fulfilmentStatus).toBe('requested');
    expect(tracked.outletId).toBe('hq');
    expect(tracked.hub).toBe('hq');
    expect(tracked.fulfilment).toBe('delivery');
    expect(tracked.city).toBe('Batu Pahat');

    // Sensitive customer PII must be completely redacted / absent
    expect(tracked.customerId).toBeUndefined();
    expect(tracked.contactRef).toBeUndefined();
    expect(tracked.lines).toBeUndefined();
    expect(tracked.amountSen).toBeUndefined();
    expect(tracked.paidAmountSen).toBeUndefined();
    expect(tracked.refundAmountSen).toBeUndefined();
    expect(tracked.paymentState).toBeUndefined();
    expect(tracked.trackingTokenHash).toBeUndefined();
    expect(tracked.trackingToken).toBeUndefined();

    // Ensure raw JSON output does not leak customer name or phone
    const serialized = JSON.stringify(trackRes.json);
    expect(serialized).not.toContain('Ahmad Albab');
    expect(serialized).not.toContain('+6012-9876543');
    expect(serialized).not.toContain('No 12 Jalan Sambal Padu');
    expect(serialized).not.toContain(customer.userId);
  });

  test('SEC-01: Guessing sequential order IDs or arbitrary tokens fails closed (404/400)', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const orderRes = await call(
      app,
      '/orders',
      {
        lines: [{ productId: product.id, quantity: 1 }],
        catalogueVersion: product.publishedVersion,
        fulfilment: 'pickup',
        contactRef: 'Counter pickup',
      },
      customer
    );
    const orderId = orderRes.json.data.id;

    // Attempting to track using sequential / known order ID instead of random token
    const guessIdRes = await call(app, `/orders/track?token=${orderId}`);
    expect(guessIdRes.response.status).toBe(404);
    expect(guessIdRes.json.ok).toBe(false);
    expect(guessIdRes.json.code).toBe('ORDER_NOT_FOUND');

    // Guessing simple sequential numbers
    const guessSeqRes = await call(app, '/orders/track?token=1');
    expect(guessSeqRes.response.status).toBe(404);
    expect(guessSeqRes.json.code).toBe('ORDER_NOT_FOUND');

    // Missing token parameter
    const missingTokenRes = await call(app, '/orders/track');
    expect(missingTokenRes.response.status).toBe(400);
    expect(missingTokenRes.json.code).toBe('INVALID_TOKEN');

    // Empty token parameter
    const emptyTokenRes = await call(app, '/orders/track?token=   ');
    expect(emptyTokenRes.response.status).toBe(400);
    expect(emptyTokenRes.json.code).toBe('INVALID_TOKEN');

    // Guessing authenticated internal endpoint without credentials fails
    const authEndpointRes = await call(app, `/orders/${orderId}`);
    expect(authEndpointRes.response.status).toBe(401);

    // Direct sequential /orders/:id/track is blocked (fails 401 unauthenticated, 404 authenticated)
    const directTrackUnauth = await call(app, `/orders/${orderId}/track`);
    expect(directTrackUnauth.response.status).toBe(401);
    const directTrackAuth = await call(app, `/orders/${orderId}/track`, undefined, customer);
    expect(directTrackAuth.response.status).toBe(404);
  });

  test('expired tracking token is rejected with 410 TRACKING_TOKEN_EXPIRED', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const orderRes = await call(
      app,
      '/orders',
      {
        lines: [{ productId: product.id, quantity: 1 }],
        catalogueVersion: product.publishedVersion,
        fulfilment: 'delivery',
        contactRef: '012-3456789, Kuantan',
      },
      customer
    );
    const token = orderRes.json.data.trackingToken;
    const orderId = orderRes.json.data.id;

    // Mutate expiry date to past
    const dbOrder = app.store.require<OrderRecord>('orders', orderId);
    app.store.save('orders', {
      ...dbOrder,
      trackingTokenExpiresAt: new Date(Date.now() - 3600_000).toISOString(),
    });

    const expiredRes = await call(app, `/orders/track?token=${token}`);
    expect(expiredRes.response.status).toBe(410);
    expect(expiredRes.json.ok).toBe(false);
    expect(expiredRes.json.code).toBe('TRACKING_TOKEN_EXPIRED');
  });

  test('extractCity accurately identifies cities from various contactRef formats', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const testCases = [
      { contactRef: '019-9999999, Kemaman', expectedCity: 'Kemaman' },
      { contactRef: '[LEGACY_IMPORT] Siti Aminah - Kota Bharu', expectedCity: 'Kota Bharu' },
      { contactRef: 'Siti, +6011-12345678, No 45 Jalan Harmoni, 80000 Johor Bahru', expectedCity: 'Johor Bahru' },
      { contactRef: 'Counter pickup HQ', expectedCity: 'Kuala Lumpur' },
      { contactRef: 'Ali bin Ahmad, 012-3456789', expectedCity: 'Kuala Lumpur' },
      { contactRef: 'Siti Nurhaliza, 013-9998888, Kaunter', expectedCity: 'Kuala Lumpur' },
      { contactRef: 'Farhan, 011-12345678, Jalan Masjid, 84000 Muar', expectedCity: 'Muar' },
    ];

    for (const { contactRef, expectedCity } of testCases) {
      const orderRes = await call(
        app,
        '/orders',
        {
          lines: [{ productId: product.id, quantity: 1 }],
          catalogueVersion: product.publishedVersion,
          fulfilment: 'delivery',
          contactRef,
        },
        customer
      );
      expect(orderRes.response.status).toBe(200);
      const token = orderRes.json.data.trackingToken;

      const trackRes = await call(app, `/orders/track?token=${token}`);
      expect(trackRes.response.status).toBe(200);
      expect(trackRes.json.data.city).toBe(expectedCity);
      // Guarantee customer name or contact detail is never exposed as the city
      expect(trackRes.json.data.city).not.toContain('Ali bin Ahmad');
      expect(trackRes.json.data.city).not.toContain('Siti Nurhaliza');
    }
  });

  test('idempotent submission returns consistent tracking token across retries', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const payload = {
      lines: [{ productId: product.id, quantity: 1 }],
      catalogueVersion: product.publishedVersion,
      fulfilment: 'delivery',
      contactRef: '012-3456789, Kuantan',
    };

    const first = await call(app, '/orders', payload, customer, { 'Idempotency-Key': 'tracking-idem-test' });
    const retry = await call(app, '/orders', payload, customer, { 'Idempotency-Key': 'tracking-idem-test' });

    expect(first.response.status).toBe(200);
    expect(retry.response.status).toBe(200);
    expect(retry.json.data.id).toBe(first.json.data.id);
    expect(retry.json.data.trackingToken).toBe(first.json.data.trackingToken);
  });

  test('tracking endpoint reflects updated fulfilmentStatus after transition', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer');
    const product = await setupCatalogueAndStock(app, founder);

    const orderRes = await call(
      app,
      '/orders',
      {
        lines: [{ productId: product.id, quantity: 1 }],
        catalogueVersion: product.publishedVersion,
        fulfilment: 'pickup',
        contactRef: 'HQ counter pickup',
      },
      customer
    );
    const token = orderRes.json.data.trackingToken;
    const orderId = orderRes.json.data.id;

    // Customer cancels order
    const cancelRes = await call(
      app,
      `/orders/${orderId}/transition`,
      { expectedRevision: 1, next: 'cancelled' },
      customer
    );
    expect(cancelRes.response.status).toBe(200);

    // Public track reflects cancelled status
    const trackRes = await call(app, `/orders/track?token=${token}`);
    expect(trackRes.response.status).toBe(200);
    expect(trackRes.json.data.status).toBe('cancelled');
    expect(trackRes.json.data.fulfilmentStatus).toBe('cancelled');
  });

  test('invalid token format with null bytes or extreme length fails closed with 400', async () => {
    const { app } = harness();
    const nullByteRes = await call(app, '/orders/track?token=token%00injection');
    expect(nullByteRes.response.status).toBe(400);
    expect(nullByteRes.json.code).toBe('INVALID_TOKEN');

    const excessiveRes = await call(app, `/orders/track?token=${'a'.repeat(3000)}`);
    expect(excessiveRes.response.status).toBe(400);
    expect(excessiveRes.json.code).toBe('INVALID_TOKEN');
  });
});
