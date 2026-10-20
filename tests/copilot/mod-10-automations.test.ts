import { describe, expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { Work } from '../../server/platform/work';
import { Jobs, admitWork } from '../../server/automation/jobs';
import { RuntimeControlCommands } from '../../server/platform/runtimeControls';
import { DomainToolRegistry } from '../../server/platform/domainTools';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import type { JobRecord, WorkEstimate, UsageSnapshot } from '../../shared/platform-contracts';

function makePrincipal(
  id: string,
  role: 'founder' | 'staff' | 'dealer' | 'customer' | 'developer',
  dealerOrgId?: string,
  outletIds = ['hq']
): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role: role === 'dealer' ? 'customer' : (role as any),
        outletIds,
        ...(dealerOrgId ? { dealerOrgId } : {}),
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  };
}

function seedPrincipal(store: PlatformStore, principal: Principal) {
  store.db.query('INSERT OR IGNORE INTO users VALUES (?,?,?,?,?)').run(
    principal.user.id,
    principal.user.email,
    principal.user.name,
    'hash',
    new Date().toISOString()
  );
  for (const m of principal.memberships) {
    store.db.query('INSERT OR IGNORE INTO memberships VALUES (?,?,?,?,?,?,?)').run(
      m.id,
      m.userId,
      m.role,
      JSON.stringify(m.outletIds),
      m.dealerOrgId ?? null,
      m.status,
      m.version
    );
  }
}

function expectDomainError(fn: () => unknown, expectedCode: string) {
  try {
    fn();
    expect.unreachable(`Expected function to throw DomainError with code ${expectedCode}`);
  } catch (err: any) {
    expect(err.code).toBe(expectedCode);
  }
}

