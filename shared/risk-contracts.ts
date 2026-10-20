/**
 * REF-01 — Kontrak risk referral (typed, server-owned).
 *
 * Prinsip yang dikuatkuasakan oleh kontrak ini:
 *
 * 1. INPUT HILANG = TIDAK DIKETAHUI, BUKAN SIFAR.
 *    Setiap isyarat hanya boleh berstatus `present` (dengan nilai sebenar yang
 *    diperoleh daripada keadaan sebenar) atau `unknown` (dengan reason code).
 *    Tiada laluan yang menukar `unknown` kepada `0`/`false`/`''`.
 * 2. SETIAP KEPUTUSAN MEMBAWA REASON CODE MESIN-BACA.
 *    Tiada verdict free-text. `detail` hanyalah nota human; ia tidak pernah
 *    menentukan keputusan.
 * 3. TIDAK ADA OTP YANG DIHANTAR TANPA PROVIDER SEBENAR.
 *    Langkah OTP mesti berakhir dengan `OTP_PROVIDER_UNAVAILABLE` apabila
 *    tiada provider — bukan "code sent" yang direka.
 * 4. APPEAL ADALAH REKOD SERVER-OWNED.
 *    Appeal mempunyai sebab, pelaku, dan state machine; ia bukan baris log.
 * 5. KEBENARAN UMUR PERLU PERSETUJUAN.
 *    Tanpa persetujuan yang direkodkan, isyarat umur tidak boleh dibaca; ia
 *    kekal `unknown` dan keputusan tidak boleh menjadi `allow` (fail closed).
 */

/** Versi dasar kata risk. */
export const RISK_POLICY_VERSION = 1;

export const RISK_SIGNAL_NAMES = ['device', 'velocity', 'age'] as const;
export type RiskSignalName = (typeof RISK_SIGNAL_NAMES)[number];

export const RISK_SEVERITIES = ['info', 'challenge', 'review', 'block'] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const RISK_OUTCOMES = [
  'allow',
  'review',
  'block',
  'challenge_required',
  'challenge_unavailable',
] as const;
export type RiskOutcome = (typeof RISK_OUTCOMES)[number];

export const RISK_REASON_CODES = [
  'RISK_NO_RULE_TRIGGERED',
  'RISK_SIGNAL_UNKNOWN',
  'DEVICE_SIGNAL_MISSING',
  'DEVICE_NOT_RECOGNIZED',
  'DEVICE_TAMPER_SIGNAL',
  'DEVICE_EMULATOR_SIGNAL',
  'DEVICE_FINGERPRINT_MISMATCH',
  'VELOCITY_SOURCE_UNAVAILABLE',
  'VELOCITY_SUBJECT_ATTEMPTS_ELEVATED',
  'VELOCITY_SUBJECT_ATTEMPTS_EXCEEDED',
  'VELOCITY_DISTINCT_DEVICE_COUNT_EXCEEDED',
  'VELOCITY_REFERRAL_CODE_ATTEMPTS_EXCEEDED',
  'AGE_SIGNAL_MISSING',
  'AGE_SIGNAL_CONSENT_MISSING',
  'AGE_BELOW_MINIMUM',
  'AGE_ABOVE_MAXIMUM',
  'OTP_PROVIDER_UNAVAILABLE',
  'OTP_DELIVERY_FAILED',
  'OTP_CHALLENGE_EXPIRED',
  'OTP_CODE_INVALID',
  'OTP_VERIFIED',
  'APPEAL_SUBMITTED',
  'APPEAL_UNDER_REVIEW',
  'APPEAL_APPROVED',
  'APPEAL_REJECTED',
  'APPEAL_WITHDRAWN',
] as const;
export type RiskReasonCode = (typeof RISK_REASON_CODES)[number];

/**
 * Severity setiap reason code. Map ini ialah penjagaan: sebarang reason code
 * baharu mesti ditambah di sini, jadi senioriti tidak boleh "terlupa".
 */
export const RISK_REASON_SEVERITY: Readonly<Record<RiskReasonCode, RiskSeverity>> = {
  RISK_NO_RULE_TRIGGERED: 'info',
  RISK_SIGNAL_UNKNOWN: 'review',
  DEVICE_SIGNAL_MISSING: 'review',
  DEVICE_NOT_RECOGNIZED: 'challenge',
  DEVICE_TAMPER_SIGNAL: 'block',
  DEVICE_EMULATOR_SIGNAL: 'block',
  DEVICE_FINGERPRINT_MISMATCH: 'block',
  VELOCITY_SOURCE_UNAVAILABLE: 'review',
  VELOCITY_SUBJECT_ATTEMPTS_ELEVATED: 'challenge',
  VELOCITY_SUBJECT_ATTEMPTS_EXCEEDED: 'block',
  VELOCITY_DISTINCT_DEVICE_COUNT_EXCEEDED: 'block',
  VELOCITY_REFERRAL_CODE_ATTEMPTS_EXCEEDED: 'block',
  AGE_SIGNAL_MISSING: 'review',
  AGE_SIGNAL_CONSENT_MISSING: 'review',
  AGE_BELOW_MINIMUM: 'review',
  AGE_ABOVE_MAXIMUM: 'review',
  OTP_PROVIDER_UNAVAILABLE: 'challenge',
  OTP_DELIVERY_FAILED: 'challenge',
  OTP_CHALLENGE_EXPIRED: 'review',
  OTP_CODE_INVALID: 'review',
  OTP_VERIFIED: 'info',
  APPEAL_SUBMITTED: 'info',
  APPEAL_UNDER_REVIEW: 'info',
  APPEAL_APPROVED: 'info',
  APPEAL_REJECTED: 'info',
  APPEAL_WITHDRAWN: 'info',
};

