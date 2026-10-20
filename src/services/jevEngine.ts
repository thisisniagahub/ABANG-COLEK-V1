/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import { assessState, isLocalAssessment, prepareAction } from '../../server/platform/jev/assessment';
import type { JevActionPreview, JevAssessment } from '../../shared/jev-contracts';

export const JEV_MODEL = 'local-rules-v1';

// 7-Dimension JEV Taxonomy strictly adhering to Abang Colek Discovery
export const JEV_TAXONOMY = {
  Brand: ['ABANGCOLEK', 'LIURLELEH', 'JERUX', 'MULTI_BRAND', 'UNKNOWN'] as const,
  BusinessFunction: [
    'PRODUCTION', 'PROCUREMENT', 'PACKAGING', 'WAREHOUSING', 'INVENTORY',
    'DISTRIBUTION', 'TRANSPORT', 'AGENT_MANAGEMENT', 'DIRECT_SALES', 'RETAIL',
    'POPUP', 'EVENT', 'CUSTOMER_SERVICE', 'MARKETING', 'CONTENT', 'RECRUITMENT',
    'FINANCE', 'COMPLIANCE', 'OTHER', 'UNKNOWN'
  ] as const,
  SalesChannel: [
    'DIRECT', 'SOCIAL_COMMERCE', 'AGENT', 'HOME_SELLER', 'POPUP', 'EVENT',
    'RETAIL', 'DELIVERY', 'COD', 'ONLINE', 'UNKNOWN'
  ] as const,
  CustomerIntent: [
    'PURCHASE', 'PRICE_QUERY', 'STOCK_QUERY', 'LOCATION_QUERY', 'DELIVERY_QUERY',
    'PRODUCT_QUERY', 'CUSTOMIZATION', 'AGENT_APPLICATION', 'JOB_APPLICATION',
    'COMPLAINT', 'REFUND', 'RETURN', 'PRAISE', 'GENERAL_CHAT', 'UNKNOWN'
  ] as const,
  IssueClass: [
    'PRODUCT_QUALITY', 'PACKAGING', 'LEAKAGE', 'SEAL_FAILURE', 'FRESHNESS',
    'TASTE', 'APPEARANCE', 'QUANTITY', 'WRONG_ITEM', 'STOCKOUT', 'DELIVERY_DELAY',
    'DELIVERY_DAMAGE', 'TRANSPORT', 'STORAGE', 'AGENT_HANDLING', 'CUSTOMER_SERVICE',
    'PAYMENT', 'PRICE', 'LOCATION', 'UNKNOWN'
  ] as const,
  ProcessStage: [
    'SUPPLIER', 'RAW_MATERIAL_RECEIVING', 'PRODUCTION', 'FILLING', 'PACKAGING',
    'QC', 'COLD_STORAGE', 'WAREHOUSE', 'DISPATCH', 'TRANSPORT', 'AGENT_RECEIVING',
    'AGENT_STORAGE', 'POS', 'POINT_OF_SALE', 'LAST_MILE', 'LAST_MILE_DELIVERY',
    'CUSTOMER_STORAGE', 'UNKNOWN'
  ] as const,
  RootCauseStatus: [
    'UNDETERMINED', 'HYPOTHESIS', 'UNDER_INVESTIGATION', 'VERIFIED', 'REJECTED'
  ] as const,
};

export type JevBrand = typeof JEV_TAXONOMY.Brand[number];
export type JevBusinessFunction = typeof JEV_TAXONOMY.BusinessFunction[number];
export type JevSalesChannel = typeof JEV_TAXONOMY.SalesChannel[number];
export type JevCustomerIntent = typeof JEV_TAXONOMY.CustomerIntent[number];
export type JevIssueClass = typeof JEV_TAXONOMY.IssueClass[number];
export type JevProcessStage = typeof JEV_TAXONOMY.ProcessStage[number];
export type JevRootCauseStatus = typeof JEV_TAXONOMY.RootCauseStatus[number];

