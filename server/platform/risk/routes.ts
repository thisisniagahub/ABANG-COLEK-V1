import type { Principal } from '../auth';
import { fail, oneOf } from '../store';
import { RISK_POLICY, type RiskDecision } from '../../../shared/risk-contracts';
import type { RiskService } from './service';

export interface RiskRouteContext {
  service: RiskService;
}

/**
 * REF-01 — Laluan HTTP risk referral.
 *
 * Handler ini Async kerana langkah OTP memanggil provider luaran. Ia dipasang
 * dalam lapisan `fetch()` aplikasi platform (bukan `route()` yang sinkron),
 * jadi orchestrator perlu menggunakan corak yang sama seperti
 * `/backup/trigger`.
 *
 * Authority datang daripada SESI server sahaja: `actor` dihantar oleh
 * `auth.resolve(request)`. Tiada actor, role, tenant atau akaun yang boleh
 * dihantar oleh pelayar pernah menjadi tuntutan keutamaan.
 */
export function createRiskRoutes(context: RiskRouteContext) {
  const { service } = context;
  return {
    async handle(
      actor: Principal,
      method: string,
      path: string,
      input: unknown,
    ): Promise<unknown | undefined> {
      const segments = path.split('/').filter(Boolean);
      if (method === 'GET') {
        if (path === '/risk/policy') return RISK_POLICY;
        if (path === '/risk/decisions') return service.decisions(actor);
        if (segments[0] === 'risk' && segments[1] === 'decisions' && segments[2]) {
          return service.decision(actor, segments[2]);
        }
        if (path === '/risk/appeals') return service.listAppeals(actor);
        if (segments[0] === 'risk' && segments[1] === 'appeals' && segments[2]) {
          return service.appeal(actor, segments[2]);
        }
        if (path === '/risk/devices') {
          return service.trustedDevices(actor, undefined);
        }
        if (path === '/risk/consents') return service.consents(actor, undefined);
        return undefined;
      }
      if (method !== 'POST') return undefined;
      if (path === '/risk/evaluate') {
        return service.evaluate(actor, input) as Promise<RiskDecision>;
      }
      if (path === '/risk/devices') {
        return service.registerTrustedDevice(actor, input);
      }
      if (path === '/risk/consents') {
        return service.setAgeConsent(actor, input);
      }
      if (path === '/risk/otp/request') {
        const outcome = await service.requestOtp(actor, input);
        if (outcome.otp.status === 'unavailable') {
          // Tiada provider OTP sebenar: ini penolakan jujur, bukan "code sent".
          fail(
            'OTP_PROVIDER_UNAVAILABLE',
            503,
            'Penyedia OTP belum disahkan. Cabaran OTP tidak boleh dihantar.',
          );
        }
        return outcome;
      }
      if (path === '/risk/otp/verify') {
        return service.verifyOtp(actor, input);
      }
      if (path === '/risk/appeals') {
        return service.submitAppeal(actor, input);
      }
      if (segments[0] === 'risk' && segments[1] === 'appeals' && segments[2]) {
        if (segments[3] === 'review') {
          return service.reviewAppeal(actor, segments[2], input);
        }
        if (segments[3] === 'withdraw') {
          return service.withdrawAppeal(actor, segments[2]);
        }
      }
      return undefined;
    },
  };
}

/** Helper kecil untuk lane lain yang mahu menyatakan senioriti secara eksplisit. */
export function riskOutcomeOf(decision: RiskDecision): string {
  return oneOf(decision.outcome, [
    'allow',
    'review',
    'block',
    'challenge_required',
    'challenge_unavailable',
  ] as const);
}
