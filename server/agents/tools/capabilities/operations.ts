/**
 * AbangColek Sovereign GrowthOS — ADV-19..ADV-24 Operations Tools
 */

import { createHash, randomUUID } from 'node:crypto';
import { defineTool, fail, resolveContext } from './common';
import { provenance } from '../runtime';
import type { ToolDefinition } from '../types';
import {
  allPayments,
  commissionsForOrder,
  dealerReturns,
  dealerSettlementPayments,
  dealerSettlements,
  readCase,
  readOrder,
  readRestock,
} from '../records';
import { dealerAccessCode, orderAccessCode } from '../scope';
import { Auth } from '../../../platform/auth';
import { Commerce } from '../../../platform/commerce';
import { Work } from '../../../platform/work';
import { Reports } from '../../../platform/reports';
import { Loyalty } from '../../../platform/loyalty';
import { daysBetween } from '../records';
import {
  authorizeExportDownload,
  checkExportQuota,
  resolveCapabilityGrant,
  resolveOutboundConsent,
} from './advOperations';
import { remediateCase, type CaseRemediationResult } from './advRemediation';
import {
  EXPORT_DOWNLOAD_WINDOW_MS,
  type ExportArtifactRecord,
  type OutboundChannel,
} from '../../../../shared/adv-contracts';
import type { BusinessSettings, OrderRecord, RestockRecord } from '../../../../shared/platform-contracts';

