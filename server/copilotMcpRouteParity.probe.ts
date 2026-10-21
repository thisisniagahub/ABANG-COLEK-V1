/**
 * ABANGCOLEK-PLATFORM — Probe pariti laluan MCP first-party (CPK-01)
 *
 * Harness bukti untuk pariti laluan `/api/copilot-mcp` (kanonikal first-party,
 * blueprint §5.1) dengan `/api/mcp` (compatibility facade). Ia bukan ujian unit:
 * ia memulakan pendengar HTTP SEBENAR (Bun.serve) yang dilengkapi dengan
 *
 *  - `createLocalRouter` SEBENAR daripada `server/index.ts` — routing yang
 *    sama seperti pelayan dev tempatan,
 *  - pengendali MCP SEBENAR daripada `api/mcp.ts` melalui import malas
 *    selepas `PLATFORM_DATABASE_PATH` ditetapkan (urutan yang sama seperti
 *    `server/index.ts`), dan
 *  - aplikasi platform SEBENAR (`createPlatformApp`) sebagai fall-through,
 *    supaya nombor "sebelum" laluan yang belum dipasang ialah tingkah laku
 *    sebenar hari ini, bukan stub.
 *
 * Yang dibuktikan: status, content-type dan badan yang serupa antara kedua-dua
 * laluan bagi descriptor GET, initialize POST tanpa sesi (401 ditaip),
 * surface GET tanpa sesi, DELETE tanpa header sesi dan subpath; serta bahawa
 * `api/copilot-mcp` mengekspor OBJEK pengendali yang sama seperti `api/mcp`
 * (satu implementasi, bukan salinan protocol code).
 *
 * Yang TIDAK dibuktikan di sini: framing SSE bagi initialize dengan sesi sah —
 * sesi hanya boleh lahir daripada log masuk sebenar dan probe ini tidak
 * memegang kredensial sesiapa. Pariti framing SSE dijamin secara struktur
 * oleh identiti objek pengendali (fungsi yang sama) dan tingkah laku framing
 * itu sendiri diuji oleh `tests/platform/mcp-protocol.test.ts`.
 *
 * HARNESS INI TIDAK DITEMUI AUTOMATIK oleh `bun test` (nama fail tidak
 * sepadan dengan corak `*.test.ts`) dan ia `skip` secara lalai. Ia hanya
 * berjalan apabila `ABANGCOLEK_ROUTE_PARITY_PROBE=1` hadir, kerana ia membuka
 * pangkalan data dev dan mengikat soket tempatan.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLocalRouter } from './index';
import { createPlatformApp } from './platform/app';

const PROBE_ENABLED = process.env.ABANGCOLEK_ROUTE_PARITY_PROBE === '1';

/**
 * Pangkalan data dev kanonikal — fail yang sama yang dibuka oleh pelayan dev
 * (`server/index.ts`). Probe ini TIDAK mengwujudkannya: checkout tanpa
 * pangkalan data dev mesti menjalankan pelayan dev sekali dahulu, dan probe
 * gagal kuat supaya tiada bukti diambil daripada keadaan yang tidak wujud.
 */
const DATABASE_PATH = resolve(process.cwd(), 'var/lib/platform/platform.sqlite');

interface ProbeCapture {
  route: string;
  status: number;
  contentType: string;
  body: string;
}

const captures: ProbeCapture[] = [];

async function probe(base: string, route: string, init?: RequestInit): Promise<ProbeCapture> {
  const response = await fetch(`${base}${route}`, init);
  const capture: ProbeCapture = {
    route,
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    body: await response.text(),
  };
  captures.push(capture);
  const method = init?.method ?? 'GET';
  console.log(`[PARITI-MCP] ${method} ${route} -> ${capture.status} ${capture.contentType}`);
  console.log(capture.body);
  return capture;
}

/**
 * Badan initialize MCP yang sah — bentuk yang sama seperti
 * `tests/platform/mcp-protocol.test.ts`, supaya probe menghantar kontrak
 * sebenar dan bukan badan reka-reka.
 */
const INITIALIZE_BODY = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'route-parity-probe', version: '0.0.0' },
  },
});

const postInitialize = (): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: INITIALIZE_BODY,
});

const deleteWithoutSessionHeader = (): RequestInit => ({ method: 'DELETE' });

/** Samakan status, content-type dan badan byte-demi-byte antara kedua-dua laluan. */
function expectIdentical(facade: ProbeCapture, canonical: ProbeCapture): void {
  expect(canonical.status).toBe(facade.status);
  expect(canonical.contentType).toBe(facade.contentType);
  expect(canonical.body).toBe(facade.body);
}

