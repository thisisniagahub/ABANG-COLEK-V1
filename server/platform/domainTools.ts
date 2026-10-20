/**
 * AbangColek Sovereign GrowthOS — Domain Tools Registry v1.1
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • Rules Own The Money • A2UI Fixed Schema
 *
 * Liputan 10 Domain Modul Platform:
 * 1. Commerce: get_product_catalog, get_pricing_rules
 * 2. Inventory: check_stock_levels, get_warehouse_allocation
 * 3. Orders: get_order_details, list_active_orders
 * 4. Delivery/Dispatch: get_delivery_manifest, track_consignment
 * 5. Payment/Ledger: get_payment_ledger_summary, verify_sen_balance
 * 6. Commission: get_agent_commission_summary, verify_contra_reversal
 * 7. Loyalty: get_loyalty_tier_status, calculate_points_balance
 * 8. Marketing: get_campaign_performance, draft_marketing_copy_spec
 * 9. QC/Audit: get_qc_audit_checklist, verify_cas_integrity
 * 10. Analytics: get_daily_sales_analytics, get_operational_kpi
 * + First-Party MCP App Tool: get_operations_brief
 *
 * KEBENARAN DATA (v1.1): Tiap-tiap alatan kini membaca daripada store / servis
 * kanonikal yang disuntik. Tiada alatan lagi memulangkan pemalar rekaan
 * (jumlah kas, nisbah margin, atau status CAS yang diasyikan).
 * Apabila store/khidmat tidak disambungkan atau rekod tiada, alatan memulangkan
 * `observation: 'unavailable'` + `reasonCode` — bukan angka yang kelihatan
 * munasabah.
 */

import type { Principal } from './auth';
import type { Auth } from './auth';
import type { PlatformStore } from './store';
import type { Commerce } from './commerce';
import type { Dealers } from './dealers';
import type { Loyalty } from './loyalty';
import type { Operations } from './operations';
import {
  type A2UIFixedSchema,
  validateA2UIComponent,
} from '../../shared/copilot-contracts';
import {
  type MarginSimulationInput,
  type MarginSimulationResult,
  evaluateMarginContribution,
  loyaltyPointsToDiscountSen,
} from '../../shared/growth-contracts';
import { parseMarginSimulationInput } from './marginInputs';
import type {
  CampaignRecord,
  CatalogueProduct,
  InventoryReservation,
  OrderRecord,
  QcRecord,
  StockLot,
} from '../../shared/platform-contracts';
import type { CommissionTransaction } from '../../shared/dealer-contracts';
import { OperationsBriefMcpApp } from './mcp/operationsBrief';

export type CanonicalRole = 'founder' | 'staff' | 'dealer' | 'customer';

export function getActorCanonicalRole(actor?: Principal): CanonicalRole {
  if (actor?.memberships?.length) {
    if (actor.memberships.some((m) => m.role === 'founder' && m.status === 'active')) return 'founder';
    if (actor.memberships.some((m) => m.role === 'staff' && m.status === 'active')) return 'staff';
    if (actor.memberships.some((m) => (m.role as string) === 'dealer' || (m.dealerOrgId && m.status === 'active'))) return 'dealer';
    return 'customer';
  }
  const fallbackRole = (actor as any)?.user?.role;
  if (fallbackRole === 'founder' || fallbackRole === 'staff' || fallbackRole === 'dealer' || fallbackRole === 'customer') {
    return fallbackRole;
  }
  return 'customer';
}

// ---------------------------------------------------------------------------
// Reason codes
// ---------------------------------------------------------------------------
export const STORE_NOT_WIRED = 'PLATFORM_STORE_NOT_WIRED';
export const RECORD_NOT_FOUND = 'RECORD_NOT_FOUND';
export const NO_COMMERCIAL_INPUTS = 'MARGIN_INPUTS_NOT_PROVIDED';
export const COST_BASIS_UNAVAILABLE = 'COST_BASIS_UNAVAILABLE';
export const PUBLISH_CHANNEL_UNAVAILABLE = 'PUBLISH_CHANNEL_NOT_CONFIGURED';

/** Ambang FIN-01: minimum nisbah sumbangan margin (%) — polisi, bukan hasil kiraan. */
export const FIN01_MIN_CONTRIBUTION_MARGIN_PCT = 25;
/** Paras stok rendah (unit) — polisi operasi, bukan hasil kiraan. */
export const LOW_STOCK_THRESHOLD_UNITS = 20;
/**
 * Jadual taraf kesetiaan — polisi tempatan. Ambang ini TIDAK datang daripada
 * kontrak kanonikal `shared/growth-contracts.ts` (yang hanya menetapkan nilai
 * mata), jadi ia dikodkan sebagai jadual polisi yang jelas, bukan kiraan.
 */
export const LOYALTY_TIER_POLICY: ReadonlyArray<{ tier: string; minPoints: number }> = [
  { tier: 'Perak', minPoints: 0 },
  { tier: 'Emas', minPoints: 200 },
  { tier: 'Platinum', minPoints: 500 },
];

/** Senarai semak QC — templat pemeriksaan yang tetap (bukan bacaan fizikal). */
const QC_CHECKLIST_TEMPLATE: ReadonlyArray<{ check: string; status: 'NOT_RECORDED' }> = [
  { check: 'Kekedapan penutup botol (Seal)', status: 'NOT_RECORDED' },
  { check: 'Pelekat label kalis air', status: 'NOT_RECORDED' },
  { check: 'Integriti kotak beralun (Corrugated)', status: 'NOT_RECORDED' },
];

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: readonly string[];
  minimum?: number;
  maximum?: number;
  default?: any;
}

export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  domain: string;
  description: string;
  allowedRoles: CanonicalRole[];
  readOnly: boolean;
  inputSchema?: ToolInputSchema;
  outputSchema?: Record<string, any>;
  execute: (context: ToolContext, input: TInput) => Promise<ToolResult<TOutput>>;
}

export interface ToolContext {
  actor: Principal;
  store?: PlatformStore;
  commerce?: Commerce;
  dealers?: Dealers;
  loyalty?: Loyalty;
  operations?: Operations;
  auth?: Auth;
}

