/**
 * AbangColek Sovereign GrowthOS — Tenant / Scope Guards for Agent Tools
 *
 * Reuses the canonical `Auth` rules (`own`, `operational`, `has`) and adds the
 * dealer-organisation check so a customer or staff actor can never read or
 * mutate another dealer's records.
 */

import { Auth, type Principal } from '../../platform/auth';
import type { PlatformStore } from '../../platform/store';
import type { Membership } from '../../../shared/platform-contracts';

export interface ScopedActor {
  principal: Principal;
  auth: Auth;
  memberships: Membership[];
  dealerOrgIds: string[];
  isFounder: boolean;
  isStaff: boolean;
  isDeveloper: boolean;
  outletIds: string[];
}

/**
 * Resolves the *live* authority of an actor from the canonical membership
 * table. Returns null when the actor has no active membership (or when no
 * platform store is wired) — the caller must then refuse the action.
 */
export function resolveActor(store: PlatformStore | undefined, actorId: string): ScopedActor | null {
  if (!store || !actorId) return null;
  const auth = new Auth(store);
  const memberships = auth.memberships(actorId);
  if (!memberships.length) return null;
  const principal: Principal = {
    user: { id: actorId, email: '', name: '' },
    memberships,
    sessionHash: '',
    csrfHash: '',
  };
  return {
    principal,
    auth,
    memberships,
    dealerOrgIds: [
      ...new Set(
        memberships
          .filter((membership) => membership.status === 'active' && membership.dealerOrgId)
          .map((membership) => membership.dealerOrgId as string),
      ),
    ],
    isFounder: memberships.some((membership) => membership.role === 'founder' && membership.status === 'active'),
    isStaff: memberships.some((membership) => membership.role === 'staff' && membership.status === 'active'),
    isDeveloper: memberships.some(
      (membership) => membership.role === 'developer' && membership.status === 'active',
    ),
    outletIds: [
      ...new Set(
        memberships
          .filter((membership) => membership.role === 'staff' && membership.status === 'active')
          .flatMap((membership) => membership.outletIds),
      ),
    ],
  };
}

/**
 * Returns a refusal code when the actor may not touch the order.
 * `null` means access is allowed.
 */
export function orderAccessCode(actor: ScopedActor, order: { customerId: string; outletId: string; dealerOrgId?: string }): string | null {
  // A dealer-scoped actor may only reach its own organisation's records.
  if (actor.dealerOrgIds.length) {
    const ownsOrg = order.dealerOrgId ? actor.dealerOrgIds.includes(order.dealerOrgId) : false;
    if (!ownsOrg) return 'CROSS_TENANT_FORBIDDEN';
  }
  try {
    actor.auth.own(actor.principal, order.customerId, order.outletId);
    return null;
  } catch {
    return 'FORBIDDEN';
  }
}

/** Restriction for operational (staff / founder) records scoped to an outlet. */
export function outletAccessCode(actor: ScopedActor, outletId: string | undefined): string | null {
  if (actor.isFounder) return null;
  if (!actor.isStaff) return 'FORBIDDEN';
  if (!outletId) return null;
  return actor.outletIds.includes(outletId) ? null : 'FORBIDDEN';
}

/** Restriction for dealer organisation scoped records. */
export function dealerAccessCode(actor: ScopedActor, dealerOrgId: string | undefined): string | null {
  if (actor.isFounder) return null;
  if (!dealerOrgId) return 'DEALER_SCOPE';
  return actor.dealerOrgIds.includes(dealerOrgId) ? null : 'DEALER_SCOPE';
}
