/**
 * REF-01 — Risk referral engine: real state, real reason codes, fail closed.
 *
 * Every assertion below reads a canonical record produced by the engine
 * itself (or a record the engine must refuse to invent). Nothing here asserts
 * a hard-coded constant that the implementation could also hard-code: each
 * positive case is paired with a negative case that proves the engine fails
 * CLOSED (missing ≠ zero, no provider ≠ "code sent", no consent ≠ consent).
 *
 * Contract source: `shared/risk-contracts.ts` + `server/platform/risk/*`.
 */

import { describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { Auth, type Principal } from '../../server/platform/auth';
import { DomainError, PlatformStore } from '../../server/platform/store';
import { RiskService } from '../../server/platform/risk/service';
import { RISK_OTP_CHALLENGE_KIND } from '../../server/platform/risk/otp';
import { RISK_POLICY, RISK_REASON_CODES } from '../../shared/risk-contracts';
import { createPlatformApp } from '../../server/platform/app';
import { FreeModelRouter } from '../../server/platform/freeModelRouter';

const FOUNDER_ID = 'usr-founder-ref01';
const SUBJECT_ID = 'usr-subject-ref01';

function principal(id: string, role: 'founder' | 'customer'): Principal {
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

const FOUNDER = principal(FOUNDER_ID, 'founder');
const SUBJECT = principal(SUBJECT_ID, 'customer');

function harness() {
  const store = new PlatformStore(':memory:');
  const auth = new Auth(store);
  const service = new RiskService(store, auth);
  return { store, auth, service };
}

/** A signal read as a plain record so the test can prove what it does NOT carry. */
function asRecord(signal: unknown): Record<string, unknown> {
  return signal as Record<string, unknown>;
}

describe('REF-01 — enjin risk referral: isyarat hilang TIDAK menjadi sifar', () => {
  test('Isyarat peranti yang hilang => unknown + reason code, tiada value 0/false', async () => {
    const { store, service } = harness();

    const decision = await service.evaluate(SUBJECT, { subjectId: SUBJECT_ID });

    const device = asRecord(decision.signals.device);
    expect(device.status).toBe('unknown');
    expect(device.reasonCode).toBe('DEVICE_SIGNAL_MISSING');
    expect(typeof device.detail).toBe('string');

    // MISSING ≠ ZERO: isyarat yang hilang TIDAK membawa `value` langsung —
    // bukan `value: 0`, bukan `value: false`, bukan `value: { trusted: false }`.
    expect('value' in device).toBe(false);
    expect(device.value).toBeUndefined();

    expect(decision.unknownSignals).toContain('device');
    expect(decision.outcome).not.toBe('allow');
    expect(decision.reasonCodes).toContain('DEVICE_SIGNAL_MISSING');
    expect(decision.reasonCodes).toContain('RISK_SIGNAL_UNKNOWN');

    // Rekod TERSIMPAN mesti membawa isyarat yang sama — bukan hanya nilai dalam memori.
    const stored = service.engine.decision(decision.id);
    expect(stored).not.toBeNull();
    const storedDevice = asRecord(stored!.signals.device);
    expect(storedDevice.status).toBe('unknown');
    expect('value' in storedDevice).toBe(false);
    expect(stored!.unknownSignals).toContain('device');

    // Tiada keputusan yang boleh "hijau" hanya kerana peranti tiada.
    expect(store.all('risk_decisions').length).toBe(1);
  });

  test('Umur tanpa persetujuan direkodkan => isyarat umur unknown, nilai umur TIDAK disimpan', async () => {
    const { service } = harness();
    // Peranti didaftar supaya HANYA isyarat umur yang unknown — ini mengasingkan
    // punca sebenar (kekurangan persetujuan) daripada isyarat lain yang hilang.
    await service.registerTrustedDevice(SUBJECT, {
      subjectId: SUBJECT_ID,
      deviceId: 'dev-trusted-01',
      fingerprint: 'fp-trusted-01',
    });

    const submittedAgeYears = 17;
    const decision = await service.evaluate(SUBJECT, {
      subjectId: SUBJECT_ID,
      ageYears: submittedAgeYears,
      device: { deviceId: 'dev-trusted-01', fingerprint: 'fp-trusted-01' },
    });

    const age = asRecord(decision.signals.age);
    expect(age.status).toBe('unknown');
    expect(age.reasonCode).toBe('AGE_SIGNAL_CONSENT_MISSING');
    expect('value' in age).toBe(false);

    expect(decision.outcome).not.toBe('allow');
    // Umur yang dihantar TIDAK pernah dinilai tanpa persetujuan.
    expect(decision.reasonCodes).not.toContain('AGE_BELOW_MINIMUM');

    const stored = service.engine.decision(decision.id)!;
    const storedAge = asRecord(stored.signals.age);
    expect(storedAge.status).toBe('unknown');
    expect('value' in storedAge).toBe(false);
    // Tiada nilai berangka yang sama dengan umur yang dihantar dalam keputusan
    // tersimpan (bandingkan nilai dengan ketat, bukan substring).
    expect(Object.values(storedAge).some((value) => value === submittedAgeYears)).toBe(false);
  });
});

describe('REF-01 — peraturan deterministik: blok dan consent', () => {
  test('Set isyarat berisiko tinggi => outcome block, reason codes semuanya dari RISK_REASON_CODES', async () => {
    const { service } = harness();
    await service.setAgeConsent(FOUNDER, { subjectId: SUBJECT_ID, granted: true });

    // Velocity dikira daripada rekod SEBENAR: 5 keputusan terdahulu ⇒
    // subjectAttempts = 5 ≥ subjectAttemptLimit.
    for (let attempt = 0; attempt < RISK_POLICY.subjectAttemptLimit; attempt += 1) {
      await service.evaluate(SUBJECT, { subjectId: SUBJECT_ID });
    }

    const decision = await service.evaluate(SUBJECT, {
      subjectId: SUBJECT_ID,
      ageYears: 15,
      device: {
        deviceId: 'dev-emulator-01',
        fingerprint: 'fp-emulator-01',
        emulatorIndicators: ['goldfish_emulator', 'framework_hooks'],
        tamperDetected: true,
      },
    });

    expect(decision.outcome).toBe('block');
    for (const code of decision.reasonCodes) {
      expect(RISK_REASON_CODES).toContain(code);
    }
    expect(decision.reasonCodes).toContain('DEVICE_TAMPER_SIGNAL');
    expect(decision.reasonCodes).toContain('DEVICE_EMULATOR_SIGNAL');
    expect(decision.reasonCodes).toContain('VELOCITY_SUBJECT_ATTEMPTS_EXCEEDED');
    expect(decision.reasonCodes).toContain('AGE_BELOW_MINIMUM');

    // Velocity yang dibaca memang dari store, bukan angka tetap.
    const velocity = asRecord(decision.signals.velocity);
    expect(velocity.status).toBe('present');
    expect((velocity.value as { subjectAttempts: number }).subjectAttempts).toBe(
      RISK_POLICY.subjectAttemptLimit,
    );
  });

  test('Set isyarat risiko rendah => outcome allow dengan RISK_NO_RULE_TRIGGERED', async () => {
    const { service } = harness();
    await service.setAgeConsent(SUBJECT, { subjectId: SUBJECT_ID, granted: true });
    await service.registerTrustedDevice(SUBJECT, {
      subjectId: SUBJECT_ID,
      deviceId: 'dev-good-01',
      fingerprint: 'fp-good-01',
    });

    const decision = await service.evaluate(SUBJECT, {
      subjectId: SUBJECT_ID,
      ageYears: 30,
      device: { deviceId: 'dev-good-01', fingerprint: 'fp-good-01' },
    });

    expect(decision.outcome).toBe('allow');
    expect(decision.reasonCodes).toEqual(['RISK_NO_RULE_TRIGGERED']);
    expect(decision.signals.device.status).toBe('present');
    expect(decision.signals.age.status).toBe('present');
    expect(decision.signals.velocity.status).toBe('present');
    expect(decision.unknownSignals).toEqual([]);
    expect(decision.otp.required).toBe(false);
    expect(decision.otp.status).toBe('not_required');

    // Peranti yang didaftarkan + cap jari sepadan ⇒ `trusted` dan cap jari BETUL.
    const device = asRecord(decision.signals.device);
    expect((device.value as { trusted: boolean }).trusted).toBe(true);
    expect((device.value as { fingerprintMatched: boolean | null }).fingerprintMatched).toBe(true);
  });
});

describe('REF-01 — OTP: tiada provider ⇒ tiada cabaran, tiada "code sent" reka', () => {
  test('Tiada provider OTP => unavailable + OTP_PROVIDER_UNAVAILABLE + tiada cabaran disimpan', async () => {
    const { store, service } = harness();
    await service.setAgeConsent(FOUNDER, { subjectId: SUBJECT_ID, granted: true });

    // Peranti tidak pernah didaftarkan ⇒ DEVICE_NOT_RECOGNIZED (severity challenge)
    // ⇒ keputusan benar-benar memerlukan cabaran OTP.
    const decision = await service.evaluate(SUBJECT, {
      subjectId: SUBJECT_ID,
      ageYears: 30,
      device: { deviceId: 'dev-unknown-01', fingerprint: 'fp-unknown-01' },
    });

    expect(decision.otp.required).toBe(true);
    expect(decision.otp.status).toBe('unavailable');
    expect(decision.otp.reasonCode).toBe('OTP_PROVIDER_UNAVAILABLE');
    expect(decision.outcome).toBe('challenge_unavailable');
    expect(decision.otp.challengeId).toBeUndefined();
    expect(decision.reasonCodes).toContain('OTP_PROVIDER_UNAVAILABLE');

    // Tiada apa-apa disimpan dalam store cabaran OTP: tiada kod, tiada "dihantar".
    expect(store.all(RISK_OTP_CHALLENGE_KIND)).toHaveLength(0);
  });

  test('Endpoint permintaan OTP tanpa provider => 503 OTP_PROVIDER_UNAVAILABLE', async () => {
    const root = `var/lib/qa/ref01-otp-${process.pid}-${Date.now()}`;
    mkdirSync(root, { recursive: true });
    const router = new FreeModelRouter();
    router.setMockHandler(async () => ({
      providerId: 'local_rules',
      model: 'local_rules',
      content: 'Ujian tempatan.',
      status: 'local_rules',
    }));
    const app = createPlatformApp({
      databasePath: `${root}/platform.sqlite`,
      bootstrapToken: 'ref01-bootstrap-token',
      origin: 'http://localhost:3000',
      freeModelRouter: router,
    });

    try {
      const signup = await app.fetch(
        new Request('http://localhost:3000/api/platform/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
          body: JSON.stringify({
            email: 'ref01-subject@test.local',
            password: 'password123456',
            name: 'Subject REF-01',
          }),
        }),
      );
      expect(signup.status).toBe(200);
      const cookie = signup.headers.get('set-cookie')!;
      const csrf = (await signup.clone().json() as { data: { csrfToken: string } }).data.csrfToken;

      const post = (path: string, body: unknown) =>
        app.fetch(
          new Request(`http://localhost:3000/api/platform${path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
              Cookie: cookie,
              'x-csrf-token': csrf,
            },
            body: JSON.stringify(body),
          }),
        );

      const consent = await post('/risk/consents', { granted: true });
      expect(consent.status).toBe(200);

      const evaluated = await post('/risk/evaluate', {
        // Umur dihantar supaya isyarat umur `present` (consent sudah direkodkan);
        // tanpa itu isyarat umur `unknown` dan severity bukan `challenge`, jadi
        // keputusan tidak akan memerlukan OTP langsung.
        ageYears: 30,
        device: { deviceId: 'dev-http-01', fingerprint: 'fp-http-01' },
      });
      expect(evaluated.status).toBe(200);
      const decision = (await evaluated.json() as { data: { id: string; otp: { status: string } } }).data;
      expect(decision.otp.status).toBe('unavailable');

      const requested = await post('/risk/otp/request', { decisionId: decision.id });
      const body = (await requested.json()) as { ok: boolean; code?: string; message?: string };
      expect(requested.status).toBe(503);
      expect(body.ok).toBe(false);
      expect(body.code).toBe('OTP_PROVIDER_UNAVAILABLE');

      // Tiada rahsia/tandatangan dalam badan respons, dan tiada cabaran disimpan.
      expect(JSON.stringify(body)).not.toContain('secret');
      expect(app.store.all(RISK_OTP_CHALLENGE_KIND)).toHaveLength(0);
    } finally {
      app.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('REF-01 — laluan appeal: rekod server-owned + state machine', () => {
  test('Submit => submitted + event pertama, transitions disahkan, transition haram => 409', async () => {
    const { service } = harness();
    const decision = await service.evaluate(SUBJECT, { subjectId: SUBJECT_ID });

    const reason = 'Saya tersilap masukkan nombor telefon.';
    const appeal = service.submitAppeal(SUBJECT, { decisionId: decision.id, reason });

    expect(appeal.state).toBe('submitted');
    expect(appeal.reason).toBe(reason);
    expect(appeal.submittedBy).toBe(SUBJECT_ID);
    expect(appeal.decisionId).toBe(decision.id);
    expect(appeal.events).toHaveLength(1);
    expect(appeal.events[0].from).toBeNull();
    expect(appeal.events[0].to).toBe('submitted');
    expect(appeal.events[0].actorId).toBe(SUBJECT_ID);

    // NEGATIF: 'submitted' → 'approved' secara terus ialah transition haram.
    let illegal: DomainError | null = null;
    try {
      service.reviewAppeal(FOUNDER, appeal.id, { action: 'approve' });
    } catch (error) {
      illegal = error as DomainError;
    }
    expect(illegal).toBeInstanceOf(DomainError);
    expect(illegal!.code).toBe('INVALID_APPEAL_TRANSITION');
    expect(illegal!.status).toBe(409);

    // Appeal kekal ada selepas transition haram (tiada state hilang).
    const afterIllegal = service.appeal(FOUNDER, appeal.id);
    expect(afterIllegal.state).toBe('submitted');
    expect(afterIllegal.events).toHaveLength(1);
    expect(service.listAppeals(FOUNDER).map((entry) => entry.id)).toContain(appeal.id);

    // POSITIF: 'submitted' → 'under_review' → 'approved', setiap satu menambah event.
    const underReview = service.reviewAppeal(FOUNDER, appeal.id, { action: 'start' });
    expect(underReview.state).toBe('under_review');
    expect(underReview.events).toHaveLength(2);
    expect(underReview.events[1].from).toBe('submitted');
    expect(underReview.events[1].to).toBe('under_review');
    expect(underReview.revision).toBe(appeal.revision + 1);

    const approved = service.reviewAppeal(FOUNDER, appeal.id, { action: 'approve' });
    expect(approved.state).toBe('approved');
    expect(approved.events).toHaveLength(3);
    expect(approved.events[2].from).toBe('under_review');
    expect(approved.events[2].to).toBe('approved');

    // NEGATIF: 'approved' ialah terminal — tiada outgoing transition.
    let terminalError: DomainError | null = null;
    try {
      service.reviewAppeal(FOUNDER, appeal.id, { action: 'reject' });
    } catch (error) {
      terminalError = error as DomainError;
    }
    expect(terminalError).toBeInstanceOf(DomainError);
    expect(terminalError!.code).toBe('INVALID_APPEAL_TRANSITION');
    expect(terminalError!.status).toBe(409);
    expect(service.appeal(FOUNDER, appeal.id).state).toBe('approved');
  });
});
