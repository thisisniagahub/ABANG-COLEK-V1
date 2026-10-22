/**
 * AbangColek Sovereign GrowthOS — MCP HTTP entry (Vercel-discovered)
 *
 * Titik masuk `/api/mcp` menggunakan pengangkutan MCP "streamable HTTP" rasmi
 * (`@modelcontextprotocol/sdk` → `McpServer`) melalui
 * `server/agents/mcp/http.ts`.
 *
 * Permukaan yang tersedia:
 *
 * - `POST   /api/mcp` — protokol MCP (initialize, tools/list, tools/call,
 *   resources/list, resources/read). Sesi dibuka dengan `initialize` dan
 *   seterusnya memerlukan header `mcp-session-id`.
 * - `DELETE /api/mcp` — menutup sesi MCP.
 * - `GET    /api/mcp` — descriptor pelayan (bukan sebahagian protokol).
 * - `GET    /api/mcp?surface=sandbox` — dokumen proksi sandbox rasmi
 *   (`@copilotkit/mcp-apps-renderer`), hos sebenar untuk MCP App.
 * - `GET    /api/mcp?surface=app` — widget HTML `ui://` yang mengandungi
 *   unjuran taklimat yang sudah dibatasi peranan.
 *
 * Identiti hanya boleh datang daripada sesi server. Badan permintaan yang
 * cuba menghantar identiti ditolak sebelum protokol diproses.
 */

import { existsSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { PlatformStore } from '../server/platform/store';
import { resolveRequestUrl } from '../server/platform/requestUrl';
import { McpAccessError } from '../server/agents/mcp/actor';
import { createMcpHttpHandler } from '../server/agents/mcp/http';
import { createSessionActorResolver } from '../server/agents/mcp/session';
import {
  buildMcpAppSandboxDocument,
  MCP_APP_HOST_CONTENT_SECURITY_POLICY,
  OPERATIONS_BRIEF_UI_URI,
} from '../server/agents/mcp/appHtml';
import { computeOperationsBrief } from '../server/agents/mcp/brief';
import {
  createOperationsMcpServer,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  OPERATIONS_BRIEF_DAILY_URI,
  OPERATIONS_BRIEF_URGENT_URI,
} from '../server/agents/mcp/server';

const DATABASE_PATH = process.env.PLATFORM_DATABASE_PATH
  ?? 'var/lib/platform/platform.sqlite';

let storeInstance: PlatformStore | undefined;
let storeResolved = false;

/**
 * Store kanonikal platform.
 *
 * Jika fail pangkalan data tidak wujud, TIDAK satu store kosong dikongsi —
 * `undefined` dikembalikan supaya taklimat melaporkan `unavailable` dan bukannya
 * sifar yang dipoleskan.
 */
function platformStore(): PlatformStore | undefined {
  if (storeResolved) return storeInstance;
  storeResolved = true;
  const path = resolvePath(process.cwd(), DATABASE_PATH);
  if (!existsSync(path)) {
    storeInstance = undefined;
    return undefined;
  }
  storeInstance = new PlatformStore(path);
  return storeInstance;
}

const resolveActor = createSessionActorResolver({ store: platformStore() });

const protocolHandler = createMcpHttpHandler({
  resolveActor,
  createServer: actor => createOperationsMcpServer({ actor, store: platformStore() }),
});

function htmlResponse(body: string, contentSecurityPolicy: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': contentSecurityPolicy,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function serverInfo(): Record<string, unknown> {
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    transport: 'streamable-http',
    protocolVersion: '2025-06-18',
    endpoints: {
      post: '/api/mcp',
      delete: '/api/mcp',
      descriptor: '/api/mcp',
      sandboxHost: '/api/mcp?surface=sandbox',
      appResource: '/api/mcp?surface=app',
    },
    tools: ['get_operations_brief', 'get_order_status'],
    resources: [
      OPERATIONS_BRIEF_DAILY_URI,
      OPERATIONS_BRIEF_URGENT_URI,
      OPERATIONS_BRIEF_UI_URI,
    ],
    identity: 'server-session-only',
  };
}

async function handleSurface(
  request: Request,
  surface: string,
): Promise<Response> {
  let actor;
  try {
    actor = await resolveActor(request);
  } catch (error) {
    if (error instanceof McpAccessError) {
      return jsonResponse(
        { ok: false, code: error.code, message: error.message },
        error.status,
      );
    }
    throw error;
  }

  if (surface === 'sandbox') {
    return htmlResponse(
      buildMcpAppSandboxDocument(),
      MCP_APP_HOST_CONTENT_SECURITY_POLICY,
    );
  }

  if (surface === 'app') {
    const result = computeOperationsBrief(platformStore(), actor, 'daily');
    const { buildOperationsBriefAppHtml } = await import(
      '../server/agents/mcp/appHtml'
    );
    return htmlResponse(
      buildOperationsBriefAppHtml(result.projection),
      "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; "
      + "connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
    );
  }

  return jsonResponse({ ok: false, code: 'UNKNOWN_SURFACE', surface }, 404);
}

export default {
  fetch: async (request: Request): Promise<Response> => {
    const url = resolveRequestUrl(request);
    const surface = url.searchParams.get('surface');

    if (request.method === 'GET' && surface) {
      return handleSurface(request, surface);
    }

    if (request.method === 'GET') {
      return jsonResponse(serverInfo());
    }

    return protocolHandler(request);
  },
};
