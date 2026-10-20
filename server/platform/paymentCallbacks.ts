/**
 * AbangColek Platform — Perkhidmatan callback pembayaran (PAY-01 / PAY-02).
 *
 * Tanggungjawab modul ini:
 *  1. Mengesahkan tandatangan HMAC-SHA256 atas BADAN MENTAH permintaan
 *     menggunakan rahsia yang dipegang server (`X-Signature`). Perbandingan
 *     ialah constant-time dan rahsia/tandatangan TIDAK PERNAH dicatatkan
 *     atau dipulangkan dalam badan respons.
 *  2. Menegakkan idempotency: `eventId` yang sama tidak boleh memuatkan
 *     bayaran dua kali. State idempotency tinggal di store server
 *     (bukan di memory proses, bukan di pelayar).
 *  3. Menghantar event kepada `PaymentReconciler` yang sedia ada — logik
 *     rekonsiliasi TIDAK diduplikasi di sini.
 *  4. Membaca status bayaran TERSIMPAN untuk laluan redirect selepas
 *     pembayaran. Status tidak pernah datang daripada pelayar.
 *
 * Wang: semua amaun ialah INTEGER SEN. Tiada aritmetik perpuluhan digunakan
 * di lapisan ini; tiada peratus margin dikira di sini.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { OrderRecord } from '../../shared/platform-contracts';
import {
  PAYMENT_EVENT_ID_FIELD,
  type PaymentCallbackEvent,
  type PaymentCallbackOutcome,
  type PaymentCallbackReasonCode,
  type PaymentEventStatus,
  type PaymentReceiptOutcome,
  type PaymentReturnView,
} from '../../shared/payment-contracts';
import { DomainError, now, type PlatformStore } from './store';
import { hash } from './auth';
import {
  PaymentReconciler,
  type ProviderCallbackPayload,
  type ProviderReceiptRecord,
} from './paymentReconciliation';
import type { Loyalty } from './loyalty';
import type { PaymentRecord } from './commerce';

/** Kind store yang memegang rekod idempotency event callback. */
export const PAYMENT_CALLBACK_EVENTS_KIND = 'payment_callback_events';

/**
 * Claim yang belum selesai dianggap "stale" selepas tempoh ini dan boleh
 * diambil alih oleh permintaan seterusnya. Rekod `processing` yang masih
 * segar menunjukkan satu permintaan lain sedang memproses event yang sama.
 */
export const PAYMENT_CALLBACK_PROCESSING_TTL_MS = 60_000;

/** Rekod idempotency untuk satu event callback. */
export interface PaymentCallbackEventRecord {
  id: string;
  eventId: string;
  transactionId: string;
  orderId: string;
  amountSen: number;
  /** SHA-256 badan mentah — TIDAK tandatangan dan TIDAK rahsia. */
  payloadHash: string;
  state: 'processing' | 'settled';
  outcome: PaymentCallbackOutcome | null;
  createdAt: string;
  updatedAt: string;
}

/** Hasil pengesahan tandatangan. */
export type PaymentSignatureVerdict =
  | { ok: true }
  | { ok: false; reasonCode: PaymentCallbackReasonCode };

/**
 * Mengira tandatangan HMAC-SHA256 (hex) atas badan mentah.
 *
 * Fungsi ini tidak pernah dicatatkan dan keluarannya hanya boleh digunakan
 * untuk perbandingan constant-time.
 */
export function computePaymentCallbackSignature(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

/**
 * Mengesahkan tandatangan `X-Signature` atas badan mentah.
 *
 * - Rahsia tiada ⇒ `PAYMENT_SIGNATURE_SECRET_UNAVAILABLE` (konfigurasi
 *   server belum lengkap; TIDAK ada rahsia rekaan).
 * - Tandatangan tiada ⇒ `PAYMENT_SIGNATURE_MISSING`.
 * - Tandatangan tidak sah ⇒ `PAYMENT_SIGNATURE_INVALID`.
 *
 * Perbandingan guna `timingSafeEqual`; nilai yang tidak sama panjang
 * ditolak tanpa perbandingan separa.
 */
export function verifyPaymentCallbackSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null | undefined,
): PaymentSignatureVerdict {
  if (!secret || !secret.trim()) return { ok: false, reasonCode: 'PAYMENT_SIGNATURE_SECRET_UNAVAILABLE' };
  if (!signature || !signature.trim()) return { ok: false, reasonCode: 'PAYMENT_SIGNATURE_MISSING' };
  const provided = signature.trim().replace(/^sha256=/i, '');
  if (!/^[0-9a-f]{64}$/i.test(provided)) return { ok: false, reasonCode: 'PAYMENT_SIGNATURE_INVALID' };
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const received = Buffer.from(provided, 'hex');
  if (received.length !== expected.length) return { ok: false, reasonCode: 'PAYMENT_SIGNATURE_INVALID' };
  return timingSafeEqual(received, expected)
    ? { ok: true }
    : { ok: false, reasonCode: 'PAYMENT_SIGNATURE_INVALID' };
}

