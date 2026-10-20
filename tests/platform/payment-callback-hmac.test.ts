/**
 * PAY-01 / PAY-02 — Callback pembayaran HMAC + idempotency + redirect.
 *
 * Authority callback ialah TANDA TANGANAN HMAC atas badan mentah — bukan
 * cookie, bukan CSRF. Setiap kes negatif mengesahkan fail-closed:
 *   - tandatangan salah / tiada / rahsia tiada ⇒ tiada apa-apa perubahan state;
 *   - `eventId` yang sama ⇒ TIDAK ada posting kedua;
 *   - `eventId` sama + badan berbeza ⇒ konflik, bukan "terima sahaja";
 *   - pesanan yang tidak dikenali ⇒ TIDAK ada kejayaan reka.
 */

import { describe, expect, test } from 'bun:test';
import { Auth, hash } from '../../server/platform/auth';
import { PlatformStore, id, now } from '../../server/platform/store';
import {
  PaymentCallbackService,
  computePaymentCallbackSignature,
  PAYMENT_CALLBACK_EVENTS_KIND,
} from '../../server/platform/paymentCallbacks';
import {
  createPaymentCallbackRoute,
  createPaymentReturnRoute,
} from '../../server/platform/paymentCallbackRoutes';
import { PAYMENT_SIGNATURE_HEADER } from '../../shared/payment-contracts';
import type { InventoryReservation, OrderRecord } from '../../shared/platform-contracts';

const SECRET = 'pay01-webhook-secret-rahasia';
const MERCHANT = 'ABANGCOLEK-HQ-MERCHANT';

interface Harness {
  store: PlatformStore;
  auth: Auth;
  service: PaymentCallbackService;
  order: OrderRecord;
}

function harness(secret: string | null = SECRET): Harness {
  const store = new PlatformStore(':memory:');
  const auth = new Auth(store);
  const service = new PaymentCallbackService(store, { secret });

  const orderId = id();
  const order: OrderRecord = {
    id: orderId,
    customerId: 'usr-customer-pay01',
    lines: [
      { productId: 'prod-colek-500g', name: 'Colek Buah Segar 500g', quantity: 2, priceSen: 1500, publishedVersion: 1 },
    ],
    amountSen: 3000,
    fulfilment: 'pickup',
    contactRef: 'Ali, Johor Bahru',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'pending',
    paidAmountSen: 0,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  store.save('orders', order);

  const reservation: InventoryReservation = {
    id: `res-${orderId}`,
    orderId,
    productId: 'prod-colek-500g',
    ownerId: 'business',
    locationId: 'hq',
    quantity: 2,
    status: 'active',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    revision: 1,
  };
  store.save('reservations', reservation);

  return { store, auth, service, order };
}

function eventBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    eventId: 'evt-pay01-0001',
    transactionId: 'txn-pay01-0001',
    orderId: 'ord-pay01-0001',
    amountSen: 3000,
    currency: 'MYR',
    merchantAccount: MERCHANT,
    status: 'paid',
    provider: 'billplz',
    ...overrides,
  });
}

function callbackRequest(body: string, signature: string | null): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (signature !== null) headers.set(PAYMENT_SIGNATURE_HEADER, signature);
  return new Request('http://localhost:3000/api/platform/payments/callback', {
    method: 'POST',
    headers,
    body,
  });
}

