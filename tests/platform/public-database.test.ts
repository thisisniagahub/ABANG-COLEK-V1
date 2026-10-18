import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withPublicDatabase } from '../../scripts/public-database';

const cloud = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'private-test-key' };
function databaseBytes() {
  const database = new Database(':memory:');
  database.run('CREATE TABLE published(value TEXT); INSERT INTO published VALUES (\'remote\')');
  const bytes = database.serialize(); database.close(); return bytes;
}

test('cloud snapshot is read-only and removed after projection', async () => {
  let temporaryFile = '';
  const result = await withPublicDatabase('/missing-local', cloud, database => {
    temporaryFile = database!.query<{file:string}, []>('PRAGMA database_list').get()!.file;
    expect(existsSync(temporaryFile)).toBe(true);
    expect(() => database!.run('DELETE FROM published')).toThrow();
    return database!.query<{value:string}, []>('SELECT value FROM published').get()!.value;
  }, async () => ({ revision: 1, bytes: databaseBytes() }));
  expect(result).toBe('remote'); expect(existsSync(temporaryFile)).toBe(false);
});

test('cloud absence is explicit and unavailable cloud never falls back locally', async () => {
  expect(await withPublicDatabase('/missing-local', cloud, database => database, async () => ({ revision: 0, bytes: null }))).toBeNull();
  let called = false;
  await expect(withPublicDatabase('/missing-local', cloud, () => { called = true; }, async () => { throw Error('private-test-key'); })).rejects.toThrow('Public catalogue snapshot unavailable');
  expect(called).toBe(false);
  await expect(withPublicDatabase('/missing-local', { SUPABASE_URL: cloud.SUPABASE_URL }, () => null)).rejects.toThrow('Incomplete cloud configuration');
});

test('cleanup also runs after projection failure', async () => {
  let temporaryFile = '';
  await expect(withPublicDatabase('/missing-local', cloud, database => {
    temporaryFile = database!.query<{file:string}, []>('PRAGMA database_list').get()!.file;
    throw Error('projection failed');
  }, async () => ({ revision: 1, bytes: databaseBytes() }))).rejects.toThrow();
  expect(existsSync(temporaryFile)).toBe(false);
});

test('unconfigured builds retain local read-only behavior without creating a database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'public-source-test-'));
  try {
    const path = join(directory, 'local.sqlite');
    expect(await withPublicDatabase(path, {}, database => database)).toBeNull();
    expect(existsSync(path)).toBe(false);
    const local = new Database(path); local.run('CREATE TABLE marker(value INTEGER); INSERT INTO marker VALUES (7)'); local.close();
    expect(await withPublicDatabase(path, {}, database => database!.query<{value:number}, []>('SELECT value FROM marker').get()!.value)).toBe(7);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
