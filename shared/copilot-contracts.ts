/**
 * AbangColek Sovereign GrowthOS — CopilotKit & ADK Contracts v1.0 / Revision 4
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • Rules Own The Money • A2UI Fixed Schema
 */

export interface FreeModelCandidate {
  providerId: 'gemini_free' | 'openrouter';
  model: string;
  name: string;
}

/**
 * Susunan calon model percuma yang dipatuhi secara ketat tanpa sebarang paid fallback:
 * 1. gemini-3.6-flash (Primary Free)
 * 2. gemini-3.5-flash-lite (Secondary Free)
 * 3. nvidia/nemotron-3-super-120b-a12b:free via OpenRouter Free
 */
export const STRICT_FREE_CANDIDATE_SEQUENCE: readonly FreeModelCandidate[] = [
  {
    providerId: 'gemini_free',
    model: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (Primary Free)',
  },
  {
    providerId: 'gemini_free',
    model: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite (Fallback Free)',
  },
  {
    providerId: 'openrouter',
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'NVIDIA Nemotron 3 Super 120B Free (OpenRouter Free)',
  },
] as const;

export const A2UI_ALLOWLISTED_COMPONENTS = [
  'OperationsBriefCard',
  'RefundImpactPanel',
  'JevAssessmentCard',
  'MarginSimulator',
  'MarginSummaryCard',
  'OrderTrackingBadge',
  'OrderTrackingCard',
  'CommissionCard',
] as const;

export type A2UIComponentName = (typeof A2UI_ALLOWLISTED_COMPONENTS)[number];

export function validateA2UIComponent(name: string): name is A2UIComponentName {
  return (A2UI_ALLOWLISTED_COMPONENTS as readonly string[]).includes(name);
}

export type ProvenanceSource =
  | 'local_authoritative'
  | 'canonical_evaluator'
  | 'jev_local_rules'
  | 'database';

export type A2UIActionType = 'approve' | 'reject' | 'navigate' | 'recheck';

export interface A2UIAction {
  id: string;
  label: string;
  actionType: A2UIActionType;
  payload?: Record<string, any>;
}

export interface A2UIProvenance {
  source: ProvenanceSource;
  timestamp: string;
  revision?: number | string;
}

/**
 * Kanonikal Wire Format A2UI v1:
 * Menyokong kedua-dua `component` dan `componentName` untuk keserasian
 * renderer Copilot dan ADR-0003.
 */
export interface A2UIFixedSchema<TProps = Record<string, any>> {
  schemaVersion: 'a2ui.v1';
  component: A2UIComponentName;
  componentName?: A2UIComponentName;
  props: TProps;
  provenance: A2UIProvenance;
  actions?: A2UIAction[];
}

// ============================================================================
// Komponen 1: JevAssessmentCard (GUI-01 Display Only)
// Peraturan Mutlak: Tiada skor keyakinan / confidenceScore rekaan.
// ============================================================================
export interface JevAssessmentCardProps {
  issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
  rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
  sopAction: string;
  evaluationState: 'reviewed' | 'pending_quarantine';
  evidencePhotoRequired: boolean;
}

// ============================================================================
// Komponen 2: MarginSummaryCard & MarginSimulator (GUI-01 & GUI-02)
// Peraturan Mutlak: Ambang tunai integer Sen dan peratusan dinyatakan secara konsisten.
// ============================================================================
export interface MarginSimulatorProps {
  contributionSen: number;
  contributionMarginPct: number;
  requiredContributionSen: number; // minMarginSen (ambang tunai integer Sen)
  requiredMarginPct: number; // minMarginPercent (ambang peratusan)
  status: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
  minMarginSen?: number; // Alias kanonikal untuk requiredContributionSen
  minMarginPercent?: number; // Alias kanonikal untuk requiredMarginPct
}

// ============================================================================
// Komponen 3: OrderTrackingCard & OrderTrackingBadge (GUI-01 & GUI-04)
// Peraturan Mutlak: Unjuran pesanan selamat tanpa kebocoran medan dalaman.
// ============================================================================
export interface OrderTrackingProjectionProps {
  orderId: string;
  stage: 'draft' | 'accepted' | 'packing' | 'dispatched' | 'received';
  trackingTokenRedactedHash: string;
  expiryDaysRemaining: number;
}