// Redaction utility for diagnostic payloads
function redactDiagnosticPayload(payload: Record<string, any>): Record<string, any> {
  const SENSITIVE_KEYS = ['apikey', 'token', 'password', 'authorization', 'secret', 'cookie', 'bearer'];
  const sanitized: Record<string, any> = {};

  for (const [k, v] of Object.entries(payload)) {
    const lowerKey = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = redactDiagnosticPayload(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

describe('MOD-10: Automations & Integrations Copilot Integration Suite', () => {
  function setupAutomation() {
    const store = new PlatformStore(':memory:');
    const auth = new Auth(store);
    const loyalty = new Loyalty(store, auth);
    const commerce = new Commerce(store, auth, loyalty);
    const work = new Work(store, auth, commerce);
    const jobs = new Jobs(store, auth, commerce, work);
    const runtimeControls = new RuntimeControlCommands(store, auth);
    const domainRegistry = new DomainToolRegistry();

    const founder = makePrincipal('founder-01', 'founder');
    const developer = makePrincipal('dev-01', 'developer');
    const staff = makePrincipal('staff-01', 'staff');
    const customer = makePrincipal('cust-01', 'customer');

    seedPrincipal(store, founder);
    seedPrincipal(store, developer);
    seedPrincipal(store, staff);
    seedPrincipal(store, customer);

    return {
      store,
      auth,
      commerce,
      work,
      jobs,
      runtimeControls,
      domainRegistry,
      founder,
      developer,
      staff,
      customer,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Positive / Happy Path (Enqueue, Claim & Execute Local Job)
  // --------------------------------------------------------------------------
  describe('Dimension 1: Positive — Kitaran Hayat Penuh Kerja Latar Belakang (Lifecycle)', () => {
    test('Founder berjaya menjadualkan kerja morning_brief, worker menuntut dan menghasilkan artifak sah', () => {
      const { jobs, founder } = setupAutomation();

      // 1. Enqueue job jenis morning_brief
      const enqueued = jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-job-01'
      );

      expect(enqueued.id).toBeDefined();
      expect(enqueued.kind).toBe('morning_brief');
      expect(enqueued.status).toBe('queued');
      expect(enqueued.attempt).toBe(0);

      // 2. Worker menuntut (claim) job
      const workerId = 'worker-node-1';
      const claimed = jobs.claimJob(workerId, 30);

      expect(claimed).not.toBeNull();
      expect(claimed!.id).toBe(enqueued.id);
      expect(claimed!.status).toBe('running');
      expect(claimed!.attempt).toBe(1);
      expect(claimed!.leaseOwner).toBe(workerId);
      expect(claimed!.leaseUntil).toBeDefined();

      // 3. Worker melaksanakan kerja secara tempatan (executeLocal)
      const completed = jobs.executeLocal(claimed!.id, workerId);

      expect(completed.status).toBe('completed');
      expect(completed.result).toBeDefined();
      expect(completed.result!.status).toBe('completed');
      expect(completed.result!.artifactIds.length).toBe(1);
      expect(completed.checkpoint).toBe('LOCAL_RESULT_PERSISTED');
      expect(completed.leaseOwner).toBeUndefined();
      expect(completed.leaseUntil).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Redacted Diagnostic Telemetry & Credential Sanitization
  // --------------------------------------------------------------------------
  describe('Dimension 2: Penapisan Telemetri Diagnostik & Pencegahan Kebocoran Token/Rahsia', () => {
    test('Telemetri dan diagnostik menapis token bearer, kata laluan dan kunci API secara telus', () => {
      const rawPayload = {
        jobId: 'job-diag-99',
        runtimeStatus: 'healthy',
        environment: 'production-local',
        credentials: {
          apiKey: 'AIzaSyFakeKey1234567890Secret',
          bearerToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
          userPassword: 'SuperSecretMasterPassword123!',
        },
        diagnostics: {
          sessionToken: 'tok-secret-abc-xyz',
          cookieHeader: 'platform_session=very_secret_cookie_hash',
          latencyMs: 42,
        },
      };

      const redacted = redactDiagnosticPayload(rawPayload);

      // Medan sensitif telah disunting
      expect(redacted.credentials.apiKey).toBe('[REDACTED]');
      expect(redacted.credentials.bearerToken).toBe('[REDACTED]');
      expect(redacted.credentials.userPassword).toBe('[REDACTED]');
      expect(redacted.diagnostics.sessionToken).toBe('[REDACTED]');
      expect(redacted.diagnostics.cookieHeader).toBe('[REDACTED]');

      // Medan bukan sensitif kekal utuh
      expect(redacted.jobId).toBe('job-diag-99');
      expect(redacted.diagnostics.latencyMs).toBe(42);
      expect(redacted.environment).toBe('production-local');
    });

    test('Pandangan senarai kerja (Jobs.all) bagi peranan developer tidak mendedahkan payload pemilik sensitif', () => {
      const { jobs, founder, developer } = setupAutomation();

      jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-strip-1'
      );

      // Founder melihat rekod penuh
      const founderView = jobs.all(founder);
      if (!('ownerId' in founderView[0])) throw new Error('Founder job projection must include ownerId.');
      expect(founderView[0].ownerId).toBe(founder.user.id);
      expect((founderView[0] as any).idempotencyKey).toBe('idem-strip-1');

      // Developer melihat rekod stripped (sanitized) tanpa maklumat peribadi pemilik
      const devView = jobs.all(developer);
      expect(devView[0].id).toBeDefined();
      expect(devView[0].status).toBe('queued');
      expect((devView[0] as any).ownerId).toBeUndefined();
      expect((devView[0] as any).idempotencyKey).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Unsafe Retry Block & Circuit Breaker / Lease Expiry Defense
  // --------------------------------------------------------------------------
  describe('Dimension 3: Sekatan Cuba Semula Tidak Selamat (Circuit Breaker) & Tamat Tempoh Pajakan', () => {
    test('Kerja yang gagal melebihi had 3 percubaan ditukar ke status failed tanpa blind retry infiniti', () => {
      const { store, jobs, founder } = setupAutomation();

      // Enqueue job
      const enqueued = jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-retry-breaker'
      );

      const workerId = 'worker-node-breaker';

      // Percubaan 1: Claim job
      const claim1 = jobs.claimJob(workerId, 30);
      expect(claim1!.attempt).toBe(1);

      // Simulasikan pajakan tamat tempoh (lease expired in the past)
      store.save('jobs', {
        ...claim1!,
        leaseUntil: new Date(Date.now() - 1000).toISOString(),
      });

      // Percubaan 2: Claim semula job selepas pajakan tamat
      const claim2 = jobs.claimJob(workerId, 30);
      expect(claim2).not.toBeNull();
      expect(claim2!.attempt).toBe(2);

      // Simulasikan pajakan tamat tempoh kali kedua
      store.save('jobs', {
        ...claim2!,
        leaseUntil: new Date(Date.now() - 1000).toISOString(),
      });

      // Percubaan 3: Claim kali ketiga
      const claim3 = jobs.claimJob(workerId, 30);
      expect(claim3).not.toBeNull();
      expect(claim3!.attempt).toBe(3);

      // Simulasikan pajakan tamat tempoh kali ketiga (attempt >= 3)
      store.save('jobs', {
        ...claim3!,
        leaseUntil: new Date(Date.now() - 1000).toISOString(),
      });

      // Percubaan ke-4: Circuit Breaker mengunci kerja ke 'failed' dengan reasonCode: LEASE_EXPIRED
      const claim4 = jobs.claimJob(workerId, 30);
      expect(claim4).toBeNull(); // Tiada job aktif boleh dituntut lagi!

      // Sahkan kerja kini berstatus 'failed'
      const failedJob = store.require<JobRecord>('jobs', enqueued.id);
      expect(failedJob.status).toBe('failed');
      expect(failedJob.reasonCode).toBe('LEASE_EXPIRED');
      expect(failedJob.attempt).toBe(3);
    });

    test('Kerja yang telah dibatalkan tidak boleh dituntut atau dilaksanakan', () => {
      const { jobs, founder } = setupAutomation();

      const enqueued = jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-cancel-test'
      );

      // Founder membatalkan kerja
      const cancelled = jobs.cancel(founder, enqueued.id);
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.reasonCode).toBe('OPERATOR_CANCELLED');

      // Worker cuba menuntut job yang dibatalkan -> Pulangkan null
      const claim = jobs.claimJob('worker-node-1', 30);
      expect(claim).toBeNull();

      // Percubaan membatalkan kali kedua ditolak dengan INVALID_TRANSITION (409)
      expectDomainError(() => {
        jobs.cancel(founder, enqueued.id);
      }, 'INVALID_TRANSITION');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: Role-Based Authorization — Founder/Developer Enforcement
  // --------------------------------------------------------------------------
  describe('Dimension 4: Pengasingan Kuasa & Penolakan Bukan Founder/Developer', () => {
    test('Kakitangan biasa dan pelanggan dilarang menjadualkan kerja atau membatalkan kerja', () => {
      const { jobs, staff, customer, founder } = setupAutomation();

      // Kakitangan cuba enqueue -> Ditolak (FORBIDDEN 403)
      expectDomainError(() => {
        jobs.enqueue(
          staff,
          {
            kind: 'morning_brief',
            entityId: 'business',
            skillVersion: '1.0.0',
            scope: 'daily_brief',
          },
          'idem-staff-bad'
        );
      }, 'FORBIDDEN');

      // Pelanggan cuba melihat senarai kerja -> Ditolak (FORBIDDEN 403)
      expectDomainError(() => {
        jobs.all(customer);
      }, 'FORBIDDEN');

      // Enqueue oleh founder
      const enqueued = jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-cancel-auth'
      );

      // Pelanggan cuba membatalkan kerja -> Ditolak (FORBIDDEN 403)
      expectDomainError(() => {
        jobs.cancel(customer, enqueued.id);
      }, 'FORBIDDEN');
    });

    test('Kerja disekat sekiranya hak founder pemilik kerja ditarik balik sebelum pelaksanaan', () => {
      const { store, jobs, founder } = setupAutomation();

      const enqueued = jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-owner-revoked'
      );

      const workerId = 'worker-node-rev';
      const claimed = jobs.claimJob(workerId, 30);
      expect(claimed).not.toBeNull();

      // Tarik balik keahlian founder dalam SQLite DB
      store.db.query("UPDATE memberships SET status='revoked' WHERE user_id=?").run(founder.user.id);

      // Pelaksanaan kerja mendapati keahlian founder pemilik telah ditarik balik -> Blocked
      const blocked = jobs.executeLocal(claimed!.id, workerId);
      expect(blocked.status).toBe('blocked');
      expect(blocked.result!.unknownReasons).toContain('OWNER_GRANT_REVOKED');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Budget Quota & Admission Control (admitWork)
  // --------------------------------------------------------------------------
  describe('Dimension 5: Kawalan Kemasukan & Had Kuota Pekerjaan Harian (admitWork)', () => {
    test('Fungsi admitWork menolak kerja sekiranya anggaran melebihi kuota harian yang tinggal', () => {
      const estimate: WorkEstimate = {
        operation: 'local_job',
        providerId: 'local_first_party',
        estimatedUnits: 15,
      };

      const usageExceeded: UsageSnapshot = {
        providerId: 'local_first_party',
        observedUnits: 90,
        limitUnits: 100, // 90 + 15 = 105 > 100 (Lebih had!)
        available: true,
        observedAt: new Date().toISOString(),
        resetAt: new Date(Date.now() + 86400_000).toISOString(),
      };

      const decExceeded = admitWork(estimate, usageExceeded);
      expect(decExceeded.allowed).toBe(false);
      expect(decExceeded.reasonCode).toBe('QUOTA_EXCEEDED');

      // Anggaran dalam lingkungan kuota
      const usageOk: UsageSnapshot = {
        ...usageExceeded,
        observedUnits: 80, // 80 + 15 = 95 <= 100 (Sah!)
      };
      const decOk = admitWork(estimate, usageOk);
      expect(decOk.allowed).toBe(true);
      expect(decOk.reasonCode).toBe('WITHIN_QUOTA');
    });

    test('admitWork menolak anggaran pincang (unit negatif atau provider tidak sepadan)', () => {
      const usage: UsageSnapshot = {
        providerId: 'local_first_party',
        observedUnits: 10,
        limitUnits: 100,
        available: true,
        observedAt: new Date().toISOString(),
        resetAt: new Date(Date.now() + 86400_000).toISOString(),
      };

      // Unit negatif
      const negativeEstimate: WorkEstimate = {
        operation: 'local_job',
        providerId: 'local_first_party',
        estimatedUnits: -5,
      };
      expect(admitWork(negativeEstimate, usage).allowed).toBe(false);
      expect(admitWork(negativeEstimate, usage).reasonCode).toBe('INVALID_ESTIMATE');

      // Provider tidak sepadan
      const mismatchEstimate: WorkEstimate = {
        operation: 'local_job',
        providerId: 'third_party_external' as any,
        estimatedUnits: 5,
      };
      expect(admitWork(mismatchEstimate, usage).allowed).toBe(false);
      expect(admitWork(mismatchEstimate, usage).reasonCode).toBe('INVALID_ESTIMATE');
    });

    test('Menolak penjadualan kerja dengan sumber yang tidak sepadan (JOB_SOURCE_MISMATCH)', () => {
      const { jobs, founder } = setupAutomation();

      // morning_brief dengan entityId bukan 'business'
      expectDomainError(() => {
        jobs.enqueue(
          founder,
          {
            kind: 'morning_brief',
            entityId: 'outlet-hq', // Bukan 'business'!
            skillVersion: '1.0.0',
            scope: 'daily_brief',
          },
          'idem-mismatch-1'
        );
      }, 'JOB_SOURCE_MISMATCH');

      // case_summary dengan ID kes yang tidak wujud
      expectDomainError(() => {
        jobs.enqueue(
          founder,
          {
            kind: 'case_summary',
            entityId: 'case-does-not-exist',
            skillVersion: '1.0.0',
            scope: 'case_triage',
          },
          'idem-mismatch-2'
        );
      }, 'JOB_SOURCE_MISMATCH');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: Runtime Controls & Admission Gate (Pause / Readonly)
  // --------------------------------------------------------------------------
  describe('Dimension 6: Kawalan Waktu Larian (Runtime Controls) & Pintu Kemasukan', () => {
    test('Apabila workerAdmission dihentikan (paused), tiada kerja baharu boleh dituntut oleh worker', () => {
      const { jobs, runtimeControls, founder } = setupAutomation();

      // Enqueue job sah
      jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-paused-test'
      );

      // Founder menjeda worker admission
      const updated = runtimeControls.change(founder, {
        expectedVersion: 0,
        workerAdmission: 'paused',
      });
      expect(updated.workerAdmission).toBe('paused');

      // Worker cuba menuntut kerja semasa paused -> Pulangkan null serta-merta
      const claimedWhilePaused = jobs.claimJob('worker-node-1', 30);
      expect(claimedWhilePaused).toBeNull();

      // Founder mengaktifkan semula worker admission ke 'running'
      runtimeControls.change(founder, {
        expectedVersion: updated.version,
        workerAdmission: 'running',
      });

      // Worker kini boleh menuntut kerja semula
      const claimedAfterResume = jobs.claimJob('worker-node-1', 30);
      expect(claimedAfterResume).not.toBeNull();
      expect(claimedAfterResume!.status).toBe('running');
    });

    test('Apabila activeRelease ialah platform-local-readonly-v1, tuntutan kerja disekat', () => {
      const { jobs, runtimeControls, founder } = setupAutomation();

      jobs.enqueue(
        founder,
        {
          kind: 'morning_brief',
          entityId: 'business',
          skillVersion: '1.0.0',
          scope: 'daily_brief',
        },
        'idem-readonly-test'
      );

      const ctrl = runtimeControls.current();
      runtimeControls.change(founder, {
        expectedVersion: ctrl.version,
        activeRelease: 'platform-local-readonly-v1',
      });

      // Dalam mod readonly, claimJob mestilah memulangkan null
      expect(jobs.claimJob('worker-node-1', 30)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 7: Copilot Session Budget Enforcement (Max 6 Dispatches)
  // --------------------------------------------------------------------------
  describe('Dimension 7: Penguatkuasaan Had Bajet Panggilan Alatan Automasi Copilot', () => {
    test('Panggilan alatan automasi disekat tepat pada panggilan ke-7 dengan kod TOOL_BUDGET_EXCEEDED', async () => {
      const toolReg = new ToolRegistry(6);
      const ctx: ToolDispatchContext = {
        actorId: 'dev-budget-01',
        role: 'developer',
        runId: 'run-auto-budget-01',
        dispatchesCount: 0,
        maxDispatches: 6,
      };

      for (let i = 0; i < 6; i++) {
        const res = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res.ok).toBe(true);
      }
      expect(ctx.dispatchesCount).toBe(6);

      // Panggilan ke-7 disekat dengan TOOL_BUDGET_EXCEEDED
      const blocked = await toolReg.dispatchTool('discover_capabilities', {}, ctx);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.code).toBe('TOOL_BUDGET_EXCEEDED');
      }
      expect(ctx.dispatchesCount).toBe(6);
    });
  });
});
