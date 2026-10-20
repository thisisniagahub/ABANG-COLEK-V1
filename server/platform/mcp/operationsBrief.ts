/**
 * AbangColek First-Party Read-Only MCP App: Operations Brief
 * Pematuhan Prinsip: Read-Only • No Side-Effects • A2UI Fixed Schema
 *
 * URI Resources:
 * - operations://brief/daily
 * - operations://brief/urgent
 *
 * Tools:
 * - get_operations_brief
 *
 * KEBENARAN DATA: Setiap angka dalam brief ini DIKIRA daripada store kanonikal
 * platform. Tiada pemalar-hardcode atau ID fikasi boleh muncul di sini.
 * Apabila store tidak disambungkan, brief bertaraf `observation: 'unavailable'`
 * dengan reason code — bukan angka sifar yang dipoleskan sebagai telemetri.
 */

import type { A2UIFixedSchema } from '../../../shared/copilot-contracts';
import type { CatalogueProduct, InventoryReservation, OrderRecord, StockLot } from '../../../shared/platform-contracts';
import type { PlatformStore } from '../store';

/** Paras stok rendah (unit) — ambush operasi, bukan hasil kiraan. */
export const LOW_STOCK_THRESHOLD_UNITS = 20;

const localDay = (stamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(stamp));

export interface OperationsBriefMetrics {
  /** Bilangan pesanan yang dibuat hari ini (waktu tempatan Asia/Kuala_Lumpur). */
  totalOrdersToday: number | null;
  /** Nilai jualan dicatat hari ini (sen): jumlah nilai pesanan hari ini. */
  grossSalesSen: number | null;
  /** Tunai benar-benar dikumpulkan hari ini (sen): dibayar tolak refund. */
  collectedSen: number | null;
  /** Pesanan dalam status 'dispatched'. */
  activeShipmentsInTransit: number | null;
  /** SKU katalog yang dipublish dengan baki boleh guna pada atau bawah paras stok rendah. */
  lowStockSkus: number | null;
  /** Tindakan HITL berstatus 'pending_approval'. */
  pendingHitlApprovals: number | null;
}

export interface OperationsBriefData {
  title: string;
  generatedAt: string;
  briefDate: string;
  period: 'daily' | 'urgent';
  /** 'observed' = semua metrik dikira daripada store; 'unavailable' = tiada store. */
  observation: 'observed' | 'unavailable';
  reasonCode?: string;
  metrics: OperationsBriefMetrics;
  highlights: string[];
  /** ID tindakan HITL sebenar yang menunggu (bukan teks naratif rekaan). */
  pendingHitlActionIds: string[];
  readOnly: true;
}

interface HitlActionRecord {
  id: string;
  status: string;
  actionType?: string;
  description?: string;
  entity?: { type: string; id: string };
}

export class OperationsBriefMcpApp {
  constructor(readonly store?: PlatformStore) {}

  private observe(): { observation: 'observed' | 'unavailable'; reasonCode?: string } {
    if (!this.store) return { observation: 'unavailable', reasonCode: 'PLATFORM_STORE_NOT_WIRED' };
    return { observation: 'observed' };
  }

  private orders(): OrderRecord[] {
    return this.store ? this.store.all<OrderRecord>('orders') : [];
  }

  private pendingHitl(): HitlActionRecord[] {
    if (!this.store) return [];
    return this.store
      .all<HitlActionRecord>('hitl_actions')
      .filter(action => action.status === 'pending_approval');
  }

  private lowStockSkuCount(): number {
    if (!this.store) return 0;
    const stamp = new Date().toISOString();
    const products = this.store.all<CatalogueProduct>('catalogue').filter(product => product.status === 'published');
    const lots = this.store.all<StockLot>('lots');
    const reservations = this.store.all<InventoryReservation>('reservations');
    let low = 0;
    for (const product of products) {
      const available = lots
        .filter(lot => lot.productId === product.id && lot.ownerId === 'business' && lot.locationId === 'hq' && lot.status === 'available' && (!lot.expiryAt || lot.expiryAt > stamp))
        .reduce((total, lot) => total + lot.quantity, 0);
      const reserved = reservations
        .filter(reservation => reservation.productId === product.id && reservation.ownerId === 'business' && reservation.locationId === 'hq' && reservation.status === 'active' && reservation.expiresAt > stamp)
        .reduce((total, reservation) => total + reservation.quantity, 0);
      if (available - reserved < LOW_STOCK_THRESHOLD_UNITS) low += 1;
    }
    return low;
  }

