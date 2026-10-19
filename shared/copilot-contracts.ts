/**
 * AbangColek Sovereign GrowthOS — CopilotKit & ADK Contracts v1.0
 * Pematuhan Prinsip: Zero-New-Paid-Cloud-Spend • A2UI Fixed Schema
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
  'OrderTrackingBadge',
  'CommissionCard',
] as const;

export type A2UIComponentName = (typeof A2UI_ALLOWLISTED_COMPONENTS)[number];

export function validateA2UIComponent(name: string): name is A2UIComponentName {
  return (A2UI_ALLOWLISTED_COMPONENTS as readonly string[]).includes(name);
}

export interface A2UIFixedSchema {
  schemaVersion: 'a2ui.v1';
  component: A2UIComponentName;
  props: Record<string, any>;
  provenance: {
    source: 'local_authoritative' | 'canonical_evaluator' | 'jev_local_rules' | 'database';
    timestamp: string;
    revision?: number | string;
  };
  actions?: Array<{
    id: string;
    label: string;
    actionType: 'approve' | 'reject' | 'navigate' | 'recheck';
    payload?: Record<string, any>;
  }>;
}

export interface HitlActionRequest {
  id: string;
  actionType: 'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra';
  description: string;
  payload: Record<string, any>;
  status: 'pending_approval' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CopilotV2RuntimeDescriptor {
  version: '2.0.0';
  runtime: 'copilotkit-v2-agui';
  schema: 'a2ui.v1';
  activeProvider: string;
  candidateModels: readonly FreeModelCandidate[];
  allowlistedComponents: readonly A2UIComponentName[];
  paidFallbackAllowed: false;
}
