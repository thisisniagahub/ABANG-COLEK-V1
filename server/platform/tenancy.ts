/**
 * AbangColek Sovereign GrowthOS — Tenancy resolution for the platform layer
 *
 * A thread, a memory and a published skill all belong to a tenant. The tenant
 * is derived from the *live* membership records, never from a client supplied
 * value, so a client cannot claim a tenant it does not belong to.
 *
 * Why this lives in `server/platform/**`: tenancy is derived from the
 * platform's own membership records, so it is platform domain logic. The
 * intelligence modules depend on it (they may depend on the platform); the
 * platform must never depend on them.
 */

import type { Principal } from './auth';

export const DEFAULT_TENANT_ID = 'business';

/**
 * The tenant of a principal. A dealer organisation membership scopes the
 * principal to that organisation; every other operational membership belongs
 * to the business tenant.
 */
export function resolveTenantId(actor: Principal): string {
  const dealer = actor.memberships.find(
    (membership) => membership.status === 'active' && membership.dealerOrgId,
  );
  return dealer?.dealerOrgId ?? DEFAULT_TENANT_ID;
}

/**
 * Every tenant the principal legitimately belongs to.
 *
 * A principal that holds a dealer-organisation membership is scoped to that
 * organisation only — it never inherits the business tenant. A principal
 * without a dealer membership belongs to the business tenant.
 */
export function resolveTenantIds(actor: Principal): string[] {
  const dealerIds = actor.memberships
    .filter((membership) => membership.status === 'active' && membership.dealerOrgId)
    .map((membership) => membership.dealerOrgId as string);
  if (dealerIds.length) return [...new Set(dealerIds)];
  return [DEFAULT_TENANT_ID];
}

/** True when the principal holds the founder role in an active membership. */
export function isFounder(actor: Principal): boolean {
  return actor.memberships.some(
    (membership) => membership.role === 'founder' && membership.status === 'active',
  );
}

/** True when the principal holds an operational (staff/founder) role. */
export function isOperational(actor: Principal): boolean {
  return actor.memberships.some(
    (membership) =>
      membership.status === 'active' &&
      (membership.role === 'staff' || membership.role === 'founder'),
  );
}
