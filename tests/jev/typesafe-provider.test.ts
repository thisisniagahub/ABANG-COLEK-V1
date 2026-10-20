import { describe, expect, test } from 'bun:test';
import {
  buildTypeSafeRequest,
  evaluateWithTypeSafe,
  interpretTypeSafeResponse,
  postSystemOne,
  resolveNativeThresholds,
  resolveTypeSafeEligibility,
  TYPESAFE_DEFAULT_MODEL,
  TYPESAFE_SYSTEM_ONE_PATH,
} from '../../server/platform/jev/typesafeProvider';
import type { JevState } from '../../shared/jev-contracts';

const ENTITLED_ENV = {
  TYPESAFE_API_KEY: 'test-only-key',
  JEV_NATIVE_ENABLED: 'true',
  JEV_NATIVE_TERMS_ACCEPTED: 'true',
  JEV_NATIVE_DATA_HANDLING_APPROVED: 'true',
};

const GATEWAY_ENTITLED_ENV = {
  KILO_API_KEY: 'kilo-test-key',
  JEV_NATIVE_ENABLED: 'true',
  JEV_NATIVE_TERMS_ACCEPTED: 'true',
  JEV_NATIVE_DATA_HANDLING_APPROVED: 'true',
  JEV_NATIVE_SPEND_APPROVED: 'true',
};

const supportState: JevState = { text: 'Botol bocor sejak semalam, saya mahu refund.' };

function supportAnswers(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    intent: { type: 'choice', choice: 'COMPLAINT', confidence: 0.82, probabilities: { COMPLAINT: 0.7, REFUND: 0.1, LOCATION_QUERY: 0.05, AGENT_APPLICATION: 0.05, PURCHASE: 0.05, UNKNOWN: 0.05 } },
    issue: { type: 'choice', choice: 'LEAKAGE', confidence: 0.9, probabilities: { LEAKAGE: 0.8, SEAL_FAILURE: 0.05, DELIVERY_DELAY: 0.05, PAYMENT: 0.05, UNKNOWN: 0.05 } },
    rootCause: { type: 'choice', choice: 'UNDETERMINED', confidence: 0.95, probabilities: { UNDETERMINED: 0.9, UNDER_INVESTIGATION: 0.04, VERIFIED: 0.03, REJECTED: 0.03 } },
    urgency: { type: 'score', score: 1.8, confidence: 0.7, legend: { '0': 'Routine', '1': 'Needs attention', '2': 'Urgent review', '3': 'Potential safety incident' }, probabilities: { '0': 0.1, '1': 0.1, '2': 0.7, '3': 0.1 } },
    refundRequested: { type: 'noul', noul: 0.95 },
    humanRequested: { type: 'noul', noul: 0.05 },
    ...overrides,
  };
}

function systemOneResponse(answers: Record<string, unknown>) {
  return { model: 'jev-1.13', answers, usage: { input_tokens: 210, output_tokens: 18 } };
}

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
}

describe('TypeSafe System One request mapping', () => {
  test('builds one request per pack with typed choice, score and noul questions', () => {
    const request = buildTypeSafeRequest('support', supportState);

    expect(request.model).toBe(TYPESAFE_DEFAULT_MODEL);
    expect(Object.keys(request.questions)).toEqual(['intent', 'issue', 'rootCause', 'urgency', 'refundRequested', 'humanRequested']);
    expect(request.questions.intent.type).toBe('choice');
    expect(request.questions.urgency.type).toBe('score');
    expect(request.questions.refundRequested.type).toBe('noul');
    expect(request.state.text).toBe(supportState.text);
  });

  test('choice options carry a meaningful description instead of the bare option name', () => {
    const request = buildTypeSafeRequest('support', supportState);
    const criteria = (request.questions.intent as { criteria: Record<string, string> }).criteria;

    expect(criteria.COMPLAINT).toContain('fault');
    expect(criteria.REFUND).toContain('money back');
    expect(Object.values(criteria).every(value => value !== value.toUpperCase())).toBe(true);
  });

  test('score levels stay ordered and noul questions state what yes and no mean', () => {
    const request = buildTypeSafeRequest('support', supportState);
    const score = request.questions.urgency as { criteria: string[] };
    const noul = request.questions.refundRequested as { criteria?: { true: string; false: string } };

    expect(score.criteria).toEqual(['Routine', 'Needs attention', 'Urgent review', 'Potential safety incident']);
    expect(noul.criteria?.true).toContain('refund');
    expect(noul.criteria?.false).toContain('No explicit refund request');
  });

  test('server-authoritative fact questions are never asked of the model', () => {
    const request = buildTypeSafeRequest('order_exception', { text: 'Order A-1', facts: { paymentVerified: true, canonicalPriceKnown: null } });

    expect(Object.keys(request.questions)).toEqual(['exception', 'readiness']);
    expect(request.questions.paymentVerified).toBeUndefined();
    expect(request.questions.canonicalPriceKnown).toBeUndefined();
  });
});

