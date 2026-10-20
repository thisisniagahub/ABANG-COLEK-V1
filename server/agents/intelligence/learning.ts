/**
 * AbangColek Sovereign GrowthOS — CPK-03 / ADV-28 Learning Pipeline
 *
 * Stage order (each stage is a durable, auditable artefact):
 *
 *   1. evidence      — a redacted observation derived from canonical records
 *   2. insight       — a pattern supported by at least two pieces of evidence
 *   3. candidate     — a proposed, versioned, reviewable skill artefact
 *   4. review        — the deterministic ADV-28 rule set (never duplicated here)
 *   5. evaluation    — the candidate really executed against held-out cases
 *   6. publish       — human-gated (founder approval); automated publish refused
 *   7. delivery      — version-pinned; incompatible runtimes are refused
 *   8. rollback      — a published version can be rolled back and is recorded
 *
 * The pipeline NEVER publishes on its own: `publish()` requires a founder
 * approval that was issued by a human reviewer, and every publish is recorded
 * as an execution receipt in the approval store.
 */

import { randomUUID } from 'node:crypto';
import type { PlatformStore } from '../../platform/store';
import type { ApprovalStore } from '../approval/store';
import type { ApprovalRole } from '../approval/types';
import { ApprovalService } from '../approval/service';
import { ToolRegistry } from '../tools/registry';
import { createToolRuntime, type ToolRole } from '../tools/runtime';
import { failIntelligence } from './errors';
import { RECORD_KINDS } from './records';
import type {
  LearningEvidenceRecord,
  LearningInsightRecord,
  LearningSourceRef,
  PublishedSkillRecord,
  SkillBehaviourRule,
  SkillCandidateRecord,
  SkillCompatibility,
  SkillDeliveryRecord,
  SkillEvaluationCase,
  SkillEvaluationRecord,
  SkillReviewResult,
  SkillRollbackRecord,
} from '../../../shared/founder-intelligence-contracts';

export const PUBLISH_PROPOSAL_KIND = 'skill.publish';

export interface LearningPipelineOptions {
  store: PlatformStore;
  approvalService: ApprovalService;
  approvalStore: ApprovalStore;
  /** Registry used to reach the deterministic ADV-28 reviewer. */
  registry?: ToolRegistry;
  clock?: () => string;
  /** Minimum number of supporting evidence records per insight. */
  minSupportingEvidence?: number;
}

export interface RecordEvidenceInput {
  tenantId: string;
  contributedBy: string;
  patternKey: string;
  summary: string;
  sources: LearningSourceRef[];
  observations?: number;
}

export interface DeriveInsightInput {
  tenantId: string;
  patternKey: string;
  title: string;
  pattern: string;
  evidenceIds: string[];
}

export interface CreateCandidateInput {
  tenantId: string;
  insightId: string;
  title: string;
  body: string;
  kind: string;
  behaviour: SkillBehaviourRule[];
  compatibility: SkillCompatibility;
  createdBy: string;
  /**
   * Continues an existing lineage. When omitted the candidate starts its own
   * lineage and its published version starts at 1.
   */
  lineageId?: string;
}

export interface PublishRequestInput {
  candidateId: string;
  requestedBy: string;
  requestedByRole?: ApprovalRole;
}

export interface PublishInput {
  candidateId: string;
  approvalId: string;
  /** The human reviewer. Must match the approver on the approval record. */
  reviewerId: string;
}

export interface DeliverInput {
  skillId: string;
  runtimeApiVersion: string;
  platformApiVersion: string;
  deliveredTo: string;
}

export interface RollbackInput {
  skillId: string;
  by: string;
  reason: string;
}

/** A reviewer identity used for the deterministic review call. */
export interface ReviewActor {
  actorId: string;
  role?: ToolRole;
  runId?: string;
}

function normaliseRule(rule: SkillBehaviourRule): SkillBehaviourRule {
  return {
    id: rule.id,
    ...(rule.contains?.length ? { contains: [...rule.contains] } : {}),
    ...(rule.matches ? { matches: rule.matches } : {}),
    emit: [...rule.emit],
  };
}