describe('PAY-01/02 — HMAC sah: bayaran direkodkan sekali sahaja', () => {
  test('Tandatangan HMAC sah => applied, bayaran tersimpan, pesanan disahkan', async () => {
    const { store, service, order } = harness();
    const body = eventBody({ orderId: order.id });
    const signature = computePaymentCallbackSignature(body, SECRET);

    const result = service.handleCallback(body, signature);

    expect(result.status).toBe(200);
    expect(result.outcome.applied).toBe(true);
    expect(result.outcome.state).toBe('applied');
    expect(result.outcome.reasonCode).toBe('PAYMENT_CALLBACK_APPLIED');
    expect(result.outcome.receiptOutcome).toBe('verified');

    // Bayaran benar-benar tersimpan di store kanonikal.
    const payments = store.all<{ orderId: string; amountSen: number; state: string; reference: string }>('payments');
    expect(payments).toHaveLength(1);
    expect(payments[0].orderId).toBe(order.id);
    expect(payments[0].amountSen).toBe(3000);
    expect(payments[0].state).toBe('confirmed');
    expect(payments[0].reference).toBe('txn-pay01-0001');

    // Pesanan disahkan — bukan "pending" yang disamar.
    const stored = store.require<OrderRecord>('orders', order.id);
    expect(stored.paymentState).toBe('verified');
    expect(stored.paidAmountSen).toBe(3000);
    expect(stored.revision).toBe(order.revision + 1);

    // Resit pembekal direkodkan.
    expect(store.all('provider_receipts')).toHaveLength(1);
  });

  test('Replay eventId yang sama => PAYMENT_EVENT_ALREADY_APPLIED, tiada posting kedua', async () => {
    const { store, service, order } = harness();
    const body = eventBody({ orderId: order.id });
    const signature = computePaymentCallbackSignature(body, SECRET);

    const first = service.handleCallback(body, signature);
    expect(first.outcome.applied).toBe(true);

    const revisionAfterFirst = store.require<OrderRecord>('orders', order.id).revision;

    const replay = service.handleCallback(body, signature);
    expect(replay.outcome.applied).toBe(false);
    expect(replay.outcome.state).toBe('already_applied');
    expect(replay.outcome.reasonCode).toBe('PAYMENT_EVENT_ALREADY_APPLIED');

    // Tiada bayaran kedua, tiada resit kedua, pesanan tidak berubah.
    expect(store.all('payments')).toHaveLength(1);
    expect(store.all('provider_receipts')).toHaveLength(1);
    const stored = store.require<OrderRecord>('orders', order.id);
    expect(stored.paidAmountSen).toBe(3000);
    expect(stored.revision).toBe(revisionAfterFirst);
  });

  test('eventId sama + badan berbeza => PAYMENT_EVENT_ID_CONFLICT (409)', async () => {
    const { store, service, order } = harness();
    const body = eventBody({ orderId: order.id });
    const signature = computePaymentCallbackSignature(body, SECRET);
    service.handleCallback(body, signature);

    // Badan berbeza (amaun lain) ⇒ hash payload berbeza ⇒ konflik.
    const conflictingBody = eventBody({ orderId: order.id, amountSen: 4000 });
    const conflictingSignature = computePaymentCallbackSignature(conflictingBody, SECRET);

    const conflict = service.handleCallback(conflictingBody, conflictingSignature);
    expect(conflict.status).toBe(409);
    expect(conflict.outcome.reasonCode).toBe('PAYMENT_EVENT_ID_CONFLICT');
    expect(conflict.outcome.applied).toBe(false);

    // Tiada posting kedua hasil daripada badan yang conflicted.
    expect(store.all('payments')).toHaveLength(1);
    const stored = store.require<OrderRecord>('orders', order.id);
    expect(stored.paidAmountSen).toBe(3000);
  });

  test('Pesanan yang tidak dikenali => PAYMENT_EVENT_UNKNOWN, tiada kejayaan reka', async () => {
    const { store, service } = harness();
    const body = eventBody({ orderId: 'ord-tiada-dalam-store' });
    const signature = computePaymentCallbackSignature(body, SECRET);

    const result = service.handleCallback(body, signature);
    expect(result.outcome.applied).toBe(false);
    expect(result.outcome.state).toBe('not_applied');
    expect(result.outcome.reasonCode).toBe('PAYMENT_EVENT_UNKNOWN');

    // Tiada bayaran, tiada resit, tiada pesanan dicipta.
    expect(store.all('payments')).toHaveLength(0);
    expect(store.all('provider_receipts')).toHaveLength(0);
    expect(store.get('orders', 'ord-tiada-dalam-store')).toBeNull();
  });
});

