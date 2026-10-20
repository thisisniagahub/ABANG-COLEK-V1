/**
 * AbangColek Sovereign GrowthOS — Public Order Projection (MOD-02)
 *
 * PRINSIP:
 * Laluan penjejakan awam (`GET /orders/track`) tidak pernah mendedahkan
 * pesanan dalaman. ID pesanan ialah kunci pengenal peribadi: ia membolehkan
 * seseorang meneka rekod lain dan membina corak pembelian. Unjuran awam
 * menukarnya kepada `publicRef` — prefix hash token penjejakan, yang:
 *   - stable untuk pesanan yang sama,
 *   - TIDAK boleh diterbalikkan kepada ID pesanan (hash token rawak),
 *   - TIDAK mendedahkan apa-apa tentang pesanan lain.
 *
 * PENJAGA PENGASINGAN:
 * `assertPublicProjectionIsolated` ialah PENJAGA, bukan harapan. Ia
 * membandingkan muatan dengan allow-list dan menolak mana-mana medan peribadi
 * (termasuk `id` dan `orderId`) atau nilai peribadi yang tersekat di dalam
 * payload. Kegagalan ⇒ `PUBLIC_PROJECTION_LEAK_BLOCKED` (fail tertutup).
 */

import { hash } from './auth';
import { extractCity } from './commerce';
import { DomainError, now, type PlatformStore } from './store';
import type { OrderRecord } from '../../shared/platform-contracts';
import {
  PUBLIC_ORDER_PROJECTION_ALLOWED_FIELDS,
  PUBLIC_ORDER_PROJECTION_DENIED_FIELDS,
  type PublicOrderProjection,
  type PublicTrackingReasonCode,
} from '../../shared/mod-contracts';

/** Bilangan aksia hash yang digunakan sebagai rujukan awam. */
export const PUBLIC_REF_HASH_PREFIX_LENGTH = 12;

/**
 * Rujukan awam yang opaque.
 *
 * Ia berasal daripada hash SHA-256 token penjejaan rawak, bukan daripada ID
 * pesanan — jadi ia tidak boleh diterbalikkan kepada ID pesanan dalaman.
 */
export function publicRefFromTokenHash(trackingTokenHash: string): string {
  return `pub_${trackingTokenHash.slice(0, PUBLIC_REF_HASH_PREFIX_LENGTH)}`;
}

/**
 * Bina unjuran awam daripada pesanan dalaman.
 *
 * Unjuran TIDAK mengandungi `id` atau `orderId`. Ia hanya mengandungi medan
 * dalam `PUBLIC_ORDER_PROJECTION_ALLOWED_FIELDS`.
 */
