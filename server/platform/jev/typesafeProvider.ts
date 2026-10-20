/**
 * ABANGCOLEK — TypeSafe System One provider untuk lapisan JEV.
 *
 * Rujukan kontrak:
 * - TypeSafe API: https://docs.typesafe.ai/api/system-one (POST /v1/systemone),
 *   primitives choice/score/noul, https://docs.typesafe.ai/primitives.
 * - Kilo AI Gateway: https://kilo.ai/docs/gateway/api-reference — ia mendedahkan
 *   passthrough System One yang sama (POST https://ai-gateway.kilo.ai/api/v1/systemone)
 *   dengan kunci akaun Kilo dan model `typesafe/jev-1.13`. Gateway mengisi
 *   Playground TypeSafe dengan Platform Credential sendiri, jadi akaun TypeSafe
 *   berasingan tidak diperlukan — tetapi penggunaan dibillah kepada baki Kilo.
 *
 * Prinsip yang dikekalkan:
 * - Kode memegang aliran. Model hanya memberi judgment typed (choice/score/noul)
 *   dan taburan kebarangkalian; tiada provider lain, tiada teks bebas.
 * - Tiada request tanpa kebenaran. Native kekal terkunci sehingga kelayakan,
 *   terma, pengendalian data dan (bagi gateway) kelulusan perbelanjaan
 *   disahkan secara eksplisit (polisi free-only:
 *   docs/research/2026-10-19-free-model-policy.md).
 * - Tiada nombor yang dikarang. Jawapan yang gagal validasi atau confidence
 *   rendah tidak dipaparkan sebagai fakta; ia dicatat sebagai abstention.
 * - Tiada model judgment melepaskan wang, stok, penerbitan atau sebarang
 *   side effect. Outcome kekal REVIEW_REQUIRED.
 */

import type {
  JevNativeAnswer,
  JevNativeAssessment,
  JevNativeThresholds,
  JevPackId,
  JevPolicy,
  JevQuestion,
  JevState,
} from '../../../shared/jev-contracts';
import { validateAnswer, validateState } from './assessment';
import { QUESTION_PACKS } from './questionRegistry';

export type JevNativeTransport = 'typesafe_direct' | 'kilo_gateway';

export interface JevNativeEndpoint {
  transport: JevNativeTransport;
  baseUrl: string;
  path: string;
  model: string;
  apiKeyEnv: string;
  credentialCode: string;
}

export const NATIVE_ENDPOINTS: Record<JevNativeTransport, JevNativeEndpoint> = {
  typesafe_direct: {
    transport: 'typesafe_direct',
    baseUrl: 'https://api.typesafe.ai',
    path: '/v1/systemone',
    model: 'jev-latest',
    apiKeyEnv: 'TYPESAFE_API_KEY',
    credentialCode: 'TYPESAFE_CREDENTIALS_MISSING',
  },
  kilo_gateway: {
    transport: 'kilo_gateway',
    baseUrl: 'https://ai-gateway.kilo.ai/api',
    path: '/v1/systemone',
    model: 'typesafe/jev-1.13',
    apiKeyEnv: 'KILO_API_KEY',
    credentialCode: 'KILO_GATEWAY_CREDENTIALS_MISSING',
  },
};

/**
 * Keutamaan router. Gateway didahulukan kerana ia tidak memerlukan akaun
 * TypeSafe berasingan; kedua-duanya memerlukan kelulusan perbelanjaan yang
 * sama. `typesafe_direct` kekal sebagai pilihan kedua.
 */
export const JEV_NATIVE_TRANSPORT_ORDER: readonly JevNativeTransport[] = ['kilo_gateway', 'typesafe_direct'];

export const TYPESAFE_API_BASE_URL = NATIVE_ENDPOINTS.typesafe_direct.baseUrl;
export const TYPESAFE_SYSTEM_ONE_PATH = NATIVE_ENDPOINTS.typesafe_direct.path;
export const TYPESAFE_DEFAULT_MODEL = NATIVE_ENDPOINTS.typesafe_direct.model;
export const KILO_GATEWAY_BASE_URL = NATIVE_ENDPOINTS.kilo_gateway.baseUrl;
export const KILO_GATEWAY_SYSTEM_ONE_PATH = NATIVE_ENDPOINTS.kilo_gateway.path;
export const KILO_GATEWAY_DEFAULT_MODEL = NATIVE_ENDPOINTS.kilo_gateway.model;
export const TYPESAFE_NATIVE_EVALUATOR_VERSION = 'typesafe-native-1.0.0';

