/**
 * GUI-04 shared client-state policy.
 *
 * The authority token list is the one published in shared/copilot-contracts.ts
 * (DISALLOWED_CLIENT_STATE_TOKENS). The extra rules below mirror the renderer
 * so the projection builder and the view can never disagree about which
 * fields are safe to show.
 */

export const DISALLOWED_CLIENT_STATE_TOKENS = [
  'role',
  'paid',
  'admin',
  'permission',
  'permissions',
  'capability',
  'capabilities',
  'authority',
  'authorized',
  'authorize',
  'authorization',
  'allowed',
  'permitted',
  'approve',
  'approved',
  'approver',
  'approves',
  'approval',
  'access',
  'privilege',
  'entitlement',
] as const;

const AUTHORITY_TOKENS = new Set<string>(DISALLOWED_CLIENT_STATE_TOKENS);
const ROLE_TOKENS = new Set([
  'founder',
  'staff',
  'dealer',
  'customer',
  'developer',
  'owner',
  'manager',
  'operator',
  'superuser',
]);
const ROLE_PREFIXES = new Set(['is', 'has', 'user', 'workspace', 'account']);
const PRICE_FILTER_TOKENS = new Set(['range', 'min', 'max', 'from', 'to', 'filter', 'sort']);
const CAPABILITY_PREFIXES = new Set(['can', 'cannot', 'may']);

export function tokenizeStateKey(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function hasAuthorityField(key: string): boolean {
  const tokens = tokenizeStateKey(key);

  if (tokens.some((token) => AUTHORITY_TOKENS.has(token))) return true;
  if (tokens.length > 1 && CAPABILITY_PREFIXES.has(tokens[0])) return true;
  if (tokens.includes('price') && !tokens.some((token) => PRICE_FILTER_TOKENS.has(token))) {
    return true;
  }

  const roleIndex = tokens.findIndex((token, index) =>
    ROLE_TOKENS.has(token) || ROLE_TOKENS.has(`${token}${tokens[index + 1] ?? ''}`));
  if (roleIndex < 0) return false;

  const roleTokenCount = ROLE_TOKENS.has(tokens[roleIndex]) ? 1 : 2;
  return (roleIndex === 0 && tokens.length === roleTokenCount)
    || (roleIndex === 1
      && ROLE_PREFIXES.has(tokens[0])
      && tokens.length === roleIndex + roleTokenCount);
}
