import { Auth } from '../auth';
import type { Principal } from '../auth';
import { fail, fields, id, integer, now, object, strings, text, PlatformStore } from '../store';
import {
  RISK_POLICY,
  RISK_POLICY_VERSION,
  RISK_REASON_SEVERITY,
  decideRiskOutcome,
  worstRiskSeverity,
  type AgeSignalValue,
  type DeviceSignalValue,
  type RiskConsent,
  type RiskConsentScope,
  type RiskDecision,
  type RiskOtpState,
  type RiskReasonCode,
  type RiskSeverity,
  type RiskSignal,
  type RiskSignalName,
  type RiskTrustedDevice,
  type VelocitySignalValue,
} from '../../../shared/risk-contracts';
import { OtpService } from './otp';

export const RISK_DECISION_KIND = 'risk_decisions';
export const RISK_TRUSTED_DEVICE_KIND = 'risk_trusted_devices';
export const RISK_CONSENT_KIND = 'risk_consents';

/** Rekod keputusan — menyimpan peranti yang.observe supaya velocity boleh dikira. */
export interface RiskDecisionRecord extends RiskDecision {
  deviceId?: string;
}

export interface RiskDeviceInput {
  deviceId?: string;
  fingerprint?: string;
  emulatorIndicators?: string[];
  tamperDetected?: boolean;
}

export interface RiskEvaluationRequest {
  subjectId: string;
  referralCode?: string;
  device?: RiskDeviceInput;
  ageYears?: number;
}

interface TriggeredRule {
  code: RiskReasonCode;
  severity: RiskSeverity;
}

export interface RiskEngineOptions {
  otp?: OtpService;
}

/**
 * REF-01 — Enjin risk referral.
 *
 * Enjin ini:
 * - hanya menggunakan input yang benar-benar ada (peranti, velocity, umur);
 * - tidak pernah menggantikan isyarat yang hilang dengan `0`/`false`;
 * - tidak pernah menjana skor; ia hanya menghasilkan reason code daripada
 *   peraturan deterministik;
 * - tidak pernah mendakwa OTP dihantar tanpa provider sebenar;
 * - membaca isyarat umur HANYA selepas persetujuan direkodkan.
 */
