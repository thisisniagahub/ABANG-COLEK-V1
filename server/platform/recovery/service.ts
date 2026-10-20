import { Auth } from '../auth';
import type { Principal } from '../auth';
import { DomainError, PlatformStore } from '../store';
import {
  RECOVERY_RTO_TARGET_MS,
  type RecoveryDrillReasonCode,
  type RecoveryDrillResult,
} from '../../../shared/recovery-contracts';
import { RECOVERY_DRILL_KIND, runRecoveryDrill, type RecoveryDrillOptions } from './drill';

export interface RecoveryServiceOptions {
  databasePath: string;
  evidenceDirectory: string;
  workDirectory: string;
  targetMs?: number;
  rpo?: RecoveryDrillOptions['rpo'];
  cleanup?: boolean;
}

/**
 * DR-01 — Perkhidmatan pemulihan.
 *
 * Menyimpan keputusan drill sebagai rekod server-owned supaya RTO yang
 * diukur boleh diaudit, dan menukar sasaran yang tidak dipenuhi menjadi
 * kegagalan bertyped (`RTO_TARGET_NOT_MET`) — bukan HTTP 200 senyap.
 */
export class RecoveryService {
  readonly targetMs: number;

  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
    readonly options: RecoveryServiceOptions,
  ) {
    this.targetMs = options.targetMs ?? RECOVERY_RTO_TARGET_MS;
  }

  /** Menjalankan drill sebenar dan menyimpan hasilnya. */
  runDrill(actor: Principal): RecoveryDrillResult {
    this.auth.founder(actor);
    const result = runRecoveryDrill({
      store: this.store,
      databasePath: this.options.databasePath,
      evidenceDirectory: this.options.evidenceDirectory,
      workDirectory: this.options.workDirectory,
      targetMs: this.targetMs,
      ...(this.options.rpo ? { rpo: this.options.rpo } : {}),
      ...(this.options.cleanup === undefined ? {} : { cleanup: this.options.cleanup }),
    });
    this.store.save(RECOVERY_DRILL_KIND, result);
    this.store.audit(actor.user.id, 'recovery.drill', result.id, 1);
    return result;
  }

  /**
   * Menukar drill yang tidak memenuhi sasaran menjadi kegagalan bertyped.
   * Definisi "gagal" di sini: `status !== 'met'`.
   */
  assertRtoTarget(result: RecoveryDrillResult): void {
    if (result.status === 'met') return;
    const code: RecoveryDrillReasonCode = result.reasonCode;
    const status = result.status === 'not_met' ? 503 : 500;
    const message =
      result.status === 'not_met'
        ? `RTO ${result.elapsedMs}ms melebihi sasaran ${result.targetMs}ms.`
        : `Drill pemulihan gagal: ${result.reasonCode}.`;
    throw new DomainError(code, status, message);
  }

  listDrills(actor: Principal): RecoveryDrillResult[] {
    this.auth.founder(actor);
    return this.store.all<RecoveryDrillResult>(RECOVERY_DRILL_KIND);
  }

  lastDrill(actor: Principal): RecoveryDrillResult | null {
    this.auth.founder(actor);
    const all = this.store.all<RecoveryDrillResult>(RECOVERY_DRILL_KIND);
    return all[0] ?? null;
  }
}
