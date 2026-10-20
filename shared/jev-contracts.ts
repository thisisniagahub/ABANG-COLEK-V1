export type JevPackId = 'support' | 'marketing' | 'dealer' | 'developer' | 'order_exception' | 'qc';
export type JevProviderMode = 'LOCAL_RULES' | 'GENERATIVE_EMULATION' | 'TYPESAFE_NATIVE';
export type JevEvidenceKind = 'BUSINESS_FACT' | 'CUSTOMER_CLAIM' | 'SOURCE' | 'RECEIPT';
export interface JevEvidence { id: string; kind: JevEvidenceKind; text: string; observedAt?: string }
export interface JevState {
  text: string;
  evidence?: JevEvidence[];
  entityId?: string;
  entityRevision?: number;
  constraints?: string[];
  pendingOperations?: string[];
  /** Supplied by the authorized server context builder, never inferred from prose. */
  facts?: Partial<Record<'paymentVerified' | 'canonicalPriceKnown' | 'evidenceComplete' | 'sopCurrent', boolean | null>>;
}
export type JevQuestion =
  | { id: string; type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { id: string; type: 'score'; instructions: string; criteria: string[] }
  | { id: string; type: 'noul'; instructions: string };
export type JevNativeAnswer =
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: 'score'; score: number; probabilities: Record<string, number>; confidence: number }
  | { type: 'noul'; noul: number };
export interface JevRuleAnswer {
  type: JevQuestion['type'];
  value: string | number | boolean | null;
  confidence: null;
  probabilities: null;
  reason: string;
}
export interface JevPolicy {
  outcome: 'READ_ONLY' | 'REVIEW_REQUIRED' | 'BLOCKED';
  reasonCodes: string[];
  version: '1.0';
}

/**
 * Taksonomi JEV 7 dimensi — satu sumber kebenaran yang dikongsi antara lapisan
 * server dan lapisan pelayar. Nilai di luar taksonomi ini TIDAK pernah
 * disimpan sebagai nilai dimensi: ia direkodkan sebagai drift.
 */
export const JEV_TAXONOMY = {
  Brand: ['ABANGCOLEK', 'LIURLELEH', 'JERUX', 'MULTI_BRAND', 'UNKNOWN'] as const,
  BusinessFunction: [
    'PRODUCTION', 'PROCUREMENT', 'PACKAGING', 'WAREHOUSING', 'INVENTORY',
    'DISTRIBUTION', 'TRANSPORT', 'AGENT_MANAGEMENT', 'DIRECT_SALES', 'RETAIL',
    'POPUP', 'EVENT', 'CUSTOMER_SERVICE', 'MARKETING', 'CONTENT', 'RECRUITMENT',
    'FINANCE', 'COMPLIANCE', 'OTHER', 'UNKNOWN',
  ] as const,
  SalesChannel: [
    'DIRECT', 'SOCIAL_COMMERCE', 'AGENT', 'HOME_SELLER', 'POPUP', 'EVENT',
    'RETAIL', 'DELIVERY', 'COD', 'ONLINE', 'UNKNOWN',
  ] as const,
  CustomerIntent: [
    'PURCHASE', 'PRICE_QUERY', 'STOCK_QUERY', 'LOCATION_QUERY', 'DELIVERY_QUERY',
    'PRODUCT_QUERY', 'CUSTOMIZATION', 'AGENT_APPLICATION', 'JOB_APPLICATION',
    'COMPLAINT', 'REFUND', 'RETURN', 'PRAISE', 'GENERAL_CHAT', 'UNKNOWN',
  ] as const,
  IssueClass: [
    'PRODUCT_QUALITY', 'PACKAGING', 'LEAKAGE', 'SEAL_FAILURE', 'FRESHNESS',
    'TASTE', 'APPEARANCE', 'QUANTITY', 'WRONG_ITEM', 'STOCKOUT', 'DELIVERY_DELAY',
    'DELIVERY_DAMAGE', 'TRANSPORT', 'STORAGE', 'AGENT_HANDLING', 'CUSTOMER_SERVICE',
    'PAYMENT', 'PRICE', 'LOCATION', 'UNKNOWN',
  ] as const,
  ProcessStage: [
    'SUPPLIER', 'RAW_MATERIAL_RECEIVING', 'PRODUCTION', 'FILLING', 'PACKAGING',
    'QC', 'COLD_STORAGE', 'WAREHOUSE', 'DISPATCH', 'TRANSPORT', 'AGENT_RECEIVING',
    'AGENT_STORAGE', 'POS', 'POINT_OF_SALE', 'LAST_MILE', 'LAST_MILE_DELIVERY',
    'CUSTOMER_STORAGE', 'UNKNOWN',
  ] as const,
  RootCauseStatus: [
    'UNDETERMINED', 'HYPOTHESIS', 'UNDER_INVESTIGATION', 'VERIFIED', 'REJECTED',
  ] as const,
};

export type JevBrand = typeof JEV_TAXONOMY.Brand[number];
export type JevBusinessFunction = typeof JEV_TAXONOMY.BusinessFunction[number];
export type JevSalesChannel = typeof JEV_TAXONOMY.SalesChannel[number];
export type JevCustomerIntent = typeof JEV_TAXONOMY.CustomerIntent[number];
export type JevIssueClass = typeof JEV_TAXONOMY.IssueClass[number];
export type JevProcessStage = typeof JEV_TAXONOMY.ProcessStage[number];
export type JevRootCauseStatus = typeof JEV_TAXONOMY.RootCauseStatus[number];