export interface ToolResult<T = any> {
  ok: boolean;
  toolName: string;
  data: T;
  a2ui?: A2UIFixedSchema;
  message?: string;
}

// ---------------------------------------------------------------------------
// Helper komputasi
// ---------------------------------------------------------------------------
const localDay = (stamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(stamp));

function observationOf(ctx: ToolContext): { observation: 'observed' | 'unavailable'; reasonCode?: string } {
  return ctx.store ? { observation: 'observed' } : { observation: 'unavailable', reasonCode: STORE_NOT_WIRED };
}

function withObservation<T extends Record<string, any>>(
  ctx: ToolContext,
  data: T
): T & { observation: 'observed' | 'unavailable'; reasonCode?: string } {
  const { observation, reasonCode } = observationOf(ctx);
  return { ...data, observation, ...(reasonCode ? { reasonCode } : {}) };
}

/** Baki boleh guna sebenar (lot available tolak tempahan aktif) untuk satu produk. */
function availableUnits(ctx: ToolContext, productId: string, locationId = 'hq', ownerId = 'business'): number {
  if (!ctx.store) return 0;
  const stamp = new Date().toISOString();
  const lots = ctx.store
    .all<StockLot>('lots')
    .filter(
      (lot) =>
        lot.productId === productId &&
        lot.ownerId === ownerId &&
        lot.locationId === locationId &&
        lot.status === 'available' &&
        (!lot.expiryAt || lot.expiryAt > stamp)
    )
    .reduce((total, lot) => total + lot.quantity, 0);
  const reserved = ctx.store
    .all<InventoryReservation>('reservations')
    .filter(
      (reservation) =>
        reservation.productId === productId &&
        reservation.ownerId === ownerId &&
        reservation.locationId === locationId &&
        reservation.status === 'active' &&
        reservation.expiresAt > stamp
    )
    .reduce((total, reservation) => total + reservation.quantity, 0);
  return lots - reserved;
}

function allocatedUnits(ctx: ToolContext, productId: string, locationId = 'hq', ownerId = 'business'): number {
  if (!ctx.store) return 0;
  const stamp = new Date().toISOString();
  return ctx.store
    .all<InventoryReservation>('reservations')
    .filter(
      (reservation) =>
        reservation.productId === productId &&
        reservation.ownerId === ownerId &&
        reservation.locationId === locationId &&
        reservation.status === 'active' &&
        reservation.expiresAt > stamp
    )
    .reduce((total, reservation) => total + reservation.quantity, 0);
}

function orderTrackingStage(status: OrderRecord['fulfilmentStatus']): string {
  switch (status) {
    case 'accepted':
      return 'accepted';
    case 'packing':
      return 'packing';
    case 'packed':
      return 'packed';
    case 'dispatched':
      return 'dispatched';
    case 'received':
      return 'received';
    default:
      return 'draft';
  }
}

function trackingExpiryDays(order: OrderRecord): number | null {
  if (!order.trackingTokenExpiresAt) return null;
  const remainingMs = new Date(order.trackingTokenExpiresAt).getTime() - Date.now();
  if (!Number.isFinite(remainingMs)) return null;
  return Math.max(0, Math.floor(remainingMs / (24 * 3600 * 1000)));
}

function orderTrackingCard(order: OrderRecord): A2UIFixedSchema {
  const expiryDaysRemaining = trackingExpiryDays(order);
  return {
    schemaVersion: 'a2ui.v1',
    component: 'OrderTrackingBadge',
    componentName: 'OrderTrackingBadge',
    props: {
      orderId: order.id,
      stage: orderTrackingStage(order.fulfilmentStatus),
      trackingTokenRedactedHash: order.trackingTokenHash ? order.trackingTokenHash.slice(0, 16) : 'unavailable',
      expiryDaysRemaining: expiryDaysRemaining ?? 0,
      fulfilmentStatus: order.fulfilmentStatus,
      paymentState: order.paymentState,
    },
    provenance: {
      source: 'database',
      timestamp: new Date().toISOString(),
      revision: order.revision,
    },
  };
}

function orderNotFoundCard(orderId: string): A2UIFixedSchema {
  return {
    schemaVersion: 'a2ui.v1',
    component: 'OrderTrackingCard',
    componentName: 'OrderTrackingCard',
    props: {
      orderId,
      found: false,
      status: 'NOT_FOUND',
      reasonCode: RECORD_NOT_FOUND,
    },
    provenance: {
      source: 'local_authoritative',
      timestamp: new Date().toISOString(),
      revision: 'none',
    },
  };
}

/**
 * Kemasukan simulasi margin daripada input alat (sen integer + peratusan).
 * Pengesahan dikongsi dengan laluan chat melalui `parseMarginSimulationInput`
 * — satu sumber kebenaran, supaya input rosak tidak pernah sampai kepada
 * penilai kanonikal dan melontar ralat.
 */
function readMarginSimulation(raw: unknown): MarginSimulationInput | null {
  const parsed = parseMarginSimulationInput(raw);
  return parsed.ok ? parsed.input : null;
}

function marginResultStatus(result: MarginSimulationResult): 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN' {
  if (!result.isContributionPass) return 'INSUFFICIENT_CASH_MARGIN';
  if (!result.isMarginPctPass) return 'INSUFFICIENT_PERCENT_MARGIN';
  return 'PASSED';
}

