/**
 * AbangColek Sovereign GrowthOS — MCP Apps host frame (client side)
 *
 * Modul ini adalah "host path" untuk MCP App: ia memuatkan widget `ui://`
 * dalam iframe bersandbox melalui proksi sandbox rasmi CopilotKit
 * (`@copilotkit/mcp-apps-renderer` → `buildSandboxHTML`), mentakrifkan
 * sempadan mesej hos↔widget, dan TIDAK sekali-kali menghantar identiti ke
 * dalam iframe.
 *
 * Modul ini berdiri sendiri (DOM biasa, tanpa React) supaya boleh dimuat
 * oleh mana-mana lapisan UI.
 *
 * Rujukan:
 * - `src/features/copilot/mcp-apps/OperationsBriefApp.tsx` — parser unjuran
 *   pada pihak klien (kontrak bentuk respons yang dikongsi).
 * - `server/agents/mcp/appHtml.ts` — penjana widget + CSP.
 * - `server/agents/mcp/boundary.ts` — kontrak sempadan mesej.
 */

/** Laluan hos sandbox (proksi rasmi). */
export const MCP_APP_SANDBOX_ROUTE = '/api/mcp?surface=sandbox';

/** Laluan widget HTML (resource `ui://` yang disajikan oleh pelayan MCP). */
export const MCP_APP_WIDGET_ROUTE = '/api/mcp?surface=app';

/** URI resource UI MCP yang dipaparkan. */
export const MCP_APP_RESOURCE_URI = 'ui://abangcolek/operations-brief.html';

/**
 * Atribut sandbox untuk iframe DALAMAN (widget). Tanpa `allow-same-origin`,
 * origin widget ialah origin legap: ia tidak boleh membaca DOM, storage atau
 * cookie hos. Ini lebih ketat daripada lalai rasmi CopilotKit.
 */
export const MCP_APP_INNER_SANDBOX = 'allow-scripts';

/**
 * Atribut sandbox untuk iframe LUAR (proksi). Tanpa `allow-same-origin`,
 * proksi juga berjalan pada origin legap dan tidak boleh mencapai DOM hos.
 */
export const MCP_APP_OUTER_SANDBOX = 'allow-scripts';

export interface McpAppHostOptions {
  /** Bekas untuk memount bingkai hos. */
  container: HTMLElement;
  /** Resource UI untuk dipaparkan. Lalai: taklimat operasi AbangColek. */
  resourceUri?: string;
  /** Tinggi bingkai luar, dalam piksel CSS. */
  height?: number;
  /** Panggil balik untuk peristiwa peringkat hos. */
  onEvent?: (event: McpAppHostEvent) => void;
}

export type McpAppHostEvent =
  | { type: 'mounted' }
  | { type: 'size-changed'; width: number; height: number }
  | { type: 'error'; message: string };

const ALLOWED_METHODS = new Set([
  'ui/initialize',
  'ui/notifications/initialized',
  'ui/notifications/size-changed',
  'ui/notifications/sandbox-proxy-ready',
  'ui/notifications/sandbox-resource-ready',
  'ui/resource-teardown',
  'ui/notifications/request-teardown',
]);

interface McpAppMessage {
  jsonrpc: '2.0';
  method?: string;
  id?: string | number;
  params?: Record<string, unknown>;
}

/**
 * Semak mesej daripada proksi sandbox.
 *
 * Dua syarat wajib:
 * 1. `event.source` MESTAKHUSUSELY bingkai luar yang kita Cipta.
 * 2. `event.origin` MESTAKHUSUSELY origin aplikasi (atau "null" apabila bingkai
 *    berjalan pada origin legap kerana `sandbox` tidak membenarkan
 *    `allow-same-origin`).
 *
 * Mesej daripada mana-mana sumber lain diabaikan sepenuhnya.
 */