/** Baca identifier string yang sah (tanpa NUL, panjang terhad). */
function readIdentifier(value: unknown, maximum = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximum || trimmed.includes('\0')) return null;
  return trimmed;
}

/**
 * Mengubah badan JSON mentah kepada kontrak event.
 *
 * Body yang tidak mengikut kontrak ditolak dengan `PAYMENT_EVENT_MALFORMED`;
 * tiada nilai lalai yang direka (contohnya status 'paid' daripada event
 * yang rosak).
 */
export function parsePaymentCallbackEvent(raw: unknown):
  | { ok: true; event: PaymentCallbackEvent }
  | { ok: false; reasonCode: 'PAYMENT_EVENT_MALFORMED' } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reasonCode: 'PAYMENT_EVENT_MALFORMED' };
  }
  const source = raw as Record<string, unknown>;
  const eventId = readIdentifier(source[PAYMENT_EVENT_ID_FIELD]);
  const transactionId = readIdentifier(source.transactionId);
  const orderId = readIdentifier(source.orderId);
  const merchantAccount = readIdentifier(source.merchantAccount);
  const currency = readIdentifier(source.currency, 8);
  const amountSen = source.amountSen;
  if (!eventId || !transactionId || !orderId || !merchantAccount || !currency) {
    return { ok: false, reasonCode: 'PAYMENT_EVENT_MALFORMED' };
  }
  // Wang: integer sen sah sahaja. Tiada sen pecahan, tiada perpuluhan.
  if (typeof amountSen !== 'number' || !Number.isSafeInteger(amountSen) || amountSen < 0) {
    return { ok: false, reasonCode: 'PAYMENT_EVENT_MALFORMED' };
  }
  const status = source.status;
  if (status !== 'paid' && status !== 'pending' && status !== 'failed') {
    return { ok: false, reasonCode: 'PAYMENT_EVENT_MALFORMED' };
  }
  const provider = source.provider === undefined ? null : readIdentifier(source.provider, 64);
  if (source.provider !== undefined && !provider) {
    return { ok: false, reasonCode: 'PAYMENT_EVENT_MALFORMED' };
  }
  const paidAt = source.paidAt === undefined ? null : readIdentifier(source.paidAt, 40);
  if (source.paidAt !== undefined && !paidAt) {
    return { ok: false, reasonCode: 'PAYMENT_EVENT_MALFORMED' };
  }
  return {
    ok: true,
    event: {
      eventId,
      transactionId,
      orderId,
      amountSen,
      currency,
      merchantAccount,
      status: status as PaymentEventStatus,
      ...(provider ? { provider } : {}),
      ...(paidAt ? { paidAt } : {}),
    },
  };
}

/** Pilihan konfigurasi perkhidmatan callback pembayaran. */
export interface PaymentCallbackServiceOptions {
  /** Rahsia HMATH yang dipegang server. TIDAK pernah dipulangkan ke klien. */
  secret?: string | null;
  /** Akaun peniaga yang dijangka (default: `ABANGCOLEK-HQ-MERCHANT`). */
  expectedMerchantAccount?: string;
  /** Loyalty (pilihan) — mata kesetiaan diberi seperti laluan pembayaran lain. */
  loyalty?: Loyalty;
}

/** Hasil pemprosesan callback: status HTTP + outcome bertyped. */
export interface PaymentCallbackResult {
  status: number;
  outcome: PaymentCallbackOutcome;
}

/** Maklumat akses (server-side sahaja) untuk laluan redirect selepas bayaran. */
export interface PaymentReturnAccess {
  customerId: string | null;
  outletId: string | null;
  trackingTokenHash: string | null;
}

