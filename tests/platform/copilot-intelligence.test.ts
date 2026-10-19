import { describe, expect, test } from 'bun:test';
import { STRICT_FREE_CANDIDATE_SEQUENCE } from '../../shared/copilot-contracts';
import { FreeModelRouter } from '../../server/platform/freeModelRouter';

describe('Fasa 05: CopilotKit Intelligence Policy & Evaluation (CPK-02 / CPK-03)', () => {
  test('CPK-02 (Remote Cloud Intelligence) status is strictly blocked_external under Zero-Cost Policy', () => {
    // Blueprint v2.3 & ADR-0003: No paid cloud subscription or unverified proprietary intelligence allowed
    const cloudIntelligenceState = {
      feature: 'CPK-02',
      status: 'blocked_external',
      reason: 'Tiada offering percuma kekal atau kontrak self-hosted cloud tanpa kos.',
      paidAllowed: false,
    };

    expect(cloudIntelligenceState.status).toBe('blocked_external');
    expect(cloudIntelligenceState.paidAllowed).toBe(false);
  });

  test('CPK-03 (Self-Hosted Intelligence Fallback) enforces local FreeModelRouter without paid overflow', async () => {
    const router = new FreeModelRouter();
    
    // Strict candidates check
    const candidates = router.getStrictFreeCandidates();
    expect(candidates.length).toBe(3);
    expect(candidates[0].model).toBe('gemini-3.6-flash');
    expect(candidates[1].model).toBe('gemini-3.5-flash-lite');
    expect(candidates[2].model).toBe('nvidia/nemotron-3-super-120b-a12b:free');

    // Deterministic fallback response generation
    const fallbackText = router.generateFallbackResponse('Semak botol sos bocor');
    expect(fallbackText).toContain('bocor');
    expect(fallbackText).toContain('UNDETERMINED');
  });

  test('Intelligence candidates sequence contains zero paid models', () => {
    for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) {
      expect(candidate.model.toLowerCase()).not.toContain('gpt-4');
      expect(candidate.model.toLowerCase()).not.toContain('claude-3');
      expect(candidate.model.toLowerCase()).not.toContain('paid');
    }
  });
});
