/**
 * OFF-01 — Revalidasi upon reconnect.
 *
 * MASALAH YANG DISELESAIKAN
 * Lapisan pelayar (`src/features/platform/client.ts`) menghantar semula
 * permintaan tertangguh apabila menyambung semula, dengan `Idempotency-Key`
 * yang sama. `Commerce.idem` melindungi terhadap pemindahan berganda, tetapi
 * `IDEMPOTENCY_CONFLICT` dan `REVISION_CONFLICT` (CAS) memberitahu pemanggil
 * "ada sesuatu yang berubah" TANPA memberitahu APA yang berubah. Domain
 * tersebut menutup jalan, tetapi tiada satu laluan pun membandingkan setiap
 * medan yang dihantar dengan nilai server semasa.
 *
 * KONTRAK MODUL INI
 * 1. Baca rekod pelayan yang sebenar.
 * 2. Bandingkan `expectedRevision` pemanggil dengan `revision` semasa.
 * 3. Bandingkan SETIAP medan yang dihantar dengan nilai semasa pelayan.
 * 4. Jika ada konflik → pulangkan keputusan bertip `REVALIDATION_CONFLICT`
 *    bersama `conflicts: [{ field, expected, actual }]`.
 * 5. Konflik itu BUKAN retryable: arahan TIDAK AKAN dijalankan. Pemanggil
 *    mesti membaca semula rekod, membuat keputusan baharu, dan menghantar
 *    semula dengan kunci idempotensi yang sesuai.
 *
 * PENTING: modul ini TIDAK menggantikan CAS. Arahan kanonik tetap mesti
 * memanggil `PlatformStore.revision()` — revalidasi ini ialah pemeriksaan awal
 * yang lebih granular (per medan), bukan pengganti CAS.
 */

import type { Principal } from './auth';
import type { Auth } from './auth';
import type { PlatformStore } from './store';

/** Satu konflik medan antara jangkaan pemanggil dan keadaan pelayan semasa. */
export interface RevalidationConflict {
  /** Nama medan yang dibandingkan (contoh: `expectedRevision`, `fulfilmentStatus`). */
  field: string;
  /** Nilai yang dijangka pemanggil (nilai yang dihantar). */
  expected: unknown;
  /** Nilai semasa pada pelayan. */
  actual: unknown;
}

/** Reason code keputusan revalidasi. */
export type RevalidationReasonCode =
  /** Ada medan yang berbeza — arahan TIDAK dijalankan. */
  | 'REVALIDATION_CONFLICT'
  /** Rekod yang disasarkan tidak wujud pada pelayan. */
  | 'REVALIDATION_RECORD_NOT_FOUND'
  /** Pemanggil tidak mempunyai kuasa atas rekod tersebut. */
  | 'REVALIDATION_FORBIDDEN'
  /** Permintaan revalidasi tidak sah (medan/kind/ID rosak). */
  | 'REVALIDATION_INPUT_INVALID';

/**
 * Perbandingan medan tersuai.
 *
 * `submittedField` ialah nama medan dalam peta yang dihantar; `serverField`
 * ialah medan (atau laluan medan) dalam rekod pelayan yang dibandingkan.
 * Lalai: `serverField === submittedField`.
 */
export interface RevalidationFieldSpec {
  submittedField: string;
  serverField?: string;
}

/**
 * Permintaan revalidasi.
 *
 * `submitted` ialah PETAAN pemanggil bagi medan yang perlu disahkan —
 * iaitu peta nilai yang pemanggil perhati sebelum menjadi offline, bukan nilai
 * yang mahu ditetapkan. Nilai baharu untuk operasi berada dalam
 * arahan itu sendiri, bukan dalam peta ini.
 */
export interface RevalidationRequest {
  /** Jenis rekod dalam store (contoh: `orders`, `campaigns`, `lots`). */
  kind: string;
  /** ID rekod yang disasarkan. */
  recordId: string;
  /** Revisi yang dijangka pemanggil. */
  expectedRevision: number;
  /** Peta medan yang perlu disahkan, medan demi medan. */
  submitted: Record<string, unknown>;
  /** Perbandingan tersuai (lalai: bandingkan medan yang wujud pada rekod). */
  comparisons?: RevalidationFieldSpec[];
}

/** Pilihan tambahan untuk revalidasi. */
export interface RevalidationOptions {
  /**
   * Penilai kebenaran tersuai. Lalai: `defaultRecordAuthoriser` (founder,
   * pemilik rekod, atau staf yang diberi outlet tersebut).
   */
  authorise?: (record: Record<string, unknown>, actor: Principal) => boolean;
}