/**
 * Executes a skill candidate against one input.
 *
 * The behaviour of a candidate is a deterministic rule set: a rule applies when
 * its `contains` tokens are all present (case-insensitive) and/or its
 * `matches` regular expression matches. The skill then *emits* the rule's
 * tokens. The emitted text is what the evaluation asserts on, so the
 * evaluation really runs the candidate instead of reading a stored boolean.
 */
export function runSkillBehaviour(behaviour: SkillBehaviourRule[], input: string): string {
  const haystack = input.toLowerCase();
  const produced: string[] = [];
  for (const rule of behaviour) {
    const containsOk = (rule.contains ?? []).every((token) => haystack.includes(token.toLowerCase()));
    const matchesOk = rule.matches ? new RegExp(rule.matches, 'i').test(input) : true;
    if (containsOk && matchesOk) produced.push(...rule.emit);
  }
  return produced.join('\n');
}

export class LearningPipeline {
  private readonly registry: ToolRegistry;

  constructor(private readonly options: LearningPipelineOptions) {
    this.registry =
      options.registry ??
      new ToolRegistry(6, {
        runtime: createToolRuntime({
          store: options.store,
          approvalStore: options.approvalStore,
          clock: options.clock,
        }),
      });
  }

  private now(): string {
    return this.options.clock ? this.options.clock() : new Date().toISOString();
  }

  private get store(): PlatformStore {
    return this.options.store;
  }

  /* --------------------------------------------------------------------- *
   * Stage 1 — evidence
   * --------------------------------------------------------------------- */

