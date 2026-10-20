/**
 * ABANGCOLEK — Advanced Capability Contracts (ADV family)
 *
 * Typed contracts for the capability gaps closed in the ADV wave:
 *
 *   ADV-05  complete checkout conflict classes (cart and order mode)
 *   ADV-15  loyalty audit *remediation* (not only detection)
 *   ADV-17  day-close reconciliation *remediation*
 *   ADV-20  export quota + re-authorisation at download time
 *   ADV-21  case triage *remediation*
 *   ADV-23  outbound-send consent guard on a draft
 *   ADV-24  grant-aware action-plan steps
 *   ADV-26  reconciliation as three distinct operations
 *
 * House rules encoded here:
 *   - every failure carries a machine-readable code (never free-text guessing);
 *   - money is always integer Sen, points are integers, no float arithmetic;
 *   - a value that cannot be computed from real state is never invented — the
 *     outcome states the reason code instead.
 */

/* ------------------------------------------------------------------ *
 * ADV-05 — checkout conflict classes
 * ------------------------------------------------------------------ */

/**
 * The five required conflict classes. `invalid_quantity` covers the
 * "fractional / negative quantity" family; the concrete variant is carried by
 * `code` (fractional, negative, zero).
 */
export type CheckoutConflictClass =
  | 'stale_price'
  | 'ineligible_loyalty'
  | 'invalid_quantity'
  | 'duplicate_line'
  | 'invalid_fulfilment';

export type CheckoutConflictCode =
  | 'CHECKOUT_STALE_PRICE'
  | 'CHECKOUT_INELIGIBLE_LOYALTY'
  | 'CHECKOUT_FRACTIONAL_QUANTITY'
  | 'CHECKOUT_NEGATIVE_QUANTITY'
  | 'CHECKOUT_ZERO_QUANTITY'
  | 'CHECKOUT_DUPLICATE_LINE'
  | 'CHECKOUT_INVALID_FULFILMENT';

export interface CheckoutConflict {
  /** Conflict class (one of the five required classes). */
  class: CheckoutConflictClass;
  /** Machine-readable reason code. */
  code: CheckoutConflictCode;
  /** True when the conflict must stop the checkout from proceeding. */
  blocking: boolean;
  /** Index of the offending line inside the requested/recorded lines. */
  lineIndex: number | null;
  productId: string | null;
  /** Expected value (canonical state) as a string, or null when not applicable. */
  expected: string | null;
  /** Actual value (client/order state) as a string, or null when not applicable. */
  actual: string | null;
  /** Human readable explanation (Malay). Never used for branching. */
  detail: string;
}

export interface CheckoutConflictSummary {
  conflictCount: number;
  blockingCount: number;
  /** Unique classes present, sorted. */
  classes: CheckoutConflictClass[];
  /** Unique codes present, sorted. */
  codes: CheckoutConflictCode[];
}

/* ------------------------------------------------------------------ *
 * ADV-15 / ADV-17 / ADV-21 — remediation outcomes
 * ------------------------------------------------------------------ */

export type RemediationStatus = 'applied' | 'refused' | 'skipped';

export type RemediationCode =
  | 'LOYALTY_EXPIRY_RECORDED'
  | 'LOYALTY_BALANCE_ADJUSTED'
  | 'LOYALTY_REMEDIATION_REQUIRES_FOUNDER'
  | 'LOYALTY_NOTHING_TO_REMEDIATE'
  | 'LOYALTY_ADJUSTMENT_REJECTED'
  | 'DAY_CLOSE_REALIGNED'
  | 'DAY_CLOSE_ALREADY_ALIGNED'
  | 'DAY_CLOSE_VARIANCE_REMAINS'
  | 'DAY_CLOSE_REMEDIATION_REQUIRES_FOUNDER'
  | 'CASE_REFUND_PROPOSAL_CREATED'
  | 'CASE_REFUND_PROPOSAL_EXISTS'
  | 'CASE_REFUND_NO_REFUNDABLE_BALANCE'
  | 'CASE_EVIDENCE_TASK_PROPOSED'
  | 'CASE_ASSIGNED'
  | 'CASE_ALREADY_OWNED'
  | 'CASE_REMEDIATION_REQUIRES_FOUNDER';

export interface RemediationOutcome {
  /** Machine-readable reason code. */
  code: RemediationCode;
  /** applied = state really changed; refused = blocked by missing authority. */
  status: RemediationStatus;
  /** Canonical subject of the remediation, e.g. `loyalty:usr-1`. */
  subject: string;
  detail: string;
  /** Integer Sen when the remediation moves money. Never a float. */
  amountSen?: number;
  /** Integer points when the remediation moves loyalty points. */
  points?: number;
  /** Durable proposal id when the remediation is a proposal awaiting approval. */
  proposalId?: string;
}

/* ------------------------------------------------------------------ *
 * ADV-20 — export quota + download-time re-authorisation
 * ------------------------------------------------------------------ */

/** Server-owned export quota per actor per local business day. */
export const EXPORT_QUOTA_PER_ACTOR_PER_DAY = 10;

/** Server-owned download window of an export artifact (24h from creation). */
export const EXPORT_DOWNLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ExportOperation = 'create' | 'download';

export type ExportRefusalCode =
  | 'EXPORT_QUOTA_EXCEEDED'
  | 'EXPORT_ARTIFACT_NOT_FOUND'
  | 'EXPORT_ARTIFACT_FORBIDDEN'
  | 'EXPORT_GRANT_EXPIRED'
  | 'EXPORT_ARTIFACT_KIND_MISMATCH'
  | 'EXPORT_ARTIFACT_CONTENT_MISMATCH'
  | 'EXPORT_DOWNLOAD_NOT_ALLOWED';