export class DomainToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerStandardTools();
  }

  registerTool<TInput = any, TOutput = any>(tool: ToolDefinition<any, any>) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(role?: CanonicalRole): Array<{
    name: string;
    domain: string;
    description: string;
    readOnly: boolean;
    allowedRoles: CanonicalRole[];
    inputSchema?: ToolInputSchema;
  }> {
    const list: Array<{
      name: string;
      domain: string;
      description: string;
      readOnly: boolean;
      allowedRoles: CanonicalRole[];
      inputSchema?: ToolInputSchema;
    }> = [];

    for (const tool of this.tools.values()) {
      if (!role || tool.allowedRoles.includes(role)) {
        list.push({
          name: tool.name,
          domain: tool.domain,
          description: tool.description,
          readOnly: tool.readOnly,
          allowedRoles: tool.allowedRoles,
          inputSchema: tool.inputSchema,
        });
      }
    }
    return list;
  }

  /**
   * Menentusahkan input berstruktur ketat mengikut JSON Schema tool.
   */
  validateInput(tool: ToolDefinition, input: any): void {
    if (!tool.inputSchema) return;
    const schema = tool.inputSchema;
    const target = input || {};

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (target[field] === undefined || target[field] === null || target[field] === '') {
          throw new Error(
            `Input tidak sah untuk '${tool.name}': Medan '${field}' diperlukan mengikut schema.`
          );
        }
      }
    }

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const val = target[key];
        if (val !== undefined && val !== null) {
          if (prop.type === 'number') {
            if (typeof val !== 'number' || Number.isNaN(val)) {
              throw new Error(`Input tidak sah untuk '${tool.name}': Medan '${key}' mesti nombor.`);
            }
            if (prop.minimum !== undefined && val < prop.minimum) {
              throw new Error(
                `Input tidak sah untuk '${tool.name}': Nilai '${key}' (${val}) kurang daripada minimum (${prop.minimum}).`
              );
            }
            if (prop.maximum !== undefined && val > prop.maximum) {
              throw new Error(
                `Input tidak sah untuk '${tool.name}': Nilai '${key}' (${val}) melebihi maksimum (${prop.maximum}).`
              );
            }
          } else if (prop.type === 'string') {
            if (typeof val !== 'string') {
              throw new Error(`Input tidak sah untuk '${tool.name}': Medan '${key}' mesti rentetan teks.`);
            }
            if (prop.enum && !prop.enum.includes(val)) {
              throw new Error(
                `Input tidak sah untuk '${tool.name}': Nilai '${key}' mestilah salah satu daripada: ${prop.enum.join(', ')}.`
              );
            }
          } else if (prop.type === 'boolean') {
            if (typeof val !== 'boolean') {
              throw new Error(`Input tidak sah untuk '${tool.name}': Medan '${key}' mesti boolean.`);
            }
          }
        }
      }
    }
  }

  async executeTool(name: string, context: ToolContext, input: any): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' tidak ditemui dalam registry.`);
    }

    // 1. Kawalan Akses Peranan Kanonikal
    const actorRole = getActorCanonicalRole(context.actor);
    if (!tool.allowedRoles.includes(actorRole)) {
      throw new Error(
        `Akses ditolak: Peranan '${actorRole}' tidak dibenarkan melaksanakan tool '${name}'.`
      );
    }

    // 2. Keselamatan Sifar Mutasi Arbitrari: tiada alatan boleh memutasi tanpa kelulusan HITL
    if (!tool.readOnly) {
      throw new Error(
        `Pelanggaran Integriti: Tool '${name}' tidak boleh mempunyai mutasi arbitrari tanpa kelulusan HITL.`
      );
    }

    // 3. Validasi Schema Input Ketat
    this.validateInput(tool, input);

    // 4. Pelaksanaan Tool
    const result = await tool.execute(context, input || {});

    // 5. Validasi Komponen A2UI jika disertakan
    if (result.a2ui) {
      if (!validateA2UIComponent(result.a2ui.component)) {
        throw new Error(
          `Komponen A2UI '${result.a2ui.component}' tidak tersenarai dalam allowlist A2UI Fixed Schema.`
        );
      }
    }

    return result;
  }

  private registerStandardTools() {
    // -------------------------------------------------------------
    // 1. COMMERCE
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_product_catalog',
      domain: 'commerce',
      description: 'Dapatkan senarai produk dan varian sambal colek yang aktif.',
      allowedRoles: ['founder', 'staff', 'dealer', 'customer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Kategori produk' },
        },
      },
      async execute(ctx, input) {
        const products = ctx.commerce
          ? ctx.commerce.catalogue().map((product) => ({
              id: product.id,
              name: product.name,
              priceSen: product.priceSen,
              stock: product.availableQuantity,
            }))
          : [];
        const data = withObservation(ctx, { products, count: products.length });
        return {
          ok: true,
          toolName: 'get_product_catalog',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Katalog Produk',
              totalSkus: products.length,
              readOnly: true,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.commerce ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.commerce ? 'catalogue_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'get_pricing_rules',
      domain: 'commerce',
      description: 'Dapatkan peraturan penetapan harga runcit dan borong mengikut kuantiti.',
      allowedRoles: ['founder', 'staff', 'dealer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          tier: { type: 'string', description: 'Taraf ejen pilihan' },
        },
      },
      async execute(ctx) {
        const terms = ctx.operations
          ? ctx.operations.settings().approvedPolicies.dealer ?? null
          : ctx.store
            ? ctx.store.get<{ approvedPolicies: { dealer?: unknown } }>('settings', 'business')?.approvedPolicies.dealer ?? null
            : null;
        const data = withObservation(ctx, {
          retailMarginMinBps: FIN01_MIN_CONTRIBUTION_MARGIN_PCT * 100,
          retailMarginMinPct: FIN01_MIN_CONTRIBUTION_MARGIN_PCT,
          dealerTerms: terms,
        });
        return {
          ok: true,
          toolName: 'get_pricing_rules',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Peraturan Penetapan Harga',
              retailMarginMinPct: FIN01_MIN_CONTRIBUTION_MARGIN_PCT,
              dealerTermsApproved: Boolean(terms),
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'settings_snapshot' : 'none',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 2. INVENTORY
    // -------------------------------------------------------------
    this.registerTool({
      name: 'check_stock_levels',
      domain: 'inventory',
      description: 'Semak baki stok fizikal di gudang utama dan depot transit.',
      allowedRoles: ['founder', 'staff', 'dealer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          warehouseId: { type: 'string', description: 'ID gudang untuk ditapis' },
        },
      },
      async execute(ctx, input: any) {
        const warehouses: Array<{
          id: string;
          skus: Array<{ productId: string; name: string; availableUnits: number }>;
          lowStockSkuCount: number;
        }> = [];
        if (ctx.store) {
          const products = ctx.store.all<CatalogueProduct>('catalogue').filter((product) => product.status === 'published');
          const productNames = new Map(products.map((product) => [product.id, product.name]));
          const locations = Array.from(
            new Set(ctx.store.all<StockLot>('lots').filter((lot) => lot.ownerId === 'business').map((lot) => lot.locationId))
          ).sort();
          const filter = typeof input?.warehouseId === 'string' ? input.warehouseId : undefined;
          for (const locationId of locations) {
            if (filter && locationId !== filter) continue;
            const skus = products
              .map((product) => ({
                productId: product.id,
                name: productNames.get(product.id) ?? product.id,
                availableUnits: availableUnits(ctx, product.id, locationId),
              }))
              .filter((entry) => entry.availableUnits !== 0 || allocatedUnits(ctx, entry.productId, locationId) !== 0);
            warehouses.push({
              id: locationId,
              skus,
              lowStockSkuCount: skus.filter((entry) => entry.availableUnits < LOW_STOCK_THRESHOLD_UNITS).length,
            });
          }
        }
        const data = withObservation(ctx, {
          warehouses,
          lowStockThreshold: LOW_STOCK_THRESHOLD_UNITS,
        });
        return {
          ok: true,
          toolName: 'check_stock_levels',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Baki Stok Gudang',
              warehouseCount: warehouses.length,
              lowStockThreshold: LOW_STOCK_THRESHOLD_UNITS,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'lots_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'get_warehouse_allocation',
      domain: 'inventory',
      description: 'Semak agihan stok pesanan tertunggak mengikut hab.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Kod SKU produk' },
        },
      },
      async execute(ctx, input: any) {
        const productId = typeof input?.sku === 'string' ? input.sku : '';
        const product = ctx.store
          ? ctx.store.get<CatalogueProduct>('catalogue', productId) ?? null
          : null;
        if (!product) {
          const data = withObservation(ctx, {
            productId,
            found: false,
            allocatedUnits: null,
            availableUnits: null,
            recordReasonCode: ctx.store ? RECORD_NOT_FOUND : STORE_NOT_WIRED,
          });
          return { ok: true, toolName: 'get_warehouse_allocation', data };
        }
        const allocated = allocatedUnits(ctx, productId);
        const available = availableUnits(ctx, productId);
        const data = withObservation(ctx, {
          productId,
          found: true,
          name: product.name,
          allocatedUnits: allocated,
          availableUnits: available,
        });
        return {
          ok: true,
          toolName: 'get_warehouse_allocation',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Agihan Stok',
              productId,
              allocatedUnits: allocated,
              availableUnits: available,
            },
            provenance: {
              source: 'database',
              timestamp: new Date().toISOString(),
              revision: product.revision,
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 3. ORDERS
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_order_details',
      domain: 'orders',
      description: 'Dapatkan maklumat terperinci pesanan pelanggan atau ejen mengikut ID.',
      allowedRoles: ['founder', 'staff', 'dealer', 'customer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Nombor rujukan pesanan' },
        },
        required: ['orderId'],
      },
      async execute(ctx, input: any) {
        const orderId = input.orderId;
        const order = ctx.store ? ctx.store.get<OrderRecord>('orders', orderId) : null;
        if (!order) {
          const data = withObservation(ctx, {
            orderId,
            found: false,
            recordReasonCode: ctx.store ? RECORD_NOT_FOUND : STORE_NOT_WIRED,
          });
          return {
            ok: true,
            toolName: 'get_order_details',
            data,
            a2ui: orderNotFoundCard(orderId),
          };
        }
        const data = withObservation(ctx, {
          orderId: order.id,
          found: true,
          status: order.fulfilmentStatus,
          paymentState: order.paymentState,
          totalSen: order.amountSen,
          paidAmountSen: order.paidAmountSen,
          refundAmountSen: order.refundAmountSen,
          items: order.lines.map((line) => ({
            sku: line.productId,
            name: line.name,
            qty: line.quantity,
            priceSen: line.priceSen,
            subtotalSen: line.priceSen * line.quantity,
          })),
          subtotalSen: order.subtotalSen ?? order.lines.reduce((total, line) => total + line.priceSen * line.quantity, 0),
          loyaltyDiscountSen: order.loyaltyDiscountSen ?? 0,
          shippingFeeSen: Math.max(0, order.amountSen - (order.subtotalSen ?? order.lines.reduce((total, line) => total + line.priceSen * line.quantity, 0))),
          revision: order.revision,
          updatedAt: order.updatedAt,
        });
        return {
          ok: true,
          toolName: 'get_order_details',
          data,
          a2ui: orderTrackingCard(order),
        };
      },
    });

    this.registerTool({
      name: 'list_active_orders',
      domain: 'orders',
      description: 'Senaraikan pesanan aktif yang belum selesai.',
      allowedRoles: ['founder', 'staff', 'dealer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, description: 'Had bilangan pesanan' },
        },
      },
      async execute(ctx, input: any) {
        const orders = ctx.store ? ctx.store.all<OrderRecord>('orders') : [];
        const limit = typeof input?.limit === 'number' ? input.limit : 100;
        const active = orders.filter((order) => order.fulfilmentStatus !== 'received' && order.fulfilmentStatus !== 'cancelled');
        const pendingDispatch = active.filter((order) => order.fulfilmentStatus !== 'dispatched');
        const data = withObservation(ctx, {
          activeOrdersCount: active.length,
          pendingDispatchCount: pendingDispatch.length,
          orders: active
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, limit)
            .map((order) => ({
              orderId: order.id,
              status: order.fulfilmentStatus,
              paymentState: order.paymentState,
              amountSen: order.amountSen,
              revision: order.revision,
              updatedAt: order.updatedAt,
            })),
        });
        return {
          ok: true,
          toolName: 'list_active_orders',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Pesanan Aktif',
              activeOrdersCount: active.length,
              pendingDispatchCount: pendingDispatch.length,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'orders_snapshot' : 'none',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 4. DELIVERY / DISPATCH
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_delivery_manifest',
      domain: 'delivery',
      description: 'Dapatkan manifes pelepasan penghantaran kargo bas Pantai Timur.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          manifestId: { type: 'string', description: 'ID manifes penghantaran' },
        },
      },
      async execute(ctx, input: any) {
        const shipments = ctx.store ? ctx.store.all<Record<string, any>>('bus_shipments') : [];
        const manifestId = typeof input?.manifestId === 'string' ? input.manifestId : undefined;
        const selected = manifestId ? shipments.filter((shipment) => shipment.id === manifestId) : shipments;
        const data = withObservation(ctx, {
          manifests: selected.map((shipment) => ({
            id: shipment.id,
            routeId: shipment.routeId,
            status: shipment.status,
            cartonCount: shipment.cartonCount,
            totalWeightKg: shipment.totalWeightKg,
            scheduledDeparture: shipment.scheduledDeparture,
            reference: shipment.reference,
          })),
          manifestCount: selected.length,
        });
        return {
          ok: true,
          toolName: 'get_delivery_manifest',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Manifes Penghantaran Kargo',
              manifestCount: selected.length,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'bus_shipments_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'track_consignment',
      domain: 'delivery',
      description: 'Jejak status konsainan penghantaran kargo bas mengikut nombor rujukan.',
      allowedRoles: ['founder', 'staff', 'dealer', 'customer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          consignmentNo: { type: 'string', description: 'Nombor konsainan konsisten' },
        },
        required: ['consignmentNo'],
      },
      async execute(ctx, input: any) {
        const consignmentNo = input.consignmentNo;
        const shipment = ctx.store
          ? ctx.store.all<Record<string, any>>('bus_shipments').find(
              (candidate) =>
                candidate.reference === consignmentNo ||
                candidate.id === consignmentNo ||
                candidate.consignmentNo === consignmentNo
            ) ?? null
          : null;
        if (!shipment) {
          const data = withObservation(ctx, {
            consignmentNo,
            found: false,
            status: 'NOT_FOUND',
            recordReasonCode: ctx.store ? RECORD_NOT_FOUND : STORE_NOT_WIRED,
          });
          return {
            ok: true,
            toolName: 'track_consignment',
            data,
            a2ui: {
              schemaVersion: 'a2ui.v1',
              component: 'OrderTrackingCard',
              componentName: 'OrderTrackingCard',
              props: {
                consignmentNo,
                found: false,
                status: 'NOT_FOUND',
                reasonCode: ctx.store ? RECORD_NOT_FOUND : STORE_NOT_WIRED,
              },
              provenance: {
                source: 'local_authoritative',
                timestamp: new Date().toISOString(),
                revision: 'none',
              },
            },
          };
        }
        const data = withObservation(ctx, {
          consignmentNo,
          found: true,
          status: shipment.status ?? 'unknown',
          routeId: shipment.routeId,
          cartonCount: shipment.cartonCount,
          totalWeightKg: shipment.totalWeightKg,
          scheduledDeparture: shipment.scheduledDeparture,
          revision: shipment.revision,
        });
        return {
          ok: true,
          toolName: 'track_consignment',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OrderTrackingBadge',
            componentName: 'OrderTrackingBadge',
            props: {
              consignmentNo,
              status: shipment.status ?? 'unknown',
              routeId: shipment.routeId,
              revision: shipment.revision,
            },
            provenance: {
              source: 'database',
              timestamp: new Date().toISOString(),
              revision: shipment.revision ?? 'none',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 5. PAYMENT / LEDGER
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_payment_ledger_summary',
      domain: 'payment',
      description: 'Dapatkan ringkasan lejar bayaran atomik dan status audit Sen integer.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Tarikh audit (YYYY-MM-DD)' },
        },
      },
      async execute(ctx, input: any) {
        const payments = ctx.store ? ctx.store.all<{ amountSen: number; state: string; createdAt: string }>('payments') : [];
        const orders = ctx.store ? ctx.store.all<OrderRecord>('orders') : [];
        const date = typeof input?.date === 'string' ? input.date : undefined;
        const scoped = date ? payments.filter((payment) => localDay(payment.createdAt) === date) : payments;
        const confirmedSen = scoped
          .filter((payment) => payment.state === 'confirmed')
          .reduce((total, payment) => total + payment.amountSen, 0);
        const refundedSen = scoped
          .filter((payment) => payment.state === 'refunded')
          .reduce((total, payment) => total + payment.amountSen, 0);
        const outstandingSen = orders
          .filter((order) => order.paymentState === 'pending')
          .reduce((total, order) => total + order.amountSen, 0);
        const totalGrossSen = confirmedSen + outstandingSen;
        const settledSen = confirmedSen - refundedSen;
        const pendingSen = outstandingSen;
        const allIntegers = scoped.every((payment) => Number.isSafeInteger(payment.amountSen));
        const data = withObservation(ctx, {
          totalGrossSen,
          settledSen,
          pendingSen,
          confirmedSen,
          refundedSen,
          outstandingSen,
          currency: 'MYR',
          integerSenVerified: allIntegers,
          paymentsObserved: scoped.length,
        });
        return {
          ok: true,
          toolName: 'get_payment_ledger_summary',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Ringkasan Lejar Bayaran',
              totalGrossSen,
              settledSen,
              pendingSen,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'payments_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'verify_sen_balance',
      domain: 'payment',
      description: 'Sahkan baki akaun mengikut formula deterministik integer tanpa ralat titik perpuluhan float.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          amountSen: { type: 'number', description: 'Nilai dalam sen integer' },
        },
        required: ['amountSen'],
      },
      async execute(ctx, input: any) {
        const amountSen = input.amountSen;
        const isStrictInteger = Number.isInteger(amountSen);
        const integerAmount = Math.floor(amountSen);
        return {
          ok: true,
          toolName: 'verify_sen_balance',
          data: {
            amountSen: integerAmount,
            isInteger: isStrictInteger,
            isValid: isStrictInteger && integerAmount >= 0,
            observation: 'observed',
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 6. COMMISSION
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_agent_commission_summary',
      domain: 'commission',
      description: 'Dapatkan ringkasan komisen ejen yang telah terakru dan lejar kontra (PAY-03).',
      allowedRoles: ['founder', 'staff', 'dealer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'ID ejen niaga' },
        },
      },
      async execute(ctx) {
        const ledger = ctx.store ? ctx.store.all<CommissionTransaction>('commission_ledger') : [];
        const actorOrgIds = new Set(
          (ctx.actor.memberships ?? []).map((membership) => membership.dealerOrgId).filter(Boolean) as string[]
        );
        const isFounder = (ctx.actor.memberships ?? []).some(
          (membership) => membership.role === 'founder' && membership.status === 'active'
        );
        const scoped = isFounder
          ? ledger
          : ledger.filter((entry) => actorOrgIds.has(entry.dealerOrgId));
        const earnedSen = scoped
          .filter((entry) => entry.amountSen > 0 && ['eligible', 'approved', 'paid'].includes(entry.status))
          .reduce((total, entry) => total + entry.amountSen, 0);
        const contraReversalSen = scoped
          .filter((entry) => entry.status === 'reversed' && entry.amountSen < 0)
          .reduce((total, entry) => total + entry.amountSen, 0);
        const netPayableSen = earnedSen + contraReversalSen;
        const status = ctx.store
          ? contraReversalSen === 0
            ? 'audited_clean'
            : 'contra_adjusted'
          : 'unavailable';
        const data = withObservation(ctx, {
          totalCommissionSen: earnedSen,
          contraReversalSen,
          netPayableSen,
          status,
          entriesObserved: scoped.length,
        });
        return {
          ok: true,
          toolName: 'get_agent_commission_summary',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'CommissionCard',
            props: {
              totalCommissionSen: earnedSen,
              netPayableSen,
              status,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'commission_ledger_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'verify_contra_reversal',
      domain: 'commission',
      description: 'Sahkan integriti pembalikan kontra komisen akibat pemulangan pesanan.',
      allowedRoles: ['founder'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          disputeId: { type: 'string', description: 'ID pertikaian atau kes ganti rugi' },
        },
      },
      async execute(ctx) {
        const ledger = ctx.store ? ctx.store.all<CommissionTransaction>('commission_ledger') : [];
        const knownIds = new Set(ledger.map((entry) => entry.id));
        const orphans = ledger.filter(
          (entry) => (entry.status === 'reversed' || entry.amountSen < 0) && entry.contraOfId && !knownIds.has(entry.contraOfId)
        );
        const overReversed = ledger.filter((entry) => {
          if (!entry.contraOfId) return false;
          const original = ledger.find((candidate) => candidate.id === entry.contraOfId);
          if (!original) return false;
          const contraTotal = ledger
            .filter((candidate) => candidate.contraOfId === original.id)
            .reduce((total, candidate) => total + Math.abs(candidate.amountSen), 0);
          return contraTotal > original.amountSen;
        });
        const orphanEntries = orphans.length + overReversed.length;
        const contraLedgerBalanced = orphanEntries === 0;
        const data = withObservation(ctx, {
          contraLedgerBalanced,
          orphanEntries,
          entriesChecked: ledger.length,
        });
        return {
          ok: true,
          toolName: 'verify_contra_reversal',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'CommissionCard',
            props: {
              title: 'Integriti Kontra Komisen',
              contraLedgerBalanced,
              orphanEntries,
              entriesChecked: ledger.length,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'commission_ledger_snapshot' : 'none',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 7. LOYALTY
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_loyalty_tier_status',
      domain: 'loyalty',
      description: 'Semak taraf kesetiaan pelanggan dan mata ganjaran terkumpul.',
      allowedRoles: ['founder', 'staff', 'dealer', 'customer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'ID pelanggan' },
        },
      },
      async execute(ctx, input: any) {
        const customerId = typeof input?.customerId === 'string' ? input.customerId : ctx.actor.user.id;
        const summary = ctx.loyalty
          ? ctx.loyalty.getSummary(customerId)
          : ctx.store
            ? null
            : null;
        if (!summary) {
          const data = withObservation(ctx, {
            customerId,
            tier: null,
            pointsBalance: null,
            redemptionValueSen: null,
            recordReasonCode: ctx.store ? RECORD_NOT_FOUND : STORE_NOT_WIRED,
          });
          return {
            ok: true,
            toolName: 'get_loyalty_tier_status',
            data,
            a2ui: {
              schemaVersion: 'a2ui.v1',
              component: 'OperationsBriefCard',
              props: {
                title: 'Status Kesetiaan Pelanggan',
                customerId,
                observation: data.observation,
                ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
              },
              provenance: {
                source: 'local_authoritative',
                timestamp: new Date().toISOString(),
                revision: 'none',
              },
            },
          };
        }
        const pointsBalance = summary.balancePoints;
        const tier =
          [...LOYALTY_TIER_POLICY].reverse().find((entry) => pointsBalance >= entry.minPoints)?.tier ??
          LOYALTY_TIER_POLICY[0].tier;
        const data = withObservation(ctx, {
          customerId,
          tier,
          pointsBalance,
          redemptionValueSen: loyaltyPointsToDiscountSen(pointsBalance),
          totalEarnedPoints: summary.totalEarnedPoints,
          totalRedeemedPoints: summary.totalRedeemedPoints,
          entriesCount: summary.entriesCount,
        });
        return {
          ok: true,
          toolName: 'get_loyalty_tier_status',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Status Kesetiaan Pelanggan',
              customerId,
              tier,
              pointsBalance,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.loyalty ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.loyalty ? 'loyalty_ledger_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'calculate_points_balance',
      domain: 'loyalty',
      description: 'Kira pertukaran mata ganjaran kesetiaan kepada nilai ringgit sen integer.',
      allowedRoles: ['founder', 'staff', 'dealer', 'customer'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          points: { type: 'number', minimum: 0, description: 'Jumlah mata ganjaran' },
        },
        required: ['points'],
      },
      async execute(ctx, input: any) {
        const points = Math.floor(input.points);
        const valueSen = loyaltyPointsToDiscountSen(points);
        return {
          ok: true,
          toolName: 'calculate_points_balance',
          data: { points, valueSen, isSenInteger: Number.isInteger(valueSen), observation: 'observed' },
        };
      },
    });

    // -------------------------------------------------------------
    // 8. MARKETING
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_campaign_performance',
      domain: 'marketing',
      description: 'Dapatkan metrik pencapaian kempen WhatsApp dan siaran promosi.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'ID kempen promosi' },
        },
      },
      async execute(ctx, input: any) {
        const campaigns = ctx.store ? ctx.store.all<CampaignRecord>('campaigns') : [];
        const campaignId = typeof input?.campaignId === 'string' ? input.campaignId : undefined;
        const selected = campaignId ? campaigns.filter((campaign) => campaign.id === campaignId) : campaigns;
        const publishIntents = ctx.store ? ctx.store.all<{ status?: string }>('publish_intents') : [];
        const sentCount = publishIntents.length;
        const byStatus: Record<string, number> = {};
        for (const campaign of selected) {
          byStatus[campaign.status] = (byStatus[campaign.status] ?? 0) + 1;
        }
        const data = withObservation(ctx, {
          campaignsObserved: selected.length,
          campaignsByStatus: byStatus,
          sentCount,
          readRatePercent: null,
          conversionOrders: null,
          metricsUnavailableReasonCode: sentCount === 0 ? PUBLISH_CHANNEL_UNAVAILABLE : 'DELIVERY_METRICS_NOT_RECORDED',
        });
        return {
          ok: true,
          toolName: 'get_campaign_performance',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Pencapaian Kempen',
              campaignsObserved: selected.length,
              sentCount,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'campaigns_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'draft_marketing_copy_spec',
      domain: 'marketing',
      description: 'Sediakan spesifikasi draf kempen dengan pematuhan Margin Guardian (FIN-01).',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          discountPercent: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Peratusan diskaun kempen',
          },
          campaignId: {
            type: 'string',
            description: 'ID kempen sedia ada (memakai marginSimulation yang direkodkan)',
          },
          marginSimulation: {
            type: 'object',
            description:
              'Input simulasi margin kanonikal (sen integer): netSalesExTaxSen, cogsSen, packagingSen, paymentFeesSen, fulfilmentVariableCostSen, deliverySubsidySen, agentCommissionSen, rewardCostSen, expectedReturnLossSen, minimumContributionSen, minimumContributionMarginPct',
          },
        },
      },
      async execute(ctx, input: any) {
        const discountPercent = input?.discountPercent !== undefined ? input.discountPercent : 10;
        const campaign = typeof input?.campaignId === 'string' && ctx.store
          ? ctx.store.get<CampaignRecord>('campaigns', input.campaignId) ?? null
          : null;
        const simulation =
          readMarginSimulation(input?.marginSimulation) ??
          (campaign?.marginSimulation ? readMarginSimulation(campaign.marginSimulation) : null);

        if (!simulation) {
          const data = withObservation(ctx, {
            title: 'Draf Kempen Sambal Liurleleh',
            discountPercent,
            simulationPerformed: false,
            projectedMargin: null,
            marginGuardianPassed: null,
            reasonCode: NO_COMMERCIAL_INPUTS,
          });
          return {
            ok: true,
            toolName: 'draft_marketing_copy_spec',
            data,
            a2ui: {
              schemaVersion: 'a2ui.v1',
              component: 'MarginSummaryCard',
              componentName: 'MarginSummaryCard',
              props: {
                title: data.title,
                discountPercent,
                simulationPerformed: false,
                status: 'NOT_SIMULATED',
                reasonCode: NO_COMMERCIAL_INPUTS,
              },
              provenance: {
                source: 'local_authoritative',
                timestamp: new Date().toISOString(),
                revision: 'none',
              },
            },
          };
        }

        const result = evaluateMarginContribution(simulation);
        const status = marginResultStatus(result);
        const data = withObservation(ctx, {
          title: 'Draf Kempen Sambal Liurleleh',
          discountPercent,
          simulationPerformed: true,
          evaluator: 'evaluateMarginContribution',
          contributionSen: result.contributionSen,
          projectedMargin: result.contributionMarginPct,
          requiredContributionSen: simulation.minimumContributionSen,
          requiredMarginPct: simulation.minimumContributionMarginPct,
          marginGuardianPassed: result.allowed,
          reasonCode: result.reasonCode,
        });
        return {
          ok: true,
          toolName: 'draft_marketing_copy_spec',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'MarginSimulator',
            componentName: 'MarginSimulator',
            props: {
              contributionSen: result.contributionSen,
              contributionMarginPct: result.contributionMarginPct,
              requiredContributionSen: simulation.minimumContributionSen,
              requiredMarginPct: simulation.minimumContributionMarginPct,
              status,
              evaluator: 'evaluateMarginContribution',
            },
            provenance: {
              source: 'canonical_evaluator',
              timestamp: new Date().toISOString(),
              revision: 'evaluateMarginContribution',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 9. QC / AUDIT
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_qc_audit_checklist',
      domain: 'qc',
      description: 'Dapatkan senarai semak audit kualiti botol sambal dan pembungkusan.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          batchNo: { type: 'string', description: 'Nombor kelompok batch pengeluaran' },
        },
      },
      async execute(ctx, input: any) {
        const batchNo = typeof input?.batchNo === 'string' ? input.batchNo : undefined;
        const qcRecords = ctx.store
          ? ctx.store.all<QcRecord>('qc').filter((record) => (batchNo ? record.batchId === batchNo : true))
          : [];
        const inspections = QC_CHECKLIST_TEMPLATE.map((item) => {
          const record = qcRecords.find((candidate) => candidate.status === 'released');
          return {
            check: item.check,
            status: record ? ('PASS' as const) : ('NOT_RECORDED' as const),
            qcRecordId: record?.id,
            qcRevision: record?.revision,
          };
        });
        const data = withObservation(ctx, {
          inspections,
          batchNo: batchNo ?? null,
          qcRecordsObserved: qcRecords.length,
          rootCausePolicy: 'UNDETERMINED_UNTIL_VERIFIED',
        });
        return {
          ok: true,
          toolName: 'get_qc_audit_checklist',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'JevAssessmentCard',
            props: {
              incidentType: 'batch_audit',
              rootCause: 'UNDETERMINED',
              confidenceScore: null,
              evaluationState: qcRecords.length > 0 ? 'reviewed' : 'pending_quarantine',
              evidencePhotoRequired: true,
              sopAction: 'Kuarantin batch di cawangan & minta bukti foto penutup botol',
            },
            provenance: {
              source: ctx.store ? 'database' : 'jev_local_rules',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'qc_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'verify_cas_integrity',
      domain: 'qc',
      description: 'Sahkan integriti CAS (Compare-And-Swap) lejar sandaran Supabase.',
      allowedRoles: ['founder'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Sasaran lejar atau entiti' },
        },
      },
      async execute(ctx) {
        let conflictsCount = 0;
        let recordsChecked = 0;
        let casStatus: 'VERIFIED_CLEAN' | 'CONFLICT_DETECTED' | 'UNVERIFIABLE' = 'UNVERIFIABLE';
        if (ctx.store) {
          const kinds = ['orders', 'lots', 'campaigns', 'restocks', 'qc', 'expenses', 'dayclose', 'reconciliations'];
          const auditRows = ctx.store.db
            .query<{ entity_id: string; revision: number }, []>(
              'SELECT entity_id, MAX(revision) AS revision FROM audit GROUP BY entity_id'
            )
            .all();
          const auditRevision = new Map(auditRows.map((row) => [row.entity_id, Number(row.revision)]));
          for (const kind of kinds) {
            for (const record of ctx.store.all<{ id: string; revision?: number }>(kind)) {
              recordsChecked += 1;
              const revision = record.revision;
              if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) {
                conflictsCount += 1;
                continue;
              }
              const audited = auditRevision.get(record.id);
              if (audited !== undefined && audited > revision) conflictsCount += 1;
            }
          }
          casStatus = conflictsCount === 0 ? 'VERIFIED_CLEAN' : 'CONFLICT_DETECTED';
        }
        const data = withObservation(ctx, {
          casStatus,
          conflictsCount,
          recordsChecked,
        });
        return {
          ok: true,
          toolName: 'verify_cas_integrity',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Integriti CAS Lejar',
              casStatus,
              conflictsCount,
              recordsChecked,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'cas_scan' : 'none',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 10. ANALYTICS
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_daily_sales_analytics',
      domain: 'analytics',
      description: 'Dapatkan ringkasan analitik jualan harian platform.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Tarikh jualan (YYYY-MM-DD)' },
        },
      },
      async execute(ctx, input: any) {
        const orders = ctx.store ? ctx.store.all<OrderRecord>('orders') : [];
        const date = typeof input?.date === 'string' ? input.date : localDay(new Date().toISOString());
        const scoped = orders.filter((order) => localDay(order.createdAt) === date && order.fulfilmentStatus !== 'cancelled');
        const todayOrdersCount = scoped.length;
        const todayGrossSen = scoped.reduce((total, order) => total + order.amountSen, 0);
        const averageBasketSen = todayOrdersCount === 0 ? 0 : Math.floor(todayGrossSen / todayOrdersCount);
        const data = withObservation(ctx, {
          date,
          todayOrdersCount,
          todayGrossSen,
          averageBasketSen,
          currency: 'MYR',
        });
        return {
          ok: true,
          toolName: 'get_daily_sales_analytics',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'Analitik Jualan Harian',
              date,
              todayOrdersCount,
              todayGrossSen,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'orders_snapshot' : 'none',
            },
          },
        };
      },
    });

    this.registerTool({
      name: 'get_operational_kpi',
      domain: 'analytics',
      description: 'Dapatkan KPI operasi platform: tempoh penghantaran, kadar pulangan, dan margin bersih.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            description: 'Jangka masa laporan KPI',
          },
        },
      },
      async execute(ctx) {
        const orders = ctx.store ? ctx.store.all<OrderRecord>('orders') : [];
        const delivered = orders.filter((order) => order.fulfilmentStatus === 'received');
        const deliveryHours = delivered
          .map((order) => (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / (3600 * 1000))
          .filter((hours) => Number.isFinite(hours) && hours >= 0);
        const avgDeliveryHours =
          deliveryHours.length === 0
            ? null
            : Math.round((deliveryHours.reduce((total, hours) => total + hours, 0) / deliveryHours.length) * 100) / 100;
        const collectedSen = orders.reduce((total, order) => total + order.paidAmountSen, 0);
        const refundedSen = orders.reduce((total, order) => total + order.refundAmountSen, 0);
        const returnRatePercent =
          collectedSen === 0 ? null : Math.round((refundedSen / collectedSen) * 10000) / 100;
        const data = withObservation(ctx, {
          avgDeliveryHours,
          returnRatePercent,
          netOperatingMarginPercent: null,
          netOperatingMarginReasonCode: COST_BASIS_UNAVAILABLE,
          deliveredOrdersObserved: delivered.length,
        });
        return {
          ok: true,
          toolName: 'get_operational_kpi',
          data,
          a2ui: {
            schemaVersion: 'a2ui.v1',
            component: 'OperationsBriefCard',
            props: {
              title: 'KPI Operasi Platform',
              avgDeliveryHours,
              returnRatePercent,
              netOperatingMarginPercent: null,
              observation: data.observation,
              ...(data.reasonCode ? { reasonCode: data.reasonCode } : {}),
            },
            provenance: {
              source: ctx.store ? 'database' : 'local_authoritative',
              timestamp: new Date().toISOString(),
              revision: ctx.store ? 'orders_snapshot' : 'none',
            },
          },
        };
      },
    });

    // -------------------------------------------------------------
    // 11. FIRST-PARTY MCP TOOL: get_operations_brief
    // -------------------------------------------------------------
    this.registerTool({
      name: 'get_operations_brief',
      domain: 'operations',
      description: 'Dapatkan ringkasan eksekutif operasi harian atau amaran mendesak secara read-only.',
      allowedRoles: ['founder', 'staff'],
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['daily', 'urgent'],
            description: 'Jenis brief operasi: daily atau urgent',
          },
        },
      },
      async execute(ctx, input: any) {
        const briefType = input?.type === 'urgent' ? 'urgent' : 'daily';
        const brief = new OperationsBriefMcpApp(ctx.store).getOperationsBrief({ type: briefType });
        return {
          ok: true,
          toolName: 'get_operations_brief',
          data: brief.data,
          a2ui: brief.a2ui,
        };
      },
    });
  }
}

export const globalDomainTools = new DomainToolRegistry();