describe.skipIf(!PROBE_ENABLED)('Probe pariti laluan MCP (/api/copilot-mcp vs /api/mcp)', () => {
  let app!: ReturnType<typeof createPlatformApp>;
  let server!: ReturnType<typeof Bun.serve>;
  let base = '';

  beforeAll(async () => {
    if (!existsSync(DATABASE_PATH)) {
      throw new Error(
        `Pangkalan data dev tidak wujud di ${DATABASE_PATH}. `
        + 'Jalankan pelayan dev sekali dahulu; probe ini tidak mengwujudkan keadaan yang tidak ada.',
      );
    }
    // Urutan yang sama seperti server/index.ts: pangkalan data kanonikal
    // ditetapkan SEBELUM modul MCP diimport kerana api/mcp membacanya semasa load.
    process.env.PLATFORM_DATABASE_PATH = DATABASE_PATH;
    app = createPlatformApp({
      databasePath: DATABASE_PATH,
      allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      backupScheduler: false,
      log: () => {},
    });
    const mcpModule = await import('../api/mcp');
    const mcpEntry: { fetch: (request: Request) => Promise<Response> } = mcpModule.default;
    const route = createLocalRouter({
      platform: request => app.fetch(request),
      runtimeIdentity: () => new Response(
        JSON.stringify({ ok: true, code: 'RUNTIME_IDENTITY_NOT_PROBED' }),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      ),
      copilotKit: () => new Response(
        JSON.stringify({ ok: false, code: 'COPILOTKIT_NOT_PROBED' }),
        { status: 501, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      ),
      mcp: request => mcpEntry.fetch(request),
    });
    server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: route });
    base = `http://127.0.0.1:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
    app?.close();
    console.log(
      '[PARITI-MCP-SUMMARY] '
      + JSON.stringify(captures.map(({ route, status, contentType }) => ({ route, status, contentType }))),
    );
  });

  test('descriptor GET: /api/copilot-mcp serupa /api/mcp (status, content-type, badan)', async () => {
    const facade = await probe(base, '/api/mcp');
    const canonical = await probe(base, '/api/copilot-mcp');
    // Kesan kawalan: laluan facade mesti benar-benar sihat; "pariti" antara
    // dua laluan yang sama-sama rosak tidak membuktikan apa-apa.
    expect(facade.status).toBe(200);
    const descriptor = JSON.parse(facade.body) as Record<string, unknown>;
    expect(descriptor.transport).toBe('streamable-http');
    expect(descriptor.identity).toBe('server-session-only');
    expectIdentical(facade, canonical);
  });

  test('initialize POST tanpa sesi: 401 ditaip yang serupa (UNAUTHENTICATED)', async () => {
    const facade = await probe(base, '/api/mcp', postInitialize());
    const canonical = await probe(base, '/api/copilot-mcp', postInitialize());
    expect(facade.status).toBe(401);
    const payload = JSON.parse(facade.body) as { error?: { data?: { code?: string } } };
    expect(payload.error?.data?.code).toBe('UNAUTHENTICATED');
    expectIdentical(facade, canonical);
  });

  test('surface=sandbox GET tanpa sesi: 401 ditaip yang serupa', async () => {
    const facade = await probe(base, '/api/mcp?surface=sandbox');
    const canonical = await probe(base, '/api/copilot-mcp?surface=sandbox');
    expect(facade.status).toBe(401);
    const payload = JSON.parse(facade.body) as { ok?: boolean; code?: string };
    expect(payload.code).toBe('UNAUTHENTICATED');
    expectIdentical(facade, canonical);
  });

  test('DELETE tanpa header mcp-session-id: 400 JSON-RPC yang serupa', async () => {
    const facade = await probe(base, '/api/mcp', deleteWithoutSessionHeader());
    const canonical = await probe(base, '/api/copilot-mcp', deleteWithoutSessionHeader());
    expect(facade.status).toBe(400);
    const payload = JSON.parse(facade.body) as { error?: { code?: number } };
    expect(payload.error?.code).toBe(-32000);
    expectIdentical(facade, canonical);
  });

  test('subpath sampai ke pengendali MCP yang sama, serupa dengan /api/mcp/<segmen>', async () => {
    const facade = await probe(base, '/api/mcp/probe-subpath');
    const canonical = await probe(base, '/api/copilot-mcp/probe-subpath');
    expect(facade.status).toBe(200);
    expectIdentical(facade, canonical);
  });

  test('NEGATIF laluan mirip /api/copilot-mcpX TIDAK dibawa ke pengendali MCP', async () => {
    const lookalike = await probe(base, '/api/copilot-mcpX');
    expect(lookalike.status).toBe(404);
    const payload = JSON.parse(lookalike.body) as { code?: string };
    expect(payload.code).toBe('NOT_FOUND');
  });

  test('api/copilot-mcp mengekspor OBJEK pengendali yang SAMA seperti api/mcp', async () => {
    const facadeModule = await import('../api/mcp');
    const canonicalModule = await import('../api/copilot-mcp');
    expect(canonicalModule.default).toBe(facadeModule.default);
  });
});
