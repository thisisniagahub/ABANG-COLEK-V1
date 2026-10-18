import { describe, expect, test } from 'bun:test';
import { createProductionHandler, MAXIMUM_REQUEST_BYTES } from '../../api/platform';

describe('Vercel platform boundary', () => {
  test('slow request bodies time out before reaching persistence', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    const handler = createProductionHandler({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' }, 10);
    const response = await handler(new Request('https://abangcolek.gangniaga.my/api/platform/evidence', { method: 'POST', body: stream }));
    expect(response.status).toBe(408);
    expect(cancelled).toBe(true);
  });
  test('missing configuration fails closed without exposing credentials', async () => {
    const response = await createProductionHandler({ SUPABASE_SERVICE_ROLE_KEY: 'private-test-secret' })(new Request('https://abangcolek.gangniaga.my/api/platform/catalogue'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-test-secret');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  test('refuses invalid origins before constructing the runtime', async () => {
    const response = await createProductionHandler({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret', PLATFORM_ALLOWED_ORIGINS: 'https://trusted.test/path' })(new Request('https://abangcolek.gangniaga.my/api/platform/catalogue'));
    expect(response.status).toBe(503);
  });
  test('does not route unrelated paths into the platform', async () => {
    expect((await createProductionHandler({})(new Request('https://abangcolek.gangniaga.my/unknown'))).status).toBe(404);
  });
  test('rejects oversized requests before persistence', async () => {
    const response = await createProductionHandler({})(new Request('https://abangcolek.gangniaga.my/api/platform/evidence', { method: 'POST', headers: { 'content-length': String(MAXIMUM_REQUEST_BYTES + 1) }, body: 'x' }));
    expect(response.status).toBe(413);
  });
  test('counts streamed bytes when content-length is absent', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new Uint8Array(MAXIMUM_REQUEST_BYTES + 1));
      controller.close();
    } });
    const response = await createProductionHandler({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' })(new Request('https://abangcolek.gangniaga.my/api/platform/evidence', { method: 'POST', body: stream }));
    expect(response.status).toBe(413);
  });});
