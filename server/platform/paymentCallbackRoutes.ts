/**
 * AbangColek Platform — Pengendali HTTP callback & redirect pembayaran
 * (PAY-01 / PAY-02).
 *
 * Dua laluan aplikasi (relatif kepada `/api/platform`):
 *
 *  - `POST /payments/callback` — callback daripada penyedia pembayaran.
 *    Authority ialah TANDA TANGANAN HMAC, bukan cookie pelayar dan bukan
 *    token CSRF. Badan mentah digunakan untuk pengesahan; TIDAK ada
 *    maklumat rahsia atau tandatangan dalam respons.
 *  - `GET /payments/return` — redirect selepas pembayaran. Laluan ini
 *    HANYA MEMBACA status bayaran yang sudah tersimpan; ia tidak pernah
 *    mengesahkan bayaran (dominance `PAYMENT_NOT_VERIFIED` kekal).
 *
 * Kontrak envelope selaras dengan `server/platform/app.ts`:
 *   - kejayaan  → `{ ok: true, data }`
 *   - kegagalan → `{ ok: false, code, requestId, message }`
 */

import { randomUUID } from 'node:crypto';
import {
  PAYMENT_CALLBACK_ROUTE,
  PAYMENT_RETURN_ROUTE,
  PAYMENT_SIGNATURE_HEADER,
  type PaymentCallbackReasonCode,
} from '../../shared/payment-contracts';
import { boundedBody } from './evidenceFiles';
import { hash, type Auth, type Principal } from './auth';
import { DomainError, fail, now } from './store';
import type { PlatformStore } from './store';
import type { PaymentCallbackService } from './paymentCallbacks';

/** Dependensi yang diperlukan oleh kedua-dua laluan. */
export interface PaymentRouteDeps {
  store: PlatformStore;
  auth: Auth;
  service: PaymentCallbackService;
}

/** Mesej stabil (Bahasa Melayu) untuk setiap reason code. */
const REASON_MESSAGE: Readonly<Record<PaymentCallbackReasonCode, string>> = {
  PAYMENT_CALLBACK_APPLIED: 'Bayaran telah direkodkan oleh platform.',
  PAYMENT_EVENT_ALREADY_APPLIED: 'Event ini telah diproses sebelum ini. Tiada bayaran kedua.',
  PAYMENT_EVENT_IN_PROGRESS: 'Event sedang diproses. Cuba semula sebentar lagi.',
  PAYMENT_EVENT_UNKNOWN: 'Event bayaran tidak dikenali oleh platform. Tiada bayaran direkodkan.',
  PAYMENT_EVENT_MALFORMED: 'Badan callback bayaran tidak mengikut kontrak.',
  PAYMENT_EVENT_ID_CONFLICT: 'ID event yang sama telah dihantar dengan kandungan berbeza.',
  PAYMENT_SIGNATURE_MISSING: 'Tandatangan X-Signature diperlukan.',
  PAYMENT_SIGNATURE_INVALID: 'Tandatangan X-Signature tidak sah.',
  PAYMENT_SIGNATURE_SECRET_UNAVAILABLE: 'Konfigurasi rahsia tandatangan bayaran belum tersedia.',
  PAYMENT_CURRENCY_MISMATCH: 'Mata wang bayaran tidak sepadan.',
  PAYMENT_ACCOUNT_MISMATCH: 'Akaun peniaga bayaran tidak sepadan.',
  PAYMENT_AMOUNT_MISMATCH: 'Amaun bayaran tidak sepadan dengan rekod pesanan.',
  PAYMENT_ORDER_NOT_FOUND: 'Pesanan yang dirujuk tidak ditemui.',
  PAYMENT_CALLBACK_FAILED: 'Callback bayaran tidak dapat diproses.',
  PAYMENT_REFERENCE_NOT_FOUND: 'Rujukan bayaran tidak ditemui.',
  PAYMENT_REFERENCE_REQUIRED: 'Rujukan bayaran diperlukan.',
  PAYMENT_CALLBACK_METHOD_NOT_ALLOWED: 'Callback bayaran hanya menerima kaedah POST.',
  PAYMENT_RETURN_METHOD_NOT_ALLOWED: 'Laluan pulangan bayaran hanya menerima kaedah GET.',
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** Respons JSON kejayaan. */
function ok(data: unknown): Response {
  return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: JSON_HEADERS });
}

