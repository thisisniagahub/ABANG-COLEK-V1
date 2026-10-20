/**
 * AbangColek Sovereign GrowthOS — MCP Operations Brief (data sebenar)
 *
 * Modul ini mengira ringkasan operasi daripada STORE KANONIKAL platform.
 * Tiada angka tetap, tiada ID fikasi: setiap metrik berasal daripada rekod
 * sebenar di `PlatformStore`, atau bernilai `null` apabila data tidak dapat
 * dikira.
 *
 * Skop peranan:
 * - Founder: seluruh rekod perniagaan.
 * - Staf: hanya outlet yang dipegang oleh staf tersebut.
 * - Pelanggan: tiada skop operasi (diketag oleh `assertOperationalScope`).
 */

import type {
  CatalogueProduct,
  InventoryReservation,
  OrderRecord,
  StockLot,
} from '../../../shared/platform-contracts';
import type { PlatformStore } from '../../platform/store';
import { assertOperationalScope, scopeOrders, type McpActor } from './actor';

/** Paras stok rendah (unit) — ambush operasi, bukan hasil kiraan. */
export const LOW_STOCK_THRESHOLD_UNITS = 20;

/**
 * Notis bacaan sahaja yang WAJIB ada dalam setiap unjuran brief.
 * Nilainya sepadan dengan `OPERATIONS_BRIEF_READ_ONLY_NOTICE` pada
 * `src/features/copilot/mcp-apps/OperationsBriefApp.tsx`.
 */
export const OPERATIONS_BRIEF_READ_ONLY_NOTICE =
  'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED' as const;

export interface OperationsBriefMetric {
  label: string;
  value: string;
}

/**
 * Unjuran brief yang consumer klien(parse) boleh terima tanpa sebarang
 * medan tambahan. Kunci di luar senarai ini akan ditolak oleh parser.
 */
export interface OperationsBriefProjection {
  title: string;
  briefDate: string;
  metrics: OperationsBriefMetric[];
  readOnlyNotice: typeof OPERATIONS_BRIEF_READ_ONLY_NOTICE;
  source: string;
  revision: string;
}

export type OperationsBriefPeriod = 'daily' | 'urgent';

export interface OperationsBriefResult {
  projection: OperationsBriefProjection;
  /** Metrik mentah untuk callers yang memerlukan nombor (bukan teks). */
  observation: 'observed' | 'unavailable';
  reasonCode?: string;
  metrics: {
    totalOrdersToday: number | null;
    grossSalesSen: number | null;
    activeShipmentsInTransit: number | null;
    lowStockSkus: number | null;
    pendingHitlApprovals: number | null;
  };
  highlights: string[];
  pendingHitlActionIds: string[];
}

const localDay = (stamp: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(stamp));

interface HitlActionRecord {
  id: string;
  status: string;
  actionType?: string;
  description?: string;
  entity?: { type: string; id: string };
}

function metricText(value: number | null): string {
  return value === null ? 'Tidak tersedia' : String(value);
}

/**
 * Mengira metrik brief daripada store kanonikal.
 *
 * Setiap metrik yang tidak dapat dikira (tiada store) dikembalikan sebagai
 * `null` bersama reason code — TIADA angka sifar yang dipoleskan sebagai
 * telemetri.
 */
