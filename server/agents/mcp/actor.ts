/**
 * AbangColek Sovereign GrowthOS — MCP Actor & Role Scoping
 *
 * Identiti MCP datang DARI SERVER sahaja. Modul ini menukar `Principal`
 * platform (sesi yang disahkan pelayan) kepada `McpActor` dan menyediakan
 * regulator skop peranan yang digunakan oleh setiap tool dan resource.
 *
 * Prinsip:
 * - Pelayar tidak pernah menghantar `actor`, `role` atau `workspaceId` dalam
 *   badan permintaan. `McpActor` hanya boleh dibina daripada `Principal` yang
 *   diperoleh daripada sesi server.
 * - Setiap pelayan MCP mengikat satu `McpActor` pada masa dibina; tiada tool
 *   boleh menukar atau melonggarkan skop semasa panggilan.
 */

import type { Principal } from '../../platform/auth';
import type { WorkspaceRole } from '../../../shared/platform-contracts';

/**
 * Identiti yang terikat pada satu instans pelayan MCP.
 *
 * `workspaceId` sentiasa 'business' (ruang kerja tunggal platform), tetapi
 * disimpan secara eksplisit supaya skop tidak pernah tersasar.
 */
export interface McpActor {
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: WorkspaceRole;
  /** Outlet yang dipegang oleh staf. Kosong untuk peranan lain. */
  readonly outletIds: readonly string[];
  /** Id organisasi dealer jika actor ialah dealer. */
  readonly dealerOrgId?: string;
  readonly membershipVersion: number;
}

/** Ralat kebenaran MCP — dipetakan kepada JSON-RPC error oleh lapisan HTTP. */
export class McpAccessError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'McpAccessError';
  }
}

/**
 * Menukar `Principal` platform kepada `McpActor`.
 *
 * Pemanggil WAJIB obtains principal daripada `Auth.resolve(request)`;
 * tiada jalan lain untuk membina `McpActor` diterima oleh pelayan MCP.
 */
export function toMcpActor(principal: Principal): McpActor {
  const activeMemberships = principal.memberships.filter(entry => entry.status === 'active');
  const rolePriority: Record<WorkspaceRole, number> = {
    founder: 0,
    staff: 1,
    developer: 2,
    customer: 3,
  };
  const membership = [...activeMemberships].sort(
    (a, b) => (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99),
  )[0];
  if (!membership) {
    throw new McpAccessError('MEMBERSHIP_REVOKED', 403, 'Tiada Membership aktif untuk sesi ini.');
  }
  const actor: McpActor = {
    userId: principal.user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
    outletIds: membership.outletIds,
    membershipVersion: membership.version,
    ...(membership.dealerOrgId ? { dealerOrgId: membership.dealerOrgId } : {}),
  };
  return actor;
}

/**
 * Skop operasi (ringkasan operasi, inventori, pesanan outlet) hanya untuk
 * founder dan staf — selaras dengan `Auth.operational()` dalam
 * `server/platform/app.ts`.
 */
export function hasOperationalScope(actor: McpActor): boolean {
  return actor.role === 'founder' || actor.role === 'staff';
}

/**
 * Pelanggan tidak pernah melihat ringkasan operasi seluruh perniagaan.
 */
export function assertOperationalScope(actor: McpActor): void {
  if (!hasOperationalScope(actor)) {
    throw new McpAccessError('FORBIDDEN', 403, 'Skop operasi tidak dibenarkan untuk peranan ini.');
  }
}

/**
 * Adakah actor boleh melihat rekod milik outlet tertentu?
 *
 * Founder: ya untuk semua outlet. Staf: hanya outlet dalam skopnya.
 */
export function canAccessOutlet(actor: McpActor, outletId: string | undefined): boolean {
  if (actor.role === 'founder') return true;
  if (actor.role !== 'staff') return false;
  return !!outletId && actor.outletIds.includes(outletId);
}

/**
 * Adakah actor boleh melihat rekod yang dimiliki dealer tertentu?
 *
 * Founder: ya. Staf dealer: hanya rekod dealer sendiri. Staf outlet biasa:
 * hanya rekod tanpa `dealerOrgId` (rekod kedai sendiri).
 */
export function canAccessDealer(actor: McpActor, dealerOrgId: string | undefined): boolean {
  if (actor.role === 'founder') return true;
  if (actor.role !== 'staff') return false;
  if (actor.dealerOrgId) return dealerOrgId === actor.dealerOrgId;
  return dealerOrgId === undefined;
}

/**
 * Adakah pesanan ini di dalam skop actor?
 */
export function canAccessOrder(
  actor: McpActor,
  order: { outletId: string; customerId: string; dealerOrgId?: string },
): boolean {
  if (actor.role === 'founder') return true;
  if (actor.role === 'staff') {
    return canAccessOutlet(actor, order.outletId) && canAccessDealer(actor, order.dealerOrgId);
  }
  // Pelanggan: hanya pesanan sendiri.
  return order.customerId === actor.userId;
}

/**
 * Menapis senarai pesanan kepada skop actor. Fungsi ini adalah satu-satunya
 * pintu masuk data pesanan dalam pelayan MCP.
 */
export function scopeOrders<T extends { outletId: string; customerId: string; dealerOrgId?: string }>(
  actor: McpActor,
  orders: readonly T[],
): T[] {
  return orders.filter(order => canAccessOrder(actor, order));
}