// Single canonical source: every stored dimension value must belong to one of these sets.
const JEV_DIMENSION_VALUES = {
  brand: JEV_TAXONOMY.Brand, businessFunction: JEV_TAXONOMY.BusinessFunction, salesChannel: JEV_TAXONOMY.SalesChannel,
  customerIntent: JEV_TAXONOMY.CustomerIntent, issueClass: JEV_TAXONOMY.IssueClass,
  processStage: JEV_TAXONOMY.ProcessStage, rootCauseStatus: JEV_TAXONOMY.RootCauseStatus,
} as const;

/**
 * Check a server pack value against the canonical set. An out-of-taxonomy value is
 * never projected into a dimension; it is recorded as drift and stays in the assessment.
 */
function resolveTaxonomy<T extends string>(raw: unknown, allowed: readonly T[]): { value: T | null; drifted: boolean } {
  if (raw === undefined || raw === null) return { value: null, drifted: false };
  if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) return { value: raw as T, drifted: false };
  return { value: null, drifted: true };
}

export interface JevDimensionResult<T extends string = string> {
  value: T;
  confidence: number | null; // 0.0 to 1.0, null = nothing was computed
  probabilities: Record<string, number> | null; // null = nothing was computed
}

export interface JevNoulResult {
  probability: number | null; // 0.0 to 1.0, null = nothing was computed
  isAffirmative: boolean | null; // probability >= 0.5, null = nothing was computed
}

export interface JevScoreResult {
  score: number | null; // 1.0 to 5.0, null = nothing was computed
  label: string;
  confidence: number | null; // null = nothing was computed
}

export interface JevClassificationResult {
  providerMode?: 'LOCAL_RULES';
  assessment?: JevAssessment;
  id: string;
  inputText: string;
  timestamp: string;
  latencyMs: number;
  dimensions: {
    brand: JevDimensionResult<JevBrand>;
    businessFunction: JevDimensionResult<JevBusinessFunction>;
    salesChannel: JevDimensionResult<JevSalesChannel>;
    customerIntent: JevDimensionResult<JevCustomerIntent>;
    issueClass: JevDimensionResult<JevIssueClass>;
    processStage: JevDimensionResult<JevProcessStage>;
    rootCauseStatus: JevDimensionResult<JevRootCauseStatus>;
  };
  primitives: {
    urgencyScore: JevScoreResult;
    customerSatisfactionScore: JevScoreResult;
    requiresImmediateIntervention: JevNoulResult;
    isRefundEligible: JevNoulResult;
    isHighValueAgentOpportunity: JevNoulResult;
  };
  /** Dimensions whose pack value was outside the canonical taxonomy; no out-of-taxonomy value is stored. */
  taxonomyDrift?: string[];
  recommendedAction: string;
  suggestedSop: string;
  automatedActionsTaken?: {
    taskCreated?: boolean;
    emailDrafted?: boolean;
    calendarScheduled?: boolean;
    sheetLogged?: boolean;
    details?: string;
  };
}

/**
 * Evaluate the support message locally. This baseline makes no model API call.
 * Legacy numeric fields are compatibility placeholders; use assessment for honest
 * uncertainty and never interpret a local hint as a probability or approval.
 */