export const operationsTools: ToolDefinition[] = [
  // ADV-19: trace_transaction (Q)
  defineTool({
    logicalCapabilityId: 'ADV-19',
    registrationName: 'trace_transaction',
    riskClass: 'Q',
    description:
      'Menjejak satu transaksi bayaran sebenar: pesanan, komisen, mata kesetiaan dan pergerakan inventori berkaitan.',
    requiredRole: 'staff',
    inputSchema: {
      paymentId: { type: 'string', min: 1, max: 120 },
      reference: { type: 'string', min: 1, max: 200 },
      $oneOf: { type: 'array', items: { type: 'string' } },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const payments = allPayments(store);
      const payment = input.paymentId
        ? payments.find((candidate) => candidate.id === input.paymentId)
        : payments.find((candidate) => candidate.reference === input.reference);
      if (!payment) {
        return fail('PAYMENT_NOT_FOUND', 'Transaksi bayaran tidak ditemui.');
      }
      const order = readOrder(store, payment.orderId);
      if (order) {
        const refusal = orderAccessCode(actor, order);
        if (refusal) return fail(refusal, 'Transaksi ini di luar skop akses pemeran.');
      } else if (!actor.isStaff && !actor.isFounder) {
        return fail('FORBIDDEN', 'Transaksi ini di luar skop akses pemeran.');
      }

      const loyaltyEntries = order ? new Loyalty(store).getEntries(order.customerId) : [];
      const movements = order
        ? store
            .all<import('../../../../shared/platform-contracts').InventoryMovement>('movements')
            .filter((movement) => movement.sourceEntityId === order.id)
        : [];

      return {
        ok: true,
        payment: {
          id: payment.id,
          orderId: payment.orderId,
          amountSen: payment.amountSen,
          method: payment.method,
          reference: payment.reference,
          state: payment.state,
          confirmedBy: payment.confirmedBy,
          createdAt: payment.createdAt,
        },
        order: order
          ? {
              id: order.id,
              revision: order.revision,
              amountSen: order.amountSen,
              paidAmountSen: order.paidAmountSen,
              refundAmountSen: order.refundAmountSen,
              paymentState: order.paymentState,
              fulfilmentStatus: order.fulfilmentStatus,
            }
          : null,
        commissions: commissionsForOrder(store, payment.orderId),
        loyaltyEntries: loyaltyEntries.filter((entry) => entry.sourceOrderId === payment.orderId),
        movements,
        provenance: provenance(ctx.runtime, ctx, ['payments', 'orders', 'commission_ledger', 'loyalty_ledger'], 'payment-trace-read'),
      };
    },
  }),

  // ADV-20: export_report (C)
  defineTool({
    logicalCapabilityId: 'ADV-20',
    registrationName: 'export_report',
    riskClass: 'C',
    description:
      'Menjana laporan sebenar daripada Reports platform dan menyusun artifak yang kekal (commit) dengan hash kandungan; muat turun disahkan semula pada masa muat turun (kuota harian milik server).',
    requiredRole: 'founder',
    inputSchema: {
      /** `create` (default) builds a new artifact; `download` re-authorises an existing one. */
      operation: { type: 'string', enum: ['create', 'download'] },
      /** Artifact to download (required for `operation: 'download'`). */
      artifactId: { type: 'string', min: 1, max: 120 },
      kind: { required: true, type: 'string', enum: ['orders', 'tasks', 'expenses', 'payments', 'stock'] },
      from: { type: 'string', min: 10, max: 10 },
      to: { type: 'string', min: 10, max: 10 },
      outletId: { type: 'string', min: 1, max: 120 },
      dealerOrgId: { type: 'string', min: 1, max: 120 },
      format: { type: 'string', enum: ['csv', 'html'] },
      idempotencyKey: { type: 'string', min: 8, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const at = ctx.runtime.clock();
      const operation = (input.operation as 'create' | 'download' | undefined) ?? 'create';

      // --- Download: the authority to download is re-verified against the LIVE
      //     state (founder role, ownership, artifact kind, download window and
      //     sha256 content integrity). It is never inherited from creation.
      if (operation === 'download') {
        const artifactId = input.artifactId as string | undefined;
        if (!artifactId) {
          return fail('EXPORT_ARTIFACT_NOT_FOUND', 'artifactId diperlukan untuk memuat turun laporan.');
        }
        const artifact = store.get<ExportArtifactRecord>('report_artifacts', artifactId);
        const authorization = authorizeExportDownload({
          store,
          actor,
          artifact,
          kind: input.kind as string,
          at,
        });
        if (!authorization.allowed || !artifact) {
          return fail(
            authorization.code ?? 'EXPORT_DOWNLOAD_NOT_ALLOWED',
            authorization.detail,
          );
        }
        const downloadCount = artifact.downloadCount + 1;
        store.save('report_artifacts', { ...artifact, downloadCount, lastDownloadedAt: at });
        store.audit(ctx.actorId, 'agent.report.download', artifact.id, downloadCount);
        return {
          ok: true,
          operation: 'download',
          artifactId: artifact.id,
          filename: artifact.filename,
          format: artifact.format,
          kind: artifact.kind,
          recordCount: artifact.recordCount,
          generatedAt: artifact.generatedAt,
          contentHash: artifact.contentHash,
          contentBytes: artifact.contentBytes,
          content: artifact.content,
          downloadExpiresAt: artifact.downloadExpiresAt,
          downloadCount,
          lastDownloadedAt: at,
          authorized: true,
          mutated: true,
          persistence: 'platform_store',
          provenance: provenance(
            ctx.runtime,
            ctx,
            ['report_artifacts'],
            'export-download-authorizer',
          ),
        };
      }

      // --- Create
      const idempotencyKey = input.idempotencyKey as string | undefined;
      if (idempotencyKey) {
        const existing = store
          .all<ExportArtifactRecord>('report_artifacts')
          .find(
            (artifact) =>
              artifact.idempotencyKey === idempotencyKey && artifact.ownerId === ctx.actorId,
          );
        if (existing) {
          return {
            ok: true,
            operation: 'create',
            code: 'ALREADY_EXPORTED',
            artifactId: existing.id,
            replay: true,
            mutated: false,
            provenance: provenance(ctx.runtime, ctx, ['report_artifacts'], 'reports-builder'),
          };
        }
      }

      // Server-owned quota: the browser can neither raise nor reset it.
      const quota = checkExportQuota(store, ctx.actorId, at);
      if (!quota.allowed) {
        return fail(
          quota.code ?? 'EXPORT_QUOTA_EXCEEDED',
          `Had laporan harian tercapai (${quota.used}/${quota.limit}); seterusnya tersedia pada ${quota.resetsAt}.`,
        );
      }

      const auth = new Auth(store);
      const commerce = new Commerce(store, auth);
      const work = new Work(store, auth, commerce);
      const reports = new Reports(store, auth, commerce, work);

      const filter: Record<string, unknown> = { kind: input.kind };
      if (input.from) filter.from = input.from;
      if (input.to) filter.to = input.to;
      if (input.outletId) filter.outletId = input.outletId;
      if (input.dealerOrgId) filter.dealerOrgId = input.dealerOrgId;

      let report;
      try {
        report = reports.build(actor.principal, filter, (input.format as 'csv' | 'html' | undefined) ?? 'csv');
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code) return fail(code, (error as Error).message);
        return fail('REPORT_BUILD_FAILED', (error as Error).message);
      }

      const contentHash = createHash('sha256').update(report.content).digest('hex');
      // The id is unique per export: the daily quota counts real exports, not
      // distinct report shapes. `idempotencyKey` is the deduplication key.
      const artifactId = `rpt-${createHash('sha256')
        .update(`${ctx.actorId}|${report.filename}|${contentHash}|${at}|${randomUUID()}`)
        .digest('hex')
        .slice(0, 24)}`;
      const downloadExpiresAt = new Date(
        Date.parse(at) + EXPORT_DOWNLOAD_WINDOW_MS,
      ).toISOString();
      const artifact: ExportArtifactRecord = {
        id: artifactId,
        ownerId: ctx.actorId,
        filename: report.filename,
        format: report.format,
        kind: input.kind as string,
        recordCount: report.recordCount,
        generatedAt: report.generatedAt,
        sourceVersions: report.sourceVersions,
        metrics: report.metrics,
        metricScope: report.metricScope,
        contentHash,
        contentBytes: Buffer.byteLength(report.content, 'utf8'),
        content: report.content,
        filter,
        idempotencyKey: idempotencyKey ?? null,
        createdAt: at,
        downloadExpiresAt,
        downloadCount: 0,
        lastDownloadedAt: null,
        revision: 1,
      };
      store.save('report_artifacts', artifact);
      store.audit(ctx.actorId, 'agent.report.export', artifactId, 1);

      return {
        ok: true,
        operation: 'create',
        artifactId,
        filename: report.filename,
        format: report.format,
        kind: artifact.kind,
        recordCount: report.recordCount,
        generatedAt: report.generatedAt,
        contentHash,
        contentBytes: artifact.contentBytes,
        metrics: report.metrics,
        metricScope: report.metricScope,
        sourceVersionCount: Object.keys(report.sourceVersions).length,
        downloadExpiresAt,
        downloadCount: 0,
        exportQuota: {
          limit: quota.limit,
          usedBefore: quota.used,
          usedAfter: quota.used + 1,
          resetsAt: quota.resetsAt,
        },
        mutated: true,
        persistence: 'platform_store',
        provenance: provenance(ctx.runtime, ctx, ['report_definitions', 'report_artifacts'], 'reports-builder'),
      };
    },
  }),

  // ADV-21: triage_case (S)
  defineTool({
    logicalCapabilityId: 'ADV-21',
    registrationName: 'triage_case',
    riskClass: 'S',
    description:
      'Menyatukan kes pelanggan kepada keutamaan dan tindakan seterusnya berdasarkan status pesanan, umur kes dan bukti; remediate membuka laluan pemulihan kekal (cadangan refund / tugasan bukti / penugasan founder).',
    requiredRole: 'staff',
    inputSchema: {
      caseId: { required: true, type: 'string', min: 1, max: 120 },
      /** Opt-in: open the durable remediation path for this case. */
      remediate: { type: 'boolean' },
      /** Why the remediation is performed — recorded with the proposal. */
      remediationReason: { type: 'string', min: 3, max: 1000 },
      /** Optional staff member that may own the case (founder-only assignment). */
      assignToStaffId: { type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const record = readCase(store, input.caseId as string);
      if (!record) {
        return fail('CASE_NOT_FOUND', `Kes '${String(input.caseId)}' tidak ditemui.`);
      }
      const order = readOrder(store, record.orderId);
      if (order) {
        const refusal = orderAccessCode(actor, order);
        if (refusal) return fail(refusal, 'Kes ini di luar skop akses pemeran.');
      } else if (!actor.isStaff && !actor.isFounder) {
        return fail('FORBIDDEN', 'Kes ini di luar skop akses pemeran.');
      }
      const at = ctx.runtime.clock();
      const ageDays = daysBetween(record.createdAt, at);
      const evidenceCount = store
        .all<import('../../../../shared/platform-contracts').EvidenceRecord>('evidence')
        .filter((evidence) => evidence.entityId === record.id).length;

      let score = 0;
      const signals: string[] = [];
      if (order?.paymentState === 'refund_requested') {
        score += 3;
        signals.push('PEMULANGAN_WANG_DIPINTA');
      }
      if (order?.fulfilmentStatus === 'cancelled') {
        score += 3;
        signals.push('PESANAN_DIBATALKAN');
      }
      if (order?.paymentState === 'pending' && order.paidAmountSen === 0) {
        score += 2;
        signals.push('BAYARAN_BELUM_MASUK');
      }
      if (ageDays >= 7) {
        score += 3;
        signals.push('KES_UMUR_LEBIH_7_HARI');
      } else if (ageDays >= 3) {
        score += 2;
        signals.push('KES_UMUR_LEBIH_3_HARI');
      }
      if (record.status === 'open') {
        score += 1;
        signals.push('KES_MASIH_OPEN');
      }
      if (evidenceCount === 0) {
        score += 1;
        signals.push('TIADA_BUKTI_DILAMPirkan');
      }

      const priority = score >= 7 ? 'critical' : score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';
      const nextActions: string[] = [];
      if (order?.paymentState === 'refund_requested') nextActions.push('Semak permintaan refund dan hantar ADV-07 preview_refund untuk kelulusan.');
      if (order?.fulfilmentStatus === 'cancelled') nextActions.push('Sahkan sama ada pulangan wang diperlukan melalui ADV-07 preview_refund.');
      if (evidenceCount === 0) nextActions.push('Minta bukti daripada pelanggan sebelum keputusan.');
      if (record.status === 'open') nextActions.push('Tetapkan-owner kes dan kemas kini status kes.');
      if (!nextActions.length) nextActions.push('Tiada tindakan tambahan; sahkan determination kes.');

      const remediate = input.remediate === true;
      const remediationReason =
        (input.remediationReason as string | undefined) ?? 'Triage kes oleh operator';

      let remediation: CaseRemediationResult | null = null;
      if (remediate) {
        // The approval store is the canonical ledger of pending work, so a
        // second remediation never creates a duplicate proposal for a scope.
        const existingProposals = ctx.runtime.approvalService
          .listProposals()
          .map((proposal) => ({
            id: proposal.id,
            scope: proposal.scope,
            status: proposal.status,
          }));
        remediation = remediateCase({
          store,
          actor,
          record,
          order,
          evidenceCount,
          at,
          reason: remediationReason,
          createProposal: (proposal) => ctx.runtime.approvalService.createProposal(proposal),
          existingProposals,
          assignToStaffId: (input.assignToStaffId as string | undefined) ?? null,
        });
      }

      return {
        ok: true,
        caseId: record.id,
        subject: record.subject,
        status: record.status,
        orderId: record.orderId,
        orderPaymentState: order?.paymentState ?? null,
        orderFulfilmentStatus: order?.fulfilmentStatus ?? null,
        ageDays,
        evidenceCount,
        priority,
        priorityScore: score,
        signals,
        nextActions,
        remediate,
        remediationReason: remediation ? remediationReason : null,
        remediationOutcomes: remediation ? remediation.outcomes : [],
        mutated: remediation ? remediation.mutated : false,
        provenance: provenance(
          ctx.runtime,
          ctx,
          ['cases', 'orders', 'evidence'],
          remediation ? 'case-remediation-engine' : 'case-triage-evaluator',
        ),
      };
    },
  }),

  // ADV-22: plan_consignment (S)
  defineTool({
    logicalCapabilityId: 'ADV-22',
    registrationName: 'plan_consignment',
    riskClass: 'S',
    description:
      'Menyusun pelan konsainan daripada rekod restock, terma dealer, jualan susut dan bayaran settlement (tanpa mutate).',
    requiredRole: 'staff',
    inputSchema: {
      restockId: { type: 'string', min: 1, max: 120 },
      dealerOrgId: { type: 'string', min: 1, max: 120 },
      $oneOf: { type: 'array', items: { type: 'string' } },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const restock = input.restockId
        ? readRestock(store, input.restockId as string)
        : store
            .all<RestockRecord>('restocks')
            .find((candidate) => candidate.dealerOrgId === input.dealerOrgId);
      if (!restock) {
        return fail('RESTOCK_NOT_FOUND', 'Tiada rekod restock untuk skop yang diminta.');
      }
      const refusal = dealerAccessCode(actor, restock.dealerOrgId);
      if (refusal) return fail(refusal, 'Rekod konsainan ini di luar skop akses pemeran.');

      const settings = store.get<BusinessSettings>('settings', 'business');
      const terms = settings?.approvedPolicies.dealer ?? null;
      const settlements = dealerSettlements(store).filter((settlement) => settlement.restockId === restock.id);
      const settlementPayments = dealerSettlementPayments(store).filter((payment) =>
        settlements.some((settlement) => settlement.id === payment.settlementId),
      );
      const returns = dealerReturns(store).filter((entry) => entry.restockId === restock.id);
      const soldThroughSen = store
        .all<import('../../../../shared/dealer-contracts').DealerLedgerEntry>('dealer_ledger')
        .filter((entry) => entry.restockId === restock.id && entry.kind === 'sell_through')
        .reduce((sum, entry) => sum + entry.amountSen, 0);
      const settledSen = settlementPayments.reduce((sum, payment) => sum + payment.amountSen, 0);

      return {
        ok: true,
        restockId: restock.id,
        dealerOrgId: restock.dealerOrgId,
        status: restock.status,
        ownership: restock.ownership,
        isConsignment: restock.ownership === 'consigned',
        totalSen: restock.totalSen,
        soldThroughSen,
        settledSen,
        outstandingSen: Math.max(0, soldThroughSen - settledSen),
        settlementCount: settlements.length,
        returnCount: returns.length,
        lineCount: restock.lines.length,
        returnRules: terms?.returnRules ?? null,
        dealerTermsVersion: terms?.version ?? null,
        nextActions:
          restock.ownership !== 'consigned'
            ? ['Rekod ini bukan konsainan; gunakan ADV-10 plan_restock untuk pelan replenish.']
            : settledSen < soldThroughSen
              ? ['Rekod bayaran settlement untuk jualan susut yang belum dijelaskan.']
              : ['Semua jualan susut telah dijelaskan; semak pemulangan jika ada.'],
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['restocks', 'dealer_ledger', 'dealer_settlements', 'dealer_settlement_payments', 'dealer_returns'], 'consignment-evaluator'),
      };
    },
  }),

  // ADV-23: draft_customer_reply (D)
  defineTool({
    logicalCapabilityId: 'ADV-23',
    registrationName: 'draft_customer_reply',
    riskClass: 'D',
    description:
      'Menyediakan draf maklum balas pelanggan daripada fakta kes dan pesanan sebenar. Penghantaran memerlukan rekod kebenaran hantar keluar yang sah; tanpa kebenaran, draf hanya disimpan sebagai cadangan.',
    requiredRole: 'staff',
    inputSchema: {
      caseId: { required: true, type: 'string', min: 1, max: 120 },
      body: { type: 'string', min: 1, max: 4000 },
      intent: { type: 'string', min: 1, max: 120 },
      /** Opt-in: actually deliver the reply in-app (requires a valid consent record). */
      send: { type: 'boolean' },
      /** Outbound channel. The platform only ever delivers in-app messages. */
      channel: { type: 'string', enum: ['in_app'] },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const record = readCase(store, input.caseId as string);
      if (!record) {
        return fail('CASE_NOT_FOUND', `Kes '${String(input.caseId)}' tidak ditemui.`);
      }
      const order = readOrder(store, record.orderId);
      if (order) {
        const refusal = orderAccessCode(actor, order);
        if (refusal) return fail(refusal, 'Kes ini di luar skop akses pemeran.');
      } else if (!actor.isStaff && !actor.isFounder) {
        return fail('FORBIDDEN', 'Kes ini di luar skop akses pemeran.');
      }

      const at = ctx.runtime.clock();
      const channel = (input.channel as OutboundChannel | undefined) ?? 'in_app';
      const send = input.send === true;

      // The consent record is the only source of truth. An `unrecorded` consent
      // is NOT consent: the send is refused with a machine-readable code.
      const consent = resolveOutboundConsent(store, record.customerId, channel, at);
      if (send && !consent.granted) {
        return fail(
          'OUTBOUND_CONSENT_NOT_GRANTED',
          `Penghantaran ke pelanggan ${record.customerId} ditolak: ${consent.detail}`,
          consent.code,
        );
      }

      const facts = [
        `Kes: ${record.subject} (${record.status}).`,
        order ? `Pesanan ${order.id}: status bayaran ${order.paymentState}, penghantaran ${order.fulfilmentStatus}.` : null,
        order ? `Jumlah bayaran disahkan: ${order.paidAmountSen} sen; dipulangkan: ${order.refundAmountSen} sen.` : null,
      ].filter((line): line is string => Boolean(line));
      const body =
        (input.body as string | undefined) ??
        `Salam, kami sedang menyemak kes "${record.subject}". Status semasa: ${record.status}.${
          order ? ` Bayaran pesanan ${order.id} berstatus ${order.paymentState}.` : ''
        } Kami akan maklumkan perkembangan seterusnya.`;

      // --- Delivery: a real in-app CaseMessage, written only with consent.
      let delivered = false;
      let messageId: string | null = null;
      if (send) {
        const auth = new Auth(store);
        const commerce = new Commerce(store, auth);
        const work = new Work(store, auth, commerce);
        try {
          const message = work.reply(actor.principal, record.id, {
            expectedRevision: record.revision,
            body,
          });
          delivered = true;
          messageId = message.id;
        } catch (error) {
          const code = (error as { code?: string }).code ?? 'DELIVERY_FAILED';
          return fail(
            code,
            `Draf tidak boleh dihantar: ${error instanceof Error ? error.message : 'ralat tidak diketahui.'}`,
          );
        }
      }

      // A delivered reply is already a durable canonical message: no separate
      // draft proposal is created for it.
      let draftId: string | null = null;
      if (!send) {
        const proposal = ctx.runtime.approvalService.createProposal({
          kind: 'message.draft',
          scope: `case:${record.id}#reply`,
          payload: {
            caseId: record.id,
            orderId: record.orderId,
            body,
            intent: input.intent ?? 'status_update',
            facts,
          },
          amountSen: 0,
          proposedBy: ctx.actorId,
          proposerRole: ctx.role,
          sourceRefs: [`cases:${record.id}@${record.revision}`],
        });
        draftId = proposal.id;
      }

      return {
        ok: true,
        draftId,
        caseId: record.id,
        orderId: record.orderId,
        body,
        intent: input.intent ?? 'status_update',
        facts,
        channel,
        send,
        delivered,
        messageId,
        consent: {
          granted: consent.granted,
          status: consent.status,
          code: consent.code,
          consentId: consent.consentId,
          detail: consent.detail,
        },
        mutated: delivered,
        authoritativeStateMutated: delivered,
        persistence: ctx.runtime.approvalStore.persistence,
        provenance: provenance(
          ctx.runtime,
          ctx,
          send ? [`cases:${record.id}@${record.revision}`, 'messages'] : [`cases:${record.id}@${record.revision}`],
          send ? 'outbound-consent-guard+case-reply' : 'proposal-store-write',
        ),
      };
    },
  }),

  // ADV-24: build_action_plan (S)
  defineTool({
    logicalCapabilityId: 'ADV-24',
    registrationName: 'build_action_plan',
    riskClass: 'S',
    description:
      'Menyusun pelan tindakan berurutan daripada keadaan sebenar; setiap langkah hanya ditawarkan jika pemeran memegang kebenaran keupayaan itu, langkah lain dilaporkan sebagai dilangkau.',
    requiredRole: 'staff',
    inputSchema: {
      objective: { required: true, type: 'string', min: 3, max: 500 },
      entityId: { type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const at = ctx.runtime.clock();
      const objective = input.objective as string;
      const entityId = input.entityId as string | undefined;
      const catalogue = ctx.catalog(ctx.role);
      const byName = new Map(catalogue.map((entry) => [entry.registrationName, entry]));
      const steps: Array<Record<string, unknown>> = [];
      const omittedSteps: Array<Record<string, unknown>> = [];
      const facts: string[] = [];
      const sources: string[] = [];

      let order: OrderRecord | null = null;
      if (entityId) {
        order = readOrder(store, entityId);
        if (order) {
          const refusal = orderAccessCode(actor, order);
          if (refusal) return fail(refusal, 'Rekod ini di luar skop akses pemeran.');
          facts.push(`Pesanan ${order.id}: bayaran ${order.paymentState}, penghantaran ${order.fulfilmentStatus}, baki ${order.amountSen - order.paidAmountSen} sen.`);
          sources.push('orders');
        }
      }

      const grantScope = { entityId: entityId ?? null, outletId: order?.outletId ?? null };

      /**
       * A step is only offered when the actor really holds the grant. A step
       * that is withheld is REPORTED (never silently dropped) with the grant
       * reason code.
       */
      const push = (name: string, why: string): void => {
        const capability = byName.get(name);
        if (!capability) return;
        const grant = resolveCapabilityGrant(
          store,
          actor,
          capability.logicalCapabilityId,
          grantScope,
          at,
        );
        if (!grant.held) {
          omittedSteps.push({
            capabilityId: capability.logicalCapabilityId,
            capability: capability.registrationName,
            riskClass: capability.riskClass,
            why,
            reasonCode: grant.code,
            detail: grant.detail,
            grantId: grant.grantId,
            grantScope: grant.scope,
          });
          return;
        }
        steps.push({
          step: steps.length + 1,
          capabilityId: capability.logicalCapabilityId,
          capability: capability.registrationName,
          riskClass: capability.riskClass,
          why,
          grantCode: grant.code,
          grantId: grant.grantId,
        });
      };

      if (order) {
        if (order.paymentState === 'pending') {
          push('diagnose_checkout', 'Bayaran belum disahkan; diagnos stok dan status pesanan dahulu.');
        }
        if (order.paidAmountSen > order.refundAmountSen) {
          push('preview_refund', 'Terdapat baki dibayar yang boleh dipulangkan jika objektif berkaitan wang.');
        }
        push('reconcile_payments', 'Sahkan lejar bayaran selepas sebarang tindakan kewangan.');
        push('build_context_bundle', 'Kumpul konteks penuh sebelum sebarang keputusan refund atau kes.');
      } else {
        push('search_records', 'Cari rekod kanonik yang berkaitan dengan objektif sebelum tindakan.');
        push('build_context_bundle', 'Bina pakej konteks untuk rekod yang ditemui.');
      }
      push('build_action_plan', 'Semak semula pelan selepas setiap langkah untuk pengesahan keadaan terkini.');

      const omittedReasonCodes = [...new Set(omittedSteps.map((step) => step.reasonCode as string))].sort();

      return {
        ok: true,
        objective,
        entityId: entityId ?? null,
        facts,
        stepCount: steps.length,
        steps,
        omittedStepCount: omittedSteps.length,
        omittedSteps,
        omittedStepReasonCodes: omittedReasonCodes,
        omittedStepReasonCode: omittedReasonCodes.length === 1 ? omittedReasonCodes[0] : null,
        availableCapabilityCount: catalogue.length,
        executed: false,
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, sources.length ? sources : ['registry:live'], 'plan-composer'),
      };
    },
  }),
];

