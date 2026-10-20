/**
 * CPK-03 / ADV-28 — the learning pipeline must be real.
 *
 * These tests are the anti-fabrication suite for the learning pipeline:
 *   evidence -> insight -> candidate -> review -> evaluation -> human publish
 *   -> version-pinned delivery -> rollback.
 *
 * A candidate that FAILS its evaluation must never become publishable, and a
 * publish without a human founder approval must always be refused.
 */

import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ApprovalService } from '../../server/agents/approval/service';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { LearningPipeline } from '../../server/agents/intelligence/learning';
import { IntelligenceError } from '../../server/agents/intelligence/errors';
import type { SkillEvaluationCase } from '../../shared/founder-intelligence-contracts';

const FOUNDER_ID = 'usr-founder-learn';
const DEVELOPER_ID = 'usr-dev-learn';
const TENANT = 'business';

function addMembership(store: PlatformStore, userId: string, role: string): void {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(['hq']), null, 'active', 1);
}

function buildPipeline(): { store: PlatformStore; pipeline: LearningPipeline; approvalStore: MemoryApprovalStore } {
  const store = new PlatformStore(':memory:');
  addMembership(store, FOUNDER_ID, 'founder');
  addMembership(store, DEVELOPER_ID, 'developer');
  const approvalStore = new MemoryApprovalStore();
  const approvalService = new ApprovalService(approvalStore);
  const pipeline = new LearningPipeline({ store, approvalStore, approvalService });
  return { store, pipeline, approvalStore };
}

const SOURCES = [
  { recordId: 'ord-learn-001', recordKind: 'orders', revision: 3 },
  { recordId: 'jev-learn-001', recordKind: 'jev_assessments', revision: 1 },
];

const COMPATIBILITY = {
  runtimeApiVersions: ['copilot-runtime@2'],
  platformApiVersions: ['platform-api@1'],
};

const BEHAVIOUR = [
  {
    id: 'rule-leakage',
    matches: 'bocor|leakage',
    emit: ['Kuarantin batch', 'Minta bukti foto penutup botol'],
  },
  {
    id: 'rule-generic',
    contains: ['pesanan'],
    emit: ['Semak status pesanan'],
  },
];

const CASES: SkillEvaluationCase[] = [
  {
    id: 'case-1',
    input: 'Pelanggan laporkan botol bocor pada pesanan',
    expectContainsAll: ['Kuarantin batch'],
    expectContainsAny: ['Minta bukti foto penutup botol'],
    expectNotContains: ['Refund automatik'],
  },
  {
    id: 'case-2',
    input: 'Pesanan dalam proses penghantaran',
    expectContainsAll: ['Semak status pesanan'],
    expectContainsAny: [],
    expectNotContains: ['Kuarantin batch'],
  },
];

const FAILING_CASES: SkillEvaluationCase[] = [
  {
    id: 'case-1',
    input: 'Pelanggan laporkan botol bocor pada pesanan',
    expectContainsAll: ['BakiRefund automatik'],
    expectContainsAny: [],
    expectNotContains: [],
  },
];

function seedEvidence(pipeline: LearningPipeline): string[] {
  const first = pipeline.recordEvidence({
    tenantId: TENANT,
    contributedBy: FOUNDER_ID,
    patternKey: 'bottle-leakage',
    summary: 'Tiga kes Bottle bocor memerlukan kuarantin batch dan bukti foto.',
    sources: [SOURCES[0]],
    observations: 3,
  });
  const second = pipeline.recordEvidence({
    tenantId: TENANT,
    contributedBy: FOUNDER_ID,
    patternKey: 'bottle-leakage',
    summary: 'Satu kes lagi Bottle bocor memerlukan kuarantin batch.',
    sources: [SOURCES[1]],
    observations: 1,
  });
  return [first.id, second.id];
}

