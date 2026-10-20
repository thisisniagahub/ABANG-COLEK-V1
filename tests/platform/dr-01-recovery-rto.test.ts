/**
 * DR-01 — Harness pengukuran RTO: keputusan sebenar, bukan angka reka.
 *
 * Ujian ini sengajaigans "harness palsu": ia tidak sekadar asserts bahawa
 * `status === 'not_met'`, ia juga membuktikan bahawa:
 *   - masa yang dilaporkan TERDASAR daripada tempoh fasa sebenar;
 *   - fasa-fasa really executed (cap masa menaik, bukan satu cap masa tetap);
 *   - salinan yang dipulihkan benar-benar mengandungi marker yang drill tulis
 *     (disemak TERHADAP fail pangkalan data yang dipulihkan, bukan terhadap
 *     laporan drill itu sendiri);
 *   - tiada tempoh tetap 30s / 30min yang ditulis tangan.
 */

import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Auth, type Principal } from '../../server/platform/auth';
import { DomainError, PlatformStore } from '../../server/platform/store';
import { runRecoveryDrill, RECOVERY_DRILL_KIND } from '../../server/platform/recovery/drill';
import { RecoveryService } from '../../server/platform/recovery/service';
import { RECOVERY_DRILL_PHASES } from '../../shared/recovery-contracts';

let sequence = 0;

function principal(id: string, role: 'founder'): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role,
        outletIds: ['hq'],
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  } as unknown as Principal;
}

const FOUNDER = principal('usr-founder-dr01', 'founder');

interface DrillHarness {
  root: string;
  databasePath: string;
  evidenceDirectory: string;
  workDirectory: string;
  store: PlatformStore;
  cleanup: () => void;
}

function harness(testId: string): DrillHarness {
  sequence += 1;
  const root = `var/lib/qa/recovery-${testId}-${process.pid}-${sequence}`;
  const databasePath = join(root, 'platform.sqlite');
  const evidenceDirectory = join(root, 'evidence');
  const workDirectory = join(root, 'drills');
  mkdirSync(evidenceDirectory, { recursive: true });
  mkdirSync(workDirectory, { recursive: true });
  const store = new PlatformStore(databasePath);
  return {
    root,
    databasePath,
    evidenceDirectory,
    workDirectory,
    store,
    cleanup: () => {
      try {
        store.close();
      } catch {
        /* store sudah tertutup */
      }
      rmSync(root, { recursive: true, force: true });
    },
  };
}

describe('DR-01 — harness RTO gagal dengan JELAS apabila sasaran tidak dipenuhi', () => {
  test('targetMs 1ms => status not_met, reason RTO_TARGET_NOT_MET, elapsedMs > targetMs', () => {
    const drill = harness('not-met');
    try {
      const result = runRecoveryDrill({
        store: drill.store,
        databasePath: drill.databasePath,
        evidenceDirectory: drill.evidenceDirectory,
        workDirectory: drill.workDirectory,
        targetMs: 1,
      });

      expect(result.status).toBe('not_met');
      expect(result.reasonCode).toBe('RTO_TARGET_NOT_MET');
      expect(result.targetMs).toBe(1);
      expect(result.elapsedMs).toBeGreaterThan(result.targetMs);
      expect(result.failures).toEqual([]);
    } finally {
      drill.cleanup();
    }
  });

  test('RecoveryService.assertRtoTarget melontar DomainError RTO_TARGET_NOT_MET dengan status 503', () => {
    const drill = harness('assert-rto');
    try {
      const auth = new Auth(drill.store);
      const service = new RecoveryService(drill.store, auth, {
        databasePath: drill.databasePath,
        evidenceDirectory: drill.evidenceDirectory,
        workDirectory: drill.workDirectory,
        targetMs: 1,
      });

      const result = service.runDrill(FOUNDER);
      expect(result.status).toBe('not_met');
      expect(result.reasonCode).toBe('RTO_TARGET_NOT_MET');

      let thrown: DomainError | null = null;
      try {
        service.assertRtoTarget(result);
      } catch (error) {
        thrown = error as DomainError;
      }
      expect(thrown).toBeInstanceOf(DomainError);
      expect(thrown!.code).toBe('RTO_TARGET_NOT_MET');
      // 503 ⇒ respons HTTP TIDAK boleh 200 ("lulus" senyap).
      expect(thrown!.status).toBe(503);
    } finally {
      drill.cleanup();
    }
  });
});