  /**
   * Mengira metrik brief daripada store kanonikal. Setiap metrik yang tidak
   * dapat dikira (tiada store) dikembalikan sebagai `null` bersama reason code.
   */
  private computeMetrics(day: string): { metrics: OperationsBriefMetrics; highlights: string[]; pendingHitlActionIds: string[] } {
    const { observation, reasonCode } = this.observe();
    if (observation === 'unavailable') {
      return {
        metrics: {
          totalOrdersToday: null,
          grossSalesSen: null,
          collectedSen: null,
          activeShipmentsInTransit: null,
          lowStockSkus: null,
          pendingHitlApprovals: null,
        },
        highlights: [],
        pendingHitlActionIds: [],
      };
    }

    const orders = this.orders();
    const todaysOrders = orders.filter(order => localDay(order.createdAt) === day);
    const totalOrdersToday = todaysOrders.length;
    const grossSalesSen = todaysOrders.reduce((total, order) => total + order.amountSen, 0);
    const collectedSen = todaysOrders.reduce(
      (total, order) => total + order.paidAmountSen - order.refundAmountSen,
      0
    );
    const activeShipmentsInTransit = orders.filter(order => order.fulfilmentStatus === 'dispatched').length;
    const lowStockSkus = this.lowStockSkuCount();
    const pending = this.pendingHitl();
    const pendingHitlApprovals = pending.length;

    const highlights: string[] = [];
    if (activeShipmentsInTransit > 0) {
      highlights.push(`${activeShipmentsInTransit} penghantaran aktif dalam transit (rekod pesanan sahkan status 'dispatched').`);
    }
    if (lowStockSkus > 0) {
      highlights.push(`${lowStockSkus} SKU pada atau bawah paras stok rendah (${LOW_STOCK_THRESHOLD_UNITS} unit).`);
    }
    if (pendingHitlApprovals > 0) {
      const ids = pending.map(action => action.id);
      highlights.push(`${pendingHitlApprovals} tindakan HITL menunggu keputusan Founder: ${ids.join(', ')}.`);
    }
    if (totalOrdersToday === 0 && highlights.length === 0) {
      highlights.push('Tiada pesanan baharu direkodkan hari ini.');
    }

    return {
      metrics: {
        totalOrdersToday,
        grossSalesSen,
        collectedSen,
        activeShipmentsInTransit,
        lowStockSkus,
        pendingHitlApprovals,
      },
      highlights,
      pendingHitlActionIds: pending.map(action => action.id),
    };
  }

  private toMetricRows(metrics: OperationsBriefMetrics): Array<{ label: string; value: string }> {
    const value = (input: number | null) => (input === null ? 'Tidak tersedia' : String(input));
    return [
      { label: 'Pesanan Hari Ini', value: value(metrics.totalOrdersToday) },
      { label: 'Jualan Dicatat (Sen)', value: value(metrics.grossSalesSen) },
      { label: 'Tunay Dikumpulkan (Sen)', value: value(metrics.collectedSen) },
      { label: 'Penghantaran Dalam Transit', value: value(metrics.activeShipmentsInTransit) },
      { label: 'SKU Stok Rendah', value: value(metrics.lowStockSkus) },
      { label: 'Tindakan HITL Menunggu', value: value(metrics.pendingHitlApprovals) },
    ];
  }