export class RiskEngine {
  readonly otp: OtpService;

  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
    options: RiskEngineOptions = {},
  ) {
    this.otp = options.otp ?? new OtpService(store);
  }

  /** Subjek hanya boleh dinilai sendiri, kecuali pengasas. */
  private assertSubjectAccess(actor: Principal, subjectId: string): void {
    if (subjectId === actor.user.id) return;
    this.auth.founder(actor);
  }

  private parse(actor: Principal, raw: unknown): RiskEvaluationRequest {
    const input = object(raw);
    fields(input, ['subjectId', 'referralCode', 'device', 'ageYears']);
    const subjectId =
      input.subjectId === undefined ? actor.user.id : text(input.subjectId, 'ID subjek', 120);
    this.assertSubjectAccess(actor, subjectId);
    let device: RiskDeviceInput | undefined;
    if (input.device !== undefined) {
      const value = object(input.device);
      fields(value, ['deviceId', 'fingerprint', 'emulatorIndicators', 'tamperDetected']);
      device = {
        ...(value.deviceId === undefined ? {} : { deviceId: text(value.deviceId, 'ID peranti', 200) }),
        ...(value.fingerprint === undefined
          ? {}
          : { fingerprint: text(value.fingerprint, 'Cap jari peranti', 200) }),
        emulatorIndicators:
          value.emulatorIndicators === undefined ? [] : strings(value.emulatorIndicators, 20),
        tamperDetected: value.tamperDetected === true,
      };
    }
    return {
      subjectId,
      ...(input.referralCode === undefined
        ? {}
        : { referralCode: text(input.referralCode, 'Kod referral', 32) }),
      ...(device === undefined ? {} : { device }),
      ...(input.ageYears === undefined ? {} : { ageYears: integer(input.ageYears, 'Umur', 0, 200) }),
    };
  }

  private trustedDevice(subjectId: string, deviceId: string): RiskTrustedDevice | null {
    return (
      this.store
        .all<RiskTrustedDevice>(RISK_TRUSTED_DEVICE_KIND)
        .find(
          (device) => device.subjectId === subjectId && device.deviceId === deviceId,
        ) ?? null
    );
  }

  /**
   * Isyarat peranti. Ketiadaan ID/cap jari ialah `unknown` — bukan peranti
   * "percaya". Peranti yang tidak pernah didaftarkan masih `present` kerana
   * pemerhatian itu sah (peranti ini bukan dalam daftar).
   */
  private deviceSignal(
    subjectId: string,
    device: RiskDeviceInput | undefined,
  ): RiskSignal<'device', DeviceSignalValue> {
    if (!device?.deviceId || !device.fingerprint) {
      return {
        status: 'unknown',
        name: 'device',
        reasonCode: 'DEVICE_SIGNAL_MISSING',
        detail: 'ID peranti dan cap jari diperlukan untuk menilai isyarat peranti.',
      };
    }
    const registered = this.trustedDevice(subjectId, device.deviceId);
    const emulatorIndicators = device.emulatorIndicators ?? [];
    const tamperDetected = device.tamperDetected === true;
    if (!registered) {
      return {
        status: 'present',
        name: 'device',
        value: {
          deviceId: device.deviceId,
          trusted: false,
          fingerprintMatched: null,
          emulatorIndicators,
          tamperDetected,
        },
      };
    }
    return {
      status: 'present',
      name: 'device',
      value: {
        deviceId: device.deviceId,
        trusted: true,
        fingerprintMatched: registered.fingerprint === device.fingerprint,
        emulatorIndicators,
        tamperDetected,
      },
    };
  }

  /**
   * Isyarat velocity — dikira daripada rekod sebenar dalam store (keputusan
   * risk terdahulu dan pesanan yang membawa kod referral yang sama).
   */
  private velocitySignal(
    subjectId: string,
    referralCode: string | undefined,
  ): RiskSignal<'velocity', VelocitySignalValue> {
    const windowMinutes = RISK_POLICY.velocityWindowMinutes;
    try {
      const since = Date.now() - windowMinutes * 60_000;
      const decisions = this.store
        .all<RiskDecisionRecord>(RISK_DECISION_KIND)
        .filter(
          (decision) =>
            decision.subjectId === subjectId && Date.parse(decision.evaluatedAt) >= since,
        );
      const devices = new Set<string>();
      for (const decision of decisions) if (decision.deviceId) devices.add(decision.deviceId);
      let referralCodeAttempts = 0;
      if (referralCode) {
        referralCodeAttempts += decisions.filter(
          (decision) => decision.referralCode === referralCode,
        ).length;
        referralCodeAttempts += this.store
          .all<{ referralCode?: string }>('orders')
          .filter((order) => order.referralCode === referralCode).length;
      }
      return {
        status: 'present',
        name: 'velocity',
        value: {
          windowMinutes,
          subjectAttempts: decisions.length,
          distinctDeviceCount: devices.size,
          referralCodeAttempts,
          source: 'platform_store',
        },
      };
    } catch {
      return {
        status: 'unknown',
        name: 'velocity',
        reasonCode: 'VELOCITY_SOURCE_UNAVAILABLE',
        detail: 'Sumber velocity (store platform) tidak dapat dibaca.',
      };
    }
  }

  /**
   * Isyarat umur. TANPA persetujuan direkodkan, umur tidak boleh dibaca dan
   * nilai yang dihantar oleh pelayar TIDAK pernah dimasukkan ke dalam
   * keputusan.
   */
  private ageSignal(
    subjectId: string,
    ageYears: number | undefined,
  ): RiskSignal<'age', AgeSignalValue> {
    const consent = this.ageConsent(subjectId);
    if (!consent || !consent.granted) {
      return {
        status: 'unknown',
        name: 'age',
        reasonCode: 'AGE_SIGNAL_CONSENT_MISSING',
        detail: 'Tiada persetujuan direkodkan untuk membaca isyarat umur.',
      };
    }
    if (ageYears === undefined) {
      return {
        status: 'unknown',
        name: 'age',
        reasonCode: 'AGE_SIGNAL_MISSING',
        detail: 'Umur tidak dihantar.',
      };
    }
    return {
      status: 'present',
      name: 'age',
      value: { years: ageYears, consentId: consent.id, consentedAt: consent.grantedAt },
    };
  }

  /** Peraturan deterministik. Tiada skor, hanya reason code. */
  private rules(
    device: RiskSignal<'device', DeviceSignalValue>,
    velocity: RiskSignal<'velocity', VelocitySignalValue>,
    age: RiskSignal<'age', AgeSignalValue>,
  ): TriggeredRule[] {
    const triggered: TriggeredRule[] = [];
    const push = (code: RiskReasonCode) => {
      triggered.push({ code, severity: RISK_REASON_SEVERITY[code] });
    };
    if (device.status === 'unknown') {
      push(device.reasonCode);
    } else {
      const value = device.value;
      if (value.tamperDetected) push('DEVICE_TAMPER_SIGNAL');
      if (value.emulatorIndicators.length) push('DEVICE_EMULATOR_SIGNAL');
      if (value.trusted && value.fingerprintMatched === false) push('DEVICE_FINGERPRINT_MISMATCH');
      if (!value.trusted) push('DEVICE_NOT_RECOGNIZED');
    }
    if (velocity.status === 'unknown') {
      push(velocity.reasonCode);
    } else {
      const value = velocity.value;
      if (value.subjectAttempts >= RISK_POLICY.subjectAttemptLimit) {
        push('VELOCITY_SUBJECT_ATTEMPTS_EXCEEDED');
      } else if (value.subjectAttempts >= RISK_POLICY.subjectAttemptElevated) {
        push('VELOCITY_SUBJECT_ATTEMPTS_ELEVATED');
      }
      if (value.distinctDeviceCount >= RISK_POLICY.distinctDeviceLimit) {
        push('VELOCITY_DISTINCT_DEVICE_COUNT_EXCEEDED');
      }
      if (value.referralCodeAttempts >= RISK_POLICY.referralCodeAttemptLimit) {
        push('VELOCITY_REFERRAL_CODE_ATTEMPTS_EXCEEDED');
      }
    }
    if (age.status === 'unknown') {
      push(age.reasonCode);
    } else {
      const years = age.value.years;
      if (years < RISK_POLICY.ageMinimumYears) push('AGE_BELOW_MINIMUM');
      if (years > RISK_POLICY.ageMaximumYears) push('AGE_ABOVE_MAXIMUM');
    }
    return triggered;
  }

  private destinationFor(subjectId: string): string {
    const row = this.store.db
      .query<{ email: string }, [string]>('SELECT email FROM users WHERE id=?')
      .get(subjectId);
    return row?.email ?? '';
  }

  /**
   * Menilai satu referral dan menyimpan keputusannya.
   *
   * Jika keputusan memerlukan cabaran OTP dan tiada provider, keputusan
   * berakhir sebagai `challenge_unavailable` dengan reason code
   * `OTP_PROVIDER_UNAVAILABLE` — TIDAK pernah "code sent".
   */
  async evaluate(actor: Principal, raw: unknown): Promise<RiskDecisionRecord> {
    const request = this.parse(actor, raw);
    const device = this.deviceSignal(request.subjectId, request.device);
    const velocity = this.velocitySignal(request.subjectId, request.referralCode);
    const age = this.ageSignal(request.subjectId, request.ageYears);
    const triggered = this.rules(device, velocity, age);
    const severity = worstRiskSeverity(triggered.map((rule) => rule.severity));
    const reasonCodes: RiskReasonCode[] = [];
    for (const rule of triggered) if (!reasonCodes.includes(rule.code)) reasonCodes.push(rule.code);
    if (device.status === 'unknown' || velocity.status === 'unknown' || age.status === 'unknown') {
      if (!reasonCodes.includes('RISK_SIGNAL_UNKNOWN')) reasonCodes.push('RISK_SIGNAL_UNKNOWN');
    }
    if (reasonCodes.length === 0) reasonCodes.push('RISK_NO_RULE_TRIGGERED');

    const decisionId = id();
    const otpRequired = severity === 'challenge';
    let otp: RiskOtpState = { required: otpRequired, status: 'not_required' };
    if (otpRequired) {
      const creation = await this.otp.create(
        decisionId,
        request.subjectId,
        this.destinationFor(request.subjectId),
      );
      otp = creation.otp;
      if (otp.status === 'unavailable' && !reasonCodes.includes('OTP_PROVIDER_UNAVAILABLE')) {
        reasonCodes.push('OTP_PROVIDER_UNAVAILABLE');
      }
      if (otp.status === 'failed' && !reasonCodes.includes('OTP_DELIVERY_FAILED')) {
        reasonCodes.push('OTP_DELIVERY_FAILED');
      }
    }
    const outcome = decideRiskOutcome(
      triggered.map((rule) => rule.severity),
      otp.status === 'pending_verification',
    );
    const unknownSignals: RiskSignalName[] = [];
    if (device.status === 'unknown') unknownSignals.push('device');
    if (velocity.status === 'unknown') unknownSignals.push('velocity');
    if (age.status === 'unknown') unknownSignals.push('age');
    const record: RiskDecisionRecord = {
      id: decisionId,
      subjectId: request.subjectId,
      ...(request.referralCode === undefined ? {} : { referralCode: request.referralCode }),
      outcome,
      severity,
      reasonCodes,
      signals: { device, velocity, age },
      unknownSignals,
      otp,
      policyVersion: RISK_POLICY_VERSION,
      revision: 1,
      evaluatedAt: now(),
      ...(request.device?.deviceId === undefined ? {} : { deviceId: request.device.deviceId }),
    };
    this.store.save(RISK_DECISION_KIND, record);
    this.store.audit(actor.user.id, 'risk.evaluate', record.id, record.revision);
    return record;
  }

  decision(decisionId: string): RiskDecisionRecord | null {
    return this.store.get<RiskDecisionRecord>(RISK_DECISION_KIND, decisionId);
  }

  decisions(subjectId?: string): RiskDecisionRecord[] {
    const all = this.store.all<RiskDecisionRecord>(RISK_DECISION_KIND);
    return subjectId ? all.filter((decision) => decision.subjectId === subjectId) : all;
  }

  ageConsent(subjectId: string): RiskConsent | null {
    return (
      this.store
        .all<RiskConsent>(RISK_CONSENT_KIND)
        .find(
          (consent) =>
            consent.subjectId === subjectId && consent.scope === ('age_signal' as RiskConsentScope),
        ) ?? null
    );
  }

  /** Direkodkan atau dicabut oleh subjek (atau pengasas bagi pihak subjek). */
  setAgeConsent(actor: Principal, raw: unknown): RiskConsent {
    const input = object(raw);
    fields(input, ['subjectId', 'granted']);
    const subjectId =
      input.subjectId === undefined ? actor.user.id : text(input.subjectId, 'ID subjek', 120);
    this.assertSubjectAccess(actor, subjectId);
    if (typeof input.granted !== 'boolean') fail('INVALID_INPUT', 400, 'Flag persetujuan tidak sah.');
    const existing = this.ageConsent(subjectId);
    const timestamp = now();
    const consent: RiskConsent = existing
      ? {
          ...existing,
          granted: input.granted,
          grantedAt: input.granted ? timestamp : existing.grantedAt,
          ...(input.granted ? { revokedAt: undefined } : { revokedAt: timestamp }),
          actorId: actor.user.id,
          revision: existing.revision + 1,
        }
      : {
          id: id(),
          subjectId,
          scope: 'age_signal',
          granted: input.granted,
          grantedAt: timestamp,
          ...(input.granted ? {} : { revokedAt: timestamp }),
          actorId: actor.user.id,
          revision: 1,
        };
    this.store.save(RISK_CONSENT_KIND, consent);
    this.store.audit(actor.user.id, 'risk.consent.set', consent.id, consent.revision);
    return consent;
  }

  /** Mendaftarkan peranti yang dipercayai untuk subjek. */
  registerTrustedDevice(actor: Principal, raw: unknown): RiskTrustedDevice {
    const input = object(raw);
    fields(input, ['subjectId', 'deviceId', 'fingerprint']);
    const subjectId =
      input.subjectId === undefined ? actor.user.id : text(input.subjectId, 'ID subjek', 120);
    this.assertSubjectAccess(actor, subjectId);
    const deviceId = text(input.deviceId, 'ID peranti', 200);
    const fingerprint = text(input.fingerprint, 'Cap jari peranti', 200);
    const existing = this.trustedDevice(subjectId, deviceId);
    const device: RiskTrustedDevice = existing
      ? {
          ...existing,
          fingerprint,
          registeredAt: now(),
          registeredBy: actor.user.id,
          revision: existing.revision + 1,
        }
      : {
          id: id(),
          subjectId,
          deviceId,
          fingerprint,
          registeredAt: now(),
          registeredBy: actor.user.id,
          revision: 1,
        };
    this.store.save(RISK_TRUSTED_DEVICE_KIND, device);
    this.store.audit(actor.user.id, 'risk.device.register', device.id, device.revision);
    return device;
  }

  trustedDevices(subjectId: string): RiskTrustedDevice[] {
    return this.store
      .all<RiskTrustedDevice>(RISK_TRUSTED_DEVICE_KIND)
      .filter((device) => device.subjectId === subjectId);
  }
}
