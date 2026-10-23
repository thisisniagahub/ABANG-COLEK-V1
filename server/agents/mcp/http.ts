/**
 * AbangColek Sovereign GrowthOS — MCP HTTP (streamable) session layer
 *
 * Lapisan ini menguruskan sesi MCP, bukan protokol itu sendiri:
 * - Sesi diwujudkan pada permintaan `initialize` dan dikikat pada SATU actor
 *   yang diperoleh daripada sesi server.
 * - Permintaan berikutnya WAJIB membawa `mcp-session-id` yang sama DAN actor
 *   yang sama; jika tidak, permintaan ditolak.
 * Badan permintaan yang percubaan
 *   `workspaceId`, ...) DITOLAK sebelum ia sampai ke protokol MCP.
 */

import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAccessError, type McpActor } from './actor';
import { createOperationsMcpServer } from './server';
import { WebStreamableHttpTransport } from './webTransport';

export const MCP_SESSION_HEADER = 'mcp-session-id';
export const MCP_PROTOCOL_VERSION_HEADER = 'mcp-protocol-version';

/** Kunci yang tidak pernah boleh dihantar oleh klien dalam badan permintaan. */
export const FORBIDDEN_IDENTITY_KEYS = [
  'actor',
  'principal',
  'userId',
  'user_id',
  'role',
  'workspaceId',
  'workspace_id',
  'membershipVersion',
  'outletIds',
  'dealerOrgId',
  'sessionHash',
  'csrfHash',
  'csrfToken',
] as const;

export interface McpSession {
  readonly id: string;
  readonly actor: McpActor;
  readonly server: McpServer;
  readonly transport: WebStreamableHttpTransport;
  readonly createdAt: number;
}

export interface McpHttpDependencies {
  /**
   * Menyelesaikan actor daripada SESI SERVER sahaja. Implementasi lalai
   * membaca cookie `platform_session` (atau token sesi dalam `Authorization`)
   * dan mencari sesi dalam store kanonikal.
   */
  resolveActor: (request: Request) => Promise<McpActor>;
  /** Kilang pelayan MCP. Default: `createOperationsMcpServer`. */
  createServer?: (actor: McpActor) => McpServer;
  /** Penjana ID sesi. Default: `crypto.randomUUID()`. */
  sessionIdFactory?: () => string;
  /** Had masa hayat sesi (ms). Default 30 minit. */
  sessionTtlMs?: number;
  /** Maksimum sesi serentak. Default 256. */
  maxSessions?: number;
  now?: () => number;
}

