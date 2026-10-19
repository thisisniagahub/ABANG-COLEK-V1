import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { backupPlatform, type BackupManifest } from './backup';
import { DomainError, type PlatformStore, now } from './store';

export const DEFAULT_RPO_HOURS = 4;
export const DEFAULT_BACKUP_INTERVAL_MS = DEFAULT_RPO_HOURS * 60 * 60 * 1000; // 4 hours in ms
export const DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_RETENTION_COUNT = 6; // Retain at least 24 hours of 4-hour snapshots
export const LOCK_KEY = 'backup_scheduler';
export const SNAPSHOT_RECORD_KIND = 'backup_snapshots';

export interface BackupSchedulerOptions {
  intervalMs?: number;
  maxRpoHours?: number;
  evidenceDirectory?: string;
  snapshotsDirectory?: string;
  retentionCount?: number;
  autoStart?: boolean;
  workerId?: string;
  lockTtlMs?: number;
  onBackupComplete?: (manifest: BackupManifest, record: SnapshotRecord) => void;
  onBackupError?: (error: unknown) => void;
}

export interface SnapshotRecord {
  id: string;
  destination: string;
  createdAt: string;
  recordCount: number;
  databaseSha256: string;
  manifestSha256: string;
  files: { name: string; sha256: string; size: number }[];
  status: 'verified' | 'failed';
  trigger: 'scheduled' | 'manual' | string;
  pruned?: boolean;
  error?: string;
}

export interface RpoStatus {
  compliant: boolean;
  maxRpoHours: number;
  elapsedSeconds: number | null;
  lastBackupAt: string | null;
  status: 'compliant' | 'violation' | 'no_snapshot';
  reasonCode: 'RPO_COMPLIANT' | 'RPO_VIOLATION_STALE_BACKUP' | 'RPO_NO_SNAPSHOT_RECORD';
}

export interface SchedulerLockInfo {
  isLocked: boolean;
  ownerId: string | null;
  acquiredAt: string | null;
  expiresAt: string | null;
}

export interface SchedulerStatus {
  running: boolean;
  intervalMs: number;
  maxRpoHours: number;
  rpo: RpoStatus;
  lock: SchedulerLockInfo;
  lastSnapshot: SnapshotRecord | null;
  totalSnapshots: number;
  snapshotsDirectory: string;
}

interface LockRecord {
  id: string;
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
}

/**
 * Automates Disaster Recovery (DR-01) with consistent SQLite Online Backup,
 * atomic periodic lock registration, SHA-256 snapshot retention, and RPO <= 4h enforcement.
 */
export class BackupScheduler {
  readonly intervalMs: number;
  readonly maxRpoHours: number;
  readonly evidenceDirectory: string;
  readonly snapshotsDirectory: string;
  readonly retentionCount: number;
  readonly workerId: string;
  readonly lockTtlMs: number;

  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private onBackupComplete?: (manifest: BackupManifest, record: SnapshotRecord) => void;
  private onBackupError?: (error: unknown) => void;