// ============================================================================
// Komponen 4: OperationsBriefCard (GUI-05 Read-Only First-Party MCP App)
// Peraturan Mutlak: Menyertakan briefDate dan senarai metrics.
// ============================================================================
export interface OperationsBriefMetric {
  label: string;
  value: string;
}

export interface OperationsBriefCardProps {
  title: string;
  briefDate: string; // Format kalendar YYYY-MM-DD
  metrics: OperationsBriefMetric[];
  readOnlyNotice?: 'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED';
}

// ============================================================================
// Komponen 5: RefundImpactPanel (GUI-06 A2UI Fixed Schema)
// ============================================================================
export interface RefundImpactPanelProps {
  issueClass: 'LEAKAGE' | 'CAP_DEFECT' | 'TASTE_ANOMALY' | 'LABEL_MISPRINT';
  rootCause: 'UNDETERMINED' | 'SUPPLIER_BATCH_CONTAMINATION' | 'PACKAGING_CRIMP_FAILURE';
  hitlRequired: true;
  estimatedImpactSen?: number;
  sopAction?: string;
}

// ============================================================================
// Human-In-The-Loop (HITL) Request & Execution Receipt Contracts
// ============================================================================
export type HitlStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'stale'
  | 'failed'
  | 'succeeded';

export interface HitlEntityRef {
  type: 'order' | 'inventory_lot' | 'dealer_commission' | 'expense' | 'user' | 'batch';
  id: string;
}

export interface ExecutionReceipt {
  receiptId: string;
  actionId: string;
  executedBy: string;
  executedAt: string;
  targetEntity: HitlEntityRef;
  preRevision: number;
  postRevision: number;
  status: 'succeeded' | 'failed';
  amountSen?: number;
  journalEntryRef?: string;
  auditLogId: string;
  sourceHash?: string;
}

export interface HitlActionRequest {
  id: string;
  actionType: 'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra';
  entity: HitlEntityRef;
  amountSen?: number; // Integer sen untuk tindakan bernilai kewangan
  revision: number; // State revision expected when action was proposed
  reason: string; // Justifikasi eksplisit keputusan
  expiry: string; // ISO 8601 timestamp tamat tempoh kelulusan
  status: HitlStatus;
  description: string;
  payload: Record<string, any>;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  executionReceipt?: ExecutionReceipt;
}

// ============================================================================
// Scoped Client-State Projection (GUI-04 Safe Allowlisted Schema)
// ============================================================================
export interface StateScope {
  workspaceId: string;
  userId: string;
  threadId: string;
}

export type SafeClientStateValue = string | number | boolean;

export interface WorkflowProgressState {
  label?: string;
  currentStep: number;
  totalSteps: number;
}

export interface ScopedStateProjection {
  scope: StateScope;
  selectedOrderId?: string;
  filters: Record<string, SafeClientStateValue>;
  draft: Record<string, SafeClientStateValue>;
  workflowProgress?: WorkflowProgressState;
  updatedAt: string;
  schemaVersion: 'scoped_state.v1';
}

export const DISALLOWED_CLIENT_STATE_TOKENS = [
  'role',
  'paid',
  'admin',
  'permission',
  'permissions',
  'capability',
  'capabilities',
  'authority',
  'authorized',
  'authorize',
  'authorization',
  'allowed',
  'permitted',
  'approve',
  'approved',
  'approver',
  'approves',
  'approval',
  'access',
  'privilege',
  'entitlement',
] as const;

export interface CopilotV2RuntimeDescriptor {
  version: '2.0.0';
  runtime: 'copilotkit-v2-agui';
  schema: 'a2ui.v1';
  activeProvider: string;
  candidateModels: readonly FreeModelCandidate[];
  allowlistedComponents: readonly A2UIComponentName[];
  paidFallbackAllowed: false;
}