export const DEFAULT_NATIVE_THRESHOLDS: JevNativeThresholds = { minConfidence: 0.6, noulYes: 0.8, noulNo: 0.2 };

/**
 * Soalan yang jawabannya datang daripada fakta server yang diautentikasi
 * (bukan daripada teks). Model tidak pernah mengesahkan ledger, harga
 * kanonik, kes lengkap SOP atau versi SOP — ia hanya boleh membaca fakta
 * tersebut daripada state.
 */
const FACT_BOUND_QUESTIONS = new Set([
  'order_exception.paymentVerified',
  'order_exception.canonicalPriceKnown',
  'qc.evidenceComplete',
  'qc.sopCurrent',
]);

const FACT_KEYS = ['paymentVerified', 'canonicalPriceKnown', 'evidenceComplete', 'sopCurrent'] as const;
type FactKey = (typeof FACT_KEYS)[number];

/** Glossary pilihan: setiap option mesti bermakna apabila dibaca sendiri. */
const OPTION_GLOSSARY: Record<string, Record<string, string>> = {
  'support.intent': {
    COMPLAINT: 'The customer alleges a fault, defect or service failure.',
    REFUND: 'The customer asks for money back for a purchase.',
    LOCATION_QUERY: 'The customer asks where a product, outlet or agent can be found.',
    AGENT_APPLICATION: 'The customer asks how to become an agent, stokis, reseller or distributor.',
    PURCHASE: 'The customer asks to buy, order or pay for a product.',
    UNKNOWN: 'The message does not clearly state any of the other intents.',
  },
  'support.issue': {
    LEAKAGE: 'The customer alleges the product leaked, spilled, burst or seeped.',
    SEAL_FAILURE: 'The customer alleges a seal, lid, cap or closure failed, loosened or broke.',
    DELIVERY_DELAY: 'The customer alleges the order arrived late, was delayed or never arrived.',
    PAYMENT: 'The customer raises a payment, charge, receipt or payment refund problem.',
    UNKNOWN: 'No issue category above is clearly alleged.',
  },
  'support.rootCause': {
    UNDETERMINED: 'No authorized investigation has established a cause.',
    UNDER_INVESTIGATION: 'An authorized investigation is currently open.',
    VERIFIED: 'An authorized investigation has confirmed a cause.',
    REJECTED: 'An authorized investigation has rejected the alleged cause.',
  },
  'marketing.pillar': {
    PRODUCT: 'The content promotes a specific product or product benefit.',
    RECIPE: 'The content teaches a preparation or usage recipe.',
    FOUNDER: 'The content tells a founder or brand story.',
    DEALER: 'The content is addressed to agents, stokis or resellers.',
    UNKNOWN: 'The content does not fit any approved pillar above.',
  },
  'dealer.intent': {
    APPLICATION: 'The message applies to become a dealer, stokis or agent.',
    RESTOCK: 'The message asks for more stock or a new order.',
    RECEIVING: 'The message reports or confirms goods being received.',
    COMPLAINT: 'The message alleges a fault, delay or service failure.',
    UNKNOWN: 'The message does not clearly state any of the other intents.',
  },
  'developer.risk': {
    AUTH: 'The change touches authentication, authorisation, sessions, tokens or permissions.',
    SCHEMA: 'The change touches a data schema, migration or record shape.',
    SIDE_EFFECT: 'The change sends, publishes, refunds, deletes or otherwise mutates state.',
    UI: 'The change only affects presentation, layout, copy or styling.',
    UNKNOWN: 'The change does not clearly touch any of the protected boundaries above.',
  },
  'order_exception.exception': {
    PAYMENT: 'The exception concerns whether the order was paid or the payment state.',
    PRICE: 'The exception concerns the price charged or the price of the order.',
    DELIVERY: 'The exception concerns delivery, shipment or arrival.',
    CANCELLATION: 'The exception concerns cancelling or reversing the order.',
    UNKNOWN: 'No exception category above is clearly alleged.',
  },
  'qc.issue': {
    LEAKAGE: 'The batch shows leaking, spillage or burst packaging.',
    SEAL_FAILURE: 'The batch shows a failed, broken or loose seal.',
    CONTAMINATION: 'The batch shows contamination, foreign matter or spoilage.',
    TEMPERATURE: 'The batch shows a temperature or cold-chain breach.',
    UNKNOWN: 'No QC issue category above is clearly alleged.',
  },
};