describe('PAY-01/02 — negative: tandatangn tidak sah / tiada / rahsia tiada', () => {
  test('Tandatangan tidak sah => 401 PAYMENT_SIGNATURE_INVALID, tiada perubahan state', async () => {
    const { store, service, order } = harness();
    const body = eventBody({ orderId: order.id });
    const wrongSignature = computePaymentCallbackSignature(`${body}-diubah`, SECRET);

    const result = service.handleCallback(body, wrongSignature);
    expect(result.status).toBe(401);
    expect(result.outcome.reasonCode).toBe('PAYMENT_SIGNATURE_INVALID');
    expect(result.outcome.applied).toBe(false);

    // Tiada apa-apa ditulis: bukan sahaja tiada bayaran, tiada rekod idempotency pun.
    expect(store.all('payments')).toHaveLength(0);
    expect(store.all('provider_receipts')).toHaveLength(0);
    expect(store.all(PAYMENT_CALLBACK_EVENTS_KIND)).toHaveLength(0);
    const stored = store.require<OrderRecord>('orders', order.id);
    expect(stored.paymentState).toBe('pending');
    expect(stored.paidAmountSen).toBe(0);
    expect(stored.revision).toBe(order.revision);
  });

  test('Header tandatangan tiada => PAYMENT_SIGNATURE_MISSING', async () => {
    const { store, service, order } = harness();
    const body = eventBody({ orderId: order.id });

    const result = service.handleCallback(body, null);
    expect(result.status).toBe(401);
    expect(result.outcome.reasonCode).toBe('PAYMENT_SIGNATURE_MISSING');
    expect(result.outcome.applied).toBe(false);
    expect(store.all('payments')).toHaveLength(0);
  });

  test('Tiada rahsia dikonfigurasi => PAYMENT_SIGNATURE_SECRET_UNAVAILABLE (503), tiada bayaran', async () => {
    const { store, service, order } = harness(null);
    const body = eventBody({ orderId: order.id });
    const signature = computePaymentCallbackSignature(body, SECRET);

    const result = service.handleCallback(body, signature);
    expect(result.status).toBe(503);
    expect(result.outcome.reasonCode).toBe('PAYMENT_SIGNATURE_SECRET_UNAVAILABLE');
    expect(result.outcome.applied).toBe(false);
    expect(store.all('payments')).toHaveLength(0);
    expect(store.all(PAYMENT_CALLBACK_EVENTS_KIND)).toHaveLength(0);
  });
});

describe('PAY-01/02 — laluan HTTP callback', () => {
  test('HTTP: tandatangan tidak sah => 401 + code, dan tiada rahsia/tandatangan dalam badan', async () => {
    const { store, auth, service, order } = harness();
    const route = createPaymentCallbackRoute({ store, auth, service });
    const body = eventBody({ orderId: order.id });
    const signature = computePaymentCallbackSignature(body, SECRET);

    const response = await route(callbackRequest(body, 'a'.repeat(64)));
    expect(response.status).toBe(401);
    const text = await response.text();
    const parsed = JSON.parse(text) as { ok: boolean; code: string };
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe('PAYMENT_SIGNATURE_INVALID');

    // Rahsia dan tandatangan TIDAK boleh muncul dalam badan respons.
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(signature);
    expect(store.all('payments')).toHaveLength(0);
  });

  test('HTTP: tandatangan sah => 200 ok:true dan bayaran direkodkan', async () => {
    const { store, auth, service, order } = harness();
    const route = createPaymentCallbackRoute({ store, auth, service });
    const body = eventBody({ orderId: order.id });
    const signature = computePaymentCallbackSignature(body, SECRET);

    const response = await route(callbackRequest(body, signature));
    expect(response.status).toBe(200);
    const text = await response.text();
    const parsed = JSON.parse(text) as { ok: boolean; data: { applied: boolean; reasonCode: string } };
    expect(parsed.ok).toBe(true);
    expect(parsed.data.applied).toBe(true);
    expect(parsed.data.reasonCode).toBe('PAYMENT_CALLBACK_APPLIED');
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(signature);
    expect(store.all('payments')).toHaveLength(1);
  });

  test('HTTP: tiada rahsia => 503 PAYMENT_SIGNATURE_SECRET_UNAVAILABLE', async () => {
    const { store, auth, order } = harness(null);
    const service = new PaymentCallbackService(store, { secret: null });
    const route = createPaymentCallbackRoute({ store, auth, service });
    const body = eventBody({ orderId: order.id });

    const response = await route(callbackRequest(body, 'b'.repeat(64)));
    expect(response.status).toBe(503);
    const parsed = (await response.json()) as { ok: boolean; code: string };
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe('PAYMENT_SIGNATURE_SECRET_UNAVAILABLE');
    expect(store.all('payments')).toHaveLength(0);
  });
});

