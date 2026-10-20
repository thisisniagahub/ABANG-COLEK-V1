/**
 * Browser-level tests for the parts of the intelligence layer that only exist
 * in the browser: the WebMCP support probe and the local inspector client.
 *
 * These live outside `tests/platform` because they exercise browser seams
 * (storage, `import.meta.env`, fetch) rather than the platform store.
 */

import { describe, expect, test } from 'bun:test';
import {
  probeWebMcpSupport,
  grantWebMcp,
  revokeWebMcp,
  readWebMcpGrant,
  defaultWebMcpGrant,
  WEB_MCP_GRANT_STORAGE_KEY,
} from '../../src/features/intelligence/webmcpProbe';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe('EXT-05 — WebMCP browser probe', () => {
  test('a browser without the Model Context Protocol API is typed unavailable', () => {
    const result = probeWebMcpSupport({ navigator: {}, window: {} });
    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.reasonCode).toBe('WEBMCP_BROWSER_UNSUPPORTED');
      expect(result.reason).toContain('modelContext');
    }
  });

  test('a browser that exposes modelContext.registerTool is reported as supported', () => {
    const result = probeWebMcpSupport({
      navigator: { modelContext: { registerTool: () => undefined } },
    });
    expect(result.supported).toBe(true);
    if (result.supported) expect(result.api).toBe('navigator.modelContext');
  });

  test('an object without registerTool is not treated as support', () => {
    const result = probeWebMcpSupport({ navigator: { modelContext: {} } });
    expect(result.supported).toBe(false);
  });

  test('the grant defaults to refused and can be given and revoked', () => {
    const storage = memoryStorage();
    expect(readWebMcpGrant(storage)).toEqual(defaultWebMcpGrant());
    const granted = grantWebMcp(storage);
    expect(granted.granted).toBe(true);
    expect(storage.getItem(WEB_MCP_GRANT_STORAGE_KEY)).toContain('granted');
    expect(readWebMcpGrant(storage).granted).toBe(true);
    const revoked = revokeWebMcp(storage);
    expect(revoked.granted).toBe(false);
    expect(readWebMcpGrant(storage).granted).toBe(false);
  });
});
