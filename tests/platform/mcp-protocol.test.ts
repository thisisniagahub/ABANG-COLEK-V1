/**
 * AbangColek Sovereign GrowthOS — MCP protocol contract
 *
 * Ujian ini menggunakan SDK MCP rasmi sebagai KEDUA-DUA pihak:
 * `Client` → `InMemoryTransport` → `McpServer`. Jadi transcript di bawah
 * adalah traffic JSON-RPC sebenar, bukan mock.
 *
 * Skop yang diuji:
 * - initialize / tools/list / tools/call / resources/list / resources/read.
 * - Resource UI MCP `ui://` dengan metadata `@modelcontextprotocol/ext-apps`.
 * - Skop peranan: staf outlet lain dan dealer lain tidak boleh dibaca.
 * - Badan permintaan tidak boleh menghantar identiti.
 */

import { describe, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { CatalogueProduct, OrderRecord, StockLot } from '../../shared/platform-contracts';
import { PlatformStore } from '../../server/platform/store';
import { createOperationsMcpServer } from '../../server/agents/mcp/server';
import { createMcpHttpHandler } from '../../server/agents/mcp/http';
import {
  MCP_APP_CONTENT_SECURITY_POLICY,
  OPERATIONS_BRIEF_UI_URI,
} from '../../server/agents/mcp/appHtml';
import { RESOURCE_MIME_TYPE } from '../../server/agents/mcp/extApps';
import type { McpActor } from '../../server/agents/mcp/actor';

/**
 * Cap hari ini dalam zon waktu operasi (Asia/Kuala_Lumpur) supaya metrik
 * "Pesanan Hari Ini" stabil tanpa mengandungi tarikh yang dipalsukan.
 */
function todayInOperationTimeZone(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const nowIso = `${todayInOperationTimeZone()}T09:00:00.000+08:00`;

function seedStore(): PlatformStore {
  const store = new PlatformStore(':memory:');
  const orders: OrderRecord[] = [
    {
      id: 'ORD-HQ-1',
      customerId: 'usr_buyer_1',
      lines: [{ productId: 'PRD-1', name: 'Beras 5kg', quantity: 2, priceSen: 2400, publishedVersion: 1 }],
      amountSen: 4800,
      fulfilment: 'pickup',
      contactRef: 'budi',
      outletId: 'hq',
      fulfilmentStatus: 'dispatched',
      revision: 1,
      paymentState: 'verified',
      paidAmountSen: 4800,
      refundAmountSen: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ORD-KL-1',
      customerId: 'usr_buyer_2',
      lines: [{ productId: 'PRD-1', name: 'Beras 5kg', quantity: 1, priceSen: 2400, publishedVersion: 1 }],
      amountSen: 2400,
      fulfilment: 'delivery',
      contactRef: 'siti',
      outletId: 'kl',
      fulfilmentStatus: 'requested',
      revision: 1,
      paymentState: 'pending',
      paidAmountSen: 0,
      refundAmountSen: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
  for (const order of orders) store.save('orders', order);
  store.save('catalogue', {
    id: 'PRD-1',
    name: 'Beras 5kg',
    status: 'published',
    revision: 1,
  } as unknown as CatalogueProduct);
  store.save('lots', {
    id: 'LOT-1',
    productId: 'PRD-1',
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'HQ',
    quantity: 4,
    status: 'available',
    revision: 1,
  } as unknown as StockLot);
  store.save('hitl_actions', {
    id: 'HITL-1',
    status: 'pending_approval',
    actionType: 'refund',
    description: 'Refund Justo',
  });
  return store;
}

const founder: McpActor = {
  userId: 'usr_founder',
  workspaceId: 'business',
  role: 'founder',
  outletIds: ['hq'],
  membershipVersion: 1,
};

const staffHq: McpActor = {
  userId: 'usr_staff_hq',
  workspaceId: 'business',
  role: 'staff',
  outletIds: ['hq'],
  membershipVersion: 1,
};

const staffKualaLumpur: McpActor = {
  userId: 'usr_staff_kl',
  workspaceId: 'business',
  role: 'staff',
  outletIds: ['kl'],
  membershipVersion: 1,
};

const customer: McpActor = {
  userId: 'usr_buyer_1',
  workspaceId: 'business',
  role: 'customer',
  outletIds: [],
  membershipVersion: 1,
};

/** Pengangkutan yang mencatat traffic JSON-RPC untuk transcript. */
function loggingTransport(inner: Transport, log: string[], tag: string): Transport {
  return {
    get sessionId() {
      return inner.sessionId;
    },
    setProtocolVersion(version: string) {
      inner.setProtocolVersion?.(version);
    },
    async start() {
      await inner.start();
    },
    async send(message: JSONRPCMessage, options?: TransportSendOptions) {
      log.push(`${tag} ${JSON.stringify(message)}`);
      await inner.send(message, options);
    },
    async close() {
      await inner.close();
    },
    get onmessage() {
      return inner.onmessage;
    },
    set onmessage(handler) {
      inner.onmessage = handler;
    },
    get onclose() {
      return inner.onclose;
    },
    set onclose(handler) {
      inner.onclose = handler;
    },
    get onerror() {
      return inner.onerror;
    },
    set onerror(handler) {
      inner.onerror = handler;
    },
  };
}

async function connect(
  actor: McpActor,
  store: PlatformStore,
  log: string[],
): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createOperationsMcpServer({ actor, store });
  await server.connect(loggingTransport(serverSide, log, 'C->S'));
  const client = new Client({ name: 'abangcolek-test-client', version: '1.0.0' }, {
    capabilities: {},
  });
  await client.connect(loggingTransport(clientSide, log, 'S->C'));
  return client;
}

describe('MCP first-party server — protocol transcript', () => {
  test('initialize → tools/list → tools/call → resources/list → resources/read', async () => {
    const store = seedStore();
    const log: string[] = [];
    const client = await connect(founder, store, log);

    const tools = await client.listTools();
    expect(tools.tools.map(tool => tool.name).sort()).toEqual([
      'get_operations_brief',
      'get_order_status',
    ]);

    const called = await client.callTool({
      name: 'get_operations_brief',
      arguments: { period: 'daily' },
    });
    const briefText = (called.content as Array<{ type: string; text?: string }>)[0]?.text ?? '';
    const brief = JSON.parse(briefText) as {
      title: string;
      metrics: Array<{ label: string; value: string }>;
      readOnlyNotice: string;
    };
    expect(brief.readOnlyNotice).toBe('FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED');
    // Metrik mesti berasal daripada store, bukan pemalar tetap. Founder melihat
    // kedua-dua pesanan yang direkodkan hari ini.
    const pesananMetric = brief.metrics.find(metric => metric.label === 'Pesanan Hari Ini');
    expect(pesananMetric?.value).toBe('2');
    const kutipanMetric = brief.metrics.find(metric => metric.label === 'Kutipan Bersih (Sen)');
    expect(kutipanMetric?.value).toBe('4800');

    const resources = await client.listResources();
    const uris = resources.resources.map(resource => resource.uri).sort();
    expect(uris).toEqual([
      'operations://brief/daily',
      'operations://brief/urgent',
      'ui://abangcolek/operations-brief.html',
    ]);

    const uiResource = resources.resources.find(
      resource => resource.uri === 'ui://abangcolek/operations-brief.html',
    );
    expect(uiResource?.mimeType).toBe(RESOURCE_MIME_TYPE);

    const read = await client.readResource({ uri: 'ui://abangcolek/operations-brief.html' });
    const contents = read.contents as Array<{ mimeType?: string; text?: string; _meta?: unknown }>;
    expect(contents[0]?.mimeType).toBe(RESOURCE_MIME_TYPE);
    expect(contents[0]?.text).toContain(MCP_APP_CONTENT_SECURITY_POLICY);
    // Tiada sumber luaran dalam widget.
    expect(contents[0]?.text).not.toContain('http://');
    expect(contents[0]?.text).not.toContain('https://');

    const jsonRead = await client.readResource({ uri: 'operations://brief/daily' });
    const jsonContents = jsonRead.contents as Array<{ mimeType?: string; text?: string }>;
    expect(jsonContents[0]?.mimeType).toBe('application/json');
    const projection = JSON.parse(jsonContents[0]?.text ?? '{}') as Record<string, unknown>;
    // Unjuran mesti strict: hanya kunci yang parser klien terima.
    expect(Object.keys(projection).sort()).toEqual([
      'briefDate',
      'metrics',
      'readOnlyNotice',
      'revision',
      'source',
      'title',
    ]);

    await client.close();

    console.log('--- MCP protocol transcript (founder) ---');
    for (const line of log) console.log(line);
    console.log('--- end transcript ---');
  });

  test('metadata resource UI mengandungi csp MCP Apps sebenar', async () => {
    const store = seedStore();
    const client = await connect(founder, store, []);
    const resources = await client.listResources();
    const uiResource = resources.resources.find(
      resource => resource.uri === 'ui://abangcolek/operations-brief.html',
    );
    const meta = uiResource?._meta as { ui?: { csp?: { connectDomains?: string[] } } } | undefined;
    expect(meta?.ui?.csp?.connectDomains).toEqual([]);

    const tools = await client.listTools();
    const briefTool = tools.tools.find(tool => tool.name === 'get_operations_brief');
    const toolMeta = briefTool?._meta as Record<string, unknown> | undefined;
    expect(toolMeta?.['ui/resourceUri']).toBe('ui://abangcolek/operations-brief.html');
    expect((toolMeta?.ui as { resourceUri?: string } | undefined)?.resourceUri)
      .toBe('ui://abangcolek/operations-brief.html');

    await client.close();
  });
});

describe('MCP role scoping', () => {
  test('staf outlet lain tidak boleh membaca pesanan luar skop', async () => {
    const store = seedStore();
    const client = await connect(staffHq, store, []);
    const result = await client.callTool({
      name: 'get_order_status',
      arguments: { orderId: 'ORD-KL-1' },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text?: string }>)[0]?.text ?? '';
    expect(text).toContain('FORBIDDEN');

    const allowed = await client.callTool({
      name: 'get_order_status',
      arguments: { orderId: 'ORD-HQ-1' },
    });
    expect(allowed.isError).toBeFalsy();
    await client.close();
  });

  test('founder boleh membaca mana-mana pesanan', async () => {
    const store = seedStore();
    const client = await connect(founder, store, []);
    const result = await client.callTool({
      name: 'get_order_status',
      arguments: { orderId: 'ORD-KL-1' },
    });
    expect(result.isError).toBeFalsy();
    await client.close();
  });

  test('pelanggan tidak boleh meminta taklimat operasi', async () => {
    const store = seedStore();
    const client = await connect(customer, store, []);
    const result = await client.callTool({
      name: 'get_operations_brief',
      arguments: {},
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text?: string }>)[0]?.text ?? '';
    expect(text).toContain('FORBIDDEN');
    await client.close();
  });

  test('taklimat staf hanya mengira pesanan outlet sendiri', async () => {
    const store = seedStore();
    const client = await connect(staffKualaLumpur, store, []);
    const called = await client.callTool({
      name: 'get_operations_brief',
      arguments: { period: 'daily' },
    });
    const text = (called.content as Array<{ text?: string }>)[0]?.text ?? '';
    const brief = JSON.parse(text) as { metrics: Array<{ label: string; value: string }> };
    const pesanan = brief.metrics.find(metric => metric.label === 'Pesanan Hari Ini');
    // Chow Kit merangkumi HANYA pesanan outlet KL (ORD-KL-1).
    expect(pesanan?.value).toBe('1');
    const kutipan = brief.metrics.find(metric => metric.label === 'Kutipan Bersih (Sen)');
    expect(kutipan?.value).toBe('0');
    await client.close();
  });
});

describe('MCP HTTP entry', () => {
  test('initialize → tools/list melalui HTTP, sesi terikat pada actor', async () => {
    const store = seedStore();
    const handler = createMcpHttpHandler({
      resolveActor: async () => founder,
      createServer: actor => createOperationsMcpServer({ actor, store }),
    });

    const initialize = await handler(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'abangcolek-test-client', version: '1.0.0' },
        },
      }),
    }));

    expect(initialize.status).toBe(200);
    const sessionId = initialize.headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();
    const initBody = await initialize.json() as {
      result: { protocolVersion: string; serverInfo: { name: string } };
    };
    expect(initBody.result.serverInfo.name).toBe('abangcolek-operations-mcp');

    const listTools = await handler(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'mcp-session-id': sessionId ?? '',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    }));
    expect(listTools.status).toBe(200);
    const toolsBody = await listTools.json() as { result: { tools: Array<{ name: string }> } };
    expect(toolsBody.result.tools.map(tool => tool.name).sort()).toEqual([
      'get_operations_brief',
      'get_order_status',
    ]);

    await handler(new Request('http://localhost/api/mcp', {
      method: 'DELETE',
      headers: { 'mcp-session-id': sessionId ?? '' },
    }));
  });

  test('badan permintaan yang membawa identiti ditolak', async () => {
    const store = seedStore();
    const handler = createMcpHttpHandler({
      resolveActor: async () => founder,
      createServer: actor => createOperationsMcpServer({ actor, store }),
    });

    const response = await handler(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'get_order_status',
          arguments: { orderId: 'ORD-HQ-1' },
          actor: { userId: 'usr_attacker', role: 'founder' },
        },
      }),
    }));

    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain('actor');
  });

  test('permintaan tanpa sesi ditolak', async () => {
    const store = seedStore();
    const handler = createMcpHttpHandler({
      resolveActor: async () => founder,
      createServer: actor => createOperationsMcpServer({ actor, store }),
    });

    const response = await handler(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} }),
    }));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('mcp-session-id');
  });

  test('actor tanpa sesi server ditolak sebelum protokol diproses', async () => {
    const store = seedStore();
    const handler = createMcpHttpHandler({
      resolveActor: async () => {
        const { McpAccessError } = await import('../../server/agents/mcp/actor');
        throw new McpAccessError('UNAUTHENTICATED', 401, 'Sesi tidak dijumpai.');
      },
      createServer: actor => createOperationsMcpServer({ actor, store }),
    });

    const response = await handler(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/list', params: {} }),
    }));

    expect(response.status).toBe(401);
    expect(await response.text()).toContain('UNAUTHENTICATED');
  });
});
