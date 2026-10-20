/**
 * AbangColek Sovereign GrowthOS — MCP Apps Message Boundary
 *
 * Kontrak pesanan antara hos (host) dan widget MCP App. Semua mesej ialah
 * JSON-RPC 2.0 seperti yang ditetapkan oleh MCP Apps (`@modelcontextprotocol/
 * ext-apps`), tetapi subset yang digunakan oleh AbangColek adalah kecil dan
 * SENARAI TUTUP — sebarang kaedah di luar senarai ini ditolak oleh hos.
 *
 * Perimeter keselamatan:
 * - Widget berjalan dalam iframe bersandbox (`allow-scripts` sahaja): tiada
 *   `allow-same-origin`, jadi origin widget ialah origin legap dan tidak boleh
 *   menyentuh DOM, storage atau cookie hos.
 * - Hos hanya menerima mesej daripada `iframe.contentWindow` yang dijangka dan
 *   hanyaisodes dari origin aplikasi.
 * - Tiada identiti, token atau sesi dihantar ke dalam iframe: widget hanya
 *   menerima unjuran brief yang sudah dibatasi peranan.
 */

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/ext-apps';

/** Versi protokol MCP Apps yang dinegosiasikan oleh hos dan widget. */
export const MCP_APP_PROTOCOL_VERSION = LATEST_PROTOCOL_VERSION;

/** Atribut sandbox iframe dalaman (widget). */
export const MCP_APP_SANDBOX_ATTRIBUTE = 'allow-scripts';

/**
 * Kaedah UI MCP Apps yang dibenarkan dalam sempadan AbangColek.
 *
 * `ui/initialize` dan `ui/notifications/initialized` ialah handshake;
 * `ui/notifications/size-changed` melaporkan saiz; `ui/resource-teardown` ialah
 * penutupan yang sopan.
 */
export const MCP_APP_ALLOWED_METHODS = [
  'ui/initialize',
  'ui/notifications/initialized',
  'ui/notifications/size-changed',
  'ui/notifications/sandbox-proxy-ready',
  'ui/notifications/sandbox-resource-ready',
  'ui/resource-teardown',
  'ui/notifications/request-teardown',
] as const;

export type McpAppAllowedMethod = (typeof MCP_APP_ALLOWED_METHODS)[number];

/**
 * Semak bahawa nilai yang diterima daripada `postMessage` ialah mesej
 * JSON-RPC 2.0 dalam sempadan yang dibenarkan.
 */
export function isMcpAppMessage(
  value: unknown,
): value is { jsonrpc: '2.0'; method: McpAppAllowedMethod; id?: string | number; params?: Record<string, unknown> } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  if (message.jsonrpc !== '2.0') return false;
  if (typeof message.method !== 'string') return false;
  if (!(MCP_APP_ALLOWED_METHODS as readonly string[]).includes(message.method)) return false;
  if (message.id !== undefined && typeof message.id !== 'string' && typeof message.id !== 'number') {
    return false;
  }
  if (
    message.params !== undefined
    && (typeof message.params !== 'object' || message.params === null || Array.isArray(message.params))
  ) {
    return false;
  }
  return true;
}

/**
 * Semak mesej "sandbox-resource-ready" yang dihantar oleh hos kepada proksi
 * sandbox: ia mesti membawa HTML widget dan attribut sandbox yang jelas.
 */
export function isSandboxResourceReadyParams(
  value: unknown,
): value is { html: string; sandbox: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const params = value as Record<string, unknown>;
  if (typeof params.html !== 'string' || params.html.length === 0) return false;
  if (typeof params.sandbox !== 'string' || params.sandbox.length === 0) return false;
  return true;
}