  /**
   * Menjana ringkasan eksekutif harian secara bacaan sahaja.
   */
  getDailyBrief(): { data: OperationsBriefData; a2ui: A2UIFixedSchema } {
    const generatedAt = new Date().toISOString();
    const briefDate = localDay(generatedAt);
    const { metrics, highlights, pendingHitlActionIds } = this.computeMetrics(briefDate);
    const { observation, reasonCode } = this.observe();
    const attentionRequired = (metrics.pendingHitlApprovals ?? 0) > 0 || (metrics.lowStockSkus ?? 0) > 0;

    const data: OperationsBriefData = {
      title: 'Ringkasan Eksekutif Operasi Harian AbangColek',
      generatedAt,
      briefDate,
      period: 'daily',
      observation,
      ...(reasonCode ? { reasonCode } : {}),
      metrics,
      highlights,
      pendingHitlActionIds,
      readOnly: true,
    };

    const a2ui: A2UIFixedSchema = {
      schemaVersion: 'a2ui.v1',
      component: 'OperationsBriefCard',
      props: {
        title: data.title,
        briefDate,
        metrics: this.toMetricRows(metrics),
        highlights,
        observation,
        ...(reasonCode ? { reasonCode } : {}),
        status: observation === 'unavailable' ? 'DATA_UNAVAILABLE' : attentionRequired ? 'ATTENTION_REQUIRED' : 'OPERATIONAL_NORMAL',
      },
      provenance: {
        source: observation === 'observed' ? 'database' : 'local_authoritative',
        timestamp: generatedAt,
        revision: observation === 'observed' ? 'store_snapshot' : 'none',
      },
    };

    return { data, a2ui };
  }

  /**
   * Menjana amaran operasi mendesak (Urgent Brief). Highlight hanya menyatakan
   * tindakan HITL sebenar yang direkodkan dalam store; tiada ID fikasi.
   */
  getUrgentBrief(): { data: OperationsBriefData; a2ui: A2UIFixedSchema } {
    const generatedAt = new Date().toISOString();
    const briefDate = localDay(generatedAt);
    const { metrics, highlights, pendingHitlActionIds } = this.computeMetrics(briefDate);
    const { observation, reasonCode } = this.observe();
    const attentionRequired = (metrics.pendingHitlApprovals ?? 0) > 0 || (metrics.lowStockSkus ?? 0) > 0;

    const data: OperationsBriefData = {
      title: 'Notis Amaran Operasi Mendesak AbangColek',
      generatedAt,
      briefDate,
      period: 'urgent',
      observation,
      ...(reasonCode ? { reasonCode } : {}),
      metrics,
      highlights,
      pendingHitlActionIds,
      readOnly: true,
    };

    const a2ui: A2UIFixedSchema = {
      schemaVersion: 'a2ui.v1',
      component: 'OperationsBriefCard',
      props: {
        title: data.title,
        briefDate,
        metrics: this.toMetricRows(metrics),
        highlights,
        observation,
        ...(reasonCode ? { reasonCode } : {}),
        status: observation === 'unavailable' ? 'DATA_UNAVAILABLE' : attentionRequired ? 'ATTENTION_REQUIRED' : 'OPERATIONAL_NORMAL',
      },
      provenance: {
        source: observation === 'observed' ? 'database' : 'local_authoritative',
        timestamp: generatedAt,
        revision: observation === 'observed' ? 'store_snapshot' : 'none',
      },
    };

    if (pendingHitlActionIds.length > 0) {
      a2ui.actions = [
        {
          id: 'view-hitl-queue',
          label: 'Semak Tindakan HITL Tertunggak',
          actionType: 'navigate',
          payload: { route: '/copilot/hitl', actionIds: pendingHitlActionIds },
        },
      ];
    }

    return { data, a2ui };
  }

  /**
   * get_operations_brief Tool:
   * Mengambil ringkasan operasi berdasarkan jenis ('daily' atau 'urgent').
   */
  getOperationsBrief(input?: { type?: 'daily' | 'urgent' }): { data: OperationsBriefData; a2ui: A2UIFixedSchema } {
    const briefType = input?.type === 'urgent' ? 'urgent' : 'daily';
    return briefType === 'urgent' ? this.getUrgentBrief() : this.getDailyBrief();
  }

  /**
   * Resolves MCP resource URI to content.
   */
  resolveResource(uri: string): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
    if (uri === 'operations://brief/daily') {
      const brief = this.getDailyBrief();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(brief.data, null, 2),
          },
        ],
      };
    }

    if (uri === 'operations://brief/urgent') {
      const brief = this.getUrgentBrief();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(brief.data, null, 2),
          },
        ],
      };
    }

    throw new Error(`MCP Resource '${uri}' tidak ditemui.`);
  }
}

/** Singleton tanpa store — brief bertaraf 'unavailable' sehingga store disambungkan. */
export const operationsBriefApp = new OperationsBriefMcpApp();

/** Factory untuk menyambungkan store kanonikal platform. */
export function createOperationsBriefApp(store: PlatformStore): OperationsBriefMcpApp {
  return new OperationsBriefMcpApp(store);
}