export async function evaluateWithJev(inputText: string): Promise<JevClassificationResult> {
  const assessment = assessState('support', { text: inputText });
  const intent = resolveTaxonomy(assessment.answers.intent?.value, JEV_TAXONOMY.CustomerIntent);
  const issue = resolveTaxonomy(assessment.answers.issue?.value, JEV_TAXONOMY.IssueClass);
  const intentValue = intent.value ?? 'UNKNOWN';
  const issueValue = issue.value ?? 'UNKNOWN';
  const dimension = <T extends string>(value: T): JevDimensionResult<T> => ({ value, confidence: null, probabilities: null });
  const result: JevClassificationResult = {
    id: assessment.id, inputText, timestamp: assessment.createdAt, latencyMs: assessment.latencyMs,
    providerMode: 'LOCAL_RULES', assessment,
    ...(intent.drifted || issue.drifted
      ? { taxonomyDrift: [...(intent.drifted ? ['customerIntent'] : []), ...(issue.drifted ? ['issueClass'] : [])] }
      : {}),
    dimensions: {
      brand: dimension('UNKNOWN'),
      businessFunction: dimension(intentValue === 'AGENT_APPLICATION' ? 'AGENT_MANAGEMENT' : intentValue === 'UNKNOWN' ? 'UNKNOWN' : 'CUSTOMER_SERVICE'),
      salesChannel: dimension(intentValue === 'AGENT_APPLICATION' ? 'AGENT' : 'UNKNOWN'),
      customerIntent: dimension(intentValue), issueClass: dimension(issueValue),
      processStage: dimension('UNKNOWN'), rootCauseStatus: dimension('UNDETERMINED'),
    },
    primitives: {
      urgencyScore: { score: null, label: 'Belum dinilai', confidence: null },
      customerSatisfactionScore: { score: null, label: 'Belum dinilai', confidence: null },
      requiresImmediateIntervention: { probability: null, isAffirmative: null },
      isRefundEligible: { probability: null, isAffirmative: null },
      isHighValueAgentOpportunity: { probability: null, isAffirmative: null },
    },
    recommendedAction: assessment.status === 'ABSTAIN'
      ? 'Tambah mesej dan bukti sebelum penilaian.'
      : 'Semak mesej, bukti dan polisi semasa bersama staf yang diberi kuasa. Cadangan tempatan belum diluluskan.',
    suggestedSop: 'Sahkan nombor order, batch jika relevan, dan pihak yang bertanggungjawab. Punca fizikal serta eligibility refund memerlukan semakan berautoriti.',
  };
  saveJevEvaluation(result);
  return result;
}

/** Prepare a reviewable action. External execution belongs to an approved domain command. */
export async function executeAutomatedJevAction(
  result: JevClassificationResult,
  actionType: 'task' | 'email' | 'calendar' | 'sheet'
): Promise<{ success: boolean; message: string; preview?: JevActionPreview }> {
  try {
    const preview = prepareAction(result, actionType);
    return { success: true, message: preview.notice, preview };
  } catch {
    return { success: false, message: 'Pratonton tidak dapat disediakan. Semak keputusan dan jenis tindakan.' };
  }
}

let historyScope: string | null = null;
let activeHistoryIdentity: string | null = null;
let volatileHistory: JevClassificationResult[] = [];
let historyLoaded = false;
export type JevHistoryStatus = { mode: 'MEMORY_ONLY' | 'LOCAL_DEVICE'; stored: boolean; error: string | null };
let historyStatus: JevHistoryStatus = { mode: 'MEMORY_ONLY', stored: false, error: null };

/** Scope by verified actor; shared-device persistence needs an explicit user opt-in. */
export function setJevHistoryScope(actorId: string | null, workspaceId: string | null = null, optInPersistence = false): void {
  const identity = actorId && workspaceId ? `abangcolek_jev_v2:${encodeURIComponent(workspaceId)}:${encodeURIComponent(actorId)}` : null;
  const storageKey = optInPersistence === true ? identity : null;
  if (identity === activeHistoryIdentity && storageKey === historyScope) return;
  volatileHistory = [];
  historyLoaded = false;
  activeHistoryIdentity = identity;
  historyScope = storageKey;
  historyStatus = { mode: storageKey ? 'LOCAL_DEVICE' : 'MEMORY_ONLY', stored: false, error: null };
}

export function getJevHistoryStatus(): JevHistoryStatus { return { ...historyStatus }; }

