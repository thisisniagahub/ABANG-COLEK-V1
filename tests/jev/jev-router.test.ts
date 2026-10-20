import { describe, expect, test } from 'bun:test';
import {
  createBudgetState,
  decideJevRoute,
  DEFAULT_NATIVE_MAX_CALLS_PER_DAY,
  recordNativeCall,
  recordNativeFailure,
  resolveNativeTransport,
} from '../../server/platform/jev/jevRouter';

const GATEWAY_ENV = {
  KILO_API_KEY: 'kilo-test-key',
  JEV_NATIVE_ENABLED: 'true',
  JEV_NATIVE_TERMS_ACCEPTED: 'true',
  JEV_NATIVE_DATA_HANDLING_APPROVED: 'true',
  JEV_NATIVE_SPEND_APPROVED: 'true',
};

const DIRECT_ENV = {
  TYPESAFE_API_KEY: 'direct-test-key',
  JEV_NATIVE_ENABLED: 'true',
  JEV_NATIVE_TERMS_ACCEPTED: 'true',
  JEV_NATIVE_DATA_HANDLING_APPROVED: 'true',
};

function budget(overrides: Partial<ReturnType<typeof createBudgetState>> = {}) {
  return { ...createBudgetState({}), ...overrides };
}

describe('JEV native router', () => {
  test('prefers the Kilo gateway because it needs no separate TypeSafe account', () => {
    const resolved = resolveNativeTransport({ ...GATEWAY_ENV, ...DIRECT_ENV });
    expect(resolved.transport).toBe('kilo_gateway');
    expect(resolved.reasonCodes).toEqual([]);
  });

  test('falls back to the direct TypeSafe API when the gateway is not usable', () => {
    const resolved = resolveNativeTransport({ ...DIRECT_ENV, JEV_NATIVE_SPEND_APPROVED: 'false' });
    expect(resolved.transport).toBe('typesafe_direct');
    expect(resolved.transportReasonCodes.kilo_gateway).toContain('JEV_NATIVE_SPEND_NOT_APPROVED');
  });

  test('no eligible transport means LOCAL_RULES with explicit reasons, never a silent fallback', () => {
    const resolved = resolveNativeTransport({});
    expect(resolved.transport).toBeNull();
    expect(resolved.reasonCodes).toEqual(['JEV_NATIVE_NO_ELIGIBLE_TRANSPORT']);
    expect(resolved.transportReasonCodes.kilo_gateway).toContain('KILO_GATEWAY_CREDENTIALS_MISSING');
  });

  test('a routed decision names the transport, the model and the remaining budget', () => {
    const decision = decideJevRoute({ env: GATEWAY_ENV, budget: budget() });
    expect(decision.mode).toBe('TYPESAFE_NATIVE');
    expect(decision.transport).toBe('kilo_gateway');
    expect(decision.model).toBe('typesafe/jev-1.13');
    expect(decision.budget.remaining).toBe(DEFAULT_NATIVE_MAX_CALLS_PER_DAY);
  });

  test('the daily call budget stops native before any request is attempted', () => {
    const decision = decideJevRoute({ env: GATEWAY_ENV, budget: budget({ callsUsed: 5, maxCallsPerDay: 5 }) });
    expect(decision.mode).toBe('LOCAL_RULES');
    expect(decision.reasonCodes).toEqual(['JEV_NATIVE_BUDGET_EXHAUSTED']);
    expect(decision.budget.remaining).toBe(0);
  });

  test('an exhausted balance puts native on cooldown instead of burning more calls', () => {
    const now = 1_700_000_000_000;
    const cooled = recordNativeFailure(budget(), 'JEV_NATIVE_BALANCE_EXHAUSTED', now, 60_000);
    expect(cooled.disabledUntil).toBe(now + 60_000);

    const decision = decideJevRoute({ env: GATEWAY_ENV, budget: cooled, now: now + 1_000 });
    expect(decision.mode).toBe('LOCAL_RULES');
    expect(decision.reasonCodes).toContain('JEV_NATIVE_COOLDOWN_ACTIVE');
    expect(decision.reasonCodes).toContain('JEV_NATIVE_BALANCE_EXHAUSTED');
    expect(decision.cooldownUntil).toBe(new Date(now + 60_000).toISOString());
  });

  test('a non-billing failure does not put native on cooldown', () => {
    const now = 1_700_000_000_000;
    const after = recordNativeFailure(budget(), 'JEV_NATIVE_PROVIDER_ERROR', now, 60_000);
    expect(after.disabledUntil).toBe(0);
    expect(decideJevRoute({ env: GATEWAY_ENV, budget: after, now }).mode).toBe('TYPESAFE_NATIVE');
  });

  test('each native call consumes exactly one unit of the daily budget', () => {
    const once = recordNativeCall(budget());
    expect(once.callsUsed).toBe(1);
    expect(once.maxCallsPerDay).toBe(DEFAULT_NATIVE_MAX_CALLS_PER_DAY);
  });

  test('an invalid daily cap falls back to the documented default', () => {
    expect(createBudgetState({ JEV_NATIVE_MAX_CALLS_PER_DAY: 'lots' }).maxCallsPerDay).toBe(DEFAULT_NATIVE_MAX_CALLS_PER_DAY);
    expect(createBudgetState({ JEV_NATIVE_MAX_CALLS_PER_DAY: '7' }).maxCallsPerDay).toBe(7);
  });
});