/** Glossary noul: apa yang dimaksud "ya" dan apa yang dimaksud "tidak". */
const NOUL_GLOSSARY: Record<string, { true: string; false: string }> = {
  'support.refundRequested': {
    true: 'The customer explicitly asks for a refund, replacement of money or money back.',
    false: 'No explicit refund request is present in the message.',
  },
  'support.humanRequested': {
    true: 'The customer explicitly asks to speak to a human, staff member, officer or person.',
    false: 'No explicit request for a person is present in the message.',
  },
  'marketing.healthClaim': {
    true: 'The content claims a health, medical, weight loss, cure, detox or therapeutic benefit.',
    false: 'The content makes no health, medical or therapeutic claim.',
  },
  'marketing.priceMention': {
    true: 'The content states a monetary price, discount amount or amount to pay.',
    false: 'The content states no monetary price or amount.',
  },
  'dealer.trainingRequested': {
    true: 'The message explicitly asks for training, onboarding or product education.',
    false: 'No training, onboarding or education request is stated.',
  },
  'developer.reviewRequired': {
    true: 'The described change touches authentication, data schema, side effects or another protected boundary.',
    false: 'The described change is limited to presentation, copy or another non-protected surface.',
  },
  'order_exception.paymentVerified': {
    true: 'Authorized payment ledger facts confirm the payment.',
    false: 'Authorized ledger facts show the payment was not made or does not match the order.',
  },
  'order_exception.canonicalPriceKnown': {
    true: 'The order is linked to a known canonical price revision.',
    false: 'The order is not linked to any canonical price revision.',
  },
  'qc.evidenceComplete': {
    true: 'Every required SOP evidence item is present in the authorised context.',
    false: 'At least one required SOP evidence item is missing from the authorised context.',
  },
  'qc.sopCurrent': {
    true: 'The batch refers to the current approved SOP revision.',
    false: 'The batch refers to an outdated or unapproved SOP revision.',
  },
};

/** Reason code yang dinyatakan pengguna, tiada butiran tersembunyi. */
const PACK_POLICY_CODES: Record<JevPackId, string[]> = {
  support: ['NO_AUTOMATIC_REFUND', 'ROOT_CAUSE_UNDETERMINED'],
  marketing: ['NO_AUTOMATIC_PUBLISH', 'MEDIA_RIGHTS_AND_PRODUCT_FACTS_REQUIRED'],
  dealer: ['LEDGER_AND_COMMERCIAL_POLICY_REQUIRED'],
  developer: ['TEST_AND_REVIEW_REQUIRED'],
  order_exception: ['NO_AUTOMATIC_PAYMENT_OR_REFUND'],
  qc: ['NO_AUTOMATIC_QC_RELEASE'],
};

export interface TypeSafeChoicePayload { type: 'choice'; instructions: string; criteria: Record<string, string> }
export interface TypeSafeScorePayload { type: 'score'; instructions: string; criteria: string[] }
export interface TypeSafeNoulPayload { type: 'noul'; instructions: string; criteria?: { true: string; false: string } }
export type TypeSafeQuestionPayload = TypeSafeChoicePayload | TypeSafeScorePayload | TypeSafeNoulPayload;
export interface TypeSafeSystemOneRequest {
  model: string;
  state: Record<string, unknown>;
  questions: Record<string, TypeSafeQuestionPayload>;
}

export interface TypeSafeEligibility { eligible: boolean; reasonCodes: string[] }

/**
 * Native TypeSafe hanya dibuka apabila semua gate lulus serentak:
 * kelayakan (kunci), terma, pengendalian data dan (bagi gateway yang
 * membillah baki akaun) kelulusan perbelanjaan. Tiada flag sahaja yang
 * mencetuskan panggilan berbayar.
 */