export function computeOperationsBrief(
  store: PlatformStore | undefined,
  actor: McpActor,
  period: OperationsBriefPeriod,
): OperationsBriefResult {
  assertOperationalScope(actor);

  const generatedAt = new Date().toISOString();
  const briefDate = localDay(generatedAt);

  if (!store) {
    return {
      projection: {
        title:
          period === 'urgent'
            ? 'Notis Amaran Operasi Mendesak AbangColek'
            : 'Ringkasan Eksekutif Operasi Harian AbangColek',
        briefDate,
        metrics: [
          { label: 'Pesanan Hari Ini', value: metricText(null) },
          { label: 'Kutipan Bersih (Sen)', value: metricText(null) },
          { label: 'Penghantaran Dalam Transit', value: metricText(null) },
          { label: 'SKU Stok Rendah', value: metricText(null) },
          { label: 'Tindakan HITL Menunggu', value: metricText(null) },
        ],
        readOnlyNotice: OPERATIONS_BRIEF_READ_ONLY_NOTICE,
        source: 'local_authoritative',
        revision: 'none',
      },
      observation: 'unavailable',
      reasonCode: 'PLATFORM_STORE_NOT_WIRED',
      metrics: {
        totalOrdersToday: null,
        grossSalesSen: null,
        activeShipmentsInTransit: null,
        lowStockSkus: null,
        pendingHitlApprovals: null,
      },
      highlights: [],
      pendingHitlActionIds: [],
    };
  }

  const allOrders = store.all<OrderRecord>('orders');
  // Skop peranan dijalankan BEFORE sebarang kiraan: staf hanya melihat
  // pesanan outlet sendiri, dan rekod dealer lain tidak sekali-kali dibaca.
  const orders = scopeOrders(actor, allOrders);

  const todaysOrders = orders.filter(order => localDay(order.createdAt) === briefDate);
  const totalOrdersToday = todaysOrders.length;
  const grossSalesSen = todaysOrders.reduce(
    (total, order) => total + order.paidAmountSen - order.refundAmountSen,
    0,
  );
  const activeShipmentsInTransit = orders.filter(order => order.fulfilmentStatus === 'dispatched').length;

  const lowStockSkus = countLowStockSkus(store);
  const pending = store
    .all<HitlActionRecord>('hitl_actions')
    .filter(action => action.status === 'pending_approval');
  const pendingHitlApprovals = pending.length;

  const highlights: string[] = [];
  if (activeShipmentsInTransit > 0) {
    highlights.push(
      `${activeShipmentsInTransit} penghantaran aktif dalam transit (rekod pesanan sahkan status 'dispatched').`,
    );
  }
  if (lowStockSkus > 0) {
    highlights.push(
      `${lowStockSkus} SKU pada atau bawah paras stok rendah (${LOW_STOCK_THRESHOLD_UNITS} unit).`,
    );
  }
  if (pendingHitlApprovals > 0) {
    highlights.push(
      `${pendingHitlApprovals} tindakan HITL menunggu keputusan Founder: ${pending
        .map(action => action.id)
        .join(', ')}.`,
    );
  }
  if (totalOrdersToday === 0 && highlights.length === 0) {
    highlights.push('Tiada pesanan baharu direkodkan hari ini.');
  }

  const projection: OperationsBriefProjection = {
    title:
      period === 'urgent'
        ? 'Notis Amaran Operasi Mendesak AbangColek'
        : 'Ringkasan Eksekutif Operasi Harian AbangColek',
    briefDate,
    metrics: [
      { label: 'Pesanan Hari Ini', value: metricText(totalOrdersToday) },
      { label: 'Kutipan Bersih (Sen)', value: metricText(grossSalesSen) },
      { label: 'Penghantaran Dalam Transit', value: metricText(activeShipmentsInTransit) },
      { label: 'SKU Stok Rendah', value: metricText(lowStockSkus) },
      { label: 'Tindakan HITL Menunggu', value: metricText(pendingHitlApprovals) },
    ],
    readOnlyNotice: OPERATIONS_BRIEF_READ_ONLY_NOTICE,
    source: 'database',
    revision: 'store_snapshot',
  };

  return {
    projection,
    observation: 'observed',
    metrics: {
      totalOrdersToday,
      grossSalesSen,
      activeShipmentsInTransit,
      lowStockSkus,
      pendingHitlApprovals,
    },
    highlights,
    pendingHitlActionIds: pending.map(action => action.id),
  };
}

/**
 * Bilangan SKU katalog yang dipublish dengan baki boleh guna pada atau bawah
 * paras stok rendah. Memakai lot dan simpanan sebenar — bukan medan turutan.
 */
function countLowStockSkus(store: PlatformStore): number {
  const stamp = new Date().toISOString();
  const products = store
    .all<CatalogueProduct>('catalogue')
    .filter(product => product.status === 'published');
  const lots = store.all<StockLot>('lots');
  const reservations = store.all<InventoryReservation>('reservations');

  let low = 0;
  for (const product of products) {
    const available = lots
      .filter(
        lot =>
          lot.productId === product.id &&
          lot.ownerId === 'business' &&
          lot.locationId === 'hq' &&
          lot.status === 'available' &&
          (!lot.expiryAt || lot.expiryAt > stamp),
      )
      .reduce((total, lot) => total + lot.quantity, 0);
    const reserved = reservations
      .filter(
        reservation =>
          reservation.productId === product.id &&
          reservation.ownerId === 'business' &&
          reservation.locationId === 'hq' &&
          reservation.status === 'active' &&
          reservation.expiresAt > stamp,
      )
      .reduce((total, reservation) => total + reservation.quantity, 0);
    if (available - reserved < LOW_STOCK_THRESHOLD_UNITS) low += 1;
  }
  return low;
}