export function buildPublicOrderProjection(order: OrderRecord): PublicOrderProjection {
  if (!order.trackingTokenHash) {
    throw new DomainError(
      'TRACKING_TOKEN_UNAVAILABLE',
      409,
      'Pesanan tiada token penjejakan; unjuran awam tidak boleh dibina.',
    );
  }
  return {
    publicRef: publicRefFromTokenHash(order.trackingTokenHash),
    status: order.fulfilmentStatus,
    fulfilmentStatus: order.fulfilmentStatus,
    outletId: order.outletId,
    hub: order.outletId,
    fulfilment: order.fulfilment,
    deliveryType: order.fulfilment,
    city: extractCity(order.contactRef, order.outletId),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

const ALLOWED = new Set<string>(PUBLIC_ORDER_PROJECTION_ALLOWED_FIELDS);
const DENIED = new Set<string>(PUBLIC_ORDER_PROJECTION_DENIED_FIELDS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Penjaga pengasingan unjuran awam.
 *
 * Menolak (fail tertutup) apabila:
 *   - mana-mana medan peribadi (`id`, `orderId`, `contactRef`, ...) hadir,
 *   - mana-mana medan di luar allow-list hadir,
 *   - mana-mana nilai peribadi yang disekat (`forbiddenValues`) hadir — ini
 *     menangkap kebocoran nilai (contohnya ID pesanan yang tersilat ke dalam
 *     medan `city`).
 *
 * @throws DomainError dengan kod `PUBLIC_PROJECTION_LEAK_BLOCKED`.
 */
export function assertPublicProjectionIsolated(payload: unknown, forbiddenValues: readonly string[] = []): void {
  const forbidden = forbiddenValues.filter(value => typeof value === 'string' && value.length > 0);
  const visit = (value: unknown, path: string): void => {
    if (typeof value === 'string') {
      for (const secret of forbidden) {
        if (value.includes(secret)) {
          throw new DomainError(
            'PUBLIC_PROJECTION_LEAK_BLOCKED',
            500,
            `Unjuran awam membocorkan nilai peribadi pada ${path}.`,
          );
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, entry] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (DENIED.has(key)) {
        throw new DomainError(
          'PUBLIC_PROJECTION_LEAK_BLOCKED',
          500,
          `Unjuran awam membocorkan medan peribadi '${key}' pada ${childPath}.`,
        );
      }
      if (!ALLOWED.has(key)) {
        throw new DomainError(
          'PUBLIC_PROJECTION_LEAK_BLOCKED',
          500,
          `Unjuran awam mengandungi medan di luar allow-list '${key}' pada ${childPath}.`,
        );
      }
      visit(entry, childPath);
    }
  };
  if (!isPlainObject(payload)) {
    throw new DomainError('PUBLIC_PROJECTION_LEAK_BLOCKED', 500, 'Unjuran awam mesti objek biasa.');
  }
  visit(payload, 'projection');
}

/** Hasil typed untuk laluan penjejakan awam. */
export type PublicTrackingOutcome =
  | { ok: true; projection: PublicOrderProjection }
  | { ok: false; code: PublicTrackingReasonCode; message: string };

/**
 * Selesaikan token penjejakan kepada unjuran awam.
 *
 * Semua kegagalan adalah typed + machine-readable:
 *   - `INVALID_TOKEN` — bentuk token tidak sah
 *   - `ORDER_NOT_FOUND` — tiada pesanan sepadan
 *   - `TRACKING_TOKEN_EXPIRED` — token sudah luput
 *   - `PUBLIC_PROJECTION_LEAK_BLOCKED` — penjaga pengasingan menolak muatan
 */
export function resolvePublicTrackingProjection(
  token: unknown,
  store: PlatformStore,
): PublicTrackingOutcome {
  if (typeof token !== 'string' || !token.trim() || token.includes('\0') || token.length > 2048) {
    return { ok: false, code: 'INVALID_TOKEN', message: 'Token penjejakan diperlukan.' };
  }
  const tokenHash = hash(token.trim());
  const order = store.all<OrderRecord>('orders').find(candidate => candidate.trackingTokenHash === tokenHash);
  if (!order) {
    return {
      ok: false,
      code: 'ORDER_NOT_FOUND',
      message: 'Pesanan tidak ditemui atau token penjejakan tidak sah.',
    };
  }
  if (order.trackingTokenExpiresAt && order.trackingTokenExpiresAt <= now()) {
    return { ok: false, code: 'TRACKING_TOKEN_EXPIRED', message: 'Token penjejakan telah luput.' };
  }
  try {
    const projection = buildPublicOrderProjection(order);
    assertPublicProjectionIsolated(projection, [
      order.id,
      order.customerId,
      order.trackingTokenHash ?? '',
      order.trackingTokenExpiresAt ?? '',
    ]);
    return { ok: true, projection };
  } catch (error) {
    if (error instanceof DomainError && error.code === 'PUBLIC_PROJECTION_LEAK_BLOCKED') {
      return {
        ok: false,
        code: 'PUBLIC_PROJECTION_LEAK_BLOCKED',
        message: 'Unjuran awam gagal pengasingan; unjuran tidak dihantar.',
      };
    }
    throw error;
  }
}
