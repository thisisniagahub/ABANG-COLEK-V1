import { describe, expect, test } from 'bun:test';
import { initializeSupabase } from '../../src/services/supabaseConfiguration';
describe('optional Supabase configuration', () => {
  test('absent or whitespace key cannot crash startup', () => {
    for (const key of [undefined, '', '   ']) {
      const result = initializeSupabase('https://example.supabase.co', key);
      expect(result.client).toBeNull();
      expect(result.status.available).toBe(false);
      expect(result.status.message).toContain('cloud');
    }
  });
  test('invalid URL becomes unavailable without leaking the supplied key', () => {
    const result = initializeSupabase('not-a-url', 'private-test-value');
    expect(result.client).toBeNull();
    expect(result.status.available).toBe(false);
    expect(result.status.message).not.toContain('private-test-value');
  });
  test('valid configuration preserves the actual integration', () => {
    const result = initializeSupabase('https://example.supabase.co', 'sb_publishable_testvalue');
    expect(result.status.available).toBe(true);
    expect(result.client).not.toBeNull();
    expect(typeof result.client?.auth.signInWithOAuth).toBe('function');
  });
});
