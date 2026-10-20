/**
 * REF-01 — Laluan risk referral (entry Vercel).
 *
 * Fail ini ialah NAMA LALUAN yang stabil untuk laluan risk. Ia tidak
 * membuka pangkalan data kedua: persistence produksi dikendalikan oleh
 * aplikasi platform (`api/platform.ts` → `server/platform/app.ts`), jadi
 * entry ini mendelegasikan ke aplikasi platform yang sama seperti
 * `api/platform/[...path].ts` lakukan.
 *
 * Implementasi sebenar:
 *   - `server/platform/risk/engine.ts` (isyarat peranti/velocity/umur),
 *   - `server/platform/risk/otp.ts` (langkah OTP, `OTP_PROVIDER_UNAVAILABLE`),
 *   - `server/platform/risk/appeals.ts` (appeal store + state machine),
 *   - `server/platform/risk/routes.ts` (kontrak HTTP).
 *
 * Kontrak: `shared/risk-contracts.ts`.
 *
 * NOTA WIRING: sehingga `server/platform/app.ts` memasang laluan `/risk/*`
 * (snippet ada dalam laporan lane ini), entry ini akan menjawab 404
 * `NOT_FOUND` daripada aplikasi platform — iaitu jujur, bukan kejayaan reka.
 */

export {
  createRiskRoutes,
  RiskAppeals,
  RiskEngine,
  RiskService,
  OtpService,
  RISK_APPEAL_KIND,
  RISK_CONSENT_KIND,
  RISK_DECISION_KIND,
  RISK_OTP_CHALLENGE_KIND,
  RISK_TRUSTED_DEVICE_KIND,
} from '../../../server/platform/risk';
export {
  RISK_APPEAL_STATES,
  RISK_APPEAL_TRANSITIONS,
  RISK_OUTCOMES,
  RISK_POLICY,
  RISK_POLICY_VERSION,
  RISK_REASON_CODES,
  RISK_REASON_SEVERITY,
} from '../../../shared/risk-contracts';

export { default } from '../../platform';
