/**
 * AbangColek Sovereign GrowthOS — Streamable HTTP transport (Web standard)
 *
 * `@modelcontextprotocol/sdk` menyediakan `StreamableHTTPServerTransport`
 * untuk Node (`IncomingMessage`/`ServerResponse`). Vercel Functions dalam
 * repo ini dijalankan dengan Web `Request`/`Response`, jadi modul ini
 * menyediakan pengangkutan Web yang menyatukan protokol MCP dengan borang
 * Web-standard.
 *
 * Apa yang TIDAK dibuat di sini: parsing JSON-RPC, negotiate versi protokol,
 * initialize, tools/list, tools/call, resources/list dan resources/read —
 * semuanya diurus oleh `McpServer` daripada SDK rasmi. Modul ini hanya
 * manages:
 * - bingkai mesej (JSON-RPC message <-> respons HTTP),
 * - penstriman SSE untuk mesej server→client,
 * - pengurusan sesi.
 */

import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from '@modelcontextprotocol/sdk/types.js';

interface PendingRequest {
  resolve: (message: JSONRPCMessage) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface WebTransportOptions {
  /** Had masa bagi satu permintaan JSON-RPC (ms). */
  requestTimeoutMs?: number;
}

function isResponse(message: JSONRPCMessage): message is JSONRPCResponse {
  return 'id' in message && message.id !== undefined
    && ('result' in message || 'error' in message);
}

function isRequest(message: JSONRPCMessage): message is JSONRPCRequest {
  return 'method' in message && typeof message.method === 'string'
    && 'id' in message && message.id !== undefined;
}

/**
 * Pengangkutan MCP untuk Web `Request`/`Response`.
 *
 * Setiap permintaan HTTP ialah "satu jalan": mesej masuk dicerna, dan respons
 * JSON-RPC dikembalikan. Mesej server→client (notifikasi) dikumpulkan dalam
 * saluran SSE.
 */
export class WebStreamableHttpTransport implements Transport {
  sessionId?: string;
  onmessage?: <T extends JSONRPCMessage>(message: T) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  private readonly pending = new Map<string, PendingRequest>();
  private readonly requestTimeoutMs: number;
  private started = false;
  private closed = false;

  /** Mesej server→client yang perlu dihantar ke saluran SSE. */
  private readonly outbound: JSONRPCMessage[] = [];

  constructor(options: WebTransportOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const [, waiter] of this.pending) {
      clearTimeout(waiter.timer);
      waiter.resolve({
        jsonrpc: '2.0',
        id: 0,
        error: { code: -32603, message: 'Sesi MCP ditutup.' },
      });
    }
    this.pending.clear();
    this.onclose?.();
  }

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    if (isResponse(message)) {
      const key = String(message.id);
      const waiter = this.pending.get(key);
      if (waiter) {
        this.pending.delete(key);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
      return;
    }
    // Notifikasi atau permintaan server→client.
    this.outbound.push(message);
  }

  /**
   * Memproses satu mesej JSON-RPC masuk dan memulangkan respons yang
   * dijana oleh pelayan MCP.
   */
  async dispatch(message: JSONRPCMessage): Promise<JSONRPCMessage[]> {
    if (!this.started) await this.start();
    if (!isRequest(message)) {
      this.onmessage?.(message);
      return [];
    }
    const key = String(message.id);
    const response = new Promise<JSONRPCMessage>(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        resolve({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32603, message: 'Pelayan MCP tidak menjawab dalam masa yang dibenarkan.' },
        });
      }, this.requestTimeoutMs);
      this.pending.set(key, { resolve, timer });
    });
    this.onmessage?.(message);
    const answer = await response;
    return [answer];
  }

  /** Mengambil dan mengosongkan mesej server→client yang belum dihantar. */
  drainOutbound(): JSONRPCMessage[] {
    return this.outbound.splice(0, this.outbound.length);
  }
}