describe('DR-01 — anti-fake: masa dan bukti drill mesti datang daripada kerja sebenar', () => {
  test('Masa, fasa, marker pulangan dan integriti disahkan terhadap keadaan sebenar', () => {
    const drill = harness('anti-fake');
    try {
      const result = runRecoveryDrill({
        store: drill.store,
        databasePath: drill.databasePath,
        evidenceDirectory: drill.evidenceDirectory,
        workDirectory: drill.workDirectory,
        targetMs: 1,
      });

      expect(result.status).toBe('not_met');
      expect(result.failures).toEqual([]);

      // 1. TEPAT 5 fasa, mengikut turutan kontrak.
      expect(result.phases).toHaveLength(5);
      expect(result.phases.map((phase) => phase.phase)).toEqual([...RECOVERY_DRILL_PHASES]);
      for (const phase of result.phases) {
        expect(phase.status).toBe('completed');
        expect(Number.isSafeInteger(phase.elapsedMs)).toBe(true);
        expect(phase.elapsedMs).toBeGreaterThanOrEqual(0);
        // Tempoh fasa mestilah konsisten dengan cap masa sendiri.
        expect(Date.parse(phase.completedAt) - Date.parse(phase.startedAt)).toBe(phase.elapsedMs);
      }

      // 2. `elapsedMs` ialah JUMLAH tempoh fasa (toleransi kecil untuk overhead
      //    pencatatan di luar fasa — bukan tempoh tetap).
      const phaseTotalMs = result.phases.reduce((sum, phase) => sum + phase.elapsedMs, 0);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(phaseTotalMs);
      expect(result.elapsedMs - phaseTotalMs).toBeLessThanOrEqual(500);

      // 3. Cap masa fasa menaik (monotonik) dan TIDAK satu cap masa tetap.
      for (let index = 1; index < result.phases.length; index += 1) {
        expect(Date.parse(result.phases[index].startedAt)).toBeGreaterThanOrEqual(
          Date.parse(result.phases[index - 1].startedAt),
        );
        expect(Date.parse(result.phases[index].completedAt)).toBeGreaterThanOrEqual(
          Date.parse(result.phases[index - 1].completedAt),
        );
      }
      expect(result.phases[0].startedAt).not.toBe(result.phases[result.phases.length - 1].startedAt);

      // 4. Tiada tempoh tetap 30 saat / 30 minit yang ditulis tangan.
      expect(result.elapsedMs).not.toBe(30_000);
      expect(result.elapsedMs).not.toBe(1_800_000);

      // 5. Salinan yang dipulihkan: integriti + bilangan rekod + hash.
      expect(result.restored.integrityCheck).toBe('ok');
      expect(result.restored.databaseSha256).not.toBeNull();
      expect(result.restored.manifestSha256).not.toBeNull();
      expect(result.restored.snapshotDirectory).not.toBe('');
      expect(result.restored.restoreDirectory).not.toBe('');

      const manifest = JSON.parse(
        readFileSync(join(result.restored.snapshotDirectory, 'manifest.json'), 'utf8'),
      ) as { recordCount: number };
      expect(result.restored.recordCountAfter).toBe(manifest.recordCount);

      // 6. Marker: disemak TERHADAP fail pangkalan data yang dipulihkan, bukan
      //    terhadap laporan drill. Ini membuktikan salinan itu benar-benar
      //    mengandungi marker yang drill tulis.
      expect(result.restored.markerRestored).toBe(true);
      const restoredDatabase = new Database(
        join(result.restored.restoreDirectory, 'platform.sqlite'),
        { readonly: true, strict: true },
      );
      try {
        const markerRow = restoredDatabase
          .query<{ data: string }, [string, string]>(
            'SELECT data FROM records WHERE kind=? AND id=?',
          )
          .get(RECOVERY_DRILL_KIND, result.id);
        expect(markerRow).toBeDefined();
        const marker = JSON.parse(markerRow!.data) as { id: string; drillId: string; note: string };
        expect(marker.id).toBe(result.id);
        expect(marker.drillId).toBe(result.id);
        expect(marker.note.length).toBeGreaterThan(0);
      } finally {
        restoredDatabase.close();
      }

      // 7. NEGATIF: drill terhadap sumber yang tiada ⇒ ia GAGAL, bukan "lulus"
      //    dengan angka reka.
      const missingSource = runRecoveryDrill({
        store: drill.store,
        databasePath: join(drill.root, 'tiada-s/database.sqlite'),
        evidenceDirectory: drill.evidenceDirectory,
        workDirectory: drill.workDirectory,
        targetMs: 1,
      });
      expect(missingSource.status).toBe('failed');
      expect(missingSource.reasonCode).toBe('RECOVERY_SOURCE_STATE_UNAVAILABLE');
      expect(missingSource.failures.length).toBeGreaterThan(0);
    } finally {
      drill.cleanup();
    }
  });
});