  constructor(readonly store: PlatformStore, options: BackupSchedulerOptions = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULT_BACKUP_INTERVAL_MS;
    this.maxRpoHours = options.maxRpoHours ?? DEFAULT_RPO_HOURS;
    this.evidenceDirectory = options.evidenceDirectory ?? 'var/lib/platform/evidence';
    this.snapshotsDirectory = options.snapshotsDirectory ?? 'var/lib/platform/backups';
    this.retentionCount = options.retentionCount ?? DEFAULT_RETENTION_COUNT;
    this.workerId = options.workerId ?? `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
    this.lockTtlMs = options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
    this.onBackupComplete = options.onBackupComplete;
    this.onBackupError = options.onBackupError;

    if (options.autoStart) {
      this.start();
    }
  }

  /**
   * Periodic lock registration (pendaftaran lock berkala).
   * Ensures mutual exclusion for backup operations across processes/workers.
   * Auto-recovers if a previous lock holder's lease expired.
   */
  acquireLock(workerId = this.workerId): boolean {
    return this.store.atomic(() => {
      const current = this.store.get<LockRecord>('locks', LOCK_KEY);
      const currentTime = new Date().toISOString();

      if (current) {
        if (current.expiresAt > currentTime && current.ownerId !== workerId) {
          return false; // Valid lock is held by another worker
        }
      }

      const expiresAt = new Date(Date.now() + this.lockTtlMs).toISOString();
      this.store.save('locks', {
        id: LOCK_KEY,
        ownerId: workerId,
        acquiredAt: currentTime,
        expiresAt,
      });
      return true;
    });
  }

  /**
   * Releases the periodic backup lock if held by the given worker.
   */
  releaseLock(workerId = this.workerId): boolean {
    return this.store.atomic(() => {
      const current = this.store.get<LockRecord>('locks', LOCK_KEY);
      if (!current) return true;
      if (current.ownerId === workerId) {
        this.store.delete('locks', LOCK_KEY);
        return true;
      }
      return false;
    });
  }

  /**
   * Inspects current lock status.
   */
  getLockInfo(): SchedulerLockInfo {
    const current = this.store.get<LockRecord>('locks', LOCK_KEY);
    const currentTime = new Date().toISOString();
    const isLocked = Boolean(current && current.expiresAt > currentTime);

    return {
      isLocked,
      ownerId: isLocked ? current!.ownerId : null,
      acquiredAt: isLocked ? current!.acquiredAt : null,
      expiresAt: isLocked ? current!.expiresAt : null,
    };
  }

  /**
   * Executes a consistent SQLite online snapshot immediately with exclusive lock registration,
   * calculates cryptographic SHA-256 digests, and stores an immutable snapshot record.
   */
  async runBackup(trigger: 'scheduled' | 'manual' | string = 'manual'): Promise<SnapshotRecord> {
    const acquired = this.acquireLock(this.workerId);
    if (!acquired) {
      const lockInfo = this.getLockInfo();
      throw new DomainError('BACKUP_LOCK_HELD', 409, `Sandaran sedang berjalan oleh pekerja ${lockInfo.ownerId ?? 'lain'}.`);
    }

    try {
      mkdirSync(this.snapshotsDirectory, { recursive: true });
      mkdirSync(this.evidenceDirectory, { recursive: true });

      const timestamp = new Date().toISOString();
      const folderName = `snapshot-${timestamp.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 6)}`;
      const destination = join(this.snapshotsDirectory, folderName);

      // Perform consistent SQLite Online Backup via transaction pinning and serialization
      const manifest = backupPlatform(this.store, this.evidenceDirectory, destination);

      const dbFile = manifest.files.find(f => f.name === 'platform.sqlite');
      const databaseSha256 = dbFile?.sha256 ?? '';

      const manifestBytes = readFileSync(join(destination, 'manifest.json'));
      const manifestSha256 = new Bun.CryptoHasher('sha256').update(manifestBytes).digest('hex');

      const record: SnapshotRecord = {
        id: folderName,
        destination,
        createdAt: manifest.createdAt,
        recordCount: manifest.recordCount,
        databaseSha256,
        manifestSha256,
        files: manifest.files,
        status: 'verified',
        trigger,
      };

      // Permanent retention of snapshot record and SHA-256 hashes in store
      this.store.save(SNAPSHOT_RECORD_KIND, record);
      this.store.audit('system:backup_scheduler', 'backup.create', record.id);

      // Prune old physical snapshots beyond retention count while retaining metadata records
      this.pruneSnapshots();

      this.onBackupComplete?.(manifest, record);
      return record;
    } catch (error) {
      this.onBackupError?.(error);
      throw error;
    } finally {
      this.releaseLock(this.workerId);
    }
  }

  /**
   * Retrieves all snapshot records sorted descending by creation timestamp.
   */
  listSnapshots(): SnapshotRecord[] {
    return this.store.all<SnapshotRecord>(SNAPSHOT_RECORD_KIND);
  }

  /**
   * Retrieves a specific snapshot record by ID.
   */
  getSnapshot(id: string): SnapshotRecord | null {
    return this.store.get<SnapshotRecord>(SNAPSHOT_RECORD_KIND, id);
  }

  /**
   * Verifies the cryptographic integrity of a snapshot on disk against recorded SHA-256 hashes.
   */
  verifySnapshot(recordOrId: string | SnapshotRecord): { valid: boolean; mismatchedFiles: string[]; manifestValid: boolean } {
    const record = typeof recordOrId === 'string' ? this.getSnapshot(recordOrId) : recordOrId;
    if (!record) return { valid: false, mismatchedFiles: ['RECORD_NOT_FOUND'], manifestValid: false };
    if (!existsSync(record.destination)) return { valid: false, mismatchedFiles: ['DESTINATION_MISSING'], manifestValid: false };

    const mismatchedFiles: string[] = [];
    const manifestPath = join(record.destination, 'manifest.json');
    let manifestValid = false;

    if (existsSync(manifestPath)) {
      const bytes = readFileSync(manifestPath);
      const hash = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
      manifestValid = hash === record.manifestSha256;
    }
    if (!manifestValid) mismatchedFiles.push('manifest.json');

    for (const file of record.files) {
      const filePath = join(record.destination, file.name);
      if (!existsSync(filePath)) {
        mismatchedFiles.push(file.name);
        continue;
      }
      const bytes = readFileSync(filePath);
      const hash = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
      if (hash !== file.sha256 || bytes.length !== file.size) {
        mismatchedFiles.push(file.name);
      }
    }

    return {
      valid: manifestValid && mismatchedFiles.length === 0,
      mismatchedFiles,
      manifestValid,
    };
  }

  /**
   * Validates Recovery Point Objective (RPO <= 4 hours).
   * Verifies that the elapsed time since the last verified snapshot does not exceed maxRpoHours.
   */
  checkRpoStatus(asOf: Date = new Date()): RpoStatus {
    const snapshots = this.listSnapshots().filter(s => s.status === 'verified');
    const maxRpoMs = this.maxRpoHours * 3600 * 1000;

    if (snapshots.length === 0) {
      return {
        compliant: false,
        maxRpoHours: this.maxRpoHours,
        elapsedSeconds: null,
        lastBackupAt: null,
        status: 'no_snapshot',
        reasonCode: 'RPO_NO_SNAPSHOT_RECORD',
      };
    }

    const latest = snapshots[0];
    const lastTime = new Date(latest.createdAt).getTime();
    const elapsedMs = asOf.getTime() - lastTime;
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const compliant = elapsedMs >= 0 && elapsedMs <= maxRpoMs;

    return {
      compliant,
      maxRpoHours: this.maxRpoHours,
      elapsedSeconds,
      lastBackupAt: latest.createdAt,
      status: compliant ? 'compliant' : 'violation',
      reasonCode: compliant ? 'RPO_COMPLIANT' : 'RPO_VIOLATION_STALE_BACKUP',
    };
  }

  isRpoCompliant(asOf: Date = new Date()): boolean {
    return this.checkRpoStatus(asOf).compliant;
  }

  getRpoReasonCode(asOf: Date = new Date()): string {
    return this.checkRpoStatus(asOf).reasonCode;
  }

  /**
   * Enforces retention policy on disk while preserving cryptographic records in SQLite.
   */
  pruneSnapshots(): number {
    const records = this.listSnapshots();
    if (records.length <= this.retentionCount) return 0;

    const toPrune = records.slice(this.retentionCount);
    let prunedCount = 0;

    for (const item of toPrune) {
      if (item.destination && existsSync(item.destination)) {
        try {
          rmSync(item.destination, { recursive: true, force: true });
          prunedCount++;
        } catch {
          // Ignore removal errors if directory already deleted
        }
      }
      if (!item.pruned) {
        this.store.save(SNAPSHOT_RECORD_KIND, { ...item, pruned: true });
      }
    }
    return prunedCount;
  }

  /**
   * Starts the 4-hour automatic backup timer.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      this.runBackup('scheduled').catch(err => {
        // Redacted failure logged via error callback
        this.onBackupError?.(err);
      });
    }, this.intervalMs);

    // Ensure timer does not block event loop termination in tests or scripts
    this.timer.unref?.();
  }

  /**
   * Stops the automatic backup timer cleanly.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Returns current scheduler runtime health and status telemetry.
   */
  status(): SchedulerStatus {
    const snapshots = this.listSnapshots();
    return {
      running: this.isRunning,
      intervalMs: this.intervalMs,
      maxRpoHours: this.maxRpoHours,
      rpo: this.checkRpoStatus(),
      lock: this.getLockInfo(),
      lastSnapshot: snapshots[0] ?? null,
      totalSnapshots: snapshots.length,
      snapshotsDirectory: this.snapshotsDirectory,
    };
  }

  getStatus(): SchedulerStatus {
    return this.status();
  }
}