describe('TypeSafe eligibility and thresholds', () => {
  test('native stays locked until credentials, terms and data handling are all approved', () => {
    const empty = resolveTypeSafeEligibility({});
    expect(empty.eligible).toBe(false);
    expect(empty.reasonCodes).toEqual(['TYPESAFE_CREDENTIALS_MISSING', 'JEV_NATIVE_DISABLED', 'JEV_NATIVE_TERMS_NOT_ACCEPTED', 'JEV_NATIVE_DATA_HANDLING_NOT_APPROVED']);

    const partial = resolveTypeSafeEligibility({ ...ENTITLED_ENV, JEV_NATIVE_TERMS_ACCEPTED: 'false' });
    expect(partial.eligible).toBe(false);
    expect(partial.reasonCodes).toEqual(['JEV_NATIVE_TERMS_NOT_ACCEPTED']);

    expect(resolveTypeSafeEligibility(ENTITLED_ENV).eligible).toBe(true);
  });

  test('the Kilo gateway transport needs its own key and an explicit spend approval', () => {
    const gateway = resolveTypeSafeEligibility({ ...GATEWAY_ENTITLED_ENV, JEV_NATIVE_SPEND_APPROVED: 'false' }, 'kilo_gateway');
    expect(gateway.eligible).toBe(false);
    expect(gateway.reasonCodes).toEqual(['JEV_NATIVE_SPEND_NOT_APPROVED']);

    const missingKey = resolveTypeSafeEligibility({ ...GATEWAY_ENTITLED_ENV, KILO_API_KEY: '' }, 'kilo_gateway');
    expect(missingKey.reasonCodes).toContain('KILO_GATEWAY_CREDENTIALS_MISSING');

    expect(resolveTypeSafeEligibility(GATEWAY_ENTITLED_ENV, 'kilo_gateway').eligible).toBe(true);
  });

  test('thresholds fall back to documented defaults when the environment is invalid', () => {
    expect(resolveNativeThresholds({})).toEqual({ minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });
    expect(resolveNativeThresholds({ JEV_NATIVE_MIN_CONFIDENCE: '0.9' }).minConfidence).toBe(0.9);
    expect(resolveNativeThresholds({ JEV_NATIVE_MIN_CONFIDENCE: 'not-a-number' }).minConfidence).toBe(0.6);
  });
});

