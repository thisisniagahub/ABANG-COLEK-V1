import { expect, test } from 'bun:test';
import { checkSupabaseConnection, requireSupabaseClient, supabaseStatus } from '../../src/services/supabaseClient';
test('unconfigured cloud is explicitly unavailable to legacy callers', async () => {
  expect(supabaseStatus.available).toBe(false);
  expect(() => requireSupabaseClient()).toThrow('cloud');
  const health = await checkSupabaseConnection();
  expect(health.isConnected).toBe(false);
  expect(health.error).toContain('cloud');
});
