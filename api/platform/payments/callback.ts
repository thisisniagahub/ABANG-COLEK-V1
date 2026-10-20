/**
 * AbangColek Platform — Laluan callback pembayaran (PAY-01).
 * Route: POST /api/platform/payments/callback
 *
 * Fail ini ialah NAMA LALUAN yang stabil untuk penyedia pembayaran. Ia tidak
 * membuka pangkalan data kedua: persistence produksi dikendalikan oleh
 * aplikasi platform (`api/platform.ts` → `server/platform/app.ts`), jadi
 * entry ini mendelegasikan ke aplikasi platform yang sama seperti
 * `api/platform/[...path].ts` lakukan.
 *
 * Implementasi sebenar pengendali:
 *   - `server/platform/paymentCallbackRoutes.ts` (kontrak HTTP + envelope),
 *   - `server/platform/paymentCallbacks.ts` (HMAC `X-Signature`, idempotency
 *     `eventId`, rekonsiliasi melalui `PaymentReconciler`).
 *
 * Kontrak: `shared/payment-contracts.ts`.
 *
 * Authority callback ialah TANDA TANGANAN HMAC-SHA256 atas badan mentah —
 * bukan cookie pelayar dan bukan token CSRF. Status HTTP, reason code, dan
 * mesej stabil; rahsia server dan nilai tandatangan tidak pernah keluar
 * dalam badan respons.
 *
 * NOTA WIRING: sehingga `server/platform/app.ts` memasang laluan
 * `/payments/callback` (snippet ada dalam laporan lane ini), entry ini
 * akan menjawab 404 `NOT_FOUND` daripada aplikasi platform — iaitu jujur,
 * bukan kejayaan reka.
 */

export {
  createPaymentCallbackRoute,
  createPaymentRoutes,
} from '../../../server/platform/paymentCallbackRoutes';
export {
  PAYMENT_CALLBACK_PATH,
  PAYMENT_CALLBACK_ROUTE,
  PAYMENT_EVENT_ID_FIELD,
  PAYMENT_SIGNATURE_HEADER,
} from '../../../shared/payment-contracts';

export { default } from '../../platform';
