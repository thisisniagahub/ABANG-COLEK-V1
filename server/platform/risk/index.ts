/**
 * REF-01 — Risk referral (risk engine, OTP, device/velocity/age signals,
 * reason codes, appeal path).
 *
 * Kontrak awam: `shared/risk-contracts.ts`.
 */

export {
  RISK_APPEAL_STATES,
  RISK_APPEAL_TRANSITIONS,
  RISK_CONSENT_SCOPES,
  RISK_OUTCOMES,
  RISK_POLICY,
  RISK_POLICY_VERSION,
  RISK_REASON_CODES,
  RISK_REASON_SEVERITY,
  RISK_SEVERITIES,
  RISK_SIGNAL_NAMES,
  decideRiskOutcome,
  worstRiskSeverity,
} from '../../../shared/risk-contracts';
export type {
  AgeSignalValue,
  DeviceSignalValue,
  RiskAppeal,
  RiskAppealEvent,
  RiskAppealState,
  RiskConsent,
  RiskConsentScope,
  RiskDecision,
  RiskOtpState,
  RiskOtpStatus,
  RiskOutcome,
  RiskReasonCode,
  RiskSeverity,
  RiskSignal,
  RiskTrustedDevice,
  VelocitySignalValue,
} from '../../../shared/risk-contracts';

export { RiskAppeals, RISK_APPEAL_KIND } from './appeals';
export {
  RiskEngine,
  RISK_CONSENT_KIND,
  RISK_DECISION_KIND,
  RISK_TRUSTED_DEVICE_KIND,
} from './engine';
export type { RiskDecisionRecord, RiskDeviceInput, RiskEvaluationRequest } from './engine';
export { OtpService, RISK_OTP_CHALLENGE_KIND } from './otp';
export type {
  OtpChallengeRecord,
  OtpCreationOutcome,
  OtpDeliveryRequest,
  OtpDeliveryResult,
  OtpProvider,
  OtpServiceOptions,
} from './otp';
export { RiskService } from './service';
export type { RiskServiceOptions } from './service';
export { createRiskRoutes } from './routes';
export type { RiskRouteContext } from './routes';