describe('PAY-02 — laluan pulangan hanya membaca status TERSIMPAN', () => {
  test('?status=paid daripada pelayar TIDAK boleh mengubah status tersimpan', async () => {
    const { store, auth, service, order } = harness();
    const trackingToken = 'token-penjekanan-pay02';
    store.save('orders', {
      ...order,
      trackingTokenHash: hashToken(trackingToken),
      trackingTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    // Callback 'pending' yang sah tandatangan: resit direkodkan, pesanan kekal
    // 'pending' (bukan 'verified').
    const pendingBody = eventBody({
      orderId: order.id,
      eventId: 'evt-pay02-pending',
      transactionId: 'txn-pay02-pending',
      status: 'pending',
    });
    const pendingResult = service.handleCallback(
      pendingBody,
      computePaymentCallbackSignature(pendingBody, SECRET),
    );
    expect(pendingResult.outcome.applied).toBe(true);
    expect(store.require<OrderRecord>('orders', order.id).paymentState).toBe('pending');

    // Bayaran yang BELUM disahkan: pesanan masih 'pending'.
    const returnRoute = createPaymentReturnRoute({ store, auth, service });
    const response = await returnRoute(
      new Request(
        `http://localhost:3000/api/platform/payments/return?reference=txn-pay02-pending&token=${trackingToken}&status=paid`,
      ),
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    const parsed = JSON.parse(text) as { ok: boolean; data: { paymentState: string | null } };
    expect(parsed.ok).toBe(true);
    // Status yang dipulangkan ialah status TERSIMPAN, bukan parameter pelayar.
    expect(parsed.data.paymentState).toBe('pending');
    expect(text).not.toContain('"status":"paid"');
    expect(text).not.toContain(SECRET);
  });

  test('Status tersimpan yang disahkan dipulangkan selepas callback yang sah', async () => {
    const { store, auth, service, order } = harness();
    const body = eventBody({ orderId: order.id });
    service.handleCallback(body, computePaymentCallbackSignature(body, SECRET));

    const trackingToken = 'token-penjekanan-pay02-bayar';
    store.save('orders', {
      ...store.require<OrderRecord>('orders', order.id),
      trackingTokenHash: hashToken(trackingToken),
      trackingTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const returnRoute = createPaymentReturnRoute({ store, auth, service });
    const response = await returnRoute(
      new Request(
        `http://localhost:3000/api/platform/payments/return?reference=txn-pay01-0001&token=${trackingToken}&status=pending`,
      ),
    );
    expect(response.status).toBe(200);
    const parsed = (await response.json()) as { ok: boolean; data: { paymentState: string | null; amountSen: number | null } };
    expect(parsed.ok).toBe(true);
    expect(parsed.data.paymentState).toBe('verified');
    expect(parsed.data.amountSen).toBe(3000);
  });
});

/** Hash token penjejakan — algoritma sama seperti `server/platform/auth.ts`. */
function hashToken(token: string): string {
  return hash(token);
}