  recordEvidence(input: RecordEvidenceInput): LearningEvidenceRecord {
    if (!input.tenantId) failIntelligence('TENANT_REQUIRED', 'Bukti pembelajaran memerlukan tenant.');
    if (!input.patternKey) failIntelligence('PATTERN_KEY_REQUIRED', 'Bukti pembelajaran memerlukan kunci corak.');
    if (!input.contributedBy) failIntelligence('CONTRIBUTOR_REQUIRED', 'Bukti pembelajaran memerlukan penyumbang.');
    if (!input.sources.length) {
      failIntelligence('EVIDENCE_SOURCES_REQUIRED', 'Bukti pembelajaran mesti rujuk sekurang-kurangnya satu rekod kanonik.');
    }
    for (const source of input.sources) {
      if (!source.recordId || !source.recordKind) {
        failIntelligence('EVIDENCE_SOURCE_INVALID', 'Setiap rujukan sumber mesti menyatakan rekod dan jenis rekod.');
      }
      if (!Number.isSafeInteger(source.revision) || source.revision < 1) {
        failIntelligence('EVIDENCE_SOURCE_INVALID', 'Setiap rujukan sumber mesti menyatakan revisi yang sah.');
      }
    }
    const record: LearningEvidenceRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      contributedBy: input.contributedBy,
      patternKey: input.patternKey,
      summary: input.summary.slice(0, 2_000),
      sources: input.sources.map((source) => ({ ...source })),
      observations: Math.max(1, Math.trunc(input.observations ?? 1)),
      status: 'recorded',
      createdAt: this.now(),
      revision: 1,
    };
    this.store.save(RECORD_KINDS.learningEvidence, record);
    this.store.audit(record.contributedBy, 'learning.evidence.record', record.id, 1);
    return record;
  }

  getEvidence(id: string): LearningEvidenceRecord | null {
    return this.store.get<LearningEvidenceRecord>(RECORD_KINDS.learningEvidence, id);
  }

  listEvidence(tenantId?: string): LearningEvidenceRecord[] {
    const all = this.store.all<LearningEvidenceRecord>(RECORD_KINDS.learningEvidence);
    return tenantId ? all.filter((record) => record.tenantId === tenantId) : all;
  }

  /* --------------------------------------------------------------------- *
   * Stage 2 — insight
   * --------------------------------------------------------------------- */

  deriveInsight(input: DeriveInsightInput): LearningInsightRecord {
    const minimum = this.options.minSupportingEvidence ?? 2;
    if (!input.evidenceIds.length) {
      failIntelligence('INSIGHT_EVIDENCE_REQUIRED', 'Insight memerlukan sekurang-kurangnya satu bukti.');
    }
    const evidence = input.evidenceIds.map((evidenceId) => {
      const record = this.getEvidence(evidenceId);
      if (!record) {
        failIntelligence('EVIDENCE_NOT_FOUND', `Bukti '${evidenceId}' tidak ditemui.`);
      }
      if (record.tenantId !== input.tenantId) {
        failIntelligence('CROSS_TENANT_EVIDENCE', 'Bukti daripada tenant lain tidak boleh digunakan.');
      }
      if (record.status !== 'recorded') {
        failIntelligence('EVIDENCE_NOT_USABLE', `Bukti '${evidenceId}' berstatus ${record.status}.`);
      }
      if (record.patternKey !== input.patternKey) {
        failIntelligence('INSIGHT_PATTERN_MISMATCH', 'Bukti yang tidak sepadan dengan kunci corak insight.');
      }
      return record;
    });
    if (evidence.length < minimum) {
      failIntelligence(
        'INSUFFICIENT_SUPPORTING_EVIDENCE',
        `Insight memerlukan sekurang-kurangnya ${minimum} bukti sokongan (diberi ${evidence.length}).`,
      );
    }
    const supportingCount = evidence.reduce((total, record) => total + record.observations, 0);
    const confidence = Math.min(1, Number((supportingCount / (supportingCount + 2)).toFixed(4)));
    const insight: LearningInsightRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      patternKey: input.patternKey,
      title: input.title.slice(0, 200),
      pattern: input.pattern.slice(0, 2_000),
      evidenceIds: evidence.map((record) => record.id),
      supportingCount,
      confidence,
      status: 'open',
      createdAt: this.now(),
      revision: 1,
    };
    this.store.save(RECORD_KINDS.learningInsight, insight);
    this.store.audit(input.tenantId, 'learning.insight.derive', insight.id, 1);
    return insight;
  }

  getInsight(id: string): LearningInsightRecord | null {
    return this.store.get<LearningInsightRecord>(RECORD_KINDS.learningInsight, id);
  }

  listInsights(tenantId?: string): LearningInsightRecord[] {
    const all = this.store.all<LearningInsightRecord>(RECORD_KINDS.learningInsight);
    return tenantId ? all.filter((record) => record.tenantId === tenantId) : all;
  }

  /* --------------------------------------------------------------------- *
   * Stage 3 — skill candidate
   * --------------------------------------------------------------------- */

  createCandidate(input: CreateCandidateInput): SkillCandidateRecord {
    const insight = this.getInsight(input.insightId);
    if (!insight) failIntelligence('INSIGHT_NOT_FOUND', `Insight '${input.insightId}' tidak ditemui.`);
    if (insight.tenantId !== input.tenantId) {
      failIntelligence('CROSS_TENANT_INSIGHT', 'Insight daripada tenant lain tidak boleh digunakan.');
    }
    if (insight.status === 'discarded') {
      failIntelligence('INSIGHT_DISCARDED', 'Insight yang telah dibuang tidak boleh dijadikan calon.');
    }
    if (!input.behaviour.length) {
      failIntelligence('CANDIDATE_BEHAVIOUR_REQUIRED', 'Calon skill memerlukan sekurang-kurangnya satu peraturan perilaku.');
    }
    for (const rule of input.behaviour) {
      if (!rule.id) failIntelligence('CANDIDATE_RULE_INVALID', 'Setiap peraturan mesti mempunyai id.');
      if (!rule.emit.length) failIntelligence('CANDIDATE_RULE_INVALID', 'Setiap peraturan mesti mempunyai sekurang-kurangnya satu token output.');
      if (rule.matches) {
        try {
          // eslint-disable-next-line no-new
          new RegExp(rule.matches);
        } catch {
          failIntelligence('CANDIDATE_RULE_INVALID', `Ekspresi biasa tidak sah dalam peraturan '${rule.id}'.`);
        }
      }
    }
    if (!input.compatibility.runtimeApiVersions.length || !input.compatibility.platformApiVersions.length) {
      failIntelligence('COMPATIBILITY_PIN_REQUIRED', 'Calon skill mesti menetapkan versi runtime dan platform yang disokong.');
    }

    const evidence = insight.evidenceIds
      .map((evidenceId) => this.getEvidence(evidenceId))
      .filter((record): record is LearningEvidenceRecord => record !== null);
    const sourceRefs: LearningSourceRef[] = [];
    for (const record of evidence) {
      for (const source of record.sources) {
        if (!sourceRefs.some((entry) => entry.recordId === source.recordId && entry.revision === source.revision)) {
          sourceRefs.push({ ...source });
        }
      }
    }

    const candidateId = randomUUID();
    const candidate: SkillCandidateRecord = {
      id: candidateId,
      tenantId: input.tenantId,
      lineageId: input.lineageId ?? candidateId,
      title: input.title.slice(0, 200),
      body: input.body.slice(0, 20_000),
      kind: input.kind.slice(0, 80),
      version: 1,
      insightIds: [insight.id],
      evidenceIds: insight.evidenceIds,
      sourceRefs,
      behaviour: input.behaviour.map(normaliseRule),
      compatibility: {
        runtimeApiVersions: [...input.compatibility.runtimeApiVersions],
        platformApiVersions: [...input.compatibility.platformApiVersions],
      },
      status: 'draft',
      createdBy: input.createdBy,
      createdAt: this.now(),
      revision: 1,
    };
    this.store.save(RECORD_KINDS.skillCandidate, candidate);
    this.store.audit(input.createdBy, 'learning.candidate.create', candidate.id, 1);
    return candidate;
  }

  getCandidate(id: string): SkillCandidateRecord | null {
    return this.store.get<SkillCandidateRecord>(RECORD_KINDS.skillCandidate, id);
  }

  listCandidates(tenantId?: string): SkillCandidateRecord[] {
    const all = this.store.all<SkillCandidateRecord>(RECORD_KINDS.skillCandidate);
    return tenantId ? all.filter((record) => record.tenantId === tenantId) : all;
  }

  /* --------------------------------------------------------------------- *
   * Stage 4 — deterministic review (the ADV-28 rule set, not a copy of it)
   * --------------------------------------------------------------------- */

  /**
   * Runs the *existing* deterministic reviewer (`review_skill_candidate`,
   * ADV-28) through the tool registry. The rules live in
   * `server/agents/tools/capabilities/governance.ts`; this pipeline never
   * duplicates them.
   */
  async reviewCandidate(candidateId: string, actor: ReviewActor): Promise<SkillReviewResult> {
    const candidate = this.getCandidate(candidateId);
    if (!candidate) failIntelligence('CANDIDATE_NOT_FOUND', `Calon '${candidateId}' tidak ditemui.`);
    const dispatched = await this.registry.dispatchTool(
      'review_skill_candidate',
      { candidateId },
      {
        actorId: actor.actorId,
        role: actor.role ?? 'developer',
        runId: actor.runId ?? `learning-review-${randomUUID()}`,
      },
    );
    if (!dispatched.ok) {
      failIntelligence(dispatched.code, dispatched.message);
    }
    const outcome = dispatched.result as {
      reviewer?: string;
      decision?: 'promote' | 'revise' | 'reject';
      checks?: Array<{ check: string; passed: boolean; detail: string }>;
      failedCheckCount?: number;
    };
    if (!outcome.decision) {
      failIntelligence('REVIEW_DECISION_MISSING', 'Peninjau deterministik tidak mengembalikan keputusan.');
    }
    const review: SkillReviewResult = {
      reviewer: outcome.reviewer ?? 'deterministic-skill-reviewer',
      decision: outcome.decision,
      checks: outcome.checks ?? [],
      failedCheckCount: outcome.failedCheckCount ?? 0,
      reviewedAt: this.now(),
      source: 'adv-28-review_skill_candidate',
    };
    const updated: SkillCandidateRecord = {
      ...candidate,
      review,
      status: outcome.decision === 'reject' ? 'rejected' : candidate.status,
      revision: candidate.revision + 1,
    };
    this.store.save(RECORD_KINDS.skillCandidate, updated);
    this.store.audit(actor.actorId, 'learning.candidate.review', updated.id, updated.revision);
    return review;
  }

  /* --------------------------------------------------------------------- *
   * Stage 5 — evaluation (the candidate is really executed)
   * --------------------------------------------------------------------- */

  evaluateCandidate(
    candidateId: string,
    cases: SkillEvaluationCase[],
    evaluatedBy: string,
  ): SkillEvaluationRecord {
    const candidate = this.getCandidate(candidateId);
    if (!candidate) failIntelligence('CANDIDATE_NOT_FOUND', `Calon '${candidateId}' tidak ditemui.`);
    if (!cases.length) {
      failIntelligence('EVALUATION_CASES_REQUIRED', 'Penilaian memerlukan sekurang-kurangnya satu kes ujian.');
    }
    const results = cases.map((testCase) => {
      const produced = runSkillBehaviour(candidate.behaviour, testCase.input);
      const haystack = produced.toLowerCase();
      const missing = testCase.expectContainsAll.filter(
        (token) => !haystack.includes(token.toLowerCase()),
      );
      const anyMissing =
        testCase.expectContainsAny.length > 0 &&
        !testCase.expectContainsAny.some((token) => haystack.includes(token.toLowerCase()));
      const forbidden = testCase.expectNotContains.filter((token) =>
        haystack.includes(token.toLowerCase()),
      );
      const passed = missing.length === 0 && !anyMissing && forbidden.length === 0;
      const detail = passed
        ? 'Semua jangkaan dipenuhi.'
        : [
            missing.length ? `tiada: ${missing.join(', ')}` : '',
            anyMissing ? `tiada sebarang: ${testCase.expectContainsAny.join(', ')}` : '',
            forbidden.length ? `dilarang hadir: ${forbidden.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('; ');
      return { caseId: testCase.id, passed, produced, detail };
    });
    const passedCount = results.filter((result) => result.passed).length;
    const passRate = Number((passedCount / results.length).toFixed(4));
    const evaluation: SkillEvaluationRecord = {
      id: randomUUID(),
      candidateId: candidate.id,
      candidateVersion: candidate.version,
      cases: cases.map((testCase) => ({ ...testCase })),
      results,
      passed: passedCount === results.length,
      passRate,
      rubric: 'Setiap kes ujian dijalankan terhadap peraturan perilaku calon; kes melepassed hanya bila semua jangkaan dipenuhi.',
      evaluatedBy,
      evaluatedAt: this.now(),
    };
    this.store.save(RECORD_KINDS.skillEvaluation, evaluation);
    const updated: SkillCandidateRecord = {
      ...candidate,
      evaluationId: evaluation.id,
      status: evaluation.passed ? 'evaluation_passed' : 'evaluation_failed',
      revision: candidate.revision + 1,
    };
    this.store.save(RECORD_KINDS.skillCandidate, updated);
    this.store.audit(evaluatedBy, 'learning.candidate.evaluate', updated.id, updated.revision);
    return evaluation;
  }

  getEvaluation(id: string): SkillEvaluationRecord | null {
    return this.store.get<SkillEvaluationRecord>(RECORD_KINDS.skillEvaluation, id);
  }

  /* --------------------------------------------------------------------- *
   * Stage 6 — human-gated publish
   * --------------------------------------------------------------------- */

  /** The scope string an approval must carry to authorise a publish. */
  publishScope(candidateId: string, version: number): string {
    return `skill_candidate:${candidateId}#v${version}`;
  }

  /**
   * Creates the human-in-the-loop proposal. The proposal is *pending*: no
   * skill becomes published until a human reviewer approves it.
   */
  requestPublish(input: PublishRequestInput) {
    const candidate = this.getCandidate(input.candidateId);
    if (!candidate) failIntelligence('CANDIDATE_NOT_FOUND', `Calon '${input.candidateId}' tidak ditemui.`);
    if (candidate.status === 'published') {
      failIntelligence('CANDIDATE_ALREADY_PUBLISHED', 'Calon ini telah diterbitkan.');
    }
    if (!candidate.evaluationId) {
      failIntelligence('EVALUATION_REQUIRED', 'Calon mesti melalui penilaian sebelum penerbitan diminta.');
    }
    const evaluation = this.getEvaluation(candidate.evaluationId);
    if (!evaluation || !evaluation.passed) {
      failIntelligence('EVALUATION_NOT_PASSED', 'Calon yang tidak melepassed penilaian tidak boleh diterbitkan.');
    }
    if (!candidate.review || candidate.review.decision !== 'promote') {
      failIntelligence('REVIEW_NOT_PROMOTED', 'Calon mesti diluluskan peninjau deterministik sebelum penerbitan.');
    }
    const proposal = this.options.approvalService.createProposal({
      kind: PUBLISH_PROPOSAL_KIND,
      scope: this.publishScope(candidate.id, candidate.version),
      payload: {
        candidateId: candidate.id,
        candidateVersion: candidate.version,
        title: candidate.title,
        kind: candidate.kind,
        evaluationId: evaluation.id,
        reviewDecision: candidate.review.decision,
      },
      amountSen: 0,
      proposedBy: input.requestedBy,
      proposerRole: input.requestedByRole ?? 'developer',
      sourceRefs: [candidate.id, ...candidate.evidenceIds],
    });
    const updated: SkillCandidateRecord = {
      ...candidate,
      status: 'publish_requested',
      revision: candidate.revision + 1,
    };
    this.store.save(RECORD_KINDS.skillCandidate, updated);
    this.store.audit(input.requestedBy, 'learning.candidate.publish_requested', updated.id, updated.revision);
    return proposal;
  }

  /**
   * Publishes a candidate. Requires a founder approval issued by a human
   * reviewer. There is no automated path: without the approval this throws.
   */
  publish(input: PublishInput): PublishedSkillRecord {
    const candidate = this.getCandidate(input.candidateId);
    if (!candidate) failIntelligence('CANDIDATE_NOT_FOUND', `Calon '${input.candidateId}' tidak ditemui.`);

    if (!candidate.evaluationId) {
      failIntelligence('EVALUATION_REQUIRED', 'Calon mesti melalui penilaian sebelum diterbitkan.');
    }
    const evaluation = this.getEvaluation(candidate.evaluationId);
    if (!evaluation) failIntelligence('EVALUATION_NOT_FOUND', 'Rekod penilaian calon tidak ditemui.');
    if (!evaluation.passed) {
      failIntelligence('EVALUATION_NOT_PASSED', 'Calon yang tidak melepassed penilaian tidak boleh diterbitkan.');
    }
    if (!candidate.review) failIntelligence('REVIEW_REQUIRED', 'Calon mesti disemak sebelum diterbitkan.');
    if (candidate.review.decision !== 'promote') {
      failIntelligence('REVIEW_NOT_PROMOTED', 'Calon yang tidak diluluskan peninjau tidak boleh diterbitkan.');
    }

    const approval = this.options.approvalStore.getApproval(input.approvalId);
    if (!approval) failIntelligence('APPROVAL_NOT_FOUND', 'Kelulusan pengesah tidak ditemui.');
    if (approval.status !== 'approved') {
      failIntelligence('APPROVAL_NOT_ACTIVE', `Kelulusan pengesah berstatus ${approval.status}.`);
    }
    if (approval.approverId !== input.reviewerId) {
      failIntelligence('APPROVAL_REVIEWER_MISMATCH', 'Pengesah kelulusan tidak sepadan dengan pengesah yang dicadangkan.');
    }
    if (approval.approverRole !== 'founder') {
      failIntelligence('HUMAN_REVIEW_REQUIRED', 'Penerbitan skill memerlukan kelulusan pengasas (founder) oleh manusia.');
    }
    const expectedScope = this.publishScope(candidate.id, candidate.version);
    if (approval.scope !== expectedScope) {
      failIntelligence('APPROVAL_SCOPE_MISMATCH', 'Skop kelulusan tidak sepadan dengan calon/version ini.');
    }

    const proposal = this.options.approvalStore.getProposal(approval.proposalId);
    if (!proposal) failIntelligence('PROPOSAL_NOT_FOUND', 'Cadangan penerbitan tidak ditemui.');
    if (proposal.payload.candidateVersion !== candidate.version) {
      failIntelligence('CANDIDATE_CHANGED_SINCE_APPROVAL', 'Calon berubah selepas kelulusan; penerbitan ditolak.');
    }
    if (proposal.status === 'executed') {
      failIntelligence('PROPOSAL_ALREADY_EXECUTED', 'Cadangan penerbitan ini telah dilaksanakan.');
    }

    const previousVersions = this.listPublishedSkills().filter(
      (skill) => skill.lineageId === candidate.lineageId,
    );
    const nextVersion =
      previousVersions.reduce((highest, skill) => Math.max(highest, skill.version), 0) + 1;
    const publishedAt = this.now();
    const skill: PublishedSkillRecord = {
      id: randomUUID(),
      tenantId: candidate.tenantId,
      candidateId: candidate.id,
      lineageId: candidate.lineageId,
      version: nextVersion,
      title: candidate.title,
      body: candidate.body,
      kind: candidate.kind,
      behaviour: candidate.behaviour.map(normaliseRule),
      evidenceIds: candidate.evidenceIds,
      evaluationId: evaluation.id,
      review: candidate.review,
      compatibility: {
        runtimeApiVersions: [...candidate.compatibility.runtimeApiVersions],
        platformApiVersions: [...candidate.compatibility.platformApiVersions],
      },
      publishedBy: input.reviewerId,
      publishedAt,
      approvalId: approval.id,
      status: 'active',
    };

    // The proposal is consumed with a compare-and-swap so two concurrent
    // publishes cannot both succeed.
    const receiptId = randomUUID();
    try {
      this.options.approvalStore.compareAndSwapProposal(proposal.id, proposal.version, {
        ...proposal,
        status: 'executed',
        executedBy: input.reviewerId,
        executedAt: publishedAt,
        receiptId,
      });
    } catch (error) {
      failIntelligence(
        'PROPOSAL_CONFLICT',
        error instanceof Error ? error.message : 'Cadangan penerbitan berubah semasa menerbitkan.',
      );
    }

    this.store.atomic(() => {
      for (const previous of previousVersions) {
        if (previous.status === 'active') {
          this.store.save(RECORD_KINDS.publishedSkill, {
            ...previous,
            status: 'superseded',
            supersededBy: skill.id,
          });
        }
      }
      this.store.save(RECORD_KINDS.publishedSkill, skill);
      this.store.save(RECORD_KINDS.skillCandidate, {
        ...candidate,
        status: 'published',
        publishedSkillId: skill.id,
        revision: candidate.revision + 1,
      });
      this.store.audit(input.reviewerId, 'learning.skill.publish', skill.id, skill.version);
    });

    this.options.approvalStore.saveReceipt({
      id: receiptId,
      proposalId: proposal.id,
      approvalId: approval.id,
      actionType: PUBLISH_PROPOSAL_KIND,
      scope: expectedScope,
      status: 'confirmed',
      amountSen: 0,
      executedBy: input.reviewerId,
      executedAt: publishedAt,
      result: { skillId: skill.id, version: skill.version, candidateId: candidate.id },
      persistence: this.options.approvalStore.persistence,
    });

    return skill;
  }

  /* --------------------------------------------------------------------- *
   * Stage 7 — version-pinned delivery
   * --------------------------------------------------------------------- */

  getPublishedSkill(id: string): PublishedSkillRecord | null {
    return this.store.get<PublishedSkillRecord>(RECORD_KINDS.publishedSkill, id);
  }

  listPublishedSkills(tenantId?: string): PublishedSkillRecord[] {
    const all = this.store.all<PublishedSkillRecord>(RECORD_KINDS.publishedSkill);
    return tenantId ? all.filter((record) => record.tenantId === tenantId) : all;
  }

  /**
   * Delivers a published skill to a runtime. Delivery is refused — with an
   * explicit reason — when the runtime or platform version is not in the
   * skill's compatibility pin. A delivery is never silently degraded.
   */
  deliver(input: DeliverInput): SkillDeliveryRecord {
    const skill = this.getPublishedSkill(input.skillId);
    if (!skill) failIntelligence('SKILL_NOT_FOUND', `Skill '${input.skillId}' tidak ditemui.`);
    if (skill.status !== 'active') {
      failIntelligence(
        'SKILL_NOT_ACTIVE',
        `Skill berstatus ${skill.status}; hanya skill aktif boleh dihantar.`,
      );
    }
    if (!skill.compatibility.runtimeApiVersions.includes(input.runtimeApiVersion)) {
      failIntelligence(
        'INCOMPATIBLE_RUNTIME_API_VERSION',
        `Skill ini memerlukan runtime API versi ${skill.compatibility.runtimeApiVersions.join(', ')}; runtime '${input.runtimeApiVersion}' tidak serasi.`,
      );
    }
    if (!skill.compatibility.platformApiVersions.includes(input.platformApiVersion)) {
      failIntelligence(
        'INCOMPATIBLE_PLATFORM_API_VERSION',
        `Skill ini memerlukan platform API versi ${skill.compatibility.platformApiVersions.join(', ')}; platform '${input.platformApiVersion}' tidak serasi.`,
      );
    }
    const delivery: SkillDeliveryRecord = {
      id: randomUUID(),
      skillId: skill.id,
      candidateId: skill.candidateId,
      version: skill.version,
      runtimeApiVersion: input.runtimeApiVersion,
      platformApiVersion: input.platformApiVersion,
      deliveredAt: this.now(),
      deliveredTo: input.deliveredTo,
    };
    this.store.save(RECORD_KINDS.skillDelivery, delivery);
    this.store.audit(input.deliveredTo, 'learning.skill.deliver', delivery.id, skill.version);
    return delivery;
  }

  listDeliveries(skillId?: string): SkillDeliveryRecord[] {
    const all = this.store.all<SkillDeliveryRecord>(RECORD_KINDS.skillDelivery);
    return skillId ? all.filter((record) => record.skillId === skillId) : all;
  }

  /* --------------------------------------------------------------------- *
   * Stage 8 — rollback
   * --------------------------------------------------------------------- */

  /**
   * Rolls a published skill back to the previous published version of the same
   * lineage. The rollback itself is recorded.
   */
  rollback(input: RollbackInput): SkillRollbackRecord {
    const skill = this.getPublishedSkill(input.skillId);
    if (!skill) failIntelligence('SKILL_NOT_FOUND', `Skill '${input.skillId}' tidak ditemui.`);
    if (skill.status !== 'active') {
      failIntelligence('SKILL_NOT_ACTIVE', `Skill berstatus ${skill.status}; hanya skill aktif boleh digulung balik.`);
    }
    const previous = this.listPublishedSkills()
      .filter((entry) => entry.lineageId === skill.lineageId && entry.version < skill.version)
      .sort((left, right) => right.version - left.version)
      .find((entry) => entry.status === 'superseded');
    if (!previous) {
      failIntelligence(
        'NO_PREVIOUS_VERSION',
        'Tiada versi terdahulu yang boleh dipulangkan untuk skill ini.',
      );
    }
    const rolledBackAt = this.now();
    const record: SkillRollbackRecord = {
      id: randomUUID(),
      fromSkillId: skill.id,
      toSkillId: previous.id,
      candidateId: skill.candidateId,
      lineageId: skill.lineageId,
      reason: input.reason,
      rolledBackBy: input.by,
      rolledBackAt,
    };
    this.store.atomic(() => {
      this.store.save(RECORD_KINDS.publishedSkill, {
        ...previous,
        status: 'active',
        supersededBy: undefined,
        rolledBackAt: undefined,
        rolledBackBy: undefined,
      });
      this.store.save(RECORD_KINDS.publishedSkill, {
        ...skill,
        status: 'rolled_back',
        rolledBackAt,
        rolledBackBy: input.by,
        rolledBackTo: previous.id,
      });
      this.store.save(RECORD_KINDS.skillRollback, record);
      this.store.audit(input.by, 'learning.skill.rollback', skill.id, skill.version);
    });
    return record;
  }

  listRollbacks(lineageId?: string): SkillRollbackRecord[] {
    const all = this.store.all<SkillRollbackRecord>(RECORD_KINDS.skillRollback);
    return lineageId ? all.filter((record) => record.lineageId === lineageId) : all;
  }
}
