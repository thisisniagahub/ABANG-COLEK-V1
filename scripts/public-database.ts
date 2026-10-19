import { Database } from 'bun:sqlite';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SupabaseSnapshotRepository, type SnapshotRepository } from '../server/platform/supabasePersistence';

/** Reads a build snapshot without initializing business data or changing its source. */
export async function withPublicDatabase<T>(
  localPath: string,
  environment: Record<string, string | undefined>,
  project: (database: Database | null) => T,
  loadSnapshot?: SnapshotRepository['load'],
): Promise<T> {
  const url = environment.SUPABASE_URL?.trim();
  const key = (environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (Boolean(url) !== Boolean(key)) throw new Error('Incomplete cloud configuration for public catalogue build.');
  let directory: string | undefined;
  let database: Database | undefined;
  try {
    let path = localPath;
    if (url && key) {
      const snapshot = await (loadSnapshot ?? (() => new SupabaseSnapshotRepository(url, key, environment.PLATFORM_WORKSPACE_ID ?? 'business').load()))();
      if (snapshot.bytes === null) return project(null);
      directory = mkdtempSync(join(tmpdir(), 'abangcolek-public-'));
      path = join(directory, 'snapshot.sqlite');
      writeFileSync(path, snapshot.bytes, { mode: 0o600 });
    } else if (!existsSync(path)) return project(null);
    database = new Database(path, { readonly: true, strict: true });
    return await project(database);
  } catch (error) {
    // Provider errors can carry request details; never print server credentials in builds.
    if (url && key) throw new Error('Public catalogue snapshot unavailable. Verify cloud configuration and migration.');
    throw error;
  } finally {
    try { database?.close(); }
    finally { if (directory) rmSync(directory, { recursive: true, force: true }); }
  }
}
