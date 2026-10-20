/**
 * AbangColek Platform — Kontrak bayaran & callback pembayaran (PAY-01 / PAY-02).
 *
 * Fail ini ialah satu-satunya sumber kebenaran untuk:
 *  - nama header tandatangan HMAC-SHA256 (`X-Signature`),
 *  - medan idempotency event (`eventId`),
 *  - bentuk event callback yang dihantar oleh penyedia pembayaran,
 *  - reason code dan bentuk outcome yang dikembalikan oleh server.
 *
 * Kontrak ini TIDAK mengandungi sebarang logik server, rahsia, atau nilai
 * rekaan. Authority, rahsia, dan keputusan pemprosesan kekal di server
 * (`server/platform/paymentCallbacks.ts`).
 *
 * Wang: semua amaun ialah INTEGER SEN. Tiada aritmetik perpuluhan (% margin
 * atau lain-lain) dibenarkan dalam lapisan ini.
 */

import type { PaymentState } from './platform-contracts';

/** Header HTTP yang membawa tandatangan HMAC-SHA256 callback pembayaran. */
export const PAYMENT_SIGNATURE_HEADER = 'X-Signature';

/** Medan idempotency (id event) dalam badan callback pembayaran. */
export const PAYMENT_EVENT_ID_FIELD = 'eventId';

/** Laluan aplikasi (relatif kepada `/api/platform`) untuk callback pembayaran. */
export const PAYMENT_CALLBACK_ROUTE = '/payments/callback';

/** Laluan aplikasi (relatif kepada `/api/platform`) untuk redirect selepas bayaran. */
export const PAYMENT_RETURN_ROUTE = '/payments/return';

/** Laluan awam penuh — stabil untuk konfigurasi gateway pembayaran. */
export const PAYMENT_CALLBACK_PATH = `/api/platform${PAYMENT_CALLBACK_ROUTE}`;
export const PAYMENT_RETURN_PATH = `/api/platform${PAYMENT_RETURN_ROUTE}`;

/** Status bayaran yang boleh dihantar oleh penyedia pembayaran. */
export type PaymentEventStatus = 'paid' | 'pending' | 'failed';

/**
 * Bentuk kontrak event callback pembayaran.
 *
 * `eventId` ialah kunci idempotency: event yang sama dihantar dua kali
 * tidak boleh memuatkan bayaran dua kali.
 */
export interface PaymentCallbackEvent {
  eventId: string;
  transactionId: string;
  orderId: string;
  amountSen: number;
  currency: string;
  merchantAccount: string;
  status: PaymentEventStatus;
  provider?: string;
  paidAt?: string;
}

/** Hasil pemprosesan resit oleh reconciler kanonikal platform. */
export type PaymentReceiptOutcome =
  | 'verified'
  | 'payment_exception_review'
  | 'rejected'
  | 'duplicate_ignored';

/**
 * Status pemprosesan event callback.
 *
 * - `applied` — event direkodkan oleh platform (satu kali sah).
 * - `already_applied` — event sudah pernah diproses; tiada perubahan kedua.
 * - `not_applied` — event TIDAK mengubah apa-apa (tandatangan salah, event
 *   tidak dikenali, amaun tidak sepadan, dan lain-lain).
 */
export type PaymentCallbackState = 'applied' | 'already_applied' | 'not_applied';

/** Reason code yang boleh dibaca mesin untuk setiap keputusan callback. */
export type PaymentCallbackReasonCode =
  /** Event berjaya direkodkan oleh platform. */
  | 'PAYMENT_CALLBACK_APPLIED'
  /** Event pernah diproses sebelum ini — tiada application kedua. */
  | 'PAYMENT_EVENT_ALREADY_APPLIED'
  /** Event sedang diproses oleh permintaan lain (claim belum selesai). */
  | 'PAYMENT_EVENT_IN_PROGRESS'
  /** Event sah tandatangan tetapi tidak dikenali platform (pesanan tiada). */
  | 'PAYMENT_EVENT_UNKNOWN'
  /** Badan event tidak mengikut kontrak. */
  | 'PAYMENT_EVENT_MALFORMED'
  /** `eventId` yang sama dihantar dengan badan berbeza. */
  | 'PAYMENT_EVENT_ID_CONFLICT'
  /** Tandatangan `X-Signature` tiada. */
  | 'PAYMENT_SIGNATURE_MISSING'
  /** Tandatangan `X-Signature` tidak sah. */
  | 'PAYMENT_SIGNATURE_INVALID'
  /** Rahsia penandatangan tidak dikonfigurasi pada server. */
  | 'PAYMENT_SIGNATURE_SECRET_UNAVAILABLE'
  /** Mata wang event tidak sepadan dengan MYR. */
  | 'PAYMENT_CURRENCY_MISMATCH'
  /** Akaun peniaga event tidak sepadan. */
  | 'PAYMENT_ACCOUNT_MISMATCH'
  /** Amaun event tidak sepadan dengan rekod pesanan. */
  | 'PAYMENT_AMOUNT_MISMATCH'
  /** Pesanan yang dirujuk tidak wujud dalam platform. */
  | 'PAYMENT_ORDER_NOT_FOUND'
  /** Ralat domain lain semasa rekonsiliasi. */
  | 'PAYMENT_CALLBACK_FAILED'
  /** Rujukan bayaran tidak jumpa dalam simpanan platform. */
  | 'PAYMENT_REFERENCE_NOT_FOUND'
  /** Rujukan bayaran tiada dalam parameter laluan redirect. */
  | 'PAYMENT_REFERENCE_REQUIRED'
  /** Kaedah HTTP tidak dibenarkan untuk callback pembayaran. */
  | 'PAYMENT_CALLBACK_METHOD_NOT_ALLOWED'
  /** Kaedah HTTP tidak dibenarkan untuk laluan redirect pembayaran. */
  | 'PAYMENT_RETURN_METHOD_NOT_ALLOWED';

/**
 * Outcome satu pemprosesan callback.
 *
 * `applied` hanya `true` apabila event itu benar-benar menyebabkan
 * perubahan state. Outcome `not_applied` tidak pernah mengubah apa-apa.
 */
export interface PaymentCallbackOutcome {
  state: PaymentCallbackState;
  reasonCode: PaymentCallbackReasonCode;
  applied: boolean;
  eventId: string | null;
  transactionId: string | null;
  orderId: string | null;
  amountSen: number | null;
  receiptOutcome: PaymentReceiptOutcome | null;
  orderPaymentState: PaymentState | null;
  receivedAt: string;
}

/**
 * Paparan status bayaran untuk laluan redirect selepas pembayaran.
 *
 * Semua medan adalah pantulan SIMPANAN platform. Pelayar tidak pernah boleh
 * menentukan status ini sendiri.
 */
export interface PaymentReturnView {
  reference: string;
  orderId: string | null;
  /** Status bayaran tersimpan dalam rekod pesanan; `null` jika tiada rekod. */
  paymentState: PaymentState | null;
  amountSen: number | null;
  currency: string | null;
  receiptOutcome: PaymentReceiptOutcome | null;
  recordedAt: string;
  orderRevision: number | null;
}