/** Keputusan revalidasi. */
export type RevalidationOutcome =
  | {
      ok: true;
      code: null;
      conflicts: RevalidationConflict[];
      /** Revisi semasa rekod pada pelayan. */
      serverRevision: number;
      /** Nilai semasa bagi medan yang dibandingkan (untuk rekonsiliasi). */
      current: Record<string, unknown>;
      /** Rekod pelayan semasa (konteks untuk pemanggil). */
      record: Record<string, unknown>;
    }
  | {
      ok: false;
      code: RevalidationReasonCode;
      /** Sentiasa `false` — percubaan semula buta tidak akan memperbaiki konflik. */
      retryable: false;
      conflicts: RevalidationConflict[];
      message: string;
      /** Revisi semasa rekod (`null` jika rekod tidak dijumpai). */
      serverRevision: number | null;
      /** Nilai semasa bagi medan yang dibandingkan. */
      current: Record<string, unknown>;
    };

/** Hasil `execute` — menunjukkan sama ada arahan benar-benar dijalankan. */
export type RevalidationExecution<T> =
  | {
      ok: true;
      code: null;
      executed: true;
      conflicts: RevalidationConflict[];
      serverRevision: number;
      current: Record<string, unknown>;
      result: T;
    }
  | {
      ok: false;
      code: RevalidationReasonCode;
      /** Sentiasa `false` — arahan tidak dijalankan. */
      executed: false;
      retryable: false;
      conflicts: RevalidationConflict[];
      message: string;
      serverRevision: number | null;
      current: Record<string, unknown>;
    };

/** Bandingkan nilai secara mendalam (objek/array/primitif). */
export function sameValue(left: unknown, right: unknown): boolean {
  if (typeof left === 'number' && typeof right === 'number') return Object.is(left, right);
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((entry, index) => sameValue(entry, right[index]));
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(key => Object.prototype.hasOwnProperty.call(rightRecord, key) && sameValue(leftRecord[key], rightRecord[key]));
}

/** Baca medan daripada rekod, menyokong laluan ber titik (`a.b.c`). */
function readField(record: Record<string, unknown>, path: string): { present: boolean; value: unknown } {
  if (Object.prototype.hasOwnProperty.call(record, path)) return { present: true, value: record[path] };
  if (!path.includes('.')) return { present: false, value: undefined };
  let cursor: unknown = record;
  for (const segment of path.split('.')) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return { present: false, value: undefined };
    const container = cursor as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(container, segment)) return { present: false, value: undefined };
    cursor = container[segment];
  }
  return { present: true, value: cursor };
}

/**
 * Penilai kebenaran lalai: session-derived sahaja.
 *
 * Founder boleh melihat semua rekod; pemilik rekod (medan `customerId`,
 * `ownerId` atau `userId`) boleh melihat rekodnya sendiri; staf hanya rekod
 * pada outlet yang diberikan kepadanya.
 */