/** Hasil bacaan status bayaran tersimpan. */
export type PaymentStatusResult =
  | { ok: true; view: PaymentReturnView; access: PaymentReturnAccess }
  | { ok: false; reasonCode: 'PAYMENT_REFERENCE_NOT_FOUND' };

/** Peta reason code domain reconciler kepada reason code callback. */
const RECONCILER_REASON: Readonly<Record<string, PaymentCallbackReasonCode>> = {
  PAYMENT_CURRENCY_MISMATCH: 'PAYMENT_CURRENCY_MISMATCH',
  PAYMENT_ACCOUNT_MISMATCH: 'PAYMENT_ACCOUNT_MISMATCH',
  PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
  NOT_FOUND: 'PAYMENT_ORDER_NOT_FOUND',
};

/** Peta reason code callback kepada status HTTP. */
const REASON_STATUS: Readonly<Record<PaymentCallbackReasonCode, number>> = {
  PAYMENT_CALLBACK_APPLIED: 200,
  PAYMENT_EVENT_ALREADY_APPLIED: 200,
  PAYMENT_EVENT_IN_PROGRESS: 202,
  PAYMENT_EVENT_UNKNOWN: 200,
  PAYMENT_EVENT_MALFORMED: 400,
  PAYMENT_EVENT_ID_CONFLICT: 409,
  PAYMENT_SIGNATURE_MISSING: 401,
  PAYMENT_SIGNATURE_INVALID: 401,
  PAYMENT_SIGNATURE_SECRET_UNAVAILABLE: 503,
  PAYMENT_CURRENCY_MISMATCH: 400,
  PAYMENT_ACCOUNT_MISMATCH: 400,
  PAYMENT_AMOUNT_MISMATCH: 409,
  PAYMENT_ORDER_NOT_FOUND: 404,
  PAYMENT_CALLBACK_FAILED: 409,
  PAYMENT_REFERENCE_NOT_FOUND: 404,
  PAYMENT_REFERENCE_REQUIRED: 400,
  PAYMENT_CALLBACK_METHOD_NOT_ALLOWED: 405,
  PAYMENT_RETURN_METHOD_NOT_ALLOWED: 405,
};

export class PaymentCallbackService {
  private readonly secret: string | null;
  private readonly reconciler: PaymentReconciler;

  constructor(
    readonly store: PlatformStore,
    options: PaymentCallbackServiceOptions = {},
  ) {
    this.secret = options.secret?.trim() ? options.secret.trim() : null;
    this.reconciler = new PaymentReconciler(
      store,
      options.loyalty,
      options.expectedMerchantAccount ?? 'ABANGCOLEK-HQ-MERCHANT',
    );
  }

