import { dirname, join, resolve } from 'node:path';
import { existsSync, lstatSync } from 'node:fs';
import { backupPlatform, restorePlatform } from '../server/platform/backup';
import { BackupScheduler } from '../server/platform/backupScheduler';
import { PlatformStore } from '../server/platform/store';

const [operation, source, destination] = process.argv.slice(2);
const validOps = ['backup', 'restore', 'status', 'rpo', 'schedule'];
if (!validOps.includes(operation) || !source) {
  throw new Error('Usage: bun scripts/platform-backup.ts backup DATABASE NEW_SNAPSHOT_DIRECTORY | restore SNAPSHOT_DIRECTORY NEW_RESTORE_DIRECTORY | status DATABASE | rpo DATABASE | schedule DATABASE [SNAPSHOT_DIRECTORY]');
}

if (operation === 'restore') {
  if (!destination) throw new Error('Usage: bun scripts/platform-backup.ts restore SNAPSHOT_DIRECTORY NEW_RESTORE_DIRECTORY');
  const result = restorePlatform(source, destination);
  console.info(`Verified restore: ${result.recordCount} records, ${result.files.length} files. Active runtime has not been changed.`);
} else if (operation === 'backup') {
  if (!destination) throw new Error('Usage: bun scripts/platform-backup.ts backup DATABASE NEW_SNAPSHOT_DIRECTORY');
  const database = resolve(source);
  if (!existsSync(database) || !lstatSync(database).isFile()) throw new Error('Existing source database is required.');
  const store = new PlatformStore(database);
  try {
    const result = backupPlatform(store, join(dirname(database), 'evidence'), destination);
    console.info(`Verified snapshot: ${result.recordCount} records, ${result.files.length} files.`);
  } finally {
    store.close();
  }
} else {
  const database = resolve(source);
  if (!existsSync(database) || !lstatSync(database).isFile()) throw new Error('Existing source database is required.');
  const store = new PlatformStore(database);
  try {
    const scheduler = new BackupScheduler(store, {
      evidenceDirectory: join(dirname(database), 'evidence'),
      snapshotsDirectory: destination ? resolve(destination) : join(dirname(database), 'backups'),
      autoStart: false,
    });
    if (operation === 'status' || operation === 'rpo') {
      const rpo = scheduler.checkRpoStatus();
      console.info(JSON.stringify({ operation, rpo, lock: scheduler.getLockInfo(), snapshots: scheduler.listSnapshots().length }, null, 2));
    } else if (operation === 'schedule') {
      await scheduler.runBackup('cli_schedule');
      const latest = scheduler.listSnapshots()[0];
      console.info(`Verified scheduled snapshot: ${latest.id}, records: ${latest.recordCount}, sha256: ${latest.databaseSha256}`);
    }
  } finally {
    store.close();
  }
}
