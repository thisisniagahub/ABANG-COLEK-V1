/**
 * DR-01 — Kontrak pengukuran RTO (Recovery Time Objective).
 *
 * RTO <= 30 minit ialah sasaran blueprint yang dinyatakan dalam
 * `docs/runbooks/platform-recovery.md` (§12). Sasaran itu BUKAN hasil: satu-
 * satu-satunya bukti ialah DRIL yang mengukur masa sebenar daripada keadaan
 * tersimpan sebenar.
 *
 * Prinsip kontrak ini:
 *
 * 1. SETIAP FASA MENGUKUR MASA DARI KAAH WAKTU SEBENAR. Tiada fasa mempunyai
 *    tempoh tetap; `elapsedMs` ialah perbezaan dua cap masa sebenar.
 * 2. DRIL GAGAL DENGAN JELAS. Jika `elapsedMs > targetMs`, status ialah
 *    `not_met` dan reason code ialah `RTO_TARGET_NOT_MET`. Ia tidak pernah
 *    "lulus" secara senyap.
 * 3. KEPUTUSAN DITERIMA DARI KERJA SEBENAR. Snapshot diambil daripada store
 *    sebenar, restore ditulis ke destination baharu, dan salinan yang
 *    dipulihkan mesti mengandungi marker yang sama seperti pangkalan data
 *    yang disalin.
 * 4. CUTOVER BUKAN KEPUTUSAN DRIL. Drill menghasilkan snapshot dan salinan
 *    yang disahkan; ia TIDAK mengaktifkan pangkalan data yang dipulihkan.
 *    Cutover ialah langkah operator luar talian (lihat runbook §6).
 */

/** Sasaran RTO: 30 minit (runbook §12). */
export const RECOVERY_RTO_TARGET_MS = 30 * 60_000;

export const RECOVERY_DRILL_PHASES = [
  'capture_source_state',
  'backup',
  'restore',
  'verify',
  'cutover_ready',
] as const;
export type RecoveryDrillPhase = (typeof RECOVERY_DRILL_PHASES)[number];

export type RecoveryDrillPhaseStatus = 'completed' | 'failed';

export interface RecoveryDrillPhaseTiming {
  phase: RecoveryDrillPhase;
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  status: RecoveryDrillPhaseStatus;
  detail?: string;
}

export type RecoveryDrillStatus = 'met' | 'not_met' | 'failed';

export const RECOVERY_DRILL_REASON_CODES = [
  'RTO_TARGET_MET',
  'RTO_TARGET_NOT_MET',
  'RECOVERY_DRILL_FAILED',
  'RECOVERY_SOURCE_STATE_UNAVAILABLE',
  'RECOVERY_BACKUP_FAILED',
  'RECOVERY_RESTORE_FAILED',
  'RECOVERY_RESTORE_INTEGRITY_FAILED',
  'RECOVERY_RECORD_COUNT_MISMATCH',
  'RECOVERY_MARKER_NOT_RESTORED',
  'RECOVERY_EVIDENCE_NOT_RESTORED',
] as const;
export type RecoveryDrillReasonCode = (typeof RECOVERY_DRILL_REASON_CODES)[number];

export interface RecoveryDrillSourceState {
  databasePath: string;
  recordCountBefore: number;
  evidenceCountBefore: number;
}

export interface RecoveryDrillRestoredState {
  snapshotDirectory: string;
  restoreDirectory: string;
  recordCountAfter: number;
  integrityCheck: 'ok' | 'failed' | 'not_run';
  markerRestored: boolean;
  evidenceRestored: boolean;
  databaseSha256: string | null;
  manifestSha256: string | null;
}

export interface RecoveryDrillResult {
  id: string;
  status: RecoveryDrillStatus;
  reasonCode: RecoveryDrillReasonCode;
  targetMs: number;
  elapsedMs: number;
  startedAt: string;
  completedAt: string;
  phases: RecoveryDrillPhaseTiming[];
  source: RecoveryDrillSourceState;
  restored: RecoveryDrillRestoredState;
  failures: string[];
  /** RPO semasa (jika sumbernya disuntik); `null` bermaksud tidak diukur. */
  rpo: {
    compliant: boolean;
    elapsedSeconds: number | null;
    lastBackupAt: string | null;
    reasonCode: string;
  } | null;
}
