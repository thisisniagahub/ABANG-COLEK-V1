/**
 * ABANGCOLEK Sovereign GrowthOS — EXT-05 WebMCP browser support probe
 *
 * WebMCP requires a browser that implements the Model Context Protocol
 * client API. When the browser does not, the probe returns a TYPED
 * `unavailable` with the exact reason — there is no fallback to an eval, a
 * shell, or an arbitrary website automation.
 *
 * The probe only reports support. It never talks to a provider.
 */

export type WebMcpSupport =
  | { supported: true; api: 'navigator.modelContext' | 'window.modelContext'; reasonCode: 'WEBMCP_SUPPORTED' }
  | { supported: false; reasonCode: string; reason: string };

/** The surface a browser may expose. */
export interface WebMcpProbeScope {
  navigator?: { modelContext?: unknown };
  window?: { modelContext?: unknown };
}

/**
 * Probes the browser for WebMCP support.
 *
 * The probe is deliberately conservative: it only reports support when the
 * browser exposes a `modelContext` object with a `registerTool` function,
 * which is the shape a client needs.
 */
export function probeWebMcpSupport(scope: WebMcpProbeScope = globalThis as WebMcpProbeScope): WebMcpSupport {
  const candidates: Array<[('navigator.modelContext' | 'window.modelContext'), unknown]> = [
    ['navigator.modelContext', scope.navigator?.modelContext],
    ['window.modelContext', scope.window?.modelContext],
  ];
  for (const [api, value] of candidates) {
    if (value && typeof (value as { registerTool?: unknown }).registerTool === 'function') {
      return { supported: true, api, reasonCode: 'WEBMCP_SUPPORTED' };
    }
  }
  return {
    supported: false,
    reasonCode: 'WEBMCP_BROWSER_UNSUPPORTED',
    reason:
      'Pelayar ini tidak mencipta API Model Context Protocol (modelContext.registerTool). Ciri WebMCP tidak tersedia; tiada fallback eval atau shell.',
  };
}

/**
 * The permission the application asks for before exposing its own MCP
 * surface. The user must grant it explicitly and it may be revoked.
 */
export interface WebMcpGrantState {
  granted: boolean;
  reasonCode: string;
  reason: string;
  grantedAt?: string;
  revokedAt?: string;
}

export const WEB_MCP_GRANT_STORAGE_KEY = 'abangcolek_webmcp_grant';

/** The grant the user must give before the own-app MCP surface is exposed. */
export function defaultWebMcpGrant(): WebMcpGrantState {
  return {
    granted: false,
    reasonCode: 'WEBMCP_GRANT_REQUIRED',
    reason: 'Pengguna belum memberi kebenaran untuk mendedahkan permukaan MCP aplikasi ini.',
  };
}

/** Reads the stored grant (if any). */
export function readWebMcpGrant(storage?: Pick<Storage, 'getItem'>): WebMcpGrantState {
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    if (!store) return defaultWebMcpGrant();
    const raw = store.getItem(WEB_MCP_GRANT_STORAGE_KEY);
    if (!raw) return defaultWebMcpGrant();
    const parsed = JSON.parse(raw) as Partial<WebMcpGrantState>;
    if (parsed.granted === true && typeof parsed.grantedAt === 'string') {
      return { granted: true, reasonCode: 'WEBMCP_GRANTED', reason: 'Permibenaran telah diberikan.', grantedAt: parsed.grantedAt };
    }
    return defaultWebMcpGrant();
  } catch {
    return defaultWebMcpGrant();
  }
}

/** Grants the own-app MCP surface. */
export function grantWebMcp(storage?: Pick<Storage, 'setItem'>): WebMcpGrantState {
  const granted: WebMcpGrantState = {
    granted: true,
    reasonCode: 'WEBMCP_GRANTED',
    reason: 'Permibenaran diberikan.',
    grantedAt: new Date().toISOString(),
  };
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    store?.setItem(WEB_MCP_GRANT_STORAGE_KEY, JSON.stringify(granted));
  } catch {
    // Storage unavailable: the grant stays in memory for this session only.
  }
  return granted;
}

/** Revokes the own-app MCP surface. */
export function revokeWebMcp(storage?: Pick<Storage, 'setItem'>): WebMcpGrantState {
  const revoked: WebMcpGrantState = {
    granted: false,
    reasonCode: 'WEBMCP_GRANT_REQUIRED',
    reason: 'Permibenaran telah ditarik balik.',
    revokedAt: new Date().toISOString(),
  };
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    store?.setItem(WEB_MCP_GRANT_STORAGE_KEY, JSON.stringify(revoked));
  } catch {
    // Storage unavailable: nothing to persist.
  }
  return revoked;
}