  /**
   * Memproses satu callback pembayaran.
   *
   * Urutan yang dipatuhi:
   *  1. sahkan tandatangan HMAC (tanpa ini badan TIDAK boleh dipercayai);
   *  2. sahkan bentuk event;
   *  3. claim idempotency `eventId`;
   *  4. rekonsiliasi melalui `PaymentReconciler` (logik sebenar, bukan salinan);
   *  5. simpan outcome supaya replay Deterministik.
   */
  handleCallback(rawBody: string, signature: string | null): PaymentCallbackResult {
    const verdict = verifyPaymentCallbackSignature(rawBody, signature, this.secret);
    if (!verdict.ok) {
      // Tandatangan/rahsia TIDAK sekali-kali dimasukkan dalam mesej atau log.
      return this.result('not_applied', verdict.reasonCode, false, {
        eventId: null,
        transactionId: null,
        orderId: null,
        amountSen: null,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return this.result('not_applied', 'PAYMENT_EVENT_MALFORMED', false, {
        eventId: null,
        transactionId: null,
        orderId: null,
        amountSen: null,
      });
    }

    const event = parsePaymentCallbackEvent(parsed);
    if (!event.ok) {
      return this.result('not_applied', 'PAYMENT_EVENT_MALFORMED', false, {
        eventId: null,
        transactionId: null,
        orderId: null,
        amountSen: null,
      });
    }

    const payloadHash = hash(rawBody);
    const claim = this.claimEvent(event.event, payloadHash);
    if (claim.kind === 'conflict') {
      return this.result('not_applied', 'PAYMENT_EVENT_ID_CONFLICT', false, {
        eventId: event.event.eventId,
        transactionId: event.event.transactionId,
        orderId: event.event.orderId,
        amountSen: event.event.amountSen,
      });
    }
    if (claim.kind === 'settled' && claim.record.outcome) {
      const stored = claim.record.outcome;
      // Replay: TIDAK ada application kedua. Outcome kekal seperti rekod pertama.
      return {
        status: REASON_STATUS[stored.reasonCode],
        outcome: {
          ...stored,
          state: stored.applied ? 'already_applied' : 'not_applied',
          reasonCode: stored.applied ? 'PAYMENT_EVENT_ALREADY_APPLIED' : stored.reasonCode,
          applied: false,
          receivedAt: now(),
        },
      };
    }
    if (claim.kind === 'in_progress') {
      return this.result('not_applied', 'PAYMENT_EVENT_IN_PROGRESS', false, {
        eventId: event.event.eventId,
        transactionId: event.event.transactionId,
        orderId: event.event.orderId,
        amountSen: event.event.amountSen,
      });
    }

    const outcome = this.applyEvent(event.event);
    this.settleEvent(event.event.eventId, outcome);
    return { status: REASON_STATUS[outcome.reasonCode], outcome };
  }

  /**
   * Membaca status bayaran TERSIMPAN bagi satu rujukan (transaction id).
   *
   * Tiada status daripada pelayar digunakan; jawapan hanya berpunca daripada
   * rekod `provider_receipts` / `payments` / `orders` dalam store platform.
   */
  paymentStatus(reference: string): PaymentStatusResult {
    const safeReference = reference.trim();
    if (!safeReference) return { ok: false, reasonCode: 'PAYMENT_REFERENCE_NOT_FOUND' };
    const receipt = this.store.get<ProviderReceiptRecord>('provider_receipts', safeReference);
    const payment =
      this.store.all<PaymentRecord>('payments').find(entry => entry.reference === safeReference) ?? null;
    if (!receipt && !payment) return { ok: false, reasonCode: 'PAYMENT_REFERENCE_NOT_FOUND' };
    const orderId = receipt?.orderId ?? payment?.orderId ?? null;
    const order = orderId ? this.store.get<OrderRecord>('orders', orderId) : null;
    const view: PaymentReturnView = {
      reference: safeReference,
      orderId,
      paymentState: order?.paymentState ?? null,
      amountSen: receipt?.amountSen ?? payment?.amountSen ?? null,
      currency: receipt?.currency ?? null,
      receiptOutcome: receipt?.outcome ?? null,
      recordedAt: receipt?.receivedAt ?? payment?.createdAt ?? now(),
      orderRevision: order?.revision ?? null,
    };
    return {
      ok: true,
      view,
      access: {
        customerId: order?.customerId ?? null,
        outletId: order?.outletId ?? null,
        trackingTokenHash: order?.trackingTokenHash ?? null,
      },
    };
  }

  /**
   * Claim idempotency untuk satu `eventId`.
   *
   * Claim berlaku dalam satu transaksi atomik: hanya satu pemproses boleh
   * memiliki event itu. Claim yang tinggal `processing` lebih lama daripada TTL
   * boleh diambil alih (reconciler dedupe ikut transactionId, jadi ambil alih
   * tidak boleh memuatkan bayaran dua kali).
   */
  private claimEvent(
    event: PaymentCallbackEvent,
    payloadHash: string,
  ):
    | { kind: 'claimed'; record: PaymentCallbackEventRecord }
    | { kind: 'settled'; record: PaymentCallbackEventRecord }
    | { kind: 'conflict' }
    | { kind: 'in_progress' } {
    return this.store.atomic(() => {
      const current = this.store.get<PaymentCallbackEventRecord>(
        PAYMENT_CALLBACK_EVENTS_KIND,
        event.eventId,
      );
      if (!current) {
        const record: PaymentCallbackEventRecord = {
          id: event.eventId,
          eventId: event.eventId,
          transactionId: event.transactionId,
          orderId: event.orderId,
          amountSen: event.amountSen,
          payloadHash,
          state: 'processing',
          outcome: null,
          createdAt: now(),
          updatedAt: now(),
        };
        this.store.save(PAYMENT_CALLBACK_EVENTS_KIND, record);
        return { kind: 'claimed', record } as const;
      }
      if (current.payloadHash !== payloadHash) return { kind: 'conflict' } as const;
      if (current.state === 'settled') return { kind: 'settled', record: current } as const;
      const age = Date.now() - Date.parse(current.updatedAt);
      if (Number.isFinite(age) && age < PAYMENT_CALLBACK_PROCESSING_TTL_MS) {
        return { kind: 'in_progress' } as const;
      }
      // Claim basi (proses mati sebelum selesai) → ambil alih.
      const taken: PaymentCallbackEventRecord = { ...current, updatedAt: now() };
      this.store.save(PAYMENT_CALLBACK_EVENTS_KIND, taken);
      return { kind: 'claimed', record: taken } as const;
    });
  }

  /** Menyimpan outcome akhir event selepas rekonsiliasi. */
  private settleEvent(eventId: string, outcome: PaymentCallbackOutcome): void {
    this.store.atomic(() => {
      const current = this.store.get<PaymentCallbackEventRecord>(
        PAYMENT_CALLBACK_EVENTS_KIND,
        eventId,
      );
      if (!current) return;
      this.store.save(PAYMENT_CALLBACK_EVENTS_KIND, {
        ...current,
        state: 'settled',
        outcome,
        updatedAt: now(),
      });
    });
  }

  /**
   * Rekod outcome bagi event yang ditolak (tanpa sebarang perubahan state
   * platform selain rekod idempotency itu sendiri).
   */
  private rejected(
    reasonCode: PaymentCallbackReasonCode,
    event: PaymentCallbackEvent,
  ): PaymentCallbackOutcome {
    return {
      state: 'not_applied',
      reasonCode,
      applied: false,
      eventId: event.eventId,
      transactionId: event.transactionId,
      orderId: event.orderId,
      amountSen: event.amountSen,
      receiptOutcome: null,
      orderPaymentState: null,
      receivedAt: now(),
    };
  }

  /**
   * Memproses event melalui reconciler kanonikal.
   *
   * Reconciler yang seb digunakan (`server/platform/paymentReconciliation.ts`);
   * tiada logik dedupe/penolakan ditulis semula di sini.
   */
  private applyEvent(event: PaymentCallbackEvent): PaymentCallbackOutcome {
    const order = this.store.get<OrderRecord>('orders', event.orderId);
    if (!order) {
      // Event yang sah tandatangan tetapi tidak dikenali platform: TIDAK
      // menjadi kejayaan reka. Tiada apa-apa direkodkan ke pembayaran.
      return this.rejected('PAYMENT_EVENT_UNKNOWN', event);
    }
    const payload: ProviderCallbackPayload = {
      transactionId: event.transactionId,
      orderId: event.orderId,
      amountSen: event.amountSen,
      currency: event.currency,
      merchantAccount: event.merchantAccount,
      status: event.status,
      ...(event.provider ? { provider: event.provider } : {}),
      ...(event.paidAt ? { paidAt: event.paidAt } : {}),
    };
    try {
      const result = this.reconciler.processProviderCallback(payload);
      const receiptOutcome: PaymentReceiptOutcome = result.outcome;
      return {
        state: result.isDuplicate ? 'already_applied' : 'applied',
        reasonCode: result.isDuplicate
          ? 'PAYMENT_EVENT_ALREADY_APPLIED'
          : 'PAYMENT_CALLBACK_APPLIED',
        applied: !result.isDuplicate,
        eventId: event.eventId,
        transactionId: event.transactionId,
        orderId: result.orderId,
        amountSen: event.amountSen,
        receiptOutcome,
        orderPaymentState: result.order?.paymentState ?? null,
        receivedAt: now(),
      };
    } catch (error) {
      const code = error instanceof DomainError ? error.code : 'PAYMENT_CALLBACK_FAILED';
      return this.rejected(RECONCILER_REASON[code] ?? 'PAYMENT_CALLBACK_FAILED', event);
    }
  }

  /** Membina hasil outcome seragam. */
  private result(
    state: PaymentCallbackOutcome['state'],
    reasonCode: PaymentCallbackReasonCode,
    applied: boolean,
    identity: {
      eventId: string | null;
      transactionId: string | null;
      orderId: string | null;
      amountSen: number | null;
    },
  ): PaymentCallbackResult {
    return {
      status: REASON_STATUS[reasonCode],
      outcome: {
        state,
        reasonCode,
        applied,
        ...identity,
        receiptOutcome: null,
        orderPaymentState: null,
        receivedAt: now(),
      },
    };
  }
}
