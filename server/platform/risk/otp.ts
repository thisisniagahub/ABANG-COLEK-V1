import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { fail, id, now, PlatformStore } from '../store';
import { RISK_POLICY, type RiskOtpState, type RiskReasonCode } from '../../../shared/risk-contracts';

/**
 * REF-01 — Langkah OTP.
 *
 * Tiada penyedia SMS/e-mel disahkan dalam repo ini. Oleh itu lalai TIDAK
 * pernah kedengaran sebagai "code sent":
 *
 * - Tanpa provider, `create()` memulangkan `OTP_PROVIDER_UNAVAILABLE` dan
 *   TIDAK mencipta sebarang cabaran (tiada kod dijana, tiada rekod "dihantar").
 * - Kod hanya dijana apabila provider benar-benar wujud, dan dihantar
 *   melalui provider tersebut sahaja.
 * - Kod itu sendiri tidak disimpan: hanya `sha256(salt + code)` disimpan bersama
 *   salt, jadi rekod bocor tidak mendedahkan kod.
 */

export const RISK_OTP_CHALLENGE_KIND = 'risk_otp_challenges';

export interface OtpDeliveryRequest {
  challengeId: string;
  /** Destinasi yang ditetapkan server (e-mel akaun yang disahkan). */
  destinationRef: string;
  /** Kod untuk dihantar oleh provider. */
  code: string;
  expiresAt: string;
}

export type OtpDeliveryResult =
  | { status: 'sent'; providerId: string; providerReference: string }
  | { status: 'failed'; providerId: string; reasonCode: RiskReasonCode };

/**
 * Provider OTP sebenar. Implementasi luar talian wajib mengembalikan
 * `providerReference` yang berasal daripada provider — rujukan reka tidak
 * boleh diterima oleh lapisan ini.
 */
export interface OtpProvider {
  readonly id: string;
  deliver(request: OtpDeliveryRequest): Promise<OtpDeliveryResult>;
}

export interface OtpChallengeRecord {
  id: string;
  decisionId: string;
  subjectId: string;
  codeHash: string;
  codeSalt: string;
  attempts: number;
  maxAttempts: number;
  state: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
  destinationRef: string;
  providerId?: string;
  providerReference?: string;
  verifiedAt?: string;
}

export interface OtpCreationOutcome {
  otp: RiskOtpState;
  challenge: OtpChallengeRecord | null;
}

export interface OtpServiceOptions {
  provider?: OtpProvider;
  ttlMs?: number;
  codeLength?: number;
  maxAttempts?: number;
}

const hashCode = (salt: string, code: string) =>
  createHash('sha256').update(`${salt}:${code}`).digest('hex');

export class OtpService {
  readonly ttlMs: number;
  readonly codeLength: number;
  readonly maxAttempts: number;

  constructor(
    readonly store: PlatformStore,
    readonly options: OtpServiceOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? RISK_POLICY.otpTtlMs;
    this.codeLength = options.codeLength ?? RISK_POLICY.otpCodeLength;
    this.maxAttempts = options.maxAttempts ?? RISK_POLICY.otpMaxAttempts;
  }

  /** True hanya apabila provider sebenar disuntik. */
  isAvailable(): boolean {
    return Boolean(this.options.provider);
  }

  providerId(): string | null {
    return this.options.provider?.id ?? null;
  }

  challenge(challengeId: string): OtpChallengeRecord | null {
    return this.store.get<OtpChallengeRecord>(RISK_OTP_CHALLENGE_KIND, challengeId);
  }

  /**
   * Mencipta dan menghantar cabaran OTP.
   *
   * Tanpa provider: tiada cabaran, tiada kod, dan `OTP_PROVIDER_UNAVAILABLE`.
   */
  async create(
    decisionId: string,
    subjectId: string,
    destinationRef: string,
  ): Promise<OtpCreationOutcome> {
    const provider = this.options.provider;
    if (!provider) {
      return {
        otp: { required: true, status: 'unavailable', reasonCode: 'OTP_PROVIDER_UNAVAILABLE' },
        challenge: null,
      };
    }
    if (!destinationRef) {
      return {
        otp: { required: true, status: 'failed', reasonCode: 'OTP_DELIVERY_FAILED' },
        challenge: null,
      };
    }
    const challengeId = id();
    const salt = randomBytes(16).toString('hex');
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    const record: OtpChallengeRecord = {
      id: challengeId,
      decisionId,
      subjectId,
      codeHash: hashCode(salt, code),
      codeSalt: salt,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      state: 'pending',
      createdAt: now(),
      expiresAt,
      destinationRef,
      providerId: provider.id,
    };
    let delivery: OtpDeliveryResult;
    try {
      delivery = await provider.deliver({
        challengeId,
        destinationRef,
        code,
        expiresAt,
      });
    } catch {
      delivery = { status: 'failed', providerId: provider.id, reasonCode: 'OTP_DELIVERY_FAILED' };
    }
    if (delivery.status === 'failed') {
      record.state = 'failed';
      this.store.save(RISK_OTP_CHALLENGE_KIND, record);
      return {
        otp: { required: true, status: 'failed', reasonCode: 'OTP_DELIVERY_FAILED', providerId: provider.id },
        challenge: record,
      };
    }
    record.providerReference = delivery.providerReference;
    this.store.save(RISK_OTP_CHALLENGE_KIND, record);
    return {
      otp: {
        required: true,
        status: 'pending_verification',
        challengeId,
        expiresAt,
        providerId: provider.id,
      },
      challenge: record,
    };
  }

  /**
   * Mengesahkan kod. Cubaan yang salah menambah kiraan; cabaran yang tamat
   * tempoh atau terkubur menjadi terminal dan tidak boleh diguna.
   */
  verify(challengeId: string, code: string): OtpChallengeRecord {
    const record = this.challenge(challengeId);
    if (!record) fail('OTP_CHALLENGE_NOT_FOUND', 404, 'Cabaran OTP tidak ditemui.');
    if (record.state === 'verified') fail('OTP_ALREADY_VERIFIED', 409, 'Cabaran OTP telah disahkan.');
    if (record.state === 'expired') fail('OTP_CHALLENGE_EXPIRED', 400, 'Cabaran OTP telah tamat tempoh.');
    if (record.state === 'failed') fail('OTP_ATTEMPTS_EXCEEDED', 429, 'Cabaran OTP telah gagal digunakan.');
    if (Date.parse(record.expiresAt) <= Date.now()) {
      record.state = 'expired';
      this.store.save(RISK_OTP_CHALLENGE_KIND, record);
      fail('OTP_CHALLENGE_EXPIRED', 400, 'Cabaran OTP telah tamat tempoh.');
    }
    if (record.attempts >= record.maxAttempts) {
      record.state = 'failed';
      this.store.save(RISK_OTP_CHALLENGE_KIND, record);
      fail('OTP_ATTEMPTS_EXCEEDED', 429, 'Cabaran OTP telah gagal digunakan.');
    }
    const expected = Buffer.from(record.codeHash, 'hex');
    const actual = Buffer.from(hashCode(record.codeSalt, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      record.attempts += 1;
      this.store.save(RISK_OTP_CHALLENGE_KIND, record);
      fail('OTP_CODE_INVALID', 400, 'Kod OTP tidak sah.');
    }
    record.state = 'verified';
    record.verifiedAt = now();
    this.store.save(RISK_OTP_CHALLENGE_KIND, record);
    return record;
  }

  private generateCode(): string {
    const length = this.codeLength;
    const upper = 10 ** length;
    return String(randomInt(0, upper)).padStart(length, '0');
  }
}