export function resolveTypeSafeEligibility(env: Record<string, string | undefined> = process.env, transport: JevNativeTransport = 'typesafe_direct'): TypeSafeEligibility {
  const endpoint = NATIVE_ENDPOINTS[transport];
  const reasonCodes: string[] = [];
  if (!env[endpoint.apiKeyEnv]?.trim()) reasonCodes.push(endpoint.credentialCode);
  if (env.JEV_NATIVE_ENABLED !== 'true') reasonCodes.push('JEV_NATIVE_DISABLED');
  if (env.JEV_NATIVE_TERMS_ACCEPTED !== 'true') reasonCodes.push('JEV_NATIVE_TERMS_NOT_ACCEPTED');
  if (env.JEV_NATIVE_DATA_HANDLING_APPROVED !== 'true') reasonCodes.push('JEV_NATIVE_DATA_HANDLING_NOT_APPROVED');
  if (transport === 'kilo_gateway' && env.JEV_NATIVE_SPEND_APPROVED !== 'true') reasonCodes.push('JEV_NATIVE_SPEND_NOT_APPROVED');
  return { eligible: reasonCodes.length === 0, reasonCodes };
}

export function resolveNativeThresholds(env: Record<string, string | undefined> = process.env): JevNativeThresholds {
  const parsed = (raw: string | undefined, fallback: number): number => {
    if (raw === undefined) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
  };
  return {
    minConfidence: parsed(env.JEV_NATIVE_MIN_CONFIDENCE, DEFAULT_NATIVE_THRESHOLDS.minConfidence),
    noulYes: parsed(env.JEV_NATIVE_NOUL_YES_THRESHOLD, DEFAULT_NATIVE_THRESHOLDS.noulYes),
    noulNo: parsed(env.JEV_NATIVE_NOUL_NO_THRESHOLD, DEFAULT_NATIVE_THRESHOLDS.noulNo),
  };
}

/** Structured state: setiap bahagian yang dinilai diberi nama sendiri. */
export function buildTypeSafeState(state: JevState): Record<string, unknown> {
  const payload: Record<string, unknown> = { text: state.text };
  if (state.entityId !== undefined) payload.entity = { id: state.entityId, revision: state.entityRevision ?? null };
  if (state.evidence?.length) payload.evidence = state.evidence.map(item => ({ kind: item.kind, text: item.text }));
  if (state.facts) payload.facts = { ...state.facts };
  if (state.constraints?.length) payload.constraints = [...state.constraints];
  if (state.pendingOperations?.length) payload.pendingOperations = [...state.pendingOperations];
  return payload;
}

export function isFactBoundQuestion(packId: JevPackId, questionId: string): boolean {
  return FACT_BOUND_QUESTIONS.has(`${packId}.${questionId}`);
}

function questionPayload(packId: JevPackId, question: JevQuestion): TypeSafeQuestionPayload {
  if (question.type === 'choice') {
    const glossary = OPTION_GLOSSARY[`${packId}.${question.id}`] ?? {};
    return {
      type: 'choice',
      instructions: question.instructions,
      criteria: Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, glossary[key] ?? value])),
    };
  }
  if (question.type === 'score') return { type: 'score', instructions: question.instructions, criteria: [...question.criteria] };
  const glossary = NOUL_GLOSSARY[`${packId}.${question.id}`];
  return glossary ? { type: 'noul', instructions: question.instructions, criteria: glossary } : { type: 'noul', instructions: question.instructions };
}

/**
 * Satu request System One untuk satu pack. Semua soalan pack yang tidak
 * terikat fakta dihantar sekali — System One menilai secara selari.
 */
export function buildTypeSafeRequest(packId: JevPackId, state: JevState, model = TYPESAFE_DEFAULT_MODEL): TypeSafeSystemOneRequest {
  if (!Object.hasOwn(QUESTION_PACKS, packId)) throw new Error('JEV_PACK_INVALID');
  validateState(state);
  const questions: Record<string, TypeSafeQuestionPayload> = {};
  for (const question of QUESTION_PACKS[packId].questions) {
    if (isFactBoundQuestion(packId, question.id)) continue;
    questions[question.id] = questionPayload(packId, question);
  }
  return { model, state: buildTypeSafeState(state), questions };
}