export function isTrustedMcpAppMessage(
  event: MessageEvent,
  frame: HTMLIFrameElement,
): event is MessageEvent<McpAppMessage> {
  if (event.source !== frame.contentWindow) return false;
  const origin = event.origin;
  if (origin !== window.location.origin && origin !== 'null') return false;
  const data = event.data as McpAppMessage | undefined;
  if (!data || typeof data !== 'object' || data.jsonrpc !== '2.0') return false;
  if (typeof data.method !== 'string') return false;
  return ALLOWED_METHODS.has(data.method);
}

/**
 * Memasang host MCP App dan memulangkan fungsi untuk melepaskan sumber.
 *
 * Aliran:
 * 1. `<iframe>` luar dimuatkan dengan dokumen proksi sandbox.
 * 2. Proksi menghantar `ui/notifications/sandbox-proxy-ready`.
 * 3. Hos mengambil HTML widget (baca sahaja, sudah dibatasi peranan).
 * 4. Hos menghantar `ui/notifications/sandbox-resource-ready` kepada proksi;
 *    proksi memuatkannya dalam iframe dalaman bersandbox.
 * 5. Widget berhandshake `ui/initialize` melalui proksi; hos menjawab dengan
 *    `hostInfo` dan `hostCapabilities` — TANPA sebarang identiti.
 */
export function mountMcpAppHost(options: McpAppHostOptions): () => void {
  const { container } = options;
  const height = options.height ?? 320;

  const frame = document.createElement('iframe');
  frame.title = 'AbangColek MCP App';
  frame.setAttribute('sandbox', MCP_APP_OUTER_SANDBOX);
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.setAttribute('loading', 'lazy');
  frame.style.width = '100%';
  frame.style.height = `${height}px`;
  frame.style.border = '0';
  frame.src = MCP_APP_SANDBOX_ROUTE;

  const onMessage = (event: MessageEvent): void => {
    if (!isTrustedMcpAppMessage(event, frame)) return;
    const message = event.data;

    if (message.method === 'ui/notifications/sandbox-proxy-ready') {
      void deliverWidget(frame, options);
      return;
    }

    if (message.method === 'ui/initialize' && message.id !== undefined) {
      // Hos menjawab handshake. Tiada identiti, tiada token, tiada data
      // perniagaan dihantar ke dalam iframe.
      frame.contentWindow?.postMessage(
        {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2026-01-26',
            hostInfo: { name: 'abangcolek-growthos', version: '1.0.0' },
            hostCapabilities: {},
            hostContext: { mode: 'read-only' },
          },
        },
        '*',
      );
      return;
    }

    if (message.method === 'ui/notifications/size-changed') {
      const params = message.params ?? {};
      const nextHeight = typeof params.height === 'number' ? params.height : height;
      frame.style.height = `${Math.max(120, Math.ceil(nextHeight))}px`;
      options.onEvent?.({
        type: 'size-changed',
        width: typeof params.width === 'number' ? params.width : 0,
        height: nextHeight,
      });
    }
  };

  window.addEventListener('message', onMessage);
  container.appendChild(frame);
  options.onEvent?.({ type: 'mounted' });

  return () => {
    window.removeEventListener('message', onMessage);
    frame.remove();
  };
}

/**
 * Mengambil HTML widget dan menghantarnya kepada proksi sandbox.
 *
 * Permintaan dibuat oleh hos (origin aplikasi) dengan kelayakan sesi yang
 * sah; pelayan menyelesaikan actor DARI SESI SERVER dan tidak pernah menerima
 * identiti daripada badan permintaan.
 */
async function deliverWidget(
  frame: HTMLIFrameElement,
  options: McpAppHostOptions,
): Promise<void> {
  try {
    const response = await fetch(MCP_APP_WIDGET_ROUTE, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) {
      options.onEvent?.({
        type: 'error',
        message: `Widget MCP App tidak dapat dimuatkan (HTTP ${response.status}).`,
      });
      return;
    }
    const html = await response.text();
    frame.contentWindow?.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/notifications/sandbox-resource-ready',
        params: {
          html,
          sandbox: MCP_APP_INNER_SANDBOX,
        },
      },
      '*',
    );
  } catch (error) {
    options.onEvent?.({
      type: 'error',
      message: error instanceof Error ? error.message : 'Widget MCP App gagal dimuatkan.',
    });
  }
}
