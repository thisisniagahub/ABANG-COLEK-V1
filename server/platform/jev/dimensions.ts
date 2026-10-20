/**
 * AbangColek Platform — Unjuran Dimensi JEV (BL-23)
 *
 * Server memiliki unjuran 7 dimensi + 5 primitif JEV. Taksonomi berada di
 * `shared/jev-contracts.ts` supaya lapisan pelayar menggunakan set yang sama.
 *
 * Peraturan mutlak (BL-23):
 * 1. "Tidak dikira" = JSON `null` — bukan `0`, bukan `false`, bukan `{}`.
 * 2. Setiap nilai dimensi mesti berada dalam taksonomi. Nilai di luar
 *    taksonomi TIDAK pernah disimpan: ia digantikan dengan `'UNKNOWN'` dan
 *    nama dimensi direkodkan dalam `taxonomyDrift`.
 * 3. Rehidrasi rekod tersimpan: rekod dengan `confidence`/`probabilities`
 *    `null` BOLEH dimuat semula; rekod dengan nilai dimensi di luar taksonomi
 *    TIDAK BOLEH.
 */

import {
  JEV_DIMENSION_NAMES,
  JEV_TAXONOMY,
  type JevAssessment,
  type JevClassificationProjection,
  type JevCustomerIntent,
  type JevDimensionName,
  type JevDimensionResult,
  type JevIssueClass,
  type JevNoulResult,
  type JevScoreResult,
} from '../../../shared/jev-contracts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isUnitInterval = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maximum;

/**
 * Semak satu nilai pek terhadap set taksonomi.
 * - `undefined`/`null` bermaksud "tidak dikira" (bukan drift).
 * - Nilai di luar taksonomi bermaksud drift: ia tidak pernah diproyeksikan.
 */
export function resolveJevDimension<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): { value: T | null; drifted: boolean } {
  if (raw === undefined || raw === null) return { value: null, drifted: false };
  if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) {
    return { value: raw as T, drifted: false };
  }
  return { value: null, drifted: true };
}

/** Dimensi yang tiada pengiraan: nilai Unknown, keyakinan `null`, taburan `null`. */
const notComputed = <T extends string>(value: T): JevDimensionResult<T> => ({
  value,
  confidence: null,
  probabilities: null,
});

/** Skor yang tidak dikira: `score` dan `confidence` adalah `null`, bukan `0`. */
export const NOT_COMPUTED_SCORE: JevScoreResult = {
  score: null,
  label: 'Belum dinilai',
  confidence: null,
};

/** Noul yang tidak dikira: `probability` dan `isAffirmative` adalah `null`. */
export const NOT_COMPUTED_NOUL: JevNoulResult = { probability: null, isAffirmative: null };

/**
 * ProjékAssessment JEV kepada unjuran dimensi/primitif.
 *
 * Setiap nilai dimensi yang tidak dapat ditentukan menjadi `'UNKNOWN'` (atau
 * `'UNDETERMINED'` untuk punca) dengan `confidence: null` dan
 * `probabilities: null`. Tiada skor, kebarangkalian atau keyakinan direka.
 */
export function projectJevAssessment(assessment: JevAssessment): JevClassificationProjection {
  const answers = isRecord(assessment.answers) ? assessment.answers : {};
  const answerValue = (id: string): unknown =>
    isRecord(answers[id]) ? (answers[id] as Record<string, unknown>).value : undefined;

  const intent = resolveJevDimension<JevCustomerIntent>(answerValue('intent'), JEV_TAXONOMY.CustomerIntent);
  const issue = resolveJevDimension<JevIssueClass>(answerValue('issue'), JEV_TAXONOMY.IssueClass);

  const intentValue = intent.value ?? 'UNKNOWN';
  const issueValue = issue.value ?? 'UNKNOWN';
  const drift: JevDimensionName[] = [
    ...(intent.drifted ? ['customerIntent' as const] : []),
    ...(issue.drifted ? ['issueClass' as const] : []),
  ];

  return {
    providerMode: 'LOCAL_RULES',
    assessmentId: assessment.id,
    dimensions: {
      brand: notComputed('UNKNOWN'),
      // Per으로부터: ini routing kata kunci, bukan pengiraan keyakinan.
      businessFunction: notComputed(
        intentValue === 'AGENT_APPLICATION'
          ? 'AGENT_MANAGEMENT'
          : intentValue === 'UNKNOWN'
            ? 'UNKNOWN'
            : 'CUSTOMER_SERVICE',
      ),
      salesChannel: notComputed(intentValue === 'AGENT_APPLICATION' ? 'AGENT' : 'UNKNOWN'),
      customerIntent: notComputed(intentValue),
      issueClass: notComputed(issueValue),
      processStage: notComputed('UNKNOWN'),
      rootCauseStatus: notComputed('UNDETERMINED'),
    },
    primitives: {
      urgencyScore: { ...NOT_COMPUTED_SCORE },
      customerSatisfactionScore: { ...NOT_COMPUTED_SCORE },
      requiresImmediateIntervention: { ...NOT_COMPUTED_NOUL },
      isRefundEligible: { ...NOT_COMPUTED_NOUL },
      isHighValueAgentOpportunity: { ...NOT_COMPUTED_NOUL },
    },
    ...(drift.length ? { taxonomyDrift: drift } : {}),
  };
}

/**
 * Dimensi tersimpan: nilai mesti berada dalam taksonomi. `confidence` dan
 * `probabilities` kedua-duanya `null` bermaksud "tidak dikira" (benar); jika
 * salah satu sahaja yang `null`, rekod itu rosak.
 */
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

/**
 * Adakah unjuran tersimpan sah untuk dimuat semula?
 *
 * - Rekod dengan `confidence`/`probabilities` `null` (tidak dikira) sah.
 * - Rekod dengan nilai dimensi di luar taksonomi TIDAK sah.
 */
export function isStoredJevClassification(value: unknown): value is JevClassificationProjection {
  if (!isRecord(value)) return false;
  if (value.providerMode !== 'LOCAL_RULES' || !boundedString(value.assessmentId, 200)) return false;
  if (!isRecord(value.dimensions) || !isRecord(value.primitives)) return false;
  const dimensions = value.dimensions;
  if (!(
    isStoredDimension(dimensions.brand, JEV_TAXONOMY.Brand) &&
    isStoredDimension(dimensions.businessFunction, JEV_TAXONOMY.BusinessFunction) &&
    isStoredDimension(dimensions.salesChannel, JEV_TAXONOMY.SalesChannel) &&
    isStoredDimension(dimensions.customerIntent, JEV_TAXONOMY.CustomerIntent) &&
    isStoredDimension(dimensions.issueClass, JEV_TAXONOMY.IssueClass) &&
    isStoredDimension(dimensions.processStage, JEV_TAXONOMY.ProcessStage) &&
    isStoredDimension(dimensions.rootCauseStatus, JEV_TAXONOMY.RootCauseStatus)
  )) return false;
  const primitives = value.primitives;
  if (!(
    isStoredScore(primitives.urgencyScore) &&
    isStoredScore(primitives.customerSatisfactionScore) &&
    isStoredNoul(primitives.requiresImmediateIntervention) &&
    isStoredNoul(primitives.isRefundEligible) &&
    isStoredNoul(primitives.isHighValueAgentOpportunity)
  )) return false;
  const drift = value.taxonomyDrift;
  if (drift !== undefined && (!Array.isArray(drift) || drift.length > 10 ||
    drift.some(name => typeof name !== 'string' || !(JEV_DIMENSION_NAMES as readonly string[]).includes(name)))) return false;
  return true;
}
