/**
 * DR-01 — Pengukuran RTO (drill pemulihan yang sebenar).
 *
 * Kontrak awam: `shared/recovery-contracts.ts`.
 * Runbook: `docs/runbooks/platform-recovery.md` §6 dan §12.
 */

export {
  RECOVERY_DRILL_PHASES,
  RECOVERY_DRILL_REASON_CODES,
  RECOVERY_RTO_TARGET_MS,
} from '../../../shared/recovery-contracts';
export type {
  RecoveryDrillPhase,
  RecoveryDrillPhaseStatus,
  RecoveryDrillPhaseTiming,
  RecoveryDrillReasonCode,
  RecoveryDrillRestoredState,
  RecoveryDrillResult,
  RecoveryDrillSourceState,
  RecoveryDrillStatus,
} from '../../../shared/recovery-contracts';

export { RECOVERY_DRILL_KIND, RecoveryDrillFailure, runRecoveryDrill } from './drill';
export type { RecoveryDrillMarker, RecoveryDrillOptions } from './drill';
export { RecoveryService } from './service';
export type { RecoveryServiceOptions } from './service';
export { createRecoveryRoutes } from './routes';
export type { RecoveryRouteContext } from './routes';