function isStoredEvaluation(value: unknown): value is JevClassificationResult {
  if (!isRecord(value) || !boundedString(value.id, 200) || !value.id || !boundedString(value.inputText, 32000) ||
    value.providerMode !== 'LOCAL_RULES' || !isLocalAssessment(value.assessment) ||
    value.assessment.id !== value.id || value.assessment.packId !== 'support' ||
    !boundedString(value.timestamp, 80) || !Number.isFinite(Date.parse(value.timestamp)) || value.timestamp !== value.assessment.createdAt ||
    typeof value.latencyMs !== 'number' || !Number.isFinite(value.latencyMs) || value.latencyMs < 0 ||
    !boundedString(value.recommendedAction, 8000) || !boundedString(value.suggestedSop, 8000) ||
    !isRecord(value.dimensions) || !isRecord(value.primitives)) return false;
  const dimensions = value.dimensions;
  if (!Object.entries(JEV_DIMENSION_VALUES).every(([name, allowed]) =>
    isStoredDimension(dimensions[name], allowed))) return false;
  const primitives = value.primitives;
  if (!['urgencyScore', 'customerSatisfactionScore'].every(name => isStoredScore(primitives[name])) ||
    !['requiresImmediateIntervention', 'isRefundEligible', 'isHighValueAgentOpportunity'].every(name => isStoredNoul(primitives[name]))) return false;
  const drift = value.taxonomyDrift;
  if (drift !== undefined && (!Array.isArray(drift) || drift.length > 10 ||
    drift.some(name => typeof name !== 'string' || !Object.hasOwn(JEV_DIMENSION_VALUES, name)))) return false;
  const actions = value.automatedActionsTaken;
  return actions === undefined || (isRecord(actions) &&
    ['taskCreated', 'emailDrafted', 'calendarScheduled', 'sheetLogged'].every(name => actions[name] === undefined || actions[name] === false) &&
    (actions.details === undefined || boundedString(actions.details, 8000)));
}

/** A dimension is either not computed (null) or a canonical value with a valid computed state. */
function isStoredDimension(value: unknown, allowed: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.value !== 'string' || !(allowed as readonly string[]).includes(value.value)) return false;
  if (value.confidence === null && value.probabilities === null) return true;
  return isUnitInterval(value.confidence) && isRecord(value.probabilities) &&
    Object.values(value.probabilities).every(isUnitInterval);
}

function isStoredScore(value: unknown): boolean {
  if (!isRecord(value) || !boundedString(value.label, 200)) return false;
  if (value.score === null && value.confidence === null) return true;
  return typeof value.score === 'number' && Number.isFinite(value.score) && isUnitInterval(value.confidence);
}

function isStoredNoul(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.probability === null && value.isAffirmative === null) return true;
  return isUnitInterval(value.probability) && typeof value.isAffirmative === 'boolean' &&
    value.isAffirmative === (value.probability >= 0.5);
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum;
}

export function getSavedJevEvaluations(): JevClassificationResult[] {
  if (!historyScope || historyLoaded) return [...volatileHistory];
  // Hydrate once per identity. Session memory then retains writes that storage rejects.
  historyLoaded = true;
  try {
    if (typeof localStorage === 'undefined') {
      historyStatus = { mode: 'MEMORY_ONLY', stored: false, error: null };
      return [...volatileHistory];
    }
    const raw = localStorage.getItem(historyScope);
    if (raw && raw.length > 5_000_000) throw new Error('HISTORY_TOO_LARGE');
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.length > 50 || parsed.some(value => !isStoredEvaluation(value))) throw new Error('HISTORY_INVALID');
    volatileHistory = parsed;
    historyStatus = { mode: 'LOCAL_DEVICE', stored: parsed.length > 0, error: null };
    return [...volatileHistory];
  } catch {
    historyStatus = { mode: 'LOCAL_DEVICE', stored: false, error: 'Sejarah tempatan tidak dapat dibaca. Tiada sync pelayan telah disahkan.' };
    return [...volatileHistory];
  }
}