export interface TypeSafeTransportOptions {
  apiKey: string;
  baseUrl?: string;
  path?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}
export type TypeSafeTransportOutcome =
  | { ok: true; status: number; body: unknown }
  | { ok: false; reasonCode: string; status?: number };

/** Reason code bagi kegagalan HTTP, mengikut transport. */
export function classifyNativeHttpFailure(status: number, transport: JevNativeTransport): string {
  if (status === 401) return 'JEV_NATIVE_ACCESS_DENIED';
  if (status === 402) return transport === 'kilo_gateway' ? 'JEV_NATIVE_BALANCE_EXHAUSTED' : 'JEV_NATIVE_PAYMENT_REQUIRED';
  if (status === 403) return 'JEV_NATIVE_ACCESS_DENIED';
  if (status === 404) return 'JEV_NATIVE_MODEL_NOT_FOUND';
  if (status === 429) return 'JEV_NATIVE_RATE_LIMITED';
  if (status === 400 || status === 422) return 'JEV_NATIVE_REQUEST_INVALID';
  if (status === 502 || status === 503) return 'JEV_NATIVE_UPSTREAM_UNAVAILABLE';
  return 'JEV_NATIVE_PROVIDER_ERROR';
}

/**
 * Transport HTTP ringkas. Badan provider tidak pernah dikembalikan kepada
 * pelayar atau disimpan — hanya status dan reason code yang terklasifikasi.
 */
export async function postSystemOne(request: TypeSafeSystemOneRequest, options: TypeSafeTransportOptions & { transport?: JevNativeTransport }): Promise<TypeSafeTransportOutcome> {
  const transport = options.transport ?? 'typesafe_direct';
  const endpoint = NATIVE_ENDPOINTS[transport];
  const base = (options.baseUrl ?? endpoint.baseUrl).replace(/\/+$/, '');
  const path = options.path ?? endpoint.path;
  if (!/^https:\/\/[^\s]+$/i.test(base)) return { ok: false, reasonCode: 'JEV_NATIVE_ENDPOINT_INVALID' };
  if (!options.apiKey.trim()) return { ok: false, reasonCode: endpoint.credentialCode };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reasonCode: classifyNativeHttpFailure(response.status, transport), status: response.status };
    return { ok: true, status: response.status, body: await response.json() as unknown };
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const aborted = name === 'AbortError' || name === 'TimeoutError';
    return { ok: false, reasonCode: aborted ? 'JEV_NATIVE_TIMEOUT' : 'JEV_NATIVE_ENDPOINT_UNREACHABLE' };
  } finally {
    clearTimeout(timeout);
  }
}

export interface TypeSafeInterpretation {
  answers: Record<string, JevNativeAnswer>;
  observations: Record<string, JevNativeAnswer>;
  answerProvenance: Record<string, 'MODEL_JUDGMENT' | 'SERVER_FACT'>;
  uncertain: string[];
  validationErrors: string[];
}

/**
 * Terjemah respons TypeSafe kepada jawapan typed. Semakan menggunakan
 * validator sedia ada (jujur: tiada confidence dikarang, tiada pilihan luar
 * senarai, tiada taburan yang tidak dijumlahkan kepada 1).
 */
