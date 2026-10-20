import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import {
  A2UI_ALLOWLISTED_COMPONENTS,
  classifyProviderHttpFailure,
  validateA2UIComponent,
  type FreeModelCandidate,
  STRICT_FREE_CANDIDATE_SEQUENCE,
} from '../../shared/copilot-contracts';
import { PlatformStore } from '../../server/platform/store';
import { Auth, type Principal } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { Loyalty } from '../../server/platform/loyalty';
import { Dealers } from '../../server/platform/dealers';
import { GoogleAdkAgent } from '../../server/platform/adkAgent';
import { FreeModelRouter, FREE_PROVIDERS } from '../../server/platform/freeModelRouter';
import { assessState, isLocalAssessment } from '../../server/platform/jev/assessment';

function makePrincipal(id: string, role: 'founder' | 'customer'): Principal {
  return {
    user: { id, email: `${id}@test.local`, name: `User ${id}` },
    memberships: [
      {
        id: `mem-${id}`,
        userId: id,
        workspaceId: 'business',
        role,
        outletIds: ['hq'],
        status: 'active',
        version: 1,
      },
    ],
    sessionHash: `hash-${id}`,
    csrfHash: `csrf-${id}`,
  } as unknown as Principal;
}

/**
 * Gestur dengan router yang tidak contacting network: hanya panggilan model
 * yang dipalsukan, MANTAK payload A2UI. Semua assertion di bawah adalah
 * terhadap kod ejen sebenar.
 */
function setupAgent() {
  const store = new PlatformStore(':memory:');
  const auth = new Auth(store);
  const loyalty = new Loyalty(store, auth);
  const commerce = new Commerce(store, auth, loyalty);
  const dealers = new Dealers(store, auth, commerce);
  const router = new FreeModelRouter();
  router.complete = async () => ({
    providerId: 'local_rules',
    model: 'local-rules-deterministic',
    content: 'Balasan lokal untuk ujian.',
    status: 'local_rules' as const,
    reason: 'LOCAL_RULES_NO_PROVIDER_RESPONSE',
  });
  const agent = new GoogleAdkAgent(store, auth, commerce, dealers, loyalty, { router });
  return { store, auth, commerce, loyalty, dealers, agent, founder: makePrincipal('founder-01', 'founder') };
}

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
    expect(STRICT_FREE_CANDIDATE_SEQUENCE[2].model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');

    // Ensure all candidates belong to free providers
    for (const candidate of STRICT_FREE_CANDIDATE_SEQUENCE) {
      expect(['gemini_free', 'openrouter']).toContain(candidate.providerId);
    }
  });

  test('provider base URLs have no trailing slash (URL berganda => HTTP 404)', () => {
    // Router menambah `/chat/completions`; trailing slash menghasilkan URL
    // berganda yang memulangkan HTTP 404 kosong.
    for (const config of Object.values(FREE_PROVIDERS)) {
      expect(config.baseUrl.endsWith('/')).toBe(false);
    }
  });

  test('provider failures: 410 (EOL model) and 401 (bad key) are not retryable', () => {
    expect(classifyProviderHttpFailure(410, 'The model has reached its end of life')).toEqual({
      reason: 'PROVIDER_MODEL_NOT_FOUND',
      retryable: false,
    });
    expect(classifyProviderHttpFailure(401, '{"code":"api_key_expired"}')).toEqual({
      reason: 'PROVIDER_ACCESS_DENIED',
      retryable: false,
    });
  });

  test('QC JEV Reviewer (real evaluator): root cause is UNDETERMINED and confidence is null', () => {
    // Penilai JEV sebenar (server/platform/jev/assessment.ts), bukan mock.
    const assessment = assessState('support', {
      text: 'Botol sambal cili padi bocor dan penutup botol pecah semasa pos',
    });

    expect(assessment.providerMode).toBe('LOCAL_RULES');
    expect(assessment.status).toBe('RULE_HINT');
    expect(assessment.answers.rootCause.value).toBe('UNDETERMINED');
    expect(assessment.answers.rootCause.confidence).toBeNull();
    expect(assessment.answers.rootCause.probabilities).toBeNull();
    expect(assessment.policy.outcome).toBe('REVIEW_REQUIRED');
    expect(assessment.policy.reasonCodes).toContain('ROOT_CAUSE_UNDETERMINED');
    expect(isLocalAssessment(assessment)).toBe(true);
  });

  test('QC JEV Reviewer (real agent): the emitted JevAssessmentCard keeps the same invariant', async () => {
    const { agent, founder } = setupAgent();
    const result = await agent.processMessage(founder, 'Pelanggan adau botol kuah colek bocor semasa pos');

    expect(result.generativeUi?.name).toBe('JevAssessmentCard');
    expect(result.generativeUi?.props.rootCause).toBe('UNDETERMINED');
    expect(result.generativeUi?.props.confidenceScore).toBeNull();
    expect(result.a2ui?.component).toBe('JevAssessmentCard');
    expect(validateA2UIComponent(result.a2ui!.component)).toBe(true);
    expect(result.a2ui?.provenance.source).toBe('jev_local_rules');
    expect(result.a2ui?.provenance.source).not.toBe('canonical_evaluator');
  });

  test('Commerce Reader (real agent): read-only brief with real provenance, zero mutation', async () => {
    const { agent, founder, store } = setupAgent();
    const before = store.all('orders').length;

    const result = await agent.processMessage(founder, 'Beritahu saya ringkasan operasi hari ini');

    expect(result.a2ui?.component).toBe('OperationsBriefCard');
    expect(result.a2ui?.props.readOnly).toBe(true);
    expect(result.a2ui?.provenance.source).toBe('database');
    expect(result.a2ui?.provenance.revision).toBe('store_snapshot');
    // Read-only: tiada pesanan direka atau diubah.
    expect(store.all('orders').length).toBe(before);
    expect(store.all('orders')).toHaveLength(0);
  });

  test('PENDING (not assertable in TypeScript): Python Google ADK specialist conformance', () => {
    // Specialist sebenar (QC JEV Reviewer / Commerce Reader) diimplementasikan
    // dalam servis Python `agents/google-adk`. Tiada binding TypeScript kepada
    // servis tersebut dalam wave ini, jadi kesesuaian specialist Python
    // TIDAK boleh diklaim oleh suite ini.
    //
    // Blok sebenar: suite ini hanya boleh mengesahkan sisi TypeScript
    // (assessState + GoogleAdkAgent). When a TypeScript binding to the Python
    // service lands, this test must be replaced by a real HTTP conformance
    // test against that service — not by asserting a locally defined mock.
    expect(existsSync('agents/google-adk/app.py')).toBe(true);
    expect(existsSync('agents/google-adk/runtime.py')).toBe(true);

    // Tiada suite TypeScript boleh mendakwa kesesuaian specialist Python
    // selagi tiada binding HTTP; ini pengesahan positif untuk "belum".
    const sourceFiles = ['tests/platform/adk-specialists.test.ts'];
    expect(sourceFiles.length).toBeGreaterThan(0);
  });
});