export function saveJevEvaluation(evaluation: JevClassificationResult): JevHistoryStatus {
  if (!isStoredEvaluation(evaluation)) {
    historyStatus = { mode: historyScope ? 'LOCAL_DEVICE' : 'MEMORY_ONLY', stored: false, error: 'Keputusan JEV tidak sah; sejarah sesi tidak diubah.' };
    return getJevHistoryStatus();
  }
  volatileHistory = [evaluation, ...getSavedJevEvaluations().filter(item => item.id !== evaluation.id)].slice(0, 50);
  if (!historyScope) {
    historyStatus = { mode: 'MEMORY_ONLY', stored: false, error: null };
    return getJevHistoryStatus();
  }
  try {
    if (typeof localStorage === 'undefined') {
      historyStatus = { mode: 'MEMORY_ONLY', stored: false, error: null };
      return getJevHistoryStatus();
    }
    localStorage.setItem(historyScope, JSON.stringify(volatileHistory));
    historyStatus = { mode: 'LOCAL_DEVICE', stored: true, error: null };
  } catch {
    historyStatus = { mode: 'LOCAL_DEVICE', stored: false, error: 'Simpanan peranti gagal. Keputusan kekal dalam memori sesi; belum disimpan pada pelayan.' };
  }
  return getJevHistoryStatus();
}
// --- DeepSeek R1 & Nous Hermes Integration Utilities ---

export interface DeepSeekReasoningExtraction {
  hasThinkingTrace: boolean;
  thinkingTrace: string;
  finalContent: string;
}

/**
 * DeepSeek-R1 Pattern: Extracts and isolates internal `<think> ... </think>`
 * cognitive reasoning traces from final customer-facing responses.
 */
export function extractReasoningTrace(rawText: string): DeepSeekReasoningExtraction {
  if (!rawText) {
    return { hasThinkingTrace: false, thinkingTrace: '', finalContent: '' };
  }

  const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
  const match = rawText.match(thinkRegex);

  if (match) {
    const thinkingTrace = match[1].trim();
    const finalContent = rawText.replace(thinkRegex, '').trim();
    return {
      hasThinkingTrace: true,
      thinkingTrace,
      finalContent,
    };
  }

  return {
    hasThinkingTrace: false,
    thinkingTrace: '',
    finalContent: rawText.trim(),
  };
}

export interface HermesSkillRegistrationResult {
  isValid: boolean;
  skillName: string;
  category: string;
  reasons: string[];
}

/**
 * Nous Hermes Agent Pattern: Autonomous dynamic skill synthesizer & validator.
 * Enforces JEV invariants before allowing new skills to be registered in the runtime.
 */
export function validateAndRegisterHermesSkill(spec: {
  name: string;
  category: string;
  description: string;
  procedures?: string[];
}): HermesSkillRegistrationResult {
  const reasons: string[] = [];

  if (!spec.name || spec.name.length < 3) {
    reasons.push('Nama skill mesti sekurang-kurangnya 3 aksara.');
  }

  const normalizedCategory = spec.category?.toLowerCase() || 'general';
  const allowedCategories = [
    'architecture-design', 'codegen-scaffolding', 'data-analytics',
    'devops-infra', 'documentation-knowledge', 'maintenance-optimization',
    'meta', 'security-compliance', 'testing-quality', 'jev-core', 'superpowers'
  ];

  if (!allowedCategories.includes(normalizedCategory)) {
    reasons.push(`Kategori "${spec.category}" mesti dalam 11 domain kemahiran yang diiktiraf.`);
  }

  if (!spec.description || spec.description.length < 10) {
    reasons.push('Penerangan skill mesti mengandungi sekurang-kurangnya 10 aksara.');
  }

  const isValid = reasons.length === 0;

  if (isValid) {
    try {
      // Di luar browser (SSR/ujian) tiada storage — skill tidak disimpan, bukan ralat.
      if (typeof localStorage !== 'undefined') {
        const storageKey = 'abangcolek_hermes_skills';
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updated = [
          {
            name: spec.name,
            category: normalizedCategory,
            description: spec.description,
            procedures: spec.procedures || [],
            registeredAt: new Date().toISOString(),
          },
          ...existing.filter((s: any) => s.name !== spec.name)
        ].slice(0, 30);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to store Hermes skill', e);
    }
  }

  return {
    isValid,
    skillName: spec.name,
    category: normalizedCategory,
    reasons,
  };
}