describe('TypeSafe response interpretation', () => {
  test('maps a valid response to typed answers and keeps the raw judgment reusable', () => {
    const interpretation = interpretTypeSafeResponse('support', supportState, systemOneResponse(supportAnswers()), { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });

    expect(interpretation.uncertain).toEqual([]);
    expect(interpretation.answers.intent).toEqual({ type: 'choice', choice: 'COMPLAINT', confidence: 0.82, probabilities: { COMPLAINT: 0.7, REFUND: 0.1, LOCATION_QUERY: 0.05, AGENT_APPLICATION: 0.05, PURCHASE: 0.05, UNKNOWN: 0.05 } });
    expect(interpretation.answers.refundRequested).toEqual({ type: 'noul', noul: 0.95 });
    expect(Object.keys(interpretation.observations)).toHaveLength(6);
    expect(interpretation.answerProvenance.intent).toBe('MODEL_JUDGMENT');
  });

  test('rejects a distribution that does not match the offered options instead of coercing it', () => {
    const answers = supportAnswers({ intent: { type: 'choice', choice: 'COMPLAINT', confidence: 0.9, probabilities: { COMPLAINT: 0.7, REFUND: 0.3 } } });
    const interpretation = interpretTypeSafeResponse('support', supportState, systemOneResponse(answers), { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });

    expect(interpretation.answers.intent).toBeUndefined();
    expect(interpretation.validationErrors).toContain('intent:DISTRIBUTION_INVALID');
    expect(interpretation.uncertain).toContain('intent');
  });

  test('rejects a choice that is not the maximum of its own distribution', () => {
    const answers = supportAnswers({ intent: { type: 'choice', choice: 'REFUND', confidence: 0.9, probabilities: { COMPLAINT: 0.7, REFUND: 0.3, LOCATION_QUERY: 0, AGENT_APPLICATION: 0, PURCHASE: 0, UNKNOWN: 0 } } });
    const interpretation = interpretTypeSafeResponse('support', supportState, systemOneResponse(answers), { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });

    expect(interpretation.answers.intent).toBeUndefined();
    expect(interpretation.validationErrors).toContain('intent:CHOICE_DISTRIBUTION_MISMATCH');
  });

  test('gates low-confidence judgments but keeps them as observations', () => {
    const answers = supportAnswers({ intent: { type: 'choice', choice: 'COMPLAINT', confidence: 0.4, probabilities: { COMPLAINT: 0.7, REFUND: 0.1, LOCATION_QUERY: 0.05, AGENT_APPLICATION: 0.05, PURCHASE: 0.05, UNKNOWN: 0.05 } } });
    const interpretation = interpretTypeSafeResponse('support', supportState, systemOneResponse(answers), { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });

    expect(interpretation.answers.intent).toBeUndefined();
    expect(interpretation.observations.intent).toBeDefined();
    expect(interpretation.validationErrors).toContain('intent:LOW_CONFIDENCE');
  });

  test('treats a noul near 0.5 as uncertain instead of a decision', () => {
    const answers = supportAnswers({ refundRequested: { type: 'noul', noul: 0.52 } });
    const interpretation = interpretTypeSafeResponse('support', supportState, systemOneResponse(answers), { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });

    expect(interpretation.answers.refundRequested).toBeUndefined();
    expect(interpretation.validationErrors).toContain('refundRequested:NOUL_UNCERTAIN');
  });

  test('reads server facts directly and never asks the model about them', () => {
    const state: JevState = { text: 'Order A-1', facts: { paymentVerified: true, canonicalPriceKnown: null } };
    const interpretation = interpretTypeSafeResponse('order_exception', state, systemOneResponse({}), { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 });

    expect(interpretation.answers.paymentVerified).toEqual({ type: 'noul', noul: 1 });
    expect(interpretation.answerProvenance.paymentVerified).toBe('SERVER_FACT');
    expect(interpretation.answers.canonicalPriceKnown).toBeUndefined();
    expect(interpretation.validationErrors).toContain('canonicalPriceKnown:FACT_UNAVAILABLE');
  });
});