/** Respons JSON kegagalan (bentuk sama seperti platform app). */
function failure(status: number, code: string, message: string, requestId: string): Response {
  return new Response(JSON.stringify({ ok: false, code, requestId, message }), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Pengendali `POST /payments/callback`.
 *
 * Nota keselamatan:
 *  - badan dibaca SEKALI sebagai teks mentah (bukan JSON.parse dahulu) kerana
 *    tandatangan HMAC dikira atas bait yang sama;
 *  - tiada session, tiada CSRF, tiada Origin — providers tidak menghantar
 *    ketiga-tiga tersebut; authority ialah tandatangan;
 *  - rahsia dan tandatangan tidak pernah dicatatkan atau dipulangkan.
 */
export function createPaymentCallbackRoute(
  deps: PaymentRouteDeps,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    if (request.method !== 'POST') {
      return failure(
        405,
        'PAYMENT_CALLBACK_METHOD_NOT_ALLOWED',
        'Callback bayaran hanya menerima kaedah POST.',
        requestId,
      );
    }
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return failure(
        415,
        'PAYMENT_CALLBACK_CONTENT_TYPE',
        'Callback bayaran memerlukan content-type application/json.',
        requestId,
      );
    }
    try {
      // Callback ialah laluan awam (provider, bukan pelayar): had kadar
      // diminta pada bucket platform yang sama seperti webhook lain.
      deps.store.rate('payment-callback', 120);
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error.status, error.code, error.message, requestId);
      }
      return failure(429, 'RATE_LIMITED', 'Terlalu banyak permintaan.', requestId);
    }
    let rawBody: string;
    try {
      const bytes = await boundedBody(request, 256 * 1024);
      rawBody = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error.status, error.code, error.message, requestId);
      }
      return failure(
        400,
        'PAYMENT_CALLBACK_BODY_INVALID',
        'Badan callback bayaran tidak dapat dibaca.',
        requestId,
      );
    }
    const signature = request.headers.get(PAYMENT_SIGNATURE_HEADER);
    const result = deps.service.handleCallback(rawBody, signature);
    const outcome = result.outcome;
    if (outcome.applied || outcome.state === 'already_applied') {
      // Replay yang sudah diproses returned sebagai `already_applied`; ia
      // BUKA kejayaan bayaran baharu, tetapi juga bukan kegagalan.
      return new Response(JSON.stringify({ ok: true, data: outcome }), {
        status: result.status,
        headers: JSON_HEADERS,
      });
    }
    return failure(
      result.status,
      outcome.reasonCode,
      REASON_MESSAGE[outcome.reasonCode],
      requestId,
    );
  };
}

/**
 * Pengendali `GET /payments/return`.
 *
 * Laluan ini reflecting status yang TERDAHULU disimpan; ia tidak boleh
 * mengesahkan bayaran dan tidak menerima status daripada pelayar.
 *
 * Akses:
 *  - sesi server yang sah DAN pemunya pesanan (atau founder/staff outlet), atau
 *  - token penjejakan pesanan yang sah (credential awam yang sama seperti
 *    `GET /orders/track`).
 */
export function createPaymentReturnRoute(
  deps: PaymentRouteDeps,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    if (request.method !== 'GET') {
      return failure(
        405,
        'PAYMENT_RETURN_METHOD_NOT_ALLOWED',
        'Laluan pulangan bayaran hanya menerima kaedah GET.',
        requestId,
      );
    }
    const url = new URL(request.url);
    const reference = (url.searchParams.get('reference') ?? '').trim();
    if (!reference) {
      return failure(
        400,
        'PAYMENT_REFERENCE_REQUIRED',
        'Rujukan bayaran diperlukan.',
        requestId,
      );
    }
    const status = deps.service.paymentStatus(reference);
    if (!status.ok) {
      return failure(404, status.reasonCode, REASON_MESSAGE[status.reasonCode], requestId);
    }
    const access = status.access;
    let actor: Principal | null = null;
    try {
      actor = deps.auth.resolve(request);
    } catch {
      actor = null;
    }
    if (actor) {
      try {
        if (access.customerId) {
          deps.auth.own(actor, access.customerId, access.outletId ?? undefined);
        } else if (!deps.auth.has(actor, 'founder')) {
          fail('FORBIDDEN', 403, 'Rekod ini di luar akses anda.');
        }
      } catch (error) {
        if (error instanceof DomainError) {
          return failure(error.status, error.code, error.message, requestId);
        }
        return failure(403, 'FORBIDDEN', 'Rekod ini di luar akses anda.', requestId);
      }
    } else {
      const token = (url.searchParams.get('token') ?? '').trim();
      if (!token) {
        return failure(401, 'UNAUTHENTICATED', 'Sila log masuk.', requestId);
      }
      if (!access.trackingTokenHash || access.trackingTokenHash !== hash(token)) {
        return failure(403, 'FORBIDDEN', 'Rekod ini di luar akses anda.', requestId);
      }
    }
    return ok({ ...status.view, observedAt: now() });
  };
}

/**
 * Kilang kedua-dua laluan pembayaran.
 *
 * `handle` Dispatcher berdasarkan laluan supaya pelayan tempatan
 * (`server/index.ts`) boleh menyambungkan kedua-duanya dengan satu handler.
 */
export function createPaymentRoutes(deps: PaymentRouteDeps): {
  callback: (request: Request) => Promise<Response>;
  return: (request: Request) => Promise<Response>;
  handle: (request: Request) => Promise<Response>;
} {
  const callback = createPaymentCallbackRoute(deps);
  const returnRoute = createPaymentReturnRoute(deps);
  return {
    callback,
    return: returnRoute,
    handle: async (request: Request): Promise<Response> => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith(PAYMENT_CALLBACK_ROUTE)) return callback(request);
      if (pathname.endsWith(PAYMENT_RETURN_ROUTE)) return returnRoute(request);
      return failure(
        404,
        'NOT_FOUND',
        'Laluan pembayaran tidak ditemui.',
        randomUUID(),
      );
    },
  };
}
