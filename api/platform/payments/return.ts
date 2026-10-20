/**
 * AbangColek Platform — Laluan redirect selepas pembayaran (PAY-02).
 * Route: GET /api/platform/payments/return?reference=<transactionId>
 *
 * Fail ini ialah NAMA LALUAN yang stabil untuk redirect selepas pembayaran.
 * Ia TIDAK membuka pangkalan data kedua: persistence produksi dikendalikan
 * oleh aplikasi platform (`api/platform.ts` → `server/platform/app.ts`),
 * jadi entry ini mendelegasikan ke aplikasi platform yang sama seperti
 * `api/platform/[...path].ts` lakukan.
 *
 * Implementasi sebenar pengendali:
 *   - `server/platform/paymentCallbackRoutes.ts` (kontrak HTTP + envelope),
 *   - `server/platform/paymentCallbacks.ts` (bacaan status TERSIMPAN).
 *
 * Laluan ini HANYA MEMBACA status bayaran yang sudah disimpan platform.
 * Ia tidak pernah mengesahkan bayaran dan tidak menerima status daripada
 * pelayar — "redirect must not confirm paid" (PAY-02) kekal utuh.
 *
 * NOTA WIRING: sehingga `server/platform/app.ts` memasang laluan
 * `/payments/return` (snippet ada dalam laporan lane ini), entry ini akan
 * menjawab 404 `NOT_FOUND` daripada aplikasi platform — iaitu jujur, bukan
 * kejayaan reka.
 */

export {
  createPaymentReturnRoute,
  createPaymentRoutes,
} from '../../../server/platform/paymentCallbackRoutes';
export {
  PAYMENT_RETURN_PATH,
  PAYMENT_RETURN_ROUTE,
} from '../../../shared/payment-contracts';

export { default } from '../../platform';