describe('TypeSafe provider evaluation', () => {
  test('never calls the provider while the native gate is closed', async () => {
    let calls = 0;
    const assessment = await evaluateWithTypeSafe('support', supportState, {
      env: {},
      fetchImpl: (async () => { calls += 1; return new Response('{}', { status: 200 }); }) as unknown as typeof fetch,
    });

    expect(calls).toBe(0);
    expect(assessment.status).toBe('UNAVAILABLE');
    expect(assessment.providerMode).toBe('TYPESAFE_NATIVE');
    expect(assessment.receipt).toBeUndefined();
    expect(assessment.abstentionReasons).toContain('JEV_NATIVE_DISABLED');
    expect(assessment.policy.outcome).toBe('REVIEW_REQUIRED');
  });

  test('a native judgment stays advisory and never authorises a transaction', async () => {
    const assessment = await evaluateWithTypeSafe('support', supportState, {
      env: ENTITLED_ENV,
      fetchImpl: jsonFetch(systemOneResponse(supportAnswers())),
    });

    expect(assessment.status).toBe('NATIVE_JUDGMENT');
    expect(assessment.answers.intent).toBeDefined();
    expect(assessment.observations.humanRequested).toEqual({ type: 'noul', noul: 0.05 });
    expect(assessment.policy.outcome).toBe('REVIEW_REQUIRED');
    expect(assessment.policy.reasonCodes).toContain('AUTHORITATIVE_POLICY_AND_APPROVAL_REQUIRED');
    expect(assessment.policy.reasonCodes).toContain('NO_AUTOMATIC_REFUND');
    expect(assessment.receipt?.transport).toBe('fixture');
    expect(assessment.receipt?.usage).toEqual({ inputTokens: 210, outputTokens: 18 });
    expect(assessment.receipt?.requestQuestionIds).toContain('intent');
  });

  test('abstains instead of inventing an answer when the provider response is broken', async () => {
    const assessment = await evaluateWithTypeSafe('support', supportState, {
      env: ENTITLED_ENV,
      fetchImpl: jsonFetch(systemOneResponse({ intent: { type: 'choice', choice: 'COMPLAINT', confidence: 0.9, probabilities: { COMPLAINT: 0.9 } } })),
    });

    expect(assessment.status).toBe('ABSTAIN');
    expect(assessment.answers).toEqual({});
    expect(assessment.validationErrors?.length).toBeGreaterThan(0);
    expect(assessment.policy.outcome).toBe('REVIEW_REQUIRED');
  });

  test('maps provider failures to reason codes without leaking the response body', async () => {
    const assessment = await evaluateWithTypeSafe('support', supportState, {
      env: ENTITLED_ENV,
      fetchImpl: jsonFetch({ detail: 'internal provider note' }, 429),
    });

    expect(assessment.status).toBe('UNAVAILABLE');
    expect(assessment.abstentionReasons).toEqual(['JEV_NATIVE_RATE_LIMITED']);
    expect(JSON.stringify(assessment)).not.toContain('internal provider note');
  });

  test('an exhausted Kilo balance is reported as a balance failure, not a model failure', async () => {
    const assessment = await evaluateWithTypeSafe('support', supportState, {
      env: GATEWAY_ENTITLED_ENV,
      transport: 'kilo_gateway',
      fetchImpl: jsonFetch({ error: { message: 'Insufficient balance. Please add credits to continue.', code: 402 } }, 402),
    });

    expect(assessment.status).toBe('UNAVAILABLE');
    expect(assessment.abstentionReasons).toEqual(['JEV_NATIVE_BALANCE_EXHAUSTED']);
  });

  test('the Kilo gateway transport posts to the documented System One passthrough', async () => {
    let seenUrl = '', seenInit: RequestInit | undefined, seenBody: unknown;
    const fetchImpl: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seenUrl = String(input);
      seenInit = init;
      seenBody = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify(systemOneResponse(supportAnswers())), { status: 200 });
    }) as unknown as typeof fetch;

    const assessment = await evaluateWithTypeSafe('support', supportState, { env: GATEWAY_ENTITLED_ENV, transport: 'kilo_gateway', fetchImpl });

    expect(seenUrl).toBe('https://ai-gateway.kilo.ai/api/v1/systemone');
    expect((seenInit?.headers as Record<string, string>).Authorization).toBe('Bearer kilo-test-key');
    expect((seenBody as { model: string }).model).toBe('typesafe/jev-1.13');
    expect(assessment.receipt?.endpoint).toBe('https://ai-gateway.kilo.ai/api/v1/systemone');
    expect(assessment.status).toBe('NATIVE_JUDGMENT');
  });

  test('a stalled provider call is stopped by the deadline', async () => {
    const stalled: typeof fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })) as unknown as typeof fetch;

    const assessment = await evaluateWithTypeSafe('support', supportState, { env: ENTITLED_ENV, fetchImpl: stalled, timeoutMs: 5 });

    expect(assessment.status).toBe('UNAVAILABLE');
    expect(assessment.abstentionReasons).toEqual(['JEV_NATIVE_TIMEOUT']);
  });
});

describe('TypeSafe transport contract', () => {
  test('posts to the documented System One endpoint with a bearer token', async () => {
    let seenUrl = '', seenInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seenUrl = String(input);
      seenInit = init;
      return new Response(JSON.stringify(systemOneResponse(supportAnswers())), { status: 200 });
    }) as unknown as typeof fetch;

    const outcome = await postSystemOne(buildTypeSafeRequest('support', supportState), { apiKey: 'test-only-key', fetchImpl });

    expect(outcome.ok).toBe(true);
    expect(seenUrl).toBe(`https://api.typesafe.ai${TYPESAFE_SYSTEM_ONE_PATH}`);
    expect((seenInit?.headers as Record<string, string>).Authorization).toBe('Bearer test-only-key');
    expect(seenInit?.method).toBe('POST');
  });

  test('refuses a non-https endpoint and a missing key before any network call', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = (async () => { calls += 1; return new Response('{}'); }) as unknown as typeof fetch;

    expect(await postSystemOne(buildTypeSafeRequest('support', supportState), { apiKey: 'k', baseUrl: 'http://insecure.example', fetchImpl })).toEqual({ ok: false, reasonCode: 'JEV_NATIVE_ENDPOINT_INVALID' });
    expect(await postSystemOne(buildTypeSafeRequest('support', supportState), { apiKey: '  ', fetchImpl })).toEqual({ ok: false, reasonCode: 'TYPESAFE_CREDENTIALS_MISSING' });
    expect(calls).toBe(0);
  });
});