export function interpretTypeSafeResponse(packId: JevPackId, state: JevState, body: unknown, thresholds: JevNativeThresholds): TypeSafeInterpretation {
  const answers: Record<string, JevNativeAnswer> = {}, observations: Record<string, JevNativeAnswer> = {}, answerProvenance: Record<string, 'MODEL_JUDGMENT' | 'SERVER_FACT'> = {};
  const uncertain: string[] = [], validationErrors: string[] = [];
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  const responseAnswers = raw && raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers) ? raw.answers as Record<string, unknown> : null;
  if (!responseAnswers) validationErrors.push('RESPONSE_ANSWERS_MISSING');
  for (const question of QUESTION_PACKS[packId].questions) {
    if (isFactBoundQuestion(packId, question.id)) {
      const factKey = question.id as FactKey;
      const fact = state.facts?.[factKey];
      if (typeof fact === 'boolean') {
        const answer: JevNativeAnswer = { type: 'noul', noul: fact ? 1 : 0 };
        answers[question.id] = answer; observations[question.id] = answer; answerProvenance[question.id] = 'SERVER_FACT';
      } else {
        uncertain.push(question.id);
        validationErrors.push(`${question.id}:FACT_UNAVAILABLE`);
      }
      continue;
    }
    const input = responseAnswers?.[question.id];
    if (input === undefined) { uncertain.push(question.id); validationErrors.push(`${question.id}:ANSWER_MISSING`); continue; }
    const result = validateAnswer(question, input);
    if (!result.ok) { uncertain.push(question.id); validationErrors.push(`${question.id}:${result.reason}`); continue; }
    observations[question.id] = result.answer;
    if (result.answer.type === 'noul') {
      const value = result.answer.noul;
      // Noul hampir 0.5 bermaksud ya/tidak sama-sama berkemungkinan; hanya
      // hujung yang jelas (ya tinggi / tidak rendah) boleh dibaca sebagai kepastian.
      if (value > thresholds.noulNo && value < thresholds.noulYes) { uncertain.push(question.id); validationErrors.push(`${question.id}:NOUL_UNCERTAIN`); continue; }
    } else if (result.answer.confidence < thresholds.minConfidence) {
      uncertain.push(question.id); validationErrors.push(`${question.id}:LOW_CONFIDENCE`); continue;
    }
    answers[question.id] = result.answer;
    answerProvenance[question.id] = 'MODEL_JUDGMENT';
  }
  return { answers, observations, answerProvenance, uncertain, validationErrors };
}

export interface TypeSafeEvaluationOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  thresholds?: JevNativeThresholds;
  model?: string;
  transport?: JevNativeTransport;
  baseUrl?: string;
  timeoutMs?: number;
  now?: () => string;
}

function policyFor(packId: JevPackId, reasonCodes: string[]): JevPolicy {
  return {
    version: '1.0',
    outcome: 'REVIEW_REQUIRED',
    reasonCodes: ['NATIVE_PROVIDER_DOMAIN_UNVERIFIED', 'AUTHORITATIVE_POLICY_AND_APPROVAL_REQUIRED', ...PACK_POLICY_CODES[packId], ...reasonCodes],
  };
}

function nativeAssessment(base: Omit<JevNativeAssessment, 'status' | 'answers' | 'observations' | 'answerProvenance' | 'policy'>, status: JevNativeAssessment['status'], policy: JevPolicy, extra: Partial<JevNativeAssessment> = {}): JevNativeAssessment {
  return { ...base, status, answers: {}, observations: {}, answerProvenance: {}, policy, ...extra };
}

/**
 * Assessment UNAVAILABLE yang jujur: tiada request dihantar, tiada jawapan
 * dikarang, reason code sahaja.
 */
export function buildUnavailableNativeAssessment(packId: JevPackId, state: JevState, reasonCodes: string[], options: { now?: () => string } = {}): JevNativeAssessment {
  const createdAt = (options.now ?? (() => new Date().toISOString()))();
  return {
    id: `jev-native-${crypto.randomUUID()}`,
    packId,
    questionSetVersion: '1.0',
    providerMode: 'TYPESAFE_NATIVE',
    status: 'UNAVAILABLE',
    answers: {},
    observations: {},
    answerProvenance: {},
    policy: policyFor(packId, reasonCodes),
    evidence: (state.evidence ?? []).map(item => ({ ...item })),
    entityId: state.entityId,
    entityRevision: state.entityRevision,
    createdAt,
    latencyMs: 0,
    schemaVersion: '1.0',
    evaluatorVersion: TYPESAFE_NATIVE_EVALUATOR_VERSION,
    abstentionReasons: [...reasonCodes],
    validationErrors: [...reasonCodes],
  };
}

/**
 * Natif JEV melalui TypeSafe System One. Assessment yang dikembalikan sentiasa
 * REVIEW_REQUIRED: judgment model tidak pernah membenarkan tindakan.
 */
