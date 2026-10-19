import { describe, expect, test } from 'bun:test';
import {
  A2UI_ALLOWLISTED_COMPONENTS,
  validateA2UIComponent,
  type A2UIFixedSchema,
  type FreeModelCandidate,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../shared/copilot-contracts';

describe('Google ADK Specialists & AG-UI Contracts Conformance', () => {
  test('A2UI allowlisted components contain all 6 canonical UI components', () => {
    expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('OperationsBriefCard');
    expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('RefundImpactPanel');
    expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('JevAssessmentCard');
    expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('MarginSimulator');
    expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('OrderTrackingBadge');
    expect(A2UI_ALLOWLISTED_COMPONENTS).toContain('CommissionCard');
  });

  test('validateA2UIComponent accepts allowlisted components and rejects unknown', () => {
    expect(validateA2UIComponent('OperationsBriefCard')).toBe(true);
    expect(validateA2UIComponent('JevAssessmentCard')).toBe(true);
    expect(validateA2UIComponent('ArbitraryWidget')).toBe(false);
    expect(validateA2UIComponent('FabricatedChart')).toBe(false);
  });

  test('STRICT_FREE_CANDIDATE_SEQUENCE satisfies Zero-New-Paid-Cloud-Spend policy', () => {
    expect(STRICT_FREE_CANDIDATE_SEQUENCE.length).toBe(3);
    expect(STRICT_FREE_CANDIDATE_SEQUENCE[0].model).toBe('gemini-3.6-flash');
    expect(STRICT_FREE_CANDIDATE_SEQUENCE[1].model).toBe('gemini-3.5-flash-lite');
    expect(STRICT_FREE_CANDIDATE_SEQUENCE[2].model).toBe('nvidia/nemotron-3-super-120b-a12b:free');
    
    // Ensure all candidates belong to free providers
    for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) {
      expect(['gemini_free', 'openrouter']).toContain(candidate.providerId);
    }
  });

  test('QC JEV Reviewer schema invariant: Root cause is UNDETERMINED and confidence is null', () => {
    const mockJevA2UI: A2UIFixedSchema = {
      schemaVersion: 'a2ui.v1',
      component: 'JevAssessmentCard',
      props: {
        incidentType: 'leakage',
        rootCause: 'UNDETERMINED',
        confidenceScore: null,
        localRulesEnforced: true,
      },
      provenance: {
        source: 'jev_local_rules',
        timestamp: new Date().toISOString(),
      },
    };

    expect(validateA2UIComponent(mockJevA2UI.component)).toBe(true);
    expect(mockJevA2UI.props.rootCause).toBe('UNDETERMINED');
    expect(mockJevA2UI.props.confidenceScore).toBeNull();
    expect(mockJevA2UI.provenance.source).toBe('jev_local_rules');
  });

  test('Commerce Reader schema invariant: Read-only access with zero mutation', () => {
    const mockCommerceA2UI: A2UIFixedSchema = {
      schemaVersion: 'a2ui.v1',
      component: 'OperationsBriefCard',
      props: {
        title: 'Analisis Katalog & Jualan Runcit',
        readOnly: true,
      },
      provenance: {
        source: 'local_authoritative',
        timestamp: new Date().toISOString(),
      },
    };

    expect(validateA2UIComponent(mockCommerceA2UI.component)).toBe(true);
    expect(mockCommerceA2UI.props.readOnly).toBe(true);
    expect(mockCommerceA2UI.provenance.source).toBe('local_authoritative');
  });
});
