import type { Principal } from '../auth';
import type { RecoveryService } from './service';

export interface RecoveryRouteContext {
  service: RecoveryService;
}

/**
 * DR-01 — Laluan HTTP pengukuran RTO.
 *
 * `POST /recovery/drill` menjalankan drill sebenar. Jika sasaran RTO tidak
 * dipenuhi, laluan menjawab dengan kegagalan bertyped (503 `RTO_TARGET_NOT_MET`
 * atau 500 dengan reason code kegagalan) — ia tidak pernah melaporkan
 * kejayaan senyap.
 */
export function createRecoveryRoutes(context: RecoveryRouteContext) {
  const { service } = context;
  return {
    handle(
      actor: Principal,
      method: string,
      path: string,
      _input: unknown,
    ): unknown | undefined {
      if (method === 'GET') {
        if (path === '/recovery/drill') return service.lastDrill(actor);
        if (path === '/recovery/drills') return service.listDrills(actor);
        return undefined;
      }
      if (method === 'POST' && path === '/recovery/drill') {
        const result = service.runDrill(actor);
        service.assertRtoTarget(result);
        return result;
      }
      return undefined;
    },
  };
}
