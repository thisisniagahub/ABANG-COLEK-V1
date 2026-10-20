/**
 * AbangColek Sovereign GrowthOS — First-Party MCP Server
 *
 * Pelayan MCP rasmi yang dibina dengan `@modelcontextprotocol/sdk`
 * (`McpServer`). Setiap instans terikat pada SATU `McpActor` yang diperoleh
 * daripada sesi server, jadi skop peranan tidak boleh dilangkau:
 *
 * - Tiada tool atau resource menerima identiti daripada badan permintaan.
 * - Tiada parameter tool boleh menukar `McpActor`.
 * - Data pesanan hanya dibaca selepas ditapis oleh skop outlet/dealer/pelanggan.
 *
 * Resource UI MCP (`ui://abangcolek/operations-brief.html`) didaftarkan dengan
 * metadata MCP Apps sebenar (`_meta.ui`) yang disahkan dengan schema rasmi
 * `@modelcontextprotocol/ext-apps`.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OrderRecord } from '../../../shared/platform-contracts';
import type { PlatformStore } from '../../platform/store';
import {
  assertOperationalScope,
  canAccessOrder,
  McpAccessError,
  type McpActor,
} from './actor';
import {
  computeOperationsBrief,
  type OperationsBriefPeriod,
  type OperationsBriefProjection,
} from './brief';
import {
  buildAppResourceMeta,
  buildAppToolMeta,
  RESOURCE_MIME_TYPE,
} from './extApps';
import {
  buildOperationsBriefAppHtml,
  OPERATIONS_BRIEF_UI_URI,
} from './appHtml';

export const MCP_SERVER_NAME = 'abangcolek-operations-mcp';
export const MCP_SERVER_VERSION = '1.0.0';

export const OPERATIONS_BRIEF_DAILY_URI = 'operations://brief/daily';
export const OPERATIONS_BRIEF_URGENT_URI = 'operations://brief/urgent';

export interface McpServerOptions {
  /** Actor yang terikat pada pelayan ini. Tidak boleh berubah selepas dibina. */
  readonly actor: McpActor;
  /** Store kanonikal platform. Tanpa store, brief melaporkan 'unavailable'. */
  readonly store?: PlatformStore;
}

function periodOf(value: unknown): OperationsBriefPeriod {
  return value === 'urgent' ? 'urgent' : 'daily';
}

/**
 * Menukar ralat skop kepada keputusan tool yang boleh dibaca.
 *
 * Ralat returned (bukan exception) supaya klien MCP menerima `isError` dengan
 * kod yang stabil — kod mesin, bukan mesej bebas.
 */
function accessErrorResult(error: McpAccessError): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  return {
    content: [
      { type: 'text', text: JSON.stringify({ code: error.code, message: error.message }) },
    ],
    isError: true,
  };
}

/**
 * Membina pelayan MCP yang terikat pada actor tertentu.
 *
 * Setiap panggilan membina instans baharu: `McpServer` menyimpan state
 * initialize/negotiation, jadi satu instans tidak boleh dikongsi antara
 * sesi yang berbeza.
 */