/** Nama medan dimensi (bukan nilai) — digunakan untuk menanda drift. */
export const JEV_DIMENSION_NAMES = [
  'brand', 'businessFunction', 'salesChannel',
  'customerIntent', 'issueClass', 'processStage', 'rootCauseStatus',
] as const;
export type JevDimensionName = typeof JEV_DIMENSION_NAMES[number];

/**
 * Semantik null JEV (BL-23).
 *
 * "Tidak dikira" mesti keluar sebagai JSON `null` — bukan `0`, bukan `false`,
 * bukan `{}` dan bukan `[]`. Nilai `0`/`false` dibaca sebagai "dikira dan
 * bernilai sifar/salah", iaitu keadaan yang salah. Setiap medan di bawah
 * hanya boleh bernilai bukan-null apabila pengiraan benar-benar dijalankan.
 */
export interface JevDimensionResult<T extends string = string> {
  value: T;
  /** 0.0..1.0. `null` = tiada keyakinan dikira. */
  confidence: number | null;
  /** Taburan kebarangkalian. `null` = tiada taburan dikira (bukan `{}`). */
  probabilities: Record<string, number> | null;
}

export interface JevScoreResult {
  /** `null` = tiada skor dikira. */
  score: number | null;
  label: string;
  /** `null` = tiada keyakinan dikira. */
  confidence: number | null;
}

export interface JevNoulResult {
  /** 0.0..1.0. `null` = tiada kebarangkalian dikira. */
  probability: number | null;
  /** `null` = tiada keputusan ya/tidak dikira (bukan `false`). */
  isAffirmative: boolean | null;
}

/**
 * Unjuran diklasifikasi JEV. Dihasilkan oleh lapisan server; setiap medan
 * "tidak dikira" ialah `null` dan setiap nilai dimensi mesti berada dalam
 * taksonomi.
 */
export interface JevClassificationProjection {
  providerMode: 'LOCAL_RULES';
  assessmentId: string;
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
  /** Dimensi yang nilai peknya berada di luar taksonomi. */
  taxonomyDrift?: JevDimensionName[];
}
export interface JevAssessment {
  id: string;
  packId: JevPackId;
  questionSetVersion: '1.0';
  providerMode: 'LOCAL_RULES';
  status: 'RULE_HINT' | 'ABSTAIN' | 'INVALID';
  answers: Record<string, JevRuleAnswer>;
  policy: JevPolicy;
  evidence: JevEvidence[];
  entityId?: string;
  entityRevision?: number;
  createdAt: string;
  latencyMs: number;
  schemaVersion?: '1.0';
  evaluatorVersion?: string;
  contextVersion?: string;
  sourceRefs?: JevContextSource[];
  abstentionReasons?: string[];
}

export interface JevContextSource {
  id: string;
  kind: 'ENTITY' | 'KNOWLEDGE' | 'EVIDENCE' | 'POLICY' | 'LEDGER';
  version: number;
  contentHash: string;
}
export interface JevAllowedContext {
  version: string;
  actorId: string;
  entityId: string;
  entityRevision: number;
  packId: JevPackId;
  sources: JevContextSource[];
  state: JevState;
  selectedAt: string;
}
export type JevEvaluationErrorClass = 'negation' | 'sarcasm' | 'contradictory_evidence' | 'missing_evidence' | 'missing_price' | 'missing_payment' | 'prompt_injection' | 'stale_knowledge' | 'routing';
export interface JevEvaluationCase {
  id: string;
  locale: 'ms' | 'en';
  errorClass: JevEvaluationErrorClass;
  packId: JevPackId;
  text: string;
  expected: Record<string, JevRuleAnswer['value']>;
  expectedStatus?: JevAssessment['status'];
}
export interface JevEvaluationMetric {
  cases: number;
  matchedCases: number;
  abstentions: number;
  unknownAnswers: number;
  totalAnswers: number;
  matchRate: number;
  abstentionRate: number;
  coverage: number;
}
export interface JevEvaluationRun {
  id: string;
  datasetId: string;
  datasetVersion: string;
  datasetHash: string;
  split: 'held_out';
  schemaVersion: '1.0';
  packVersions: Partial<Record<JevPackId, string>>;
  providerMode: 'LOCAL_RULES';
  providerVersion: string;
  caseCount: number;
  metrics: JevEvaluationMetric;
  byPack: Partial<Record<JevPackId, JevEvaluationMetric>>;
  byErrorClass: Partial<Record<JevEvaluationErrorClass, JevEvaluationMetric>>;
  errors: { caseId: string; packId: JevPackId; errorClass: JevEvaluationErrorClass; questionIds: string[] }[];
  observedLatency: { totalMs: number; meanMs: number; p95Ms: number };
  usage: { providerCalls: 0; newSpendSen: 0; inputTokens: null; outputTokens: null };
  calibration: { status: 'NOT_APPLICABLE_LOCAL_RULES'; reason: string };
  activation: 'REVIEW_ONLY';
  createdAt: string;
}
export interface JevActionPreview {
  id: string;
  assessmentId: string;
  status: 'PREPARED';
  operation: 'CREATE_DRAFT' | 'CREATE_TASK' | 'CREATE_EVENT' | 'CREATE_SHEET';
  recipient: null;
  title: string;
  body: string;
  requiresApproval: true;
  notice: string;
}
