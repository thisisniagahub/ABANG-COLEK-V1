import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { backupPlatform, restorePlatform } from '../backup';
import { id, PlatformStore } from '../store';
import {
  RECOVERY_RTO_TARGET_MS,
  type RecoveryDrillPhase,
  type RecoveryDrillPhaseTiming,
  type RecoveryDrillReasonCode,
  type RecoveryDrillResult,
  type RecoveryDrillStatus,
} from '../../../shared/recovery-contracts';

export const RECOVERY_DRILL_KIND = 'recovery_drills';

/** Kegagalan drill yang membawa reason code yang boleh dibaca mesin. */
export class RecoveryDrillFailure extends Error {
  constructor(
    readonly reasonCode: RecoveryDrillReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'RecoveryDrillFailure';
  }
}

export interface RecoveryDrillOptions {
  store: PlatformStore;
  /** Laluan pangkalan data sumber yang SEBENAR (bukan `:memory:`). */
  databasePath: string;
  evidenceDirectory: string;
  /** Root di mana snapshot dan salinan yang dipulihkan akan dicipta. */
  workDirectory: string;
  /** Sasaran RTO dalam milisaat; lalai 30 minit (runbook §12). */
  targetMs?: number;
  /** RPO semasa daripada sumber sebenar; `null` bermaksud tidak diukur. */
  rpo?: () => {
    compliant: boolean;
    elapsedSeconds: number | null;
    lastBackupAt: string | null;
    reasonCode: string;
  } | null;
  /** Buang artifak drill selepas selesai (lalai: kekal sebagai bukti). */
  cleanup?: boolean;
}

export interface RecoveryDrillMarker {
  id: string;
  drillId: string;
  startedAt: string;
  databasePath: string;
  note: string;
}

const sha256 = (bytes: Uint8Array) =>
  new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
/**
 * DR-01 — Harness pengukuran RTO.
 *
 * Drill ini:
 * 1. mengambil keadaan SEBENAR daripada store (kira rekod + evidence) dan
 *    menulis marker sebenar supaya snapshot mengandungi data sebenar;
 * 2. menjalankan `backupPlatform` (snapshot sebenar dengan manifest + hash);
 * 3. menjalankan `restorePlatform` (restore sebenar ke destination baharu);
 * 4. mengesahkan salinan yang dipulihkan: `PRAGMA integrity_check`, kiraan
 *    rekod, kehadiran marker, dan hash evidence;
 * 5. mengukur masa setiap fasa daripada cap masa sebenar.
 *
 * Ia TIDAK melakukan cutover (runbook §6: cutover ialah langkah operator luar
 * talian) dan TIDAK pernah melaporkan "selesai dalam 30 saat" tanpa pengukuran.
 */
