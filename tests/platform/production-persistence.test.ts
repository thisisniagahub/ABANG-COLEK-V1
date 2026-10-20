import { describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { PlatformStore } from '../../server/platform/store';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Setiap larian mendapat direktori sementara sendiri.
 *
 * Root cause (dikuatkuasakan): laluan tetap `var/lib/qa/persistence-*.sqlite`
 * dikongsi antara larian DAN antara proses `bun test` yang berjalan serentak.
 * Pada Windows, fail SQLite yang masih dibuka TIDAK boleh dipadam; jadi fail
 * daripada larian sebelumnya boleh tinggal bersama baris `owner_bootstrapped`
 * dan bootstrap seterusnya membalas 409 `OWNER_ALREADY_BOOTSTRAPPED` —
 * kegagalan palsu, bukan pepijat produk.
 *
 * `mkdtempSync` memberi laluan unik bagi setiap larian/proses, jadi dua larian
 * tidak mungkin pernah meminta fail SQLite yang sama. Suite ini MELETAKAKAN
 * pangkalan data sebagai fail (bukan `:memory:`) kerana ia membuktikan
 * ketekalan WAL merentas restart.
 */
function tempDirectory(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `abangcolek-${prefix}-`));
}

describe('C04: Production Persistence & Worker Recovery', () => {
  test('SQLite WAL persistence: Data, settings and audit logs survive server restarts', async () => {
    const directory = tempDirectory('persistence-restart');
    const dbPath = join(directory, 'persistence-restart.sqlite');

    try {
      // 1. Initial server startup
      const app1 = createPlatformApp({
        databasePath: dbPath,
        bootstrapToken: 'persist-token-11111',
        origin: 'http://localhost:3000',
      });

      try {
        const bootRes = await app1.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
          body: JSON.stringify({
            email: 'founder-persist@test.local',
            password: 'password123456',
            name: 'Founder Persist',
            token: 'persist-token-11111',
          }),
        }));
        expect(bootRes.status).toBe(200);
        const bootData = await bootRes.json() as { data: { user: { id: string }; csrfToken: string } };
        const founderCookie = bootRes.headers.get('set-cookie')!;
        const founderCsrf = bootData.data.csrfToken;

        // Save a product in catalogue
        const prodRes = await app1.fetch(new Request('http://localhost:3000/api/platform/catalogue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3000',
            'Cookie': founderCookie,
            'X-CSRF-Token': founderCsrf,
          },
          body: JSON.stringify({
            name: 'Sambal Colek Padu 350g',
            description: 'Sambal warisan resepi asli',
            priceSen: 1800,
            packSize: 1,
            publish: true,
          }),
        }));
        expect(prodRes.status).toBe(200);

        // Save settings
        const settingsRes = await app1.fetch(new Request('http://localhost:3000/api/platform/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3000',
            'Cookie': founderCookie,
            'X-CSRF-Token': founderCsrf,
          },
          body: JSON.stringify({
            contact: 'care@abangcolek.local, +601122334455',
            paymentInstructions: 'DuitNow QR HQ 123456789',
            locations: [{
              id: 'hq',
              name: 'HQ Abang Colek',
              address: 'Batu Pahat, Johor',
              hours: '8am - 6pm',
              verifiedAt: '2026-10-04T00:00:00.000Z',
            }],
            expectedVersion: 0,
          }),
        }));
        expect(settingsRes.status).toBe(200);
      } finally {
        // Close app1 (simulating process restart). Handle SQLite mesti dilepaskan
        // SEBELUM fail boleh dipadam pada Windows.
        app1.close();
      }

      // 2. Restart server with app2 on same SQLite DB
      const app2 = createPlatformApp({
        databasePath: dbPath,
        bootstrapToken: 'persist-token-11111',
        origin: 'http://localhost:3000',
      });

      try {
        // Verify bootstrap-status shows required: false (already bootstrapped)
        const statusRes = await app2.fetch(new Request('http://localhost:3000/api/platform/bootstrap-status', {
          method: 'GET',
        }));
        expect(statusRes.status).toBe(200);
        const statusData = await statusRes.json() as { data: { required: boolean } };
        expect(statusData.data.required).toBe(false);

        // Verify catalogue product persisted
        const catRes = await app2.fetch(new Request('http://localhost:3000/api/platform/catalogue', {
          method: 'GET',
        }));
        expect(catRes.status).toBe(200);
        const catData = await catRes.json() as { data: Array<{ name: string; priceSen: number }> };
        expect(catData.data.some(p => p.name === 'Sambal Colek Padu 350g')).toBe(true);

        // Verify public info settings persisted
        const infoRes = await app2.fetch(new Request('http://localhost:3000/api/platform/public-info', {
          method: 'GET',
        }));
        expect(infoRes.status).toBe(200);
        const infoData = await infoRes.json() as { data: { contact: string } };
        expect(infoData.data.contact).toContain('care@abangcolek.local');
      } finally {
        app2.close();
      }
    } finally {
      // Direktori sementara hanya boleh dipadam selepas semua handle ditutup;
      // pada Windows handle yang masih hidup akan throw EBUSY/EPERM.
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('Worker bounded recovery & lease expiry handling', async () => {
    const directory = tempDirectory('persistence-worker');
    const dbPath = join(directory, 'persistence-worker.sqlite');

    try {
      const store = new PlatformStore(dbPath);
      const app = createPlatformApp({ databasePath: dbPath, origin: 'http://localhost:3000' });

      try {
        // Seed a queued job directly
        const jobId = 'job-recovery-1';
        store.save('jobs', {
          id: jobId,
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'ops',
          ownerId: 'founder-1',
          status: 'queued',
          attempt: 0,
          createdAt: new Date().toISOString(),
        });

        // Worker 1 claims job with 1 second lease
        const claimed1 = app.jobs.claimJob('worker-alpha', 1);
        expect(claimed1).not.toBeNull();
        expect(claimed1?.id).toBe(jobId);
        expect(claimed1?.status).toBe('running');
        expect(claimed1?.attempt).toBe(1);
        expect(claimed1?.leaseOwner).toBe('worker-alpha');

        // Simulate time passing beyond lease expiry by backdating leaseUntil in the store
        const runningJob = store.require<{ id: string; leaseUntil: string }>('jobs', jobId);
        store.save('jobs', {
          ...runningJob,
          leaseUntil: new Date(Date.now() - 5000).toISOString(),
        });

        // Worker 2 calls claimJob: lease recovery triggers, job requeued and claimed as attempt 2
        const claimed2 = app.jobs.claimJob('worker-beta', 1);
        expect(claimed2).not.toBeNull();
        expect(claimed2?.id).toBe(jobId);
        expect(claimed2?.attempt).toBe(2);
        expect(claimed2?.leaseOwner).toBe('worker-beta');

        // Expire lease again
        const runningJob2 = store.require<{ id: string; leaseUntil: string }>('jobs', jobId);
        store.save('jobs', {
          ...runningJob2,
          leaseUntil: new Date(Date.now() - 5000).toISOString(),
        });

        // Worker 3 claims: attempt 3
        const claimed3 = app.jobs.claimJob('worker-gamma', 1);
        expect(claimed3).not.toBeNull();
        expect(claimed3?.attempt).toBe(3);

        // Expire lease after attempt 3
        const runningJob3 = store.require<{ id: string; leaseUntil: string }>('jobs', jobId);
        store.save('jobs', {
          ...runningJob3,
          leaseUntil: new Date(Date.now() - 5000).toISOString(),
        });

        // Next claimJob should fail the job because attempt >= 3
        const claimed4 = app.jobs.claimJob('worker-delta', 1);
        expect(claimed4).toBeNull();

        const failedJob = store.require<{ id: string; status: string; reasonCode: string }>('jobs', jobId);
        expect(failedJob.status).toBe('failed');
        expect(failedJob.reasonCode).toBe('LEASE_EXPIRED');
      } finally {
        // KEDUA-DUA sambungan mesti ditutup: `app` dan `store` membuka fail
        // SQLite yang sama, dan hanya satu handle yang tinggal ⇒ fail tidak
        // boleh dipadam pada Windows ⇒ fail basi ⇒ 409 pada larian seterusnya.
        app.close();
        store.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('Database backup integrity check', async () => {
    const directory = tempDirectory('production-backup');
    const primaryDb = join(directory, 'primary-backup-test.sqlite');
    const backupDb = join(directory, 'replica-backup-test.sqlite');

    try {
      const store = new PlatformStore(primaryDb);
      store.save('test_records', { id: 'rec-1', name: 'Item 1' });
      store.save('test_records', { id: 'rec-2', name: 'Item 2' });

      // Ensure WAL checkpoint so backup has all latest data
      store.db.run('PRAGMA wal_checkpoint(TRUNCATE);');
      store.close();

      // Copy primary to backup location
      copyFileSync(primaryDb, backupDb);

      // Open backup database and verify integrity
      const backupStore = new PlatformStore(backupDb);
      try {
        const integrity = backupStore.db.query<{ integrity_check: string }, []>('PRAGMA integrity_check').get();
        expect(integrity?.integrity_check).toBe('ok');

        const records = backupStore.all<{ id: string; name: string }>('test_records');
        expect(records.length).toBe(2);
        expect(records.map(r => r.id)).toContain('rec-1');
        expect(records.map(r => r.id)).toContain('rec-2');
      } finally {
        backupStore.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
