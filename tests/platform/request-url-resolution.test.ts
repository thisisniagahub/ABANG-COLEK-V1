/**
 * `resolveRequestUrl` — lapisan kedua terhadap URL relatif daripada Vercel.
 *
 * Sebahagian laluan Vercel menghantar `request.url` sebagai pathname sahaja
 * (`/api/copilotkit`). `new URL(request.url)` melontar `TypeError: Invalid
 * URL` pada URL relatif, dan `api/copilotkit.ts` memerlukan URL mutlak untuk
 * memulihkan laluan daripada parameter `__route`. Kesannya setiap laluan
 * CopilotKit membalas 500 di produksi (disahkan pada 2026-10-22).
 *
 * Helper ini memastikan URL mutlakSentiasa boleh dibina, dengan host dan
 * protokol daripada header permintaan apabila ia tersedia.
 */

import { describe, expect, test } from 'bun:test';
import { resolveRequestUrl } from '../../server/platform/requestUrl';

/** Request palsu dengan `url` dan `headers` yang ditetapkan manual. */
function fakeRequest(url: string, headers: Record<string, string> = {}): Request {
  const request = Object.create(Request.prototype) as Request;
  Object.defineProperty(request, 'url', { value: url });
  Object.defineProperty(request, 'headers', { value: new Headers(headers) });
  Object.defineProperty(request, 'method', { value: 'POST' });
  return request;
}

describe('resolveRequestUrl', () => {
  test('URL mutlak dikembalikan tanpa perubahan', () => {
    const url = resolveRequestUrl(
      fakeRequest('https://abangcolek.gangniaga.my/api/copilotkit?__route=agent/x/run')
    );
    expect(url.href).toBe(
      'https://abangcolek.gangniaga.my/api/copilotkit?__route=agent/x/run'
    );
    expect(url.pathname).toBe('/api/copilotkit');
  });

  test('URL relatif TIDAK melontar — digabungkan dengan header host', () => {
    const url = resolveRequestUrl(
      fakeRequest('/api/copilotkit', { host: 'abangcolek.gangniaga.my' })
    );
    expect(url.hostname).toBe('abangcolek.gangniaga.my');
    expect(url.pathname).toBe('/api/copilotkit');
  });

  test('URL relatif dengan x-forwarded-host dan x-forwarded-proto digunakan', () => {
    const url = resolveRequestUrl(
      fakeRequest('/api/copilotkit', {
        'x-forwarded-host': 'abangcolek.gangniaga.my',
        'x-forwarded-proto': 'https',
      })
    );
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('abangcolek.gangniaga.my');
  });

  test('URL relatif tanpa host langsung tidak melontar (fallback parsing)', () => {
    const url = resolveRequestUrl(fakeRequest('/api/copilotkit'));
    // Tanpa host, origin fallback `http://localhost` digunakan dan pathname
    // asal dikekalkan — yang penting ialah TIDAK melontar.
    expect(url.pathname).toBe('/api/copilotkit');
    expect(url.hostname).toBe('localhost');
  });

  test('searchParams boleh dibaca pada URL relatif yang dipulihkan', () => {
    const url = resolveRequestUrl(
      fakeRequest('/api/copilotkit?__route=agent/x/run', { host: 'example.test' })
    );
    expect(url.searchParams.get('__route')).toBe('agent/x/run');
  });

  test('pathname relatif dengan query sahaja tidak melontar', () => {
    const url = resolveRequestUrl(
      fakeRequest('/api/copilotkit?surface=chat', { host: 'example.test' })
    );
    expect(url.searchParams.get('surface')).toBe('chat');
  });
});
