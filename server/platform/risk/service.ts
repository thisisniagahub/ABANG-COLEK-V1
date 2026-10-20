import { Auth } from '../auth';
import type { Principal } from '../auth';
import { fail, fields, object, text, PlatformStore } from '../store';
import {
  RISK_REASON_SEVERITY,
  worstRiskSeverity,
  type RiskAppeal,
  type RiskDecision,
  type RiskOtpState,
  type RiskReasonCode,
  type RiskTrustedDevice,
} from '../../../shared/risk-contracts';
import { RiskAppeals } from './appeals';
import { RISK_DECISION_KIND, RiskEngine, type RiskDecisionRecord } from './engine';
import { OtpService, type OtpProvider } from './otp';

export interface RiskServiceOptions {
  otp?: OtpService;
  /** Provider OTP sebenar. Tiada provider ⇒ `OTP_PROVIDER_UNAVAILABLE`. */
  otpProvider?: OtpProvider;
}

/**
 * REF-01 — Fasad risk referral.
 *
 * Menyatukan enjin, perkhidmatan OTP dan laluan appeal di bawah satu
 * pintu masuk server-owned.
 */
export class RiskService {
  readonly otp: OtpService;
  readonly engine: RiskEngine;
  readonly appeals: RiskAppeals;

  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
    options: RiskServiceOptions = {},
  ) {
    this.otp =
      options.otp ??
      new OtpService(store, options.otpProvider ? { provider: options.otpProvider } : {});
    this.engine = new RiskEngine(store, auth, { otp: this.otp });
    this.appeals = new RiskAppeals(store, auth);
  }

  private visible(actor: Principal, decision: RiskDecisionRecord): void {
    if (decision.subjectId === actor.user.id) return;
    this.auth.founder(actor);
  }

  evaluate(actor: Principal, raw: unknown): Promise<RiskDecisionRecord> {
    return this.engine.evaluate(actor, raw);
  }

  decisions(actor: Principal): RiskDecisionRecord[] {
    if (this.auth.has(actor, 'founder')) return this.engine.decisions();
    return this.engine.decisions(actor.user.id);
  }

  decision(actor: Principal, decisionId: string): RiskDecisionRecord {
    const decision = this.engine.decision(decisionId);
    if (!decision) fail('NOT_FOUND', 404, 'Keputusan risk tidak ditemui.');
    this.visible(actor, decision);
    return decision;
  }

  /** Minta cabaran OTP untuk keputusan yang memerlukannya. */
  async requestOtp(
    actor: Principal,
    raw: unknown,
  ): Promise<{ decisionId: string; otp: RiskOtpState }> {
    const input = object(raw);
    fields(input, ['decisionId']);
    const decisionId = text(input.decisionId, 'ID keputusan', 120);
    const decision = this.decision(actor, decisionId);
    if (!decision.otp.required) fail('OTP_NOT_REQUIRED', 409, 'Keputusan ini tidak memerlukan OTP.');
    if (decision.otp.status === 'verified') {
      fail('OTP_ALREADY_VERIFIED', 409, 'OTP untuk keputusan ini telah disahkan.');
    }
    const destination = this.store.db
      .query<{ email: string }, [string]>('SELECT email FROM users WHERE id=?')
      .get(decision.subjectId)?.email ?? '';
    const creation = await this.otp.create(decision.id, decision.subjectId, destination);
    const updated: RiskDecisionRecord = {
      ...decision,
      otp: creation.otp,
      revision: decision.revision + 1,
      reasonCodes: this.withOtpReason(decision.reasonCodes, creation.otp),
    };
    this.store.save(RISK_DECISION_KIND, updated);
    this.store.audit(actor.user.id, 'risk.otp.request', updated.id, updated.revision);
    return { decisionId: updated.id, otp: updated.otp };
  }

  /** Mengesahkan kod OTP dan mengemas kini keputusan. */
  verifyOtp(
    actor: Principal,
    raw: unknown,
  ): { decisionId: string; otp: RiskOtpState; outcome: RiskDecision['outcome'] } {
    const input = object(raw);
    fields(input, ['challengeId', 'code']);
    const challengeId = text(input.challengeId, 'ID cabaran', 120);
    const code = text(input.code, 'Kod OTP', 32, 4);
    const challenge = this.otp.verify(challengeId, code);
    const decision = this.engine.decision(challenge.decisionId);
    if (!decision) fail('NOT_FOUND', 404, 'Keputusan risk tidak ditemui.');
    this.visible(actor, decision);
    const remaining = decision.reasonCodes.filter(
      (reason) => RISK_REASON_SEVERITY[reason] !== 'challenge',
    );
    const worst = worstRiskSeverity(
      remaining.map((reason) => RISK_REASON_SEVERITY[reason]),
    );
    let outcome = decision.outcome;
    let severity = decision.severity;
    let reasonCodes: RiskReasonCode[] = [...decision.reasonCodes];
    if (worst === 'info') {
      outcome = 'allow';
      severity = 'info';
      reasonCodes = [
        ...remaining.filter((reason) => reason !== 'RISK_NO_RULE_TRIGGERED'),
        'OTP_VERIFIED',
      ];
    }
    const otp: RiskOtpState = { ...decision.otp, status: 'verified', reasonCode: 'OTP_VERIFIED' };
    const updated: RiskDecisionRecord = {
      ...decision,
      otp,
      outcome,
      severity,
      reasonCodes,
      revision: decision.revision + 1,
    };
    this.store.save(RISK_DECISION_KIND, updated);
    this.store.audit(actor.user.id, 'risk.otp.verify', updated.id, updated.revision);
    return { decisionId: updated.id, otp, outcome: updated.outcome };
  }

  private withOtpReason(
    reasonCodes: RiskReasonCode[],
    otp: RiskOtpState,
  ): RiskReasonCode[] {
    const next = [...reasonCodes];
    if (otp.status === 'unavailable' && !next.includes('OTP_PROVIDER_UNAVAILABLE')) {
      next.push('OTP_PROVIDER_UNAVAILABLE');
    }
    if (otp.status === 'failed' && !next.includes('OTP_DELIVERY_FAILED')) {
      next.push('OTP_DELIVERY_FAILED');
    }
    return next;
  }

  setAgeConsent(actor: Principal, raw: unknown) {
    return this.engine.setAgeConsent(actor, raw);
  }

  registerTrustedDevice(actor: Principal, raw: unknown): RiskTrustedDevice {
    return this.engine.registerTrustedDevice(actor, raw);
  }

  trustedDevices(actor: Principal, subjectId: string | undefined): RiskTrustedDevice[] {
    const subject = subjectId ?? actor.user.id;
    if (subject !== actor.user.id) this.auth.founder(actor);
    return this.engine.trustedDevices(subject);
  }

  consents(actor: Principal, subjectId: string | undefined) {
    const subject = subjectId ?? actor.user.id;
    if (subject !== actor.user.id) this.auth.founder(actor);
    const consent = this.engine.ageConsent(subject);
    return consent ? [consent] : [];
  }

  submitAppeal(actor: Principal, raw: unknown): RiskAppeal {
    return this.appeals.submit(actor, raw);
  }

  listAppeals(actor: Principal): RiskAppeal[] {
    return this.appeals.list(actor);
  }

  appeal(actor: Principal, appealId: string): RiskAppeal {
    return this.appeals.get(actor, appealId);
  }

  reviewAppeal(actor: Principal, appealId: string, raw: unknown): RiskAppeal {
    return this.appeals.review(actor, appealId, raw);
  }

  withdrawAppeal(actor: Principal, appealId: string): RiskAppeal {
    return this.appeals.withdraw(actor, appealId);
  }
}
