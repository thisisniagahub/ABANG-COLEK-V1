import { describe, expect, test } from 'bun:test';
import { pluginManager } from '../../src/services/pluginService';

describe('Plugin service runs outside the browser', () => {
  test('loading and saving plugins does not throw when localStorage is absent', () => {
    // Runtime ini (Bun/SSR) tiada `localStorage`. Rujukan terus akan meletup
    // ReferenceError; service mesti kembali ke senarai awal dengan tenang.
    expect(typeof localStorage).toBe('undefined');

    expect(pluginManager.getAll().length).toBeGreaterThan(0);
    expect(() => pluginManager.recordUsage('nonexistent-plugin-id')).not.toThrow();
  });
});
