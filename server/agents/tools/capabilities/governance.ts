/**
 * AbangColek Sovereign GrowthOS — ADV-25..ADV-32 Governance Tools
 *
 * ADV-25 is the only tool that can mutate authoritative business state and it
 * refuses to do so without a live approval record, a matching scope, a fresh
 * founder authority, a clean compare-and-swap and a registered executor.
 */

import { randomUUID } from 'node:crypto';
import { defineTool, fail, resolveContext } from './common';
import { provenance } from '../runtime';
import type { ToolDefinition } from '../types';
import {
  approvedKnowledge,
  catalogueProducts,
  catalogueVersion,
  readJob,
  readOrder,
} from '../records';
import { orderAccessCode } from '../scope';
import { resolveActor } from '../scope';
import { ApprovalConflictError } from '../../approval/types';
import { evaluateMarginContribution } from '../../../platform/marginGuardian';
import {
  applyVerifiedActionOutcome,
  inspectActionReceipt,
  refreshExternalActionStatus,
} from './advReconciliation';
import {
  RECONCILE_OPERATIONS,
  type ReconcileOperation,
} from '../../../../shared/adv-contracts';

export const governanceTools: ToolDefinition[] = [
  // ADV-25: execute_approved_action (C/X)
  defineTool({
    logicalCapabilityId: 'ADV-25',
    registrationName: 'execute_approved_action',
    riskClass: 'C',
    description:
      'Melaksanakan tindakan yang telah diluluskan founder: semak cadangan, kelulusan, skop, tempoh, compare-and-swap, eksekutor sebenar, kemudian resit kekal.',
    requiredRole: 'founder',
    validationMessage: 'EXECUTION_REQUIRES_PROPOSAL_AND_APPROVAL_IDS',
    inputSchema: {
      proposalId: { required: true, type: 'string', min: 1, max: 120 },
      approvalId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      // 0. Only a founder may ever reach a mutating executor.
      if (ctx.role !== 'founder') {
        throw new Error('FORBIDDEN_FOUNDER_REQUIRED: Hanya founder berkuasa boleh melaksanakan tindakan mutasi kewangan.');
      }
      const store = ctx.runtime.store;
      if (!store) {
        return fail(
          'EXECUTOR_UNAVAILABLE',
          'Platform store unavailable: tiada eksekutor boleh melaksanakan tindakan ini.',
        );
      }
      // 1. Re-verify the caller's authority against the canonical membership table.
      const actor = resolveActor(store, ctx.actorId);
      if (!actor) {
        return fail('AUTHORITY_UNRESOLVED', 'Kebenaran pemeran tidak dapat disahkan daripada rekod keahlian aktif.');
      }
      if (!actor.isFounder) {
        return fail('FORBIDDEN_FOUNDER_REQUIRED', 'Hanya founder berkuasa boleh melaksanakan tindakan mutasi kewangan.');
      }

      const now = ctx.runtime.clock();
      const proposalId = input.proposalId as string;
      const approvalId = input.approvalId as string;

      // 2. Proposal must exist — never fabricate a receipt for an unknown proposal.
      //    Canonical code: EXECUTOR_UNAVAILABLE (no canonical approval => no
      //    executor may act). The precise cause stays in `reason`.
      const proposal = ctx.runtime.approvalService.getProposal(proposalId);
      if (!proposal) {
        return fail(
          'EXECUTOR_UNAVAILABLE',
          `Cadangan '${proposalId}' tidak ditemui; tiada resit kanonikal boleh dikeluarkan.`,
          'PROPOSAL_NOT_FOUND',
        );
      }

      // 3. Approval must exist.
      const approval = ctx.runtime.approvalService.expireIfNeeded(approvalId);
      if (!approval) {
        return fail(
          'EXECUTOR_UNAVAILABLE',
          `Kelulusan '${approvalId}' tidak ditemui; tiada resit kanonikal boleh dikeluarkan.`,
          'APPROVAL_NOT_FOUND',
        );
      }
      if (approval.proposalId !== proposal.id) {
        return fail(
          'EXECUTOR_UNAVAILABLE',
          'Kelulusan ini tidak terikat pada cadangan yang diminta; tiada resit boleh dikeluarkan.',
          'APPROVAL_PROPOSAL_MISMATCH',
        );
      }

      // 4. Idempotency — a repeated execution returns the original receipt.
      const existingReceipt = ctx.runtime.approvalStore.findReceiptByProposal(proposal.id);
      if (existingReceipt) {
        return {
          ok: true,
          code: 'ALREADY_EXECUTED',
          replay: true,
          receiptId: existingReceipt.id,
          status: existingReceipt.status,
          proposalId: existingReceipt.proposalId,
          approvalId: existingReceipt.approvalId,
          actionType: existingReceipt.actionType,
          scope: existingReceipt.scope,
          amountSen: existingReceipt.amountSen,
          executedBy: existingReceipt.executedBy,
          executedAt: existingReceipt.executedAt,
          result: existingReceipt.result,
          duplicateCommandCreated: false,
          persistence: ctx.runtime.approvalStore.persistence,
          provenance: provenance(ctx.runtime, ctx, [`proposals:${proposal.id}`, `approvals:${approval.id}`], 'approval-execution-replay'),
        };
      }

      // 5. Approval state.
      if (approval.status === 'revoked') {
        return fail('APPROVAL_REVOKED', 'Kelulusan telah dicabut.');
      }
      if (approval.status === 'expired') {
        return fail('APPROVAL_EXPIRED', 'Kelulusan telah luput tempoh.');
      }
      if (approval.status === 'pending') {
        return fail('APPROVAL_PENDING', 'Kelulusan belum diberikan.');
      }
      if (approval.expiresAt <= now) {
        return fail('APPROVAL_EXPIRED', 'Kelulusan telah luput tempoh.');
      }
      if (proposal.expiresAt <= now) {
        return fail('PROPOSAL_EXPIRED', 'Cadangan telah luput tempoh.');
      }

      // 6. Scope + nonce binding.
      if (approval.scope !== proposal.scope) {
        return fail('SCOPE_MISMATCH', `Skop kelulusan (${approval.scope}) tidak sepadan dengan skop cadangan (${proposal.scope}).`);
      }
      if (approval.proposalNonce !== proposal.nonce) {
        return fail('APPROVAL_NONCE_MISMATCH', 'Kelulusan tidak terikat pada versi cadangan yang diluluskan.');
      }
      if (proposal.status === 'rejected') {
        return fail('PROPOSAL_REJECTED', 'Cadangan telah ditolak.');
      }
      if (proposal.status === 'cancelled') {
        return fail('PROPOSAL_CANCELLED', 'Cadangan telah dibatalkan.');
      }
      if (proposal.status === 'unknown_outcome') {
        return fail(
          'PROPOSAL_OUTCOME_UNKNOWN',
          'Keputusan pelaksanaan terdahulu tidak dapat ditentukan; jalankan penyelarasan (reconcile_action) sebelum mencuba semula.',
        );
      }

      // 7. Compare-and-swap: the approval must still match the current proposal version.
      if (approval.proposalVersion !== proposal.version) {
        return fail(
          'CAS_CONFLICT',
          `Cadangan telah berubah sejak kelulusan (versi ${proposal.version} != ${approval.proposalVersion}). Muat semula sebelum meneruskan.`,
        );
      }

      // 8. A registered executor is mandatory.
      if (!ctx.runtime.executors.has(proposal.kind)) {
        return fail('EXECUTOR_UNAVAILABLE', `Tiada eksekutor didaftar untuk tindakan '${proposal.kind}'.`);
      }

      // 9. Claim the proposal (optimistic lock) so a concurrent execution cannot double-commit.
      let claimed;
      try {
        claimed = ctx.runtime.approvalStore.compareAndSwapProposal(
          proposal.id,
          proposal.version,
          { ...proposal, status: 'executing' },
        );
      } catch (error) {
        if (error instanceof ApprovalConflictError) {
          return fail('CAS_CONFLICT', error.message);
        }
        return fail('CAS_CONFLICT', 'Cadangan tidak dapat dikunci untuk pelaksanaan.');
      }

      // 10. Execute against the real executor.
      const outcome = await ctx.runtime.executors.execute(
        proposal.kind,
        { ...proposal.payload, proposalId: proposal.id },
        {
          actorId: ctx.actorId,
          role: ctx.role,
          runId: ctx.runId,
          store,
          principal: actor.principal,
          at: now,
        },
      );
      if (!outcome.ok) {
        // Roll the claim back so the action can be retried once the blocker is fixed.
        if (outcome.code === 'EXECUTION_OUTCOME_UNKNOWN') {
          ctx.runtime.approvalStore.saveProposal({
            ...claimed,
            status: 'unknown_outcome',
            executedBy: ctx.actorId,
            executedAt: now,
          });
          return fail(
            'EXECUTION_OUTCOME_UNKNOWN',
            outcome.message ?? 'Keputusan pelaksanaan tidak dapat ditentukan; rekod ditanda unknown_outcome tanpa resit.',
          );
        }
        ctx.runtime.approvalStore.saveProposal({ ...proposal, status: 'approved' });
        return fail(outcome.code ?? 'EXECUTION_FAILED', outcome.message ?? 'Pelaksanaan gagal.');
      }

      // 11. Durable commit of the receipt.
      const receiptId = randomUUID();
      const receipt = {
        id: receiptId,
        proposalId: proposal.id,
        approvalId: approval.id,
        actionType: proposal.kind,
        scope: proposal.scope,
        status: 'confirmed' as const,
        amountSen: proposal.amountSen,
        executedBy: ctx.actorId,
        executedAt: now,
        result: outcome.data ?? {},
        persistence: ctx.runtime.approvalStore.persistence,
      };
      ctx.runtime.approvalStore.saveReceipt(receipt);
      try {
        ctx.runtime.approvalStore.compareAndSwapProposal(claimed.id, claimed.version, {
          ...claimed,
          status: 'executed',
          receiptId,
          executedBy: ctx.actorId,
          executedAt: now,
        });
      } catch (error) {
        if (error instanceof ApprovalConflictError) {
          return fail('CAS_CONFLICT', error.message);
        }
        return fail('CAS_CONFLICT', 'Cadangan tidak dapat dikunci selepas pelaksanaan.');
      }
      if (store.audit) {
        store.audit(ctx.actorId, `agent.action.${proposal.kind}`, proposal.id, claimed.version);
      }

      return {
        ok: true,
        receiptId,
        status: 'confirmed',
        replay: false,
        proposalId: proposal.id,
        approvalId: approval.id,
        actionType: proposal.kind,
        scope: proposal.scope,
        amountSen: proposal.amountSen,
        executedBy: ctx.actorId,
        executedAt: now,
        result: receipt.result,
        duplicateCommandCreated: false,
        persistence: ctx.runtime.approvalStore.persistence,
        provenance: provenance(
          ctx.runtime,
          ctx,
          [`proposals:${proposal.id}`, `approvals:${approval.id}`, `receipts:${receiptId}`],
          'approval-execution-service',
        ),
      };
    },
  }),

  // ADV-26: reconcile_action (Q/C)
  defineTool({
    logicalCapabilityId: 'ADV-26',
    registrationName: 'reconcile_action',
    riskClass: 'Q',
    description:
      'Menyelaraskan resit tindakan yang dilaksanakan dengan keadaan platform sebenar (pesanan, bayaran) dan melaporkan drift melalui tiga operasi berasingan: periksa resit, segarkan status luaran, dan gunakan hasil yang disahkan.',
    requiredRole: 'founder',
    inputSchema: {
      /** Reconciliation is three DISTINCT operations, never one blended step. */
      operation: {
        type: 'string',
        enum: ['inspect_action_receipt', 'refresh_external_action_status', 'apply_verified_action_outcome'],
      },
      proposalId: { type: 'string', min: 1, max: 120 },
      receiptId: { type: 'string', min: 1, max: 120 },
      $oneOf: { type: 'array', items: { type: 'string' } },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      if (!actor.isFounder) {
        return fail('FORBIDDEN_FOUNDER_REQUIRED', 'Penyelarasan tindakan memerlukan peranan founder.');
      }
      const at = ctx.runtime.clock();
      const operation = (input.operation as ReconcileOperation | undefined) ?? 'inspect_action_receipt';
      if (!RECONCILE_OPERATIONS.includes(operation)) {
        return fail('RECONCILE_OPERATION_INVALID', `Operasi penyelarasan '${operation}' tidak dikenali.`);
      }
      const proposalId = input.proposalId as string | undefined;
      const receiptId = input.receiptId as string | undefined;
      const receipt = receiptId
        ? ctx.runtime.approvalStore.getReceipt(receiptId)
        : proposalId
          ? ctx.runtime.approvalStore.findReceiptByProposal(proposalId)
          : null;
      if (!receipt) {
        return fail('RECEIPT_NOT_FOUND', 'Tiada resit Pelaksanaan untuk reconciliation tersebut.');
      }
      const proposal = ctx.runtime.approvalService.getProposal(receipt.proposalId);

      // Operation 1 is always evaluated so `status` / `drifts` stay truthful for
      // every operation: the receipt is compared against the LIVE platform
      // state (order / payment), never against a remembered snapshot.
      const inspection = inspectActionReceipt(store, receipt);
      const base = {
        ok: true as const,
        operation,
        receiptId: receipt.id,
        proposalId: receipt.proposalId,
        actionType: receipt.actionType,
        receiptStatus: receipt.status,
        executedBy: receipt.executedBy,
        executedAt: receipt.executedAt,
        proposalStatus: proposal?.status ?? null,
        proposalVersion: proposal?.version ?? null,
        drifts: inspection.drifts,
        status: inspection.status,
        inspectedOrderId: inspection.orderId,
        refundableSen: inspection.refundableSen,
        paymentId: inspection.paymentId,
        persistence: ctx.runtime.approvalStore.persistence,
      };

      if (operation === 'inspect_action_receipt') {
        return {
          ...base,
            mutated: false,
            provenance: provenance(
              ctx.runtime,
              ctx,
              [`receipts:${receipt.id}`],
              'execution-reconciliation-read',
            ),
        };
      }

      if (operation === 'refresh_external_action_status') {
        const refreshed = refreshExternalActionStatus(store, actor, receipt, at);
        if (!refreshed.reading.ok) {
          return fail(
            refreshed.reading.reason ?? 'EXTERNAL_STATUS_UNAVAILABLE',
            refreshed.reading.message,
          );
        }
        return {
          ...base,
          externalStatus: refreshed.reading.status,
          externalStatusReason: refreshed.reading.reason,
          externalStatusMessage: refreshed.reading.message,
          externalStatusEvidence: refreshed.reading.evidence,
          previousExternalStatus: refreshed.previousStatus,
          externalStatusChanged: refreshed.changed,
          observedAt: at,
          observedBy: actor.principal.user.id,
          mutated: refreshed.record !== null,
          provenance: provenance(
            ctx.runtime,
            ctx,
            [`receipts:${receipt.id}`, 'action_status'],
            'external-action-status-refresh',
          ),
        };
      }

      // apply_verified_action_outcome — applied at most once, and only when the
      // live state proves the outcome.
      const applied = applyVerifiedActionOutcome(store, actor, receipt, at);
      if (!applied.ok) {
        return fail(applied.reason ?? 'EXTERNAL_OUTCOME_UNVERIFIED', applied.message);
      }
      return {
        ...base,
        applied: true,
        replay: applied.replay,
        applyReason: applied.reason,
        applyMessage: applied.message,
        platformStateRepaired: applied.platformStateRepaired,
        appliedOrderId: applied.orderId,
        appliedAt: applied.outcome?.appliedAt ?? null,
        verifiedBy: applied.outcome?.verifiedBy ?? null,
        mutated: !applied.replay,
        provenance: provenance(
          ctx.runtime,
          ctx,
          [`receipts:${receipt.id}`, 'action_outcomes'],
          'verified-action-outcome-apply',
        ),
      };
    },
  }),

  // ADV-27: inspect_runtime (Q)
  defineTool({
    logicalCapabilityId: 'ADV-27',
    registrationName: 'inspect_runtime',
    riskClass: 'Q',
    description:
      'Memeriksa status runtime sebenar: kawalan pekerja, launch/version, penggunaan kerja harian dan ketersediaan store kelulusan.',
    requiredRole: 'developer',
    inputSchema: {
      component: { type: 'string', enum: ['all', 'worker', 'jobs', 'approval'] },
    },
    execute: async (input, ctx) => {
      const component = (input.component as string | undefined) ?? 'all';
      const at = ctx.runtime.clock();
      const components: Array<{ component: string; status: string; reasonCode: string; detail: Record<string, unknown> }> = [];

      if (component === 'all' || component === 'worker') {
        const controls = ctx.runtime.store?.get<{
          id: string;
          version: number;
          workerAdmission: string;
          activeRelease: string;
          availableReleases: readonly string[];
          externalFlags: Record<string, boolean>;
          updatedAt: string;
        }>('runtime_controls', 'runtime');
        components.push({
          component: 'worker',
          status: controls?.workerAdmission === 'paused' ? 'degraded' : 'ready',
          reasonCode: controls ? `ADMISSION_${String(controls.workerAdmission).toUpperCase()}` : 'RUNTIME_CONTROLS_UNAVAILABLE',
          detail: controls
            ? {
                version: controls.version,
                workerAdmission: controls.workerAdmission,
                activeRelease: controls.activeRelease,
                availableReleases: controls.availableReleases,
                externalFlags: controls.externalFlags,
                updatedAt: controls.updatedAt,
              }
            : {},
        });
      }

      if (component === 'all' || component === 'jobs') {
        const store = ctx.runtime.store;
        const day = at.slice(0, 10);
        const jobs = store ? store.all<import('../../../../shared/platform-contracts').JobRecord>('jobs') : [];
        const todayJobs = jobs.filter((job) => job.createdAt.slice(0, 10) === day);
        components.push({
          component: 'jobs',
          status: store ? 'ready' : 'unavailable',
          reasonCode: store ? 'JOBS_READABLE' : 'PLATFORM_STORE_UNAVAILABLE',
          detail: {
            totalJobs: jobs.length,
            jobsCreatedToday: todayJobs.length,
            queued: jobs.filter((job) => job.status === 'queued').length,
            running: jobs.filter((job) => job.status === 'running').length,
            failed: jobs.filter((job) => job.status === 'failed').length,
            unknown: jobs.filter((job) => job.status === 'unknown').length,
          },
        });
      }

      if (component === 'all' || component === 'approval') {
        const proposals = ctx.runtime.approvalService.listProposals();
        components.push({
          component: 'approval',
          status: 'ready',
          reasonCode: 'APPROVAL_STORE_READABLE',
          detail: {
            persistence: ctx.runtime.approvalStore.persistence,
            proposalCount: proposals.length,
            pendingProposals: proposals.filter((proposal) => proposal.status === 'pending_approval').length,
            executedProposals: proposals.filter((proposal) => proposal.status === 'executed').length,
            registeredExecutors: ctx.runtime.executors.list(),
          },
        });
      }

      return {
        ok: true,
        component,
        observedAt: at,
        components,
        status: components.every((entry) => entry.status === 'ready') ? 'healthy' : 'attention_required',
        provenance: provenance(ctx.runtime, ctx, ['runtime_controls', 'jobs', 'approval_store'], 'runtime-inspection-read'),
      };
    },
  }),

  // ADV-28: review_skill_candidate (S)
  defineTool({
    logicalCapabilityId: 'ADV-28',
    registrationName: 'review_skill_candidate',
    riskClass: 'S',
    description:
      'Menilai calon skill terhadap semakan deterministik (kelengkapan, skop, tanda rahsia) dan menghasilkan keputusan yang dikira.',
    requiredRole: 'developer',
    inputSchema: {
      candidateId: { type: 'string', min: 1, max: 120 },
      title: { type: 'string', min: 1, max: 200 },
      body: { type: 'string', min: 1, max: 20000 },
      kind: { type: 'string', min: 1, max: 80 },
      $oneOf: { type: 'array', items: { type: 'string' } },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store } = resolved;
      const candidateId = input.candidateId as string | undefined;
      let title = input.title as string | undefined;
      let body = input.body as string | undefined;
      const sources: string[] = [];

      if (candidateId) {
        const record = store.get<{ id: string; title?: string; body?: string; content?: string; kind?: string }>(
          'skill_candidates',
          candidateId,
        );
        if (!record) {
          return fail('CANDIDATE_NOT_FOUND', `Calon skill '${candidateId}' tidak ditemui.`);
        }
        title = title ?? record.title;
        body = body ?? record.body ?? record.content;
        sources.push(`skill_candidates:${record.id}`);
      }
      if (!title || !body) {
        return fail('CANDIDATE_CONTENT_REQUIRED', 'Kandungan calon (title/body) diperlukan untuk penilaian.');
      }

      const secretPatterns = [
        { label: 'API_KEY_LITERAL', pattern: /(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/ },
        { label: 'PASSWORD_LITERAL', pattern: /(password|passwd|secret|token)\s*[:=]\s*['"][^'"]{6,}['"]/i },
      ];
      const checks: Array<{ check: string; passed: boolean; detail: string }> = [
        { check: 'TITLE_PRESENT', passed: title.trim().length >= 3, detail: `panjang tajuk ${title.trim().length}` },
        { check: 'BODY_PRESENT', passed: body.trim().length >= 20, detail: `panjang badan ${body.trim().length}` },
        { check: 'SCOPE_DECLARED', passed: /skop|scope|domain|had|limit/i.test(body), detail: 'perlu pernyataan skop/had' },
        { check: 'NO_TODO_MARKERS', passed: !/\bTODO\b|\bFIXME\b/.test(body), detail: 'penanda TODO/FIXME tidak dibenarkan' },
        { check: 'NO_SECRET_LITERAL', passed: !secretPatterns.some((entry) => entry.pattern.test(body)), detail: 'corak rahsia dikesan' },
        {
          check: 'ERROR_HANDLING_DECLARED',
          passed: /ralat|error|exception|gagal|fail/i.test(body),
          detail: 'perlu pilihan ralat dinyatakan',
        },
      ];
      const failed = checks.filter((check) => !check.passed);
      const secretLeak = failed.some((check) => check.check === 'NO_SECRET_LITERAL');
      const decision = secretLeak ? 'reject' : failed.length === 0 ? 'promote' : 'revise';

      return {
        ok: true,
        candidateId: candidateId ?? null,
        title,
        kind: input.kind ?? null,
        decision,
        checks,
        failedCheckCount: failed.length,
        reviewer: 'deterministic-skill-reviewer',
        promoted: false,
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, sources.length ? sources : ['inline:candidate'], 'skill-candidate-reviewer'),
      };
    },
  }),

  // ADV-29: search_sop (Q)
  defineTool({
    logicalCapabilityId: 'ADV-29',
    registrationName: 'search_sop',
    riskClass: 'Q',
    description:
      'Mencari SOP dan pengetahuan yang telah diluluskan daripada knowledge kanonik dan reading QC (baca sahaja).',
    requiredRole: 'staff',
    inputSchema: {
      query: { required: true, type: 'string', min: 2, max: 200 },
      limit: { type: 'integer', min: 1, max: 50 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store } = resolved;
      const at = ctx.runtime.clock();
      const query = (input.query as string).trim().toLowerCase();
      const limit = (input.limit as number | undefined) ?? 10;

      const knowledge = approvedKnowledge(store, at)
        .filter((entry) => `${entry.title} ${entry.body}`.toLowerCase().includes(query))
        .slice(0, limit)
        .map((entry) => ({
          id: entry.id,
          documentId: entry.documentId,
          version: entry.version,
          title: entry.title,
          expiresAt: entry.expiresAt ?? null,
          excerpt: entry.body.slice(0, 240),
        }));

      const sops = store
        .all<{ id: string; knowledgeId: string; knowledgeVersion: number; version: number; readings: Array<{ name: string; unit: string; minimum: number; maximum: number }>; approvedBy: string }>('qc_sops')
        .filter((sop) => sop.readings.some((reading) => reading.name.toLowerCase().includes(query)))
        .slice(0, limit)
        .map((sop) => ({
          id: sop.id,
          knowledgeId: sop.knowledgeId,
          knowledgeVersion: sop.knowledgeVersion,
          version: sop.version,
          approvedBy: sop.approvedBy,
          readings: sop.readings,
        }));

      return {
        ok: true,
        query: input.query,
        knowledgeMatchCount: knowledge.length,
        sopMatchCount: sops.length,
        knowledge,
        sops,
        status: knowledge.length + sops.length === 0 ? 'no_match' : 'matched',
        provenance: provenance(ctx.runtime, ctx, ['knowledge', 'qc_sops'], 'knowledge-sop-search'),
      };
    },
  }),

  // ADV-30: propose_task (S)
  defineTool({
    logicalCapabilityId: 'ADV-30',
    registrationName: 'propose_task',
    riskClass: 'S',
    description:
      'Meny-cadangkan task baharu selepas mengesahkan entiti dan penerima di bawah skop. Tiada task dicipta dalam rekod authoritative.',
    requiredRole: 'staff',
    inputSchema: {
      entityId: { required: true, type: 'string', min: 1, max: 120 },
      title: { required: true, type: 'string', min: 3, max: 200 },
      assigneeId: { type: 'string', min: 1, max: 120 },
      dueAt: { type: 'string', min: 4, max: 40 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const entityId = input.entityId as string;
      const order = readOrder(store, entityId);
      const entity = order
        ? order
        : (store.get('cases', entityId) ??
          store.get('tasks', entityId) ??
          store.get('lots', entityId) ??
          null);
      if (!entity) {
        return fail('ENTITY_NOT_FOUND', `Entiti '${entityId}' tidak ditemui.`);
      }
      if (order) {
        const refusal = orderAccessCode(actor, order);
        if (refusal) return fail(refusal, 'Entiti ini di luar skop akses pemeran.');
      } else if (!actor.isStaff && !actor.isFounder) {
        return fail('FORBIDDEN', 'Entiti ini di luar skop akses pemeran.');
      }

      const assigneeId = input.assigneeId as string | undefined;
      if (assigneeId) {
        const memberships = store.db
          .query<{ role: string; status: string }, [string]>('SELECT role,status FROM memberships WHERE user_id=?')
          .all(assigneeId);
        const eligible = memberships.some(
          (membership) =>
            membership.status === 'active' && (membership.role === 'founder' || membership.role === 'staff'),
        );
        if (!eligible) {
          return fail('ASSIGNEE_SCOPE', `Penerima '${assigneeId}' tiada keahlian aktif yang boleh menerima task.`);
        }
      }

      const dueAt = input.dueAt as string | undefined;
      if (dueAt) {
        if (!Number.isFinite(Date.parse(dueAt))) {
          return fail('INVALID_DUE_DATE', 'Tarikh akhir tidak sah.');
        }
        if (dueAt <= ctx.runtime.clock()) {
          return fail('INVALID_DUE_DATE', 'Tarikh akhir mesti pada masa hadapan.');
        }
      }

      const proposal = ctx.runtime.approvalService.createProposal({
        kind: 'task.create',
        scope: `entity:${entityId}#task`,
        payload: {
          entityId,
          title: input.title,
          ...(assigneeId ? { assigneeId } : {}),
          ...(dueAt ? { dueAt } : {}),
        },
        amountSen: 0,
        proposedBy: ctx.actorId,
        proposerRole: ctx.role,
        sourceRefs: [`entity:${entityId}`],
      });

      return {
        ok: true,
        proposalId: proposal.id,
        kind: proposal.kind,
        scope: proposal.scope,
        entityId,
        title: input.title,
        assigneeId: assigneeId ?? null,
        dueAt: dueAt ?? null,
        status: proposal.status,
        createdAt: proposal.createdAt,
        expiresAt: proposal.expiresAt,
        taskCreated: false,
        mutated: false,
        authoritativeStateMutated: false,
        persistence: ctx.runtime.approvalStore.persistence,
        provenance: provenance(ctx.runtime, ctx, proposal.sourceRefs, 'proposal-store-write'),
      };
    },
  }),

  // ADV-31: evaluate_job_retry (S)
  defineTool({
    logicalCapabilityId: 'ADV-31',
    registrationName: 'evaluate_job_retry',
    riskClass: 'S',
    description:
      'Menilai sama ada satu job automasi boleh dicuba semula berdasarkan status, bilangan cubaan, lease dan punca kegagalan yang direkodkan.',
    requiredRole: 'developer',
    inputSchema: {
      jobId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store } = resolved;
      const job = readJob(store, input.jobId as string);
      if (!job) {
        return fail('JOB_NOT_FOUND', `Job '${String(input.jobId)}' tidak ditemui.`);
      }
      const at = ctx.runtime.clock();
      const reasons: string[] = [];
      let retryable = false;

      if (job.status === 'queued') {
        retryable = false;
        reasons.push('JOB_SEDANG_BERGANTUNG');
      } else if (job.status === 'running') {
        const leaseValid = Boolean(job.leaseUntil && job.leaseUntil > at);
        retryable = false;
        reasons.push(leaseValid ? 'LEASE_MASIH_AKTIF' : 'LEASE_TELEPUH');
      } else if (job.status === 'completed') {
        reasons.push('JOB_SUDAH_SELESAI');
      } else if (job.status === 'cancelled') {
        reasons.push('JOB_DIBATALKAN');
      } else if (job.status === 'blocked') {
        reasons.push(`JOB_DISEKAT:${job.reasonCode ?? 'SEBAB_TIDAK_DIKETAHUI'}`);
      } else if (job.status === 'failed' || job.status === 'unknown') {
        if (job.attempt >= 3) {
          reasons.push('CUBANAN_MAKSIMUM_DICAPAI');
        } else if (job.reasonCode === 'RESEARCH_ADAPTER_UNAVAILABLE') {
          reasons.push('PENYESUAI_PENELITIAN_TIDAK_TERSEDIA');
        } else {
          retryable = true;
          reasons.push(job.reasonCode ? `GAGAL:${job.reasonCode}` : 'GAGAL_TANPA_PUNCA');
        }
      }

      return {
        ok: true,
        jobId: job.id,
        kind: job.kind,
        status: job.status,
        attempt: job.attempt,
        maxAttempts: 3,
        reasonCode: job.reasonCode ?? null,
        leaseUntil: job.leaseUntil ?? null,
        idempotencyKey: job.idempotencyKey,
        retryable,
        reasons,
        evaluatedAt: at,
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['jobs'], 'job-retry-evaluator'),
      };
    },
  }),

  // ADV-32: draft_campaign (D)
  defineTool({
    logicalCapabilityId: 'ADV-32',
    registrationName: 'draft_campaign',
    riskClass: 'D',
    description:
      'Menyediakan draf kempen denganMargin Guardian dikira dan harga katalog live. Tiada kempen disimpan atau diterbitkan.',
    requiredRole: 'founder',
    inputSchema: {
      title: { required: true, type: 'string', min: 3, max: 200 },
      objective: { required: true, type: 'string', min: 3, max: 2000 },
      copy: { type: 'string', min: 1, max: 20000 },
      productIds: {
        type: 'array',
        maxItems: 50,
        items: { type: 'string', min: 1, max: 120 },
      },
      marginSimulation: {
        type: 'object',
        fields: {
          netSalesExTaxSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          cogsSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          packagingSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          paymentFeesSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          fulfilmentVariableCostSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          deliverySubsidySen: { type: 'integer', min: 0, max: 1_000_000_000 },
          agentCommissionSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          rewardCostSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          expectedReturnLossSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          minimumContributionSen: { type: 'integer', min: 0, max: 1_000_000_000 },
          minimumContributionMarginPct: { type: 'number', min: 0, max: 100 },
        },
      },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      if (!actor.isFounder) {
        return fail('FORBIDDEN_FOUNDER_REQUIRED', 'Draf kempen memerlukan peranan founder.');
      }
      const productIds = (input.productIds as string[] | undefined) ?? [];
      const catalogue = catalogueProducts(store);
      const products = productIds.map((productId) => {
        const product = catalogue.find((candidate) => candidate.id === productId);
        return product
          ? { id: product.id, name: product.name, priceSen: product.priceSen, status: product.status, availableQuantity: product.availableQuantity }
          : { id: productId, name: null, priceSen: null, status: 'missing', availableQuantity: null };
      });
      const missingProducts = products.filter((product) => product.status === 'missing');
      if (missingProducts.length) {
        return fail('PRODUCT_UNAVAILABLE', `Produk tidak dijumpai: ${missingProducts.map((product) => product.id).join(', ')}.`);
      }

      let marginResult: ReturnType<typeof evaluateMarginContribution> | null = null;
      const simulation = input.marginSimulation as Record<string, unknown> | undefined;
      if (simulation) {
        const defaultsApplied: string[] = [];
        const cost = (key: string): number => {
          if (typeof simulation[key] === 'number') return simulation[key] as number;
          defaultsApplied.push(`${key}=0`);
          return 0;
        };
        const marginInput = {
          netSalesExTaxSen: simulation.netSalesExTaxSen as number,
          cogsSen: simulation.cogsSen as number,
          packagingSen: cost('packagingSen'),
          paymentFeesSen: cost('paymentFeesSen'),
          fulfilmentVariableCostSen: cost('fulfilmentVariableCostSen'),
          deliverySubsidySen: cost('deliverySubsidySen'),
          agentCommissionSen: cost('agentCommissionSen'),
          rewardCostSen: cost('rewardCostSen'),
          expectedReturnLossSen: cost('expectedReturnLossSen'),
          minimumContributionSen:
            typeof simulation.minimumContributionSen === 'number'
              ? (simulation.minimumContributionSen as number)
              : (defaultsApplied.push('minimumContributionSen=0'), 0),
          minimumContributionMarginPct:
            typeof simulation.minimumContributionMarginPct === 'number'
              ? (simulation.minimumContributionMarginPct as number)
              : (defaultsApplied.push('minimumContributionMarginPct=25'), 25),
        };
        marginResult = evaluateMarginContribution(marginInput);
        if (defaultsApplied.length) {
          marginResult = { ...marginResult };
        }
      }

      const proposal = ctx.runtime.approvalService.createProposal({
        kind: 'campaign.draft',
        scope: `campaign-draft:${input.title}`,
        payload: {
          title: input.title,
          objective: input.objective,
          copy: input.copy ?? '',
          productIds,
          marginSimulation: simulation ?? null,
          marginResult: marginResult ?? null,
        },
        amountSen: 0,
        proposedBy: ctx.actorId,
        proposerRole: ctx.role,
        sourceRefs: [...productIds.map((productId) => `catalogue:${productId}`), 'shared/growth-contracts:evaluateMarginContribution'],
      });

      return {
        ok: true,
        draftId: proposal.id,
        title: input.title,
        objective: input.objective,
        copy: input.copy ?? '',
        products,
        catalogueVersion: catalogueVersion(store),
        marginResult: marginResult
          ? {
              contributionSen: marginResult.contributionSen,
              contributionMarginPct: marginResult.contributionMarginPct,
              allowed: marginResult.allowed,
              reasonCode: marginResult.reasonCode,
            }
          : null,
        status: proposal.status,
        published: false,
        mutated: false,
        authoritativeStateMutated: false,
        persistence: ctx.runtime.approvalStore.persistence,
        provenance: provenance(ctx.runtime, ctx, proposal.sourceRefs, 'margin-guardian+proposal-store'),
      };
    },
  }),
];