const SEVERITY_RANK: Readonly<Record<RiskSeverity, number>> = {
  info: 0,
  challenge: 1,
  review: 2,
  block: 3,
};

/** Senioriti tertinggi daripada senarai; `info` apabila senarai kosong. */
export function worstRiskSeverity(severities: readonly RiskSeverity[]): RiskSeverity {
  let worst: RiskSeverity = 'info';
  for (const severity of severities) {
    if (SEVERITY_RANK[severity] > SEVERITY_RANK[worst]) worst = severity;
  }
  return worst;
}

/**
 * Beberapa senioriti boleh dicetuskan serentak, jadi `block` sentiasa menang,
 * kemudian `review`, kemudian `challenge`.
 */
export function decideRiskOutcome(
  severities: readonly RiskSeverity[],
  otpAvailable: boolean,
): RiskOutcome {
  const worst = worstRiskSeverity(severities);
  if (worst === 'block') return 'block';
  if (worst === 'review') return 'review';
  if (worst === 'challenge') return otpAvailable ? 'challenge_required' : 'challenge_unavailable';
  return 'allow';
}

/** Ambang dasar kata risk. Semua nombor adalah integer dan deterministik. */
export const RISK_POLICY = {
  version: RISK_POLICY_VERSION,
  ageMinimumYears: 18,
  ageMaximumYears: 120,
  velocityWindowMinutes: 1440,
  subjectAttemptElevated: 3,
  subjectAttemptLimit: 5,
  distinctDeviceLimit: 3,
  referralCodeAttemptLimit: 20,
  otpTtlMs: 10 * 60_000,
  otpCodeLength: 6,
  otpMaxAttempts: 5,
} as const;

export type RiskSignalStatus = 'present' | 'unknown';

export interface UnknownRiskSignal<N extends RiskSignalName = RiskSignalName> {
  status: 'unknown';
  name: N;
  reasonCode: RiskReasonCode;
  /** Nota human sahaja; tidak pernah menentukan keputusan. */
  detail: string;
}

export interface PresentRiskSignal<N extends RiskSignalName = RiskSignalName, T = unknown> {
  status: 'present';
  name: N;
  value: T;
}

export type RiskSignal<
  N extends RiskSignalName = RiskSignalName,
  T = unknown,
> = PresentRiskSignal<N, T> | UnknownRiskSignal<N>;

/**
 * Nilai isyarat peranti. `fingerprintMatched === null` bermaksud perbandingan
 * tidak dapat dibuat (peranti tidak pernah didaftarkan) — ia TIDAK bermaksud
 * padanan.
 */
export interface DeviceSignalValue {
  deviceId: string;
  trusted: boolean;
  fingerprintMatched: boolean | null;
  emulatorIndicators: string[];
  tamperDetected: boolean;
}

/** Nilai isyarat velocity — dikira daripada rekod sebenar dalam store. */
export interface VelocitySignalValue {
  windowMinutes: number;
  subjectAttempts: number;
  distinctDeviceCount: number;
  referralCodeAttempts: number;
  source: 'platform_store';
}

/** Nilai isyarat umur — hanya boleh dibaca selepas persetujuan direkodkan. */
export interface AgeSignalValue {
  years: number;
  consentId: string;
  consentedAt: string;
}

export const RISK_OTP_STATUSES = [
  'not_required',
  'pending_verification',
  'verified',
  'unavailable',
  'failed',
  'expired',
] as const;
export type RiskOtpStatus = (typeof RISK_OTP_STATUSES)[number];

export interface RiskOtpState {
  required: boolean;
  status: RiskOtpStatus;
  reasonCode?: RiskReasonCode;
  challengeId?: string;
  expiresAt?: string;
  providerId?: string;
}

export interface RiskDecision {
  id: string;
  subjectId: string;
  referralCode?: string;
  outcome: RiskOutcome;
  severity: RiskSeverity;
  reasonCodes: RiskReasonCode[];
  signals: {
    device: RiskSignal<'device', DeviceSignalValue>;
    velocity: RiskSignal<'velocity', VelocitySignalValue>;
    age: RiskSignal<'age', AgeSignalValue>;
  };
  unknownSignals: RiskSignalName[];
  otp: RiskOtpState;
  policyVersion: number;
  revision: number;
  evaluatedAt: string;
}

export const RISK_APPEAL_STATES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'withdrawn',
] as const;
export type RiskAppealState = (typeof RISK_APPEAL_STATES)[number];

/** State machine appeal. Terminal state tiada outgoing transition. */
export const RISK_APPEAL_TRANSITIONS: Readonly<Record<RiskAppealState, readonly RiskAppealState[]>> = {
  submitted: ['under_review', 'withdrawn'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export interface RiskAppealEvent {
  from: RiskAppealState | null;
  to: RiskAppealState;
  at: string;
  actorId: string;
  note?: string;
}

export interface RiskAppeal {
  id: string;
  decisionId: string;
  subjectId: string;
  reason: string;
  state: RiskAppealState;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  events: RiskAppealEvent[];
}

export const RISK_CONSENT_SCOPES = ['age_signal'] as const;
export type RiskConsentScope = (typeof RISK_CONSENT_SCOPES)[number];

export interface RiskConsent {
  id: string;
  subjectId: string;
  scope: RiskConsentScope;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  actorId: string;
  revision: number;
}

export interface RiskTrustedDevice {
  id: string;
  subjectId: string;
  deviceId: string;
  fingerprint: string;
  registeredAt: string;
  registeredBy: string;
  revision: number;
}