export function createOperationsMcpServer(options: McpServerOptions): McpServer {
  const { actor, store } = options;

  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      instructions:
        'Taklimat operasi AbangColek yang membaca sahaja. Skop setiap panggilan '
        + 'ditentukan oleh sesi server; tiada parameter yang boleh menukar skop.',
    },
  );

  const projectionFor = (period: OperationsBriefPeriod): OperationsBriefProjection =>
    computeOperationsBrief(store, actor, period).projection;

  // ---------------------------------------------------------------------
  // Tool: taklimat operasi (MCP App — dipaparkan sebagai resource UI)
  // ---------------------------------------------------------------------
  server.registerTool(
    'get_operations_brief',
    {
      title: 'Get Operations Brief',
      description:
        'Ringkasan operasi harian atau mendesak yang dikira daripada store kanonikal platform. Baca sahaja.',
      inputSchema: {
        period: z
          .enum(['daily', 'urgent'])
          .optional()
          .describe('Jenis taklimat. Default "daily".'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      _meta: buildAppToolMeta({
        resourceUri: OPERATIONS_BRIEF_UI_URI,
        visibility: ['model', 'app'],
      }),
    },
    async (args: { period?: 'daily' | 'urgent' }) => {
      try {
        const period = periodOf(args?.period);
        const result = computeOperationsBrief(store, actor, period);
        const payload: OperationsBriefProjection & {
          observation: string;
          highlights: string[];
        } = {
          ...result.projection,
          observation: result.observation,
          highlights: result.highlights,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload as unknown as Record<string, unknown>,
        };
      } catch (error) {
        if (error instanceof McpAccessError) return accessErrorResult(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------
  // Tool: status pesanan (skop peranan dikuatkuasakan)
  // ---------------------------------------------------------------------
  server.registerTool(
    'get_order_status',
    {
      title: 'Get Order Status',
      description:
        'Status satu pesanan. Pesanan di luar skop outlet, dealer atau akaun pelayar ditolak.',
      inputSchema: {
        orderId: z.string().min(1).max(120).describe('ID pesanan, contoh ORD-001.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: { orderId: string }) => {
      try {
        assertOperationalScope(actor);
        const orderId = z.string().min(1).max(120).parse(args?.orderId);
        const order = store?.get<OrderRecord>('orders', orderId);
        if (!order) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ code: 'NOT_FOUND', orderId }) }],
            isError: true,
          };
        }
        if (!canAccessOrder(actor, order)) {
          // Skop adalah sengaja: pelayar tidak boleh menggunakan
          // perbezaan antara "tiada pesanan" dan "pesanan di luar skop".
          return {
            content: [{ type: 'text', text: JSON.stringify({ code: 'FORBIDDEN', orderId }) }],
            isError: true,
          };
        }
        const projection = {
          orderId: order.id,
          fulfilmentStatus: order.fulfilmentStatus,
          paymentState: order.paymentState,
          amountSen: order.amountSen,
          paidAmountSen: order.paidAmountSen,
          refundAmountSen: order.refundAmountSen,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(projection, null, 2) }],
          structuredContent: projection as unknown as Record<string, unknown>,
        };
      } catch (error) {
        if (error instanceof McpAccessError) return accessErrorResult(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------
  // Resources: unjuran JSON (strict shape untuk parser klien)
  // ---------------------------------------------------------------------
  const briefResource = (
    name: string,
    uri: string,
    period: OperationsBriefPeriod,
  ): void => {
    server.registerResource(
      name,
      uri,
      {
        title: name,
        description:
          'Unjuran taklimat operasi yang strict: title, briefDate, metrics, readOnlyNotice, source, revision.',
        mimeType: 'application/json',
      },
      async () => ({
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(projectionFor(period)),
          },
        ],
      }),
    );
  };

  briefResource('Operations Brief (daily)', OPERATIONS_BRIEF_DAILY_URI, 'daily');
  briefResource('Operations Brief (urgent)', OPERATIONS_BRIEF_URGENT_URI, 'urgent');

  // ---------------------------------------------------------------------
  // Resource: MCP App UI (`ui://`) dengan metadata MCP Apps sebenar
  // ---------------------------------------------------------------------
  const appResourceMeta = buildAppResourceMeta({
    prefersBorder: true,
    csp: {
      // Tiada domain rangkaian: widget tidak boleh memuat atau memanggil
      // apa-apa sumber luaran.
      connectDomains: [],
      resourceDomains: [],
      frameDomains: [],
      baseUriDomains: [],
    },
  });

  server.registerResource(
    'AbangColek Operations Brief App',
    OPERATIONS_BRIEF_UI_URI,
    {
      title: 'AbangColek Operations Brief App',
      description:
        'Widget taklimat operasi baca sahaja. Dihos dalam iframe bersandbox dengan CSP ketat.',
      mimeType: RESOURCE_MIME_TYPE,
      _meta: appResourceMeta,
    },
    async () => ({
      contents: [
        {
          uri: OPERATIONS_BRIEF_UI_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildOperationsBriefAppHtml(projectionFor('daily')),
          _meta: appResourceMeta,
        },
      ],
    }),
  );

  return server;
}
