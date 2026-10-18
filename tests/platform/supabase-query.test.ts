import { expect, test } from 'bun:test';
import { executeSupabaseQuery } from '../../src/services/pluginExecutors';
test('missing cloud configuration cannot fabricate successful query rows', async () => {
  const result = await executeSupabaseQuery({ table: 'orders' });
  expect(result.success).toBe(false);
  expect(result.data.rows).toEqual([]);
  expect(result.data.rowCount).toBe(0);
  expect(result.message).toContain('tidak dapat disahkan');
});