export function defaultRecordAuthoriser(actor: Principal, record: Record<string, unknown>): boolean {
  if (actor.memberships.some(membership => membership.role === 'founder' && membership.status === 'active')) return true;
  const owner = record.customerId ?? record.ownerId ?? record.userId;
  if (typeof owner === 'string' && owner === actor.user.id) return true;
  const scope = record.outletId ?? record.locationId;
  if (typeof scope === 'string') {
    return actor.memberships.some(
      membership => membership.role === 'staff' && membership.status === 'active' && membership.outletIds.includes(scope),
    );
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Revalidasi upon-reconnect untuk domain command.
 *
 * Gunakan kelas ini pada laluan HTTP yang menerima semula permintaan
 * tertangguh selepas reconnect.
 */
export class ReconnectRevalidation {
  constructor(readonly store: PlatformStore, readonly auth: Auth) {}

  /**
   * Baca rekod pelayan dan bandingkan setiap medan yang dihantar.
   *
   * Tiada mutasi berlaku dalam fungsi ini.
   */
  revalidate(actor: Principal, request: RevalidationRequest, options: RevalidationOptions = {}): RevalidationOutcome {
    if (!isPlainObject(request)) {
      return {
        ok: false,
        code: 'REVALIDATION_INPUT_INVALID',
        retryable: false,
        conflicts: [],
        message: 'Permintaan revalidasi tidak sah.',
        serverRevision: null,
        current: {},
      };
    }
    const kind = typeof request.kind === 'string' ? request.kind.trim() : '';
    const recordId = typeof request.recordId === 'string' ? request.recordId.trim() : '';
    if (!kind || kind.length > 60 || !recordId || recordId.length > 200) {
      return {
        ok: false,
        code: 'REVALIDATION_INPUT_INVALID',
        retryable: false,
        conflicts: [],
        message: 'Jenis rekod atau ID rekod tidak sah.',
        serverRevision: null,
        current: {},
      };
    }
    if (typeof request.expectedRevision !== 'number' || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
      return {
        ok: false,
        code: 'REVALIDATION_INPUT_INVALID',
        retryable: false,
        conflicts: [],
        message: 'Revisi yang dijangka tidak sah.',
        serverRevision: null,
        current: {},
      };
    }
    if (!isPlainObject(request.submitted)) {
      return {
        ok: false,
        code: 'REVALIDATION_INPUT_INVALID',
        retryable: false,
        conflicts: [],
        message: 'Peta medan yang dihantar tidak sah.',
        serverRevision: null,
        current: {},
      };
    }

    const record = this.store.get<Record<string, unknown>>(kind, recordId);
    if (!record) {
      return {
        ok: false,
        code: 'REVALIDATION_RECORD_NOT_FOUND',
        retryable: false,
        conflicts: [],
        message: 'Rekod tidak ditemui pada pelayan.',
        serverRevision: null,
        current: {},
      };
    }

    // `defaultRecordAuthoriser` menerima (actor, record) manakala kontrak
    // `options.authorise` ialah (record, actor) — adaptasi di sini supaya
    // kedua-dua bentuk boleh digunakan tanpa menukar API awam.
    const authorise = options.authorise ?? ((record, act) => defaultRecordAuthoriser(act, record));
    if (!authorise(record, actor)) {
      return {
        ok: false,
        code: 'REVALIDATION_FORBIDDEN',
        retryable: false,
        conflicts: [],
        message: 'Rekod ini di luar akses anda.',
        serverRevision: Number(record.revision) || 0,
        current: {},
      };
    }

    const serverRevision = Number.isSafeInteger(Number(record.revision)) ? Number(record.revision) : 0;
    const conflicts: RevalidationConflict[] = [];
    const current: Record<string, unknown> = {};

    // 1. Revisi — CAS yang sama seperti `PlatformStore.revision`, tetapi
    //    dilaporkan sebagai konflik yang boleh dibaca bukan kod HTTP.
    if (serverRevision !== request.expectedRevision) {
      conflicts.push({ field: 'expectedRevision', expected: request.expectedRevision, actual: serverRevision });
    }

    // 2. Setiap medan yang dihantar, satu per satu.
    const specs: RevalidationFieldSpec[] = request.comparisons
      ?? Object.keys(request.submitted)
        .filter(field => field !== 'expectedRevision')
        .map(field => ({ submittedField: field }));

    for (const spec of specs) {
      if (!spec || typeof spec.submittedField !== 'string' || !spec.submittedField) continue;
      const serverField = spec.serverField ?? spec.submittedField;
      const submittedValue = request.submitted[spec.submittedField];
      const server = readField(record, serverField);
      if (!server.present) continue; // Tidak boleh dibandingkan — bukan konflik.
      current[spec.submittedField] = server.value;
      if (!sameValue(submittedValue, server.value)) {
        conflicts.push({ field: spec.submittedField, expected: submittedValue, actual: server.value });
      }
    }

    if (conflicts.length) {
      return {
        ok: false,
        code: 'REVALIDATION_CONFLICT',
        retryable: false,
        conflicts,
        message: 'Rekod pelayan telah berubah. Semak semula sebelum meneruskan.',
        serverRevision,
        current,
      };
    }

    return { ok: true, code: null, conflicts: [], serverRevision, current, record };
  }

  /**
   * Revalidasi dengan pintasan: arahan hanya berjalan apabila TIDAK
   * ada konflik. Konflik ⇒ arahan TIDAK dijalankan.
   */
  execute<T>(
    actor: Principal,
    request: RevalidationRequest,
    command: () => T,
    options: RevalidationOptions = {},
  ): RevalidationExecution<T> {
    const outcome = this.revalidate(actor, request, options);
    if (!outcome.ok) {
      return {
        ok: false,
        code: outcome.code,
        executed: false,
        retryable: false,
        conflicts: outcome.conflicts,
        message: outcome.message,
        serverRevision: outcome.serverRevision,
        current: outcome.current,
      };
    }
    const result = command();
    return {
      ok: true,
      code: null,
      executed: true,
      conflicts: [],
      serverRevision: outcome.serverRevision,
      current: outcome.current,
      result,
    };
  }
}