export function runRecoveryDrill(options: RecoveryDrillOptions): RecoveryDrillResult {
  const targetMs = options.targetMs ?? RECOVERY_RTO_TARGET_MS;
  const drillId = id();
  const startedAtMs = Date.now();
  const phases: RecoveryDrillPhaseTiming[] = [];
  const failures: string[] = [];
  const source = {
    databasePath: options.databasePath,
    recordCountBefore: 0,
    evidenceCountBefore: 0,
  };
  const restored = {
    snapshotDirectory: '',
    restoreDirectory: '',
    recordCountAfter: 0,
    integrityCheck: 'not_run' as 'ok' | 'failed' | 'not_run',
    markerRestored: false,
    evidenceRestored: false,
    databaseSha256: null as string | null,
    manifestSha256: null as string | null,
  };
  let failureReason: RecoveryDrillReasonCode | null = null;

  const phase = <T>(name: RecoveryDrillPhase, work: () => T): T => {
    const phaseStart = Date.now();
    try {
      const value = work();
      phases.push({
        phase: name,
        startedAt: new Date(phaseStart).toISOString(),
        completedAt: new Date(Date.now()).toISOString(),
        elapsedMs: Date.now() - phaseStart,
        status: 'completed',
      });
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      phases.push({
        phase: name,
        startedAt: new Date(phaseStart).toISOString(),
        completedAt: new Date(Date.now()).toISOString(),
        elapsedMs: Date.now() - phaseStart,
        status: 'failed',
        detail: message,
      });
      if (error instanceof RecoveryDrillFailure) failureReason = error.reasonCode;
      else failureReason = 'RECOVERY_DRILL_FAILED';
      throw error;
    }
  };

  const drillRoot = join(options.workDirectory, `drill-${drillId}`);

  try {
    phase('capture_source_state', () => {
      if (!options.databasePath || options.databasePath === ':memory:') {
        throw new RecoveryDrillFailure(
          'RECOVERY_SOURCE_STATE_UNAVAILABLE',
          'Pangkalan data sumber bukan fail sebenar; drill memerlukan keadaan tersimpan sebenar.',
        );
      }
      if (!existsSync(options.databasePath)) {
        throw new RecoveryDrillFailure(
          'RECOVERY_SOURCE_STATE_UNAVAILABLE',
          'Pangkalan data sumber tidak wujud.',
        );
      }
      const records = options.store.db
        .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM records')
        .get();
      source.recordCountBefore = records?.count ?? 0;
      source.evidenceCountBefore = options.store.db
        .query<{ count: number }, [string]>('SELECT COUNT(*) AS count FROM records WHERE kind=?')
        .get('evidence')?.count ?? 0;
      const marker: RecoveryDrillMarker = {
        id: drillId,
        drillId,
        startedAt: new Date(startedAtMs).toISOString(),
        databasePath: options.databasePath,
        note: 'Marker drill pemulihan RTO — mesti hadir dalam salinan yang dipulihkan.',
      };
      options.store.save(RECOVERY_DRILL_KIND, marker);
      return marker;
    });

    phase('backup', () => {
      mkdirSync(options.workDirectory, { recursive: true });
      restored.snapshotDirectory = join(drillRoot, 'snapshot');
      const manifest = backupPlatform(
        options.store,
        options.evidenceDirectory,
        restored.snapshotDirectory,
      );
      const database = manifest.files.find((file) => file.name === 'platform.sqlite');
      restored.databaseSha256 = database?.sha256 ?? null;
      restored.manifestSha256 = sha256(readFileSync(join(restored.snapshotDirectory, 'manifest.json')));
      return manifest;
    });

    phase('restore', () => {
      restored.restoreDirectory = join(drillRoot, 'restore');
      return restorePlatform(restored.snapshotDirectory, restored.restoreDirectory);
    });

    phase('verify', () => {
      const manifest = JSON.parse(
        readFileSync(join(restored.snapshotDirectory, 'manifest.json'), 'utf8'),
      ) as { recordCount: number };
      const database = new Database(join(restored.restoreDirectory, 'platform.sqlite'), {
        readonly: true,
        strict: true,
      });
      try {
        const integrity = database
          .query<{ integrity_check: string }, []>('PRAGMA integrity_check')
          .all();
        if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
          restored.integrityCheck = 'failed';
          throw new RecoveryDrillFailure(
            'RECOVERY_RESTORE_INTEGRITY_FAILED',
            'Semakan integriti salinan yang dipulihkan gagal.',
          );
        }
        restored.integrityCheck = 'ok';
        const count = database
          .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM records')
          .get();
        restored.recordCountAfter = count?.count ?? 0;
        if (restored.recordCountAfter !== manifest.recordCount) {
          throw new RecoveryDrillFailure(
            'RECOVERY_RECORD_COUNT_MISMATCH',
            'Kiraan rekod salinan yang dipulihkan tidak sepadan dengan manifest.',
          );
        }
        const marker = database
          .query<{ data: string }, [string, string]>(
            'SELECT data FROM records WHERE kind=? AND id=?',
          )
          .get(RECOVERY_DRILL_KIND, drillId);
        if (!marker) {
          throw new RecoveryDrillFailure(
            'RECOVERY_MARKER_NOT_RESTORED',
            'Marker drill tiada dalam salinan yang dipulihkan.',
          );
        }
        restored.markerRestored = true;
        const evidenceRows = database
          .query<{ data: string }, [string]>('SELECT data FROM records WHERE kind=?')
          .all('evidence');
        let evidenceOk = true;
        for (const row of evidenceRows) {
          const evidence = JSON.parse(row.data) as { kind: string; id: string; sha256?: string };
          if (evidence.kind !== 'file') continue;
          const path = join(restored.restoreDirectory, 'evidence', evidence.id);
          if (!existsSync(path)) {
            evidenceOk = false;
            break;
          }
          if (evidence.sha256 && sha256(readFileSync(path)) !== evidence.sha256) {
            evidenceOk = false;
            break;
          }
        }
        if (!evidenceOk) {
          throw new RecoveryDrillFailure(
            'RECOVERY_EVIDENCE_NOT_RESTORED',
            'Evidence yang dirujuk tidak dipulihkan dengan hash yang sama.',
          );
        }
        restored.evidenceRestored = true;
        return true;
      } finally {
        database.close();
      }
    });

    phase('cutover_ready', () => {
      // Cutover bukan keputusan drill: ia langkah operator luar talian yang
      // memerlukan penulisan dihentikan dan API dimatikan (runbook §6).
      return 'SNAPSHOT_AND_RESTORE_VERIFIED_CUTOVER_NOT_PERFORMED_OPERATOR_STEP';
    });
  } catch {
    // Kegagalan sudah direkodkan dalam `failures` dan `phases`.
  } finally {
    if (options.cleanup === true && existsSync(drillRoot)) {
      rmSync(drillRoot, { recursive: true, force: true });
    }
  }

  const completedAtMs = Date.now();
  const elapsedMs = completedAtMs - startedAtMs;
  let status: RecoveryDrillStatus;
  let reasonCode: RecoveryDrillReasonCode;
  if (failures.length > 0) {
    status = 'failed';
    reasonCode = failureReason ?? 'RECOVERY_DRILL_FAILED';
  } else if (elapsedMs > targetMs) {
    status = 'not_met';
    reasonCode = 'RTO_TARGET_NOT_MET';
  } else {
    status = 'met';
    reasonCode = 'RTO_TARGET_MET';
  }

  return {
    id: drillId,
    status,
    reasonCode,
    targetMs,
    elapsedMs,
    startedAt: new Date(startedAtMs).toISOString(),
    completedAt: new Date(completedAtMs).toISOString(),
    phases,
    source,
    restored,
    failures,
    rpo: options.rpo ? options.rpo() : null,
  };
}
