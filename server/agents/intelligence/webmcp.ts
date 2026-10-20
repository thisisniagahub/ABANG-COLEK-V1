/**
 * AbangColek Sovereign GrowthOS — EXT-05 WebMCP (own-app surface)
 *
 * WebMCP in this product is deliberately narrow: it may only expose the
 * application's OWN MCP surface (bounded context and UI actions). It must not
 * automate arbitrary websites and must not read cookies.
 *
 * This module owns the *permission model* (grants) and the tool-surface
 * allowlist. The browser support probe lives in
 * `src/features/intelligence/webmcpProbe.ts` and returns a typed
 * `unavailable` when the browser does not implement the API.
 *
 * Persistence mode: `platform_store`. Locality: `local`.
 */

import { randomUUID } from 'node:crypto';
import type { PlatformStore } from '../../platform/store';
import type { Principal } from '../../platform/auth';
import { failIntelligence } from './errors';

export interface McpGrantRecord {
  id: string;
  userId: string;
  toolName: string;
  /** The bounded action the grant covers, e.g. `read_context` or `render_ui`. */
  action: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

/** The bounded action surface the own-app MCP may perform. */
export const WEBMCP_ALLOWED_ACTIONS = ['read_context', 'render_ui', 'propose_action'] as const;
export type WebMcpAction = (typeof WEBMCP_ALLOWED_ACTIONS)[number];

/** The decision of an authorisation check. */
export interface McpAuthorisation {
  allowed: boolean;
  reasonCode: string;
  reason: string;
  grantId?: string;
}

export interface McpGrantStoreOptions {
  store: PlatformStore;
  clock?: () => string;
  /**
   * The application's own MCP tool surface. Injected so this module does not
   * depend on (or edit) the MCP server implementation: the MCP server
   * registers its tools and this predicate decides whether a tool belongs to
   * the own-app surface.
   */
  toolSurface: { has(toolName: string): boolean };
}

export class McpGrantStore {
  constructor(private readonly options: McpGrantStoreOptions) {}

  private now(): string {
    return this.options.clock ? this.options.clock() : new Date().toISOString();
  }

  /** Grants a bounded WebMCP action to a user. Consent must be explicit. */
  grant(actor: Principal, input: { toolName: string; action: WebMcpAction; ttlMs?: number }): McpGrantRecord {
    if (!this.options.toolSurface.has(input.toolName)) {
      failIntelligence(
        'WEBMCP_TOOL_NOT_IN_OWN_APP_SURFACE',
        `Alat '${input.toolName}' bukan sebahagian permukaan MCP aplikasi ini.`,
      );
    }
    if (!WEBMCP_ALLOWED_ACTIONS.includes(input.action)) {
      failIntelligence(
        'WEBMCP_ACTION_NOT_ALLOWED',
        `Tindakan '${input.action}' di luar skop WebMCP yang dibenarkan.`,
      );
    }
    const grantedAt = this.now();
    const grant: McpGrantRecord = {
      id: randomUUID(),
      userId: actor.user.id,
      toolName: input.toolName,
      action: input.action,
      grantedAt,
      expiresAt: new Date(Date.parse(grantedAt) + Math.max(1, input.ttlMs ?? 3_600_000)).toISOString(),
    };
    this.options.store.save('webmcp_grants', grant);
    this.options.store.audit(actor.user.id, 'webmcp.grant', grant.id, 1);
    return grant;
  }

  /** Revokes a grant. */
  revoke(actor: Principal, grantId: string): McpGrantRecord {
    const grant = this.options.store.get<McpGrantRecord>('webmcp_grants', grantId);
    if (!grant) failIntelligence('WEBMCP_GRANT_NOT_FOUND', 'Grant WebMCP tidak ditemui.');
    if (grant.userId !== actor.user.id) {
      failIntelligence('WEBMCP_GRANT_NOT_OWNED', 'Grant ini milik pengguna lain.');
    }
    const revoked = { ...grant, revokedAt: this.now() };
    this.options.store.save('webmcp_grants', revoked);
    this.options.store.audit(actor.user.id, 'webmcp.revoke', revoked.id, 1);
    return revoked;
  }

  /** Lists the live grants of a user. */
  listGrants(actor: Principal): McpGrantRecord[] {
    const at = this.now();
    return this.options.store
      .all<McpGrantRecord>('webmcp_grants')
      .filter(
        (grant) =>
          grant.userId === actor.user.id &&
          !grant.revokedAt &&
          Date.parse(grant.expiresAt) > Date.parse(at),
      );
  }

  /**
   * Authorises a WebMCP call. Only the application's own tools and only the
   * bounded actions are ever authorised; anything else is refused with a
   * reason. There is no shell/eval fallback.
   */
  authorize(actor: Principal, input: { toolName: string; action: string }): McpAuthorisation {
    if (!this.options.toolSurface.has(input.toolName)) {
      return {
        allowed: false,
        reasonCode: 'WEBMCP_TOOL_NOT_IN_OWN_APP_SURFACE',
        reason: `Alat '${input.toolName}' bukan sebahagian permukaan MCP aplikasi ini;iautomasi laman web luar tidak dibenarkan.`,
      };
    }
    if (!WEBMCP_ALLOWED_ACTIONS.includes(input.action as WebMcpAction)) {
      return {
        allowed: false,
        reasonCode: 'WEBMCP_ACTION_NOT_ALLOWED',
        reason: `Tindakan '${input.action}' di luar skop WebMCP yang dibenarkan.`,
      };
    }
    const grant = this.listGrants(actor).find(
      (entry) => entry.toolName === input.toolName && entry.action === input.action,
    );
    if (!grant) {
      return {
        allowed: false,
        reasonCode: 'WEBMCP_GRANT_REQUIRED',
        reason: 'Tiada grant pengguna yang sah untuk alat dan tindakan ini.',
      };
    }
    return { allowed: true, reasonCode: 'WEBMCP_GRANTED', reason: 'Grant sah.', grantId: grant.id };
  }
}
