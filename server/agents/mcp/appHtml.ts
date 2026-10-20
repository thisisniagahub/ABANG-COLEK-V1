/**
 * AbangColek Sovereign GrowthOS — MCP App (UI Resource) & Host Sandbox
 *
 * Dua artefak:
 *
 * 1. WIDGET (`ui://abangcolek/operations-brief.html`) — resource UI MCP yang
 *    dipaparkan oleh hos. HTML-nya dijana server-side, mengandungi unjuran
 *    brief yang sudah dibatasi peranan, dan tidak memuat sebarang skrip atau
 *    sumber luaran. CSP-nya dikuatkuasakan melalui `<meta http-equiv>` dan
 *    melalui `_meta.ui.csp` pada resource.
 *
 * 2. HOST SANDBOX — dokumen proksi yang dibina oleh pustaka rasmi
 *    `@copilotkit/mcp-apps-renderer` (`buildSandboxHTML`). Dokumen ini dimuat
 *    dalam iframe luar dan menyekat widget dalam iframe dalaman yang
 *    bersandbox. Pesanan hos↔widget disalakan oleh proksi; widget tidak
 *    pernah attaining akses langsung kepada DOM hos.
 *
 * Both documents are self-contained: no network access is required or
 * permitted for the widget (connect-src 'none').
 */

import { buildSandboxHTML } from '@copilotkit/mcp-apps-renderer';
import {
  MCP_APP_PROTOCOL_VERSION,
  MCP_APP_SANDBOX_ATTRIBUTE,
} from './boundary';
import type { OperationsBriefProjection } from './brief';

/** URI resource UI MCP untuk taklimat operasi. */
export const OPERATIONS_BRIEF_UI_URI = 'ui://abangcolek/operations-brief.html';

/**
 * CSP untuk dokumen widget.
 *
 * default-src 'none' menutup semua jenis data; hanya style-src dan
 * `script-src` inline dibenarkan kerana widget tidak memuat mana-mana
 * sumber luaran. `connect-src 'none'` bermakna widget tidak boleh bercakap
 * dengan rangkaian — termasuk pelayan MCP — dan tidak menerima sebarang
 * identiti.
 */
export const MCP_APP_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "img-src data:",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** CSP untuk dokumen hos yang memuat iframe widget. */
export const MCP_APP_HOST_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "img-src data:",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "connect-src 'none'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

/**
 * Menjana HTML widget MCP App untuk satu unjuran brief.
 *
 * Unjuran diserialkan terus ke dalam dokumen supaya widget tidak perlu
 * memanggil mana-mana API — ini mengekalkan "read-only, first-party resource"
 * tanpa membuka laluan proxy tanpa kawalan.
 */
export function buildOperationsBriefAppHtml(projection: OperationsBriefProjection): string {
  const payload = escapeJson(projection);
  const title = escapeHtml(projection.title);
  const metrics = projection.metrics
    .map(
      metric =>
        `<div class="metric"><dt>${escapeHtml(metric.label)}</dt><dd>${escapeHtml(metric.value)}</dd></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="${MCP_APP_CONTENT_SECURITY_POLICY}" />
<title>${title}</title>
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #16181d; background: #ffffff; }
header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
h1 { font-size: 15px; font-weight: 600; margin: 0; }
.badge { font-size: 11px; border: 1px solid #d5d8de; border-radius: 999px; padding: 2px 8px; color: #5b616b; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 12px 0 0; }
.metric { background: #f5f6f8; border-radius: 10px; padding: 10px; min-width: 0; }
dt { font-size: 11px; color: #5b616b; margin: 0; }
dd { margin: 4px 0 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
footer { margin-top: 12px; font-size: 11px; color: #6b7280; border-top: 1px solid #e4e6ea; padding-top: 8px; }
@media (prefers-color-scheme: dark) {
  body { color: #e6e8ec; background: #14161a; }
  .metric { background: #1d2026; }
  .badge { border-color: #333842; color: #9aa3b2; }
  footer { border-top-color: #2a2e36; color: #9aa3b2; }
}
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <span class="badge">Read only</span>
</header>
<dl>${metrics}</dl>
<footer>${escapeHtml(projection.readOnlyNotice)} · ${escapeHtml(projection.source)} · rev ${escapeHtml(projection.revision)}</footer>
<script type="application/json" id="mcp-app-brief">${payload}</script>
<script>
(function () {
  'use strict';
  var PROTOCOL_VERSION = ${JSON.stringify(MCP_APP_PROTOCOL_VERSION)};
  var APP_INFO = { name: 'abangcolek-operations-brief', version: '1.0.0' };
  var TARGET_ORIGIN = '*';
  var pending = Object.create(null);

  function post(message) {
    try { window.parent.postMessage(message, TARGET_ORIGIN); } catch (error) { /* host gone */ }
  }

  function respond(id, result) {
    post({ jsonrpc: '2.0', id: id, result: result });
  }

  function fail(id, code, message) {
    post({ jsonrpc: '2.0', id: id, error: { code: code, message: message } });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || typeof data !== 'object' || data.jsonrpc !== '2.0') return;
    if (data.method === 'ui/resource-teardown') {
      if (typeof data.id === 'number' || typeof data.id === 'string') respond(data.id, {});
      return;
    }
    if (data.method === 'ui/notifications/host-context-changed') return;
  });

  function requestInitialize() {
    var id = 'ui-init-' + Date.now();
    pending[id] = true;
    post({
      jsonrpc: '2.0',
      id: id,
      method: 'ui/initialize',
      params: {
        appInfo: APP_INFO,
        appCapabilities: {},
        protocolVersion: PROTOCOL_VERSION
      }
    });
    // If the host never answers, the widget stays inert but rendered.
    setTimeout(function () { delete pending[id]; }, 10000);
  }

  function notifySize() {
    var doc = document.documentElement;
    var height = Math.ceil(doc.getBoundingClientRect().height);
    var width = Math.ceil(window.innerWidth);
    post({
      jsonrpc: '2.0',
      method: 'ui/notifications/size-changed',
      params: { width: width, height: height }
    });
  }

  function start() {
    requestInitialize();
    post({ jsonrpc: '2.0', method: 'ui/notifications/initialized' });
    if (typeof ResizeObserver === 'function') {
      var observer = new ResizeObserver(notifySize);
      observer.observe(document.documentElement);
      observer.observe(document.body);
    } else {
      window.addEventListener('resize', notifySize);
    }
    notifySize();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
</script>
</body>
</html>`;
}

/**
 * Dokumen proksi sandbox rasmi (CopilotKit MCP Apps renderer).
 *
 * Proksi ini ialah "host path" sebenar: ia memuat widget dalam iframe dalaman
 * bersandbox, menyalakan mesej hos↔widget, dan hanya menyalarkan mesej yang
 * datang daripada `window.parent` atau `inner.contentWindow`.
 */
export function buildMcpAppSandboxDocument(extraCspDomains?: string[]): string {
  return buildSandboxHTML(extraCspDomains);
}