function jsonRpcError(id: string | number | null, code: number, message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

function containsForbiddenIdentity(value: unknown, depth = 0): string | undefined {
  if (depth > 4 || typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if ((FORBIDDEN_IDENTITY_KEYS as readonly string[]).includes(key)) return key;
    const nested = containsForbiddenIdentity(record[key], depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function wantsSse(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/event-stream');
}

function sseResponse(messages: unknown[], sessionId: string | undefined): Response {
  const frames = messages
    .map(message => `event: message\ndata: ${JSON.stringify(message)}\n\n`)
    .join('');
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    Connection: 'keep-alive',
    'X-Content-Type-Options': 'nosniff',
  };
  if (sessionId) headers[MCP_SESSION_HEADER] = sessionId;
  return new Response(frames, { status: 200, headers });
}

/**
 * Membina pengendali HTTP MCP.
 *
 * Mengembalikan fungsi `(request: Request) => Promise<Response>` yang sesuai
 * untuk Vercel Functions (`export default { fetch }`).
 */
export function createMcpHttpHandler(
  dependencies: McpHttpDependencies,
): (request: Request) => Promise<Response> {
  const createServer = dependencies.createServer
    ?? ((actor: McpActor) => createOperationsMcpServer({ actor }));
  const sessionIdFactory = dependencies.sessionIdFactory
    ?? (() => crypto.randomUUID());
  const sessionTtlMs = dependencies.sessionTtlMs ?? 30 * 60_000;
  const maxSessions = dependencies.maxSessions ?? 256;
  const now = dependencies.now ?? (() => Date.now());

  const sessions = new Map<string, McpSession>();

  const prune = (): void => {
    const stamp = now();
    for (const [id, session] of sessions) {
      if (stamp - session.createdAt > sessionTtlMs) {
        sessions.delete(id);
        void session.server.close();
      }
    }
    while (sessions.size > maxSessions) {
      const oldest = sessions.keys().next();
      if (oldest.done) break;
      const session = sessions.get(oldest.value);
      sessions.delete(oldest.value);
      if (session) void session.server.close();
    }
  };

  const respond = (
    sse: boolean,
    responses: unknown[],
    sessionId?: string,
  ): Response => {
    if (sse) return sseResponse(responses, sessionId);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (sessionId) headers[MCP_SESSION_HEADER] = sessionId;
    const payload = responses.length === 1 ? responses[0] : responses;
    return new Response(JSON.stringify(payload), { status: 200, headers });
  };

  return async (request: Request): Promise<Response> => {
    prune();

    if (request.method === "DELETE") {
      const id = request.headers.get(MCP_SESSION_HEADER);
      if (!id) return jsonRpcError(null, -32000, "Header mcp-session-id diperlukan.");
      const session = sessions.get(id);
      if (!session) return jsonRpcError(null, -32001, "Sesi MCP tidak dijumpai atau telah tamat.");
      let actor: McpActor;
      try {
        actor = await dependencies.resolveActor(request);
      } catch (error) {
        if (error instanceof McpAccessError) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0", id: null, error: { code: -32001, message: error.message, data: { code: error.code } }
            }),
            { status: error.status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
          );
        }
        throw error;
      }
      if (session.actor.userId !== actor.userId) {
        return jsonRpcError(null, -32001, "Sesi MCP ini milik actor lain.");
      }
      sessions.delete(id);
      await session.server.close();
      return new Response(null, { status: 204 });
    }

    if (request.method !== 'POST') {
      return jsonRpcError(
        null,
        -32000,
        'Kaedah HTTP tidak disokong oleh titik masuk MCP ini.',
      );
    }

    let actor: McpActor;
    try {
      actor = await dependencies.resolveActor(request);
    } catch (error) {
      if (error instanceof McpAccessError) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32001, message: error.message, data: { code: error.code } },
          }),
          {
            status: error.status,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          },
        );
      }
      throw error;
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonRpcError(null, -32700, 'Badan permintaan bukan JSON yang sah.');
    }

    const forbidden = containsForbiddenIdentity(raw);
    if (forbidden) {
      return jsonRpcError(
        null,
        -32602,
        `Badan permintaan mengandungi identiti yang tidak dibenarkan ("${forbidden}"). `
        + 'Identiti hanya boleh datang daripada sesi server.',
      );
    }

    const batch = Array.isArray(raw) ? raw : [raw];
    const parsed = batch.map(entry => JSONRPCMessageSchema.parse(entry));

    const isInitialize = parsed.some(
      message => 'method' in message && message.method === 'initialize',
    );

    if (isInitialize) {
      const server = createServer(actor);
      const transport = new WebStreamableHttpTransport();
      await server.connect(transport);
      const id = sessionIdFactory();
      sessions.set(id, { id, actor, server, transport, createdAt: now() });
      const responses: unknown[] = [];
      for (const message of parsed) {
        responses.push(...(await transport.dispatch(message)));
      }
      return respond(wantsSse(request), responses, id);
    }

    const sessionId = request.headers.get(MCP_SESSION_HEADER);
    if (!sessionId) {
      return jsonRpcError(
        null,
        -32000,
        'Permintaan bukan initialize memerlukan header mcp-session-id.',
      );
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return jsonRpcError(null, -32001, 'Sesi MCP tidak dijumpai atau telah tamat.');
    }
    if (session.actor.userId !== actor.userId) {
      return jsonRpcError(
        null,
        -32001,
        'Sesi MCP ini milik actor lain.',
      );
    }

    const responses: unknown[] = [];
    for (const message of parsed) {
      responses.push(...(await session.transport.dispatch(message)));
    }
    return respond(wantsSse(request), responses, session.id);
  };
}