export interface ExportQuotaDecision {
  allowed: boolean;
  code: ExportRefusalCode | null;
  used: number;
  limit: number;
  /** ISO instant the current window resets (next local business day). */
  resetsAt: string;
}

/** The durable export artifact kept in the platform store. */
export interface ExportArtifactRecord {
  id: string;
  ownerId: string;
  filename: string;
  format: 'csv' | 'html';
  kind: string;
  recordCount: number;
  generatedAt: string;
  sourceVersions: Record<string, number>;
  metrics: Record<string, unknown>;
  metricScope: string;
  contentHash: string;
  contentBytes: number;
  /** Exact content handed to the founder at download time. */
  content: string;
  /** Filter used to build the report — kept so the export stays auditable. */
  filter: Record<string, unknown>;
  idempotencyKey: string | null;
  createdAt: string;
  /** Server-owned download grant window. */
  downloadExpiresAt: string;
  downloadCount: number;
  lastDownloadedAt: string | null;
  revision: number;
}

export interface ExportDownloadAuthorization {
  allowed: boolean;
  code: ExportRefusalCode | null;
  detail: string;
}

/* ------------------------------------------------------------------ *
 * ADV-23 — outbound-send consent
 * ------------------------------------------------------------------ */

/** The platform only ever delivers in-app messages (canonical CaseMessage). */
export type OutboundChannel = 'in_app';

export type OutboundConsentStatus = 'granted' | 'revoked' | 'expired' | 'unrecorded';

export type OutboundConsentCode =
  | 'OUTBOUND_CONSENT_GRANTED'
  | 'OUTBOUND_CONSENT_NOT_GRANTED'
  | 'OUTBOUND_CONSENT_REVOKED'
  | 'OUTBOUND_CONSENT_EXPIRED'
  | 'OUTBOUND_CONSENT_UNRECORDED';

/**
 * Canonical consent record. The server never invents consent: a send is only
 * allowed when such a record exists and is still valid.
 */
export interface OutboundConsentRecord {
  id: string;
  customerId: string;
  channel: OutboundChannel;
  caseId?: string;
  status: 'granted' | 'revoked';
  grantedAt: string;
  expiresAt?: string;
  recordedBy: string;
  sourceRef?: string;
}

export interface OutboundConsentDecision {
  granted: boolean;
  status: OutboundConsentStatus;
  code: OutboundConsentCode;
  channel: OutboundChannel;
  consentId: string | null;
  detail: string;
}

/* ------------------------------------------------------------------ *
 * ADV-24 — capability grants
 * ------------------------------------------------------------------ */

export interface CapabilityGrantRecord {
  id: string;
  userId: string;
  /** Logical capability id, e.g. `ADV-07`. */
  capabilityId: string;
  /** `*`, `outlet:<id>`, `entity:<id>` or `case:<id>`. */
  scope: string;
  status: 'active' | 'revoked';
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  source: 'founder_grant' | 'approval:capability.grant';
}

export type GrantDecisionCode =
  | 'GRANT_HELD'
  | 'GRANT_NOT_HELD'
  | 'GRANT_REVOKED'
  | 'GRANT_EXPIRED'
  | 'GRANT_SCOPE_MISMATCH'
  | 'GRANT_FOUNDER_ROOT_AUTHORITY';

export interface GrantDecision {
  held: boolean;
  code: GrantDecisionCode;
  capabilityId: string;
  grantId: string | null;
  scope: string | null;
  detail: string;
}

/* ------------------------------------------------------------------ *
 * ADV-26 — three distinct reconciliation operations
 * ------------------------------------------------------------------ */

export type ReconcileOperation =
  | 'inspect_action_receipt'
  | 'refresh_external_action_status'
  | 'apply_verified_action_outcome';

export const RECONCILE_OPERATIONS: readonly ReconcileOperation[] = [
  'inspect_action_receipt',
  'refresh_external_action_status',
  'apply_verified_action_outcome',
];

export type ExternalActionStatus = 'confirmed' | 'drifted' | 'missing';

export type ReconcileReasonCode =
  | 'RECEIPT_NOT_FOUND'
  | 'RECEIPT_NOT_CONFIRMED'
  | 'EXTERNAL_STATUS_UNAVAILABLE'
  | 'EXTERNAL_OUTCOME_UNVERIFIED'
  | 'ACTION_TYPE_NOT_SUPPORTED'
  | 'PAYMENT_RECORD_MISSING'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'PAYMENT_STATE_MISMATCH'
  | 'ORDER_STATE_MISMATCH'
  | 'ACTION_ALREADY_APPLIED';

/** Durable snapshot of the last observed external status of an action. */
export interface ActionStatusRecord {
  id: string;
  receiptId: string;
  proposalId: string;
  actionType: string;
  externalStatus: ExternalActionStatus;
  observedAt: string;
  observedBy: string;
  evidence: Record<string, unknown>;
}

/** Durable ledger of a verified action outcome that has been applied. */
export interface ActionOutcomeRecord {
  id: string;
  receiptId: string;
  proposalId: string;
  actionType: string;
  amountSen: number;
  externalStatus: ExternalActionStatus;
  verifiedAt: string;
  verifiedBy: string;
  appliedAt: string;
  platformStateRepaired: boolean;
  evidence: Record<string, unknown>;
}