describe('CPK-03 / ADV-28 — learning pipeline', () => {
  test('evidence records the canonical source records and their revisions', () => {
    const { pipeline } = buildPipeline();
    const [evidenceId] = seedEvidence(pipeline);
    const evidence = pipeline.getEvidence(evidenceId);
    expect(evidence).not.toBeNull();
    expect(evidence?.sources[0].recordId).toBe('ord-learn-001');
    expect(evidence?.sources[0].revision).toBe(3);
    expect(evidence?.observations).toBe(3);
  });

  test('evidence without a canonical source reference is refused', () => {
    const { pipeline } = buildPipeline();
    expect(() =>
      pipeline.recordEvidence({
        tenantId: TENANT,
        contributedBy: FOUNDER_ID,
        patternKey: 'bottle-leakage',
        summary: 'Ringkasan tanpa sumber.',
        sources: [],
      }),
    ).toThrow(IntelligenceError);
  });

  test('an insight needs at least two supporting pieces of evidence', () => {
    const { pipeline } = buildPipeline();
    const [evidenceId] = seedEvidence(pipeline);
    let code = '';
    try {
      pipeline.deriveInsight({
        tenantId: TENANT,
        patternKey: 'bottle-leakage',
        title: 'Kuarantin bottle bocor',
        pattern: 'Kuarantin batch + bukti foto',
        evidenceIds: [evidenceId],
      });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('INSUFFICIENT_SUPPORTING_EVIDENCE');
  });

  test('an insight derived from two evidence records becomes a candidate with its provenance', () => {
    const { pipeline } = buildPipeline();
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    expect(insight.supportingCount).toBe(4);
    expect(insight.confidence).toBeGreaterThan(0);

    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan di langkah kuarantin dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    expect(candidate.evidenceIds).toEqual(evidenceIds);
    expect(candidate.sourceRefs.map((ref) => ref.recordId)).toContain('ord-learn-001');
    expect(candidate.sourceRefs.find((ref) => ref.recordId === 'ord-learn-001')?.revision).toBe(3);
    expect(candidate.status).toBe('draft');
  });

  test('the deterministic ADV-28 reviewer is used (not a duplicated rule set)', async () => {
    const { pipeline } = buildPipeline();
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    const review = await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    expect(review.source).toBe('adv-28-review_skill_candidate');
    expect(review.reviewer).toBe('deterministic-skill-reviewer');
    expect(review.decision).toBe('promote');
    expect(review.checks.length).toBe(6);
  });

  test('a candidate that FAILS evaluation is not publishable', async () => {
    const { pipeline, approvalStore } = buildPipeline();
    const approvalService = new ApprovalService(approvalStore);
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    const evaluation = pipeline.evaluateCandidate(candidate.id, FAILING_CASES, DEVELOPER_ID);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.passRate).toBe(0);
    expect(evaluation.results[0].detail).toContain('tiada:');
    expect(pipeline.getCandidate(candidate.id)?.status).toBe('evaluation_failed');

    // The publish request itself is refused for a failed evaluation.
    let requestCode = '';
    try {
      pipeline.requestPublish({ candidateId: candidate.id, requestedBy: DEVELOPER_ID });
    } catch (error) {
      requestCode = (error as IntelligenceError).code;
    }
    expect(requestCode).toBe('EVALUATION_NOT_PASSED');

    // Even with a human approval, publishing a failed candidate is refused.
    const proposal = approvalService.createProposal({
      kind: 'skill.publish',
      scope: pipeline.publishScope(candidate.id, 1),
      payload: { candidateId: candidate.id, candidateVersion: 1 },
      amountSen: 0,
      proposedBy: DEVELOPER_ID,
      proposerRole: 'developer',
    });
    const approval = approvalService.approve({
      proposalId: proposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    let publishCode = '';
    try {
      pipeline.publish({ candidateId: candidate.id, approvalId: approval.id, reviewerId: FOUNDER_ID });
    } catch (error) {
      publishCode = (error as IntelligenceError).code;
    }
    expect(publishCode).toBe('EVALUATION_NOT_PASSED');
    expect(pipeline.listPublishedSkills()).toHaveLength(0);
  });

  test('publish without a human approval is refused', async () => {
    const { pipeline } = buildPipeline();
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    pipeline.evaluateCandidate(candidate.id, CASES, DEVELOPER_ID);
    pipeline.requestPublish({ candidateId: candidate.id, requestedBy: DEVELOPER_ID });

    let code = '';
    try {
      pipeline.publish({
        candidateId: candidate.id,
        approvalId: 'not-a-real-approval',
        reviewerId: FOUNDER_ID,
      });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('APPROVAL_NOT_FOUND');
    expect(pipeline.listPublishedSkills()).toHaveLength(0);
  });

  test('publish succeeds with a human founder reviewer and is auditable', async () => {
    const { pipeline, approvalStore } = buildPipeline();
    const approvalService = new ApprovalService(approvalStore);
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    const evaluation = pipeline.evaluateCandidate(candidate.id, CASES, DEVELOPER_ID);
    expect(evaluation.passed).toBe(true);
    expect(evaluation.passRate).toBe(1);

    const proposal = pipeline.requestPublish({ candidateId: candidate.id, requestedBy: DEVELOPER_ID });
    expect(proposal.status).toBe('pending_approval');
    expect(proposal.scope).toBe(pipeline.publishScope(candidate.id, 1));
    expect(pipeline.listPublishedSkills()).toHaveLength(0);

    // An approval by a non-founder is refused at publish time.
    const developerProposal = pipeline.requestPublish({
      candidateId: candidate.id,
      requestedBy: DEVELOPER_ID,
    });
    const developerApproval = approvalService.approve({
      proposalId: developerProposal.id,
      approverId: DEVELOPER_ID,
      approverRole: 'developer',
    });
    let roleCode = '';
    try {
      pipeline.publish({
        candidateId: candidate.id,
        approvalId: developerApproval.id,
        reviewerId: DEVELOPER_ID,
      });
    } catch (error) {
      roleCode = (error as IntelligenceError).code;
    }
    expect(roleCode).toBe('HUMAN_REVIEW_REQUIRED');

    const approval = approvalService.approve({
      proposalId: proposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    const skill = pipeline.publish({
      candidateId: candidate.id,
      approvalId: approval.id,
      reviewerId: FOUNDER_ID,
    });
    expect(skill.version).toBe(1);
    expect(skill.publishedBy).toBe(FOUNDER_ID);
    expect(skill.status).toBe('active');
    expect(skill.evaluationId).toBe(evaluation.id);
    expect(pipeline.getCandidate(candidate.id)?.status).toBe('published');

    // The publish left an execution receipt in the approval store.
    const receipt = approvalStore.findReceiptByProposal(proposal.id);
    expect(receipt?.status).toBe('confirmed');
    expect(receipt?.executedBy).toBe(FOUNDER_ID);
    expect(receipt?.actionType).toBe('skill.publish');
  });

  test('delivery to an incompatible runtime is refused with an explicit reason', async () => {
    const { pipeline, approvalStore } = buildPipeline();
    const approvalService = new ApprovalService(approvalStore);
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    pipeline.evaluateCandidate(candidate.id, CASES, DEVELOPER_ID);
    const proposal = pipeline.requestPublish({ candidateId: candidate.id, requestedBy: DEVELOPER_ID });
    const approval = approvalService.approve({
      proposalId: proposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    const skill = pipeline.publish({
      candidateId: candidate.id,
      approvalId: approval.id,
      reviewerId: FOUNDER_ID,
    });

    let code = '';
    try {
      pipeline.deliver({
        skillId: skill.id,
        runtimeApiVersion: 'copilot-runtime@1',
        platformApiVersion: 'platform-api@1',
        deliveredTo: 'runtime-1',
      });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('INCOMPATIBLE_RUNTIME_API_VERSION');
    expect(pipeline.listDeliveries(skill.id)).toHaveLength(0);

    const delivery = pipeline.deliver({
      skillId: skill.id,
      runtimeApiVersion: 'copilot-runtime@2',
      platformApiVersion: 'platform-api@1',
      deliveredTo: 'runtime-2',
    });
    expect(delivery.version).toBe(1);
    expect(delivery.runtimeApiVersion).toBe('copilot-runtime@2');
    expect(pipeline.listDeliveries(skill.id)).toHaveLength(1);
  });

  test('a published skill can be rolled back to the previous version and the rollback is recorded', async () => {
    const { pipeline, approvalStore } = buildPipeline();
    const approvalService = new ApprovalService(approvalStore);
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    pipeline.evaluateCandidate(candidate.id, CASES, DEVELOPER_ID);

    const firstProposal = pipeline.requestPublish({ candidateId: candidate.id, requestedBy: DEVELOPER_ID });
    const firstApproval = approvalService.approve({
      proposalId: firstProposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    const first = pipeline.publish({
      candidateId: candidate.id,
      approvalId: firstApproval.id,
      reviewerId: FOUNDER_ID,
    });
    expect(first.version).toBe(1);

    // A second candidate on the SAME lineage continues the lineage and takes
    // the next published version.
    const secondCandidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor (v2)',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
      lineageId: candidate.lineageId,
    });
    expect(secondCandidate.lineageId).toBe(candidate.lineageId);
    await pipeline.reviewCandidate(secondCandidate.id, { actorId: DEVELOPER_ID });
    pipeline.evaluateCandidate(secondCandidate.id, CASES, DEVELOPER_ID);
    const secondProposal = pipeline.requestPublish({
      candidateId: secondCandidate.id,
      requestedBy: DEVELOPER_ID,
    });
    const secondApproval = approvalService.approve({
      proposalId: secondProposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    const second = pipeline.publish({
      candidateId: secondCandidate.id,
      approvalId: secondApproval.id,
      reviewerId: FOUNDER_ID,
    });
    expect(second.version).toBe(2);
    expect(pipeline.getPublishedSkill(first.id)?.status).toBe('superseded');

    const rollback = pipeline.rollback({
      skillId: second.id,
      by: FOUNDER_ID,
      reason: 'Regresi dikesan dalam penilaian.',
    });
    expect(rollback.fromSkillId).toBe(second.id);
    expect(rollback.toSkillId).toBe(first.id);
    expect(pipeline.getPublishedSkill(second.id)?.status).toBe('rolled_back');
    expect(pipeline.getPublishedSkill(first.id)?.status).toBe('active');
    expect(pipeline.listRollbacks(candidate.lineageId)).toHaveLength(1);
  });

  test('a lineage without an earlier version cannot be rolled back', async () => {
    const { pipeline, approvalStore } = buildPipeline();
    const approvalService = new ApprovalService(approvalStore);
    const evidenceIds = seedEvidence(pipeline);
    const insight = pipeline.deriveInsight({
      tenantId: TENANT,
      patternKey: 'bottle-leakage',
      title: 'Kuarantin bottle bocor',
      pattern: 'Kuarantin batch + bukti foto',
      evidenceIds,
    });
    const candidate = pipeline.createCandidate({
      tenantId: TENANT,
      insightId: insight.id,
      title: 'SOP kuarantin bottle bocor',
      body:
        'Skop: hanya kes Bottle bocor. Had: tiada refund automatik. Ralat: sekiranya bukti foto tiada, hentikan dan laporkan kepada pengasas.',
      kind: 'sop',
      behaviour: BEHAVIOUR,
      compatibility: COMPATIBILITY,
      createdBy: DEVELOPER_ID,
    });
    await pipeline.reviewCandidate(candidate.id, { actorId: DEVELOPER_ID });
    pipeline.evaluateCandidate(candidate.id, CASES, DEVELOPER_ID);
    const proposal = pipeline.requestPublish({ candidateId: candidate.id, requestedBy: DEVELOPER_ID });
    const approval = approvalService.approve({
      proposalId: proposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    const skill = pipeline.publish({
      candidateId: candidate.id,
      approvalId: approval.id,
      reviewerId: FOUNDER_ID,
    });
    let code = '';
    try {
      pipeline.rollback({ skillId: skill.id, by: FOUNDER_ID, reason: 'Ujian' });
    } catch (error) {
      code = (error as IntelligenceError).code;
    }
    expect(code).toBe('NO_PREVIOUS_VERSION');
  });
});