export async function evaluateWithTypeSafe(packId: JevPackId, state: JevState, options: TypeSafeEvaluationOptions = {}): Promise<JevNativeAssessment> {
  if (!Object.hasOwn(QUESTION_PACKS, packId)) throw new Error('JEV_PACK_INVALID');
  validateState(state);
  const started = performance.now();
  const env = options.env ?? process.env;
  const transport = options.transport ?? 'typesafe_direct';
  const endpoint = NATIVE_ENDPOINTS[transport];
  const thresholds = options.thresholds ?? resolveNativeThresholds(env);
  const createdAt = (options.now ?? (() => new Date().toISOString()))();
  const base = {
    id: `jev-native-${crypto.randomUUID()}`,
    packId,
    questionSetVersion: '1.0' as const,
    providerMode: 'TYPESAFE_NATIVE' as const,
    evidence: (state.evidence ?? []).map(item => ({ ...item })),
    entityId: state.entityId,
    entityRevision: state.entityRevision,
    createdAt,
    latencyMs: 0,
    schemaVersion: '1.0' as const,
    evaluatorVersion: TYPESAFE_NATIVE_EVALUATOR_VERSION,
  };
  const finish = (assessment: JevNativeAssessment): JevNativeAssessment => ({ ...assessment, latencyMs: Math.round((performance.now() - started) * 100) / 100 });

  const eligibility = resolveTypeSafeEligibility(env, transport);
  if (!eligibility.eligible) {
    return finish(nativeAssessment(base, 'UNAVAILABLE', policyFor(packId, eligibility.reasonCodes), { abstentionReasons: eligibility.reasonCodes }));
  }

  let request: TypeSafeSystemOneRequest;
  try {
    request = buildTypeSafeRequest(packId, state, options.model ?? endpoint.model);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'JEV_REQUEST_INVALID';
    return finish(nativeAssessment(base, 'INVALID', policyFor(packId, ['JEV_REQUEST_INVALID']), { abstentionReasons: ['JEV_REQUEST_INVALID'], validationErrors: [reason] }));
  }

  const outcome = await postSystemOne(request, {
    apiKey: env[endpoint.apiKeyEnv] ?? '',
    transport,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  if (!outcome.ok) {
    return finish(nativeAssessment(base, 'UNAVAILABLE', policyFor(packId, [outcome.reasonCode]), { abstentionReasons: [outcome.reasonCode] }));
  }

  const interpretation = interpretTypeSafeResponse(packId, state, outcome.body, thresholds);
  const raw = outcome.body && typeof outcome.body === 'object' && !Array.isArray(outcome.body) ? outcome.body as Record<string, unknown> : {};
  const usage = raw.usage && typeof raw.usage === 'object' && !Array.isArray(raw.usage) ? raw.usage as Record<string, unknown> : null;
  const receipt = {
    provider: 'TYPESAFE' as const,
    transport: options.fetchImpl ? 'fixture' as const : 'live' as const,
    model: typeof raw.model === 'string' ? raw.model : (options.model ?? endpoint.model),
    endpoint: `${(options.baseUrl ?? endpoint.baseUrl).replace(/\/+$/, '')}${endpoint.path}`,
    requestQuestionIds: Object.keys(request.questions),
    usage: usage && typeof usage.input_tokens === 'number' && typeof usage.output_tokens === 'number'
      ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens }
      : null,
    observedAt: createdAt,
    latencyMs: Math.round((performance.now() - started) * 100) / 100,
  };
  const abstentionReasons = interpretation.uncertain.map(questionId => `NATIVE_UNCERTAIN:${questionId}`);
  const status: JevNativeAssessment['status'] = interpretation.uncertain.length === 0 ? 'NATIVE_JUDGMENT'
    : Object.keys(interpretation.answers).length ? 'PARTIAL_JUDGMENT' : 'ABSTAIN';
  return finish({
    ...base,
    status,
    answers: interpretation.answers,
    observations: interpretation.observations,
    answerProvenance: interpretation.answerProvenance,
    policy: policyFor(packId, []),
    receipt,
    ...(interpretation.validationErrors.length ? { validationErrors: interpretation.validationErrors } : {}),
    ...(abstentionReasons.length ? { abstentionReasons } : {}),
  });
}
