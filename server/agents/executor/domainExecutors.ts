/**
 * AbangColek Sovereign GrowthOS — Universal Domain Executors (CPK-06)
 *
 * Store-backed executors for approved proposal action families:
 *   - inventory.quarantine (ADV-12 propose_quarantine)
 *   - task.create          (ADV-30 propose_task)
 *   - campaign.draft       (ADV-32 draft_campaign)
 *   - message.draft        (ADV-23 draft_customer_reply)
 *
 * Unknown/unregistered action families continue to fail closed with
 * EXECUTOR_UNAVAILABLE in ExecutorRegistry.
 */

import type {
  OutboundChannel,
  OutboundConsentDecision,
  OutboundConsentRecord,
} from '../../../shared/adv-contracts';
import type {
  CampaignRecord,
  CaseMessage,
  CaseRecord,
  InventoryMovement,
  StockLot,
  TaskRecord,
} from '../../../shared/platform-contracts';
import { evaluateMarginContribution, type MarginSimulationInput } from '../../platform/marginGuardian';
import type { PlatformStore } from '../../platform/store';
import { RefundExecutor } from './refund';
import type { ExecutorRegistry } from './registry';
import type { Executor, ExecutorContext, ExecutorResult } from './types';

const readCatalogueVersion = (store: PlatformStore): number =>
  Number(store.metadata('catalogue_version') ?? '0');

const checkOutboundConsent = (
  store: PlatformStore,
  customerId: string,
  channel: OutboundChannel,
  at: string,
): OutboundConsentDecision => {
  const records = store
    .all<OutboundConsentRecord>('outbound_consents')
    .filter((entry) => entry.customerId === customerId && entry.channel === channel)
    .sort((left, right) => right.grantedAt.localeCompare(left.grantedAt));
  const record = records[0];
  if (!record) {
    return {
      granted: false,
      status: 'unrecorded',
      code: 'OUTBOUND_CONSENT_UNRECORDED',
      channel,
      consentId: null,
      detail: `Tiada rekod kebenaran hantar keluar untuk pelanggan ${customerId}.`,
    };
  }
  if (record.status === 'revoked') {
    return {
      granted: false,
      status: 'revoked',
      code: 'OUTBOUND_CONSENT_REVOKED',
      channel,
      consentId: record.id,
      detail: `Kebenaran hantar keluar telah dicabut (${record.id}).`,
    };
  }
  if (record.expiresAt && record.expiresAt <= at) {
    return {
      granted: false,
      status: 'expired',
      code: 'OUTBOUND_CONSENT_EXPIRED',
      channel,
      consentId: record.id,
      detail: `Kebenaran hantar keluar telah luput tempoh (${record.expiresAt}).`,
    };
  }
  return {
    granted: true,
    status: 'granted',
    code: 'OUTBOUND_CONSENT_GRANTED',
    channel,
    consentId: record.id,
    detail: `Kebenaran hantar keluar sah (${record.id}).`,
  };
};

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export class QuarantineExecutor implements Executor {
  readonly actionType = 'inventory.quarantine';

  async execute(payload: Record<string, unknown>, context: ExecutorContext): Promise<ExecutorResult> {
    if (!context.store) {
      return {
        ok: false,
        code: 'EXECUTOR_UNAVAILABLE',
        message: 'Stor platform tidak disambungkan; kuarantin lot tidak boleh dilaksanakan.',
      };
    }

    if (payload.simulateIndeterminateOutcome === true) {
      return {
        ok: false,
        code: 'EXECUTION_OUTCOME_UNKNOWN',
        message: 'Status penguncian kuarantin fizikal tidak dapat disahkan semasa gangguan pengangkutan.',
      };
    }

    const lotId = asString(payload.lotId);
    const proposalId = asString(payload.proposalId);
    const reason = asString(payload.reason) ?? 'Lot dikuarantin melalui kelulusan HITL';
    if (!lotId || !proposalId) {
      return {
        ok: false,
        code: 'INVALID_QUARANTINE_PAYLOAD',
        message: 'Payload kuarantin memerlukan lotId dan proposalId yang sah.',
      };
    }

    const lot = context.store.get<StockLot>('lots', lotId);
    if (!lot) {
      return { ok: false, code: 'LOT_NOT_FOUND', message: `Lot '${lotId}' tidak ditemui.` };
    }

    const expectedRevision =
      typeof payload.expectedRevision === 'number' && Number.isSafeInteger(payload.expectedRevision)
        ? payload.expectedRevision
        : null;
    if (expectedRevision !== null && lot.revision !== expectedRevision && lot.status !== 'quarantine') {
      return {
        ok: false,
        code: 'CAS_CONFLICT',
        message: `Versi lot '${lotId}' telah berubah (${lot.revision} != ${expectedRevision}).`,
      };
    }

    const operationKey = `quarantine-${proposalId}`;
    const existingMovements = context.store
      .all<InventoryMovement>('movements')
      .filter((m) => m.operationKey === operationKey);
    if (existingMovements.length > 0 && lot.status === 'quarantine') {
      return {
        ok: true,
        data: {
          lotId: lot.id,
          productId: lot.productId,
          locationId: lot.locationId,
          previousStatus: payload.currentStatus ?? 'available',
          status: lot.status,
          revision: lot.revision,
          movementId: existingMovements[0].id,
          reason,
          replay: true,
        },
      };
    }

    const updatedLot: StockLot = {
      ...lot,
      status: 'quarantine',
      revision: lot.revision + 1,
    };
    const movement: InventoryMovement = {
      id: `mov-quarantine-${proposalId}`,
      productId: lot.productId,
      ownerId: lot.ownerId,
      locationId: lot.locationId,
      quantityDelta: 0,
      operationKey,
      sourceEntityId: lot.id,
      createdAt: context.at,
    };
    context.store.save('lots', updatedLot);
    context.store.save('movements', movement);

    return {
      ok: true,
      data: {
        lotId: updatedLot.id,
        productId: updatedLot.productId,
        locationId: updatedLot.locationId,
        previousStatus: lot.status,
        status: updatedLot.status,
        revision: updatedLot.revision,
        movementId: movement.id,
        reason,
        replay: false,
      },
    };
  }
}

export class TaskCreateExecutor implements Executor {
  readonly actionType = 'task.create';

  async execute(payload: Record<string, unknown>, context: ExecutorContext): Promise<ExecutorResult> {
    if (!context.store) {
      return {
        ok: false,
        code: 'EXECUTOR_UNAVAILABLE',
        message: 'Stor platform tidak disambungkan; task tidak boleh dicipta.',
      };
    }

    const entityId = asString(payload.entityId);
    const title = asString(payload.title);
    const proposalId = asString(payload.proposalId);
    if (!entityId || !title || !proposalId) {
      return {
        ok: false,
        code: 'INVALID_TASK_PAYLOAD',
        message: 'Payload task memerlukan entityId, title dan proposalId yang sah.',
      };
    }

    const taskId = `task-${proposalId}`;
    const existing = context.store.get<TaskRecord>('tasks', taskId);
    if (existing) {
      return {
        ok: true,
        data: {
          taskId: existing.id,
          entityId: existing.entityId,
          title: existing.title,
          assigneeId: existing.assigneeId,
          status: existing.status,
          revision: existing.revision,
          replay: true,
        },
      };
    }

    const assigneeId = asString(payload.assigneeId) ?? context.actorId;
    const dueAt = asString(payload.dueAt) ?? undefined;
    const outletId = asString(payload.outletId) ?? undefined;
    const task: TaskRecord = {
      id: taskId,
      entityId,
      title,
      assigneeId,
      ...(dueAt ? { dueAt } : {}),
      ...(outletId ? { outletId } : {}),
      documentIds: Array.isArray(payload.documentIds)
        ? payload.documentIds.filter((item): item is string => typeof item === 'string')
        : [],
      ownerId: context.actorId,
      status: 'open',
      revision: 1,
      createdAt: context.at,
    };
    context.store.save('tasks', task);

    return {
      ok: true,
      data: {
        taskId: task.id,
        entityId: task.entityId,
        title: task.title,
        assigneeId: task.assigneeId,
        status: task.status,
        revision: task.revision,
        replay: false,
      },
    };
  }
}

export class CampaignDraftExecutor implements Executor {
  readonly actionType = 'campaign.draft';

  async execute(payload: Record<string, unknown>, context: ExecutorContext): Promise<ExecutorResult> {
    if (!context.store) {
      return {
        ok: false,
        code: 'EXECUTOR_UNAVAILABLE',
        message: 'Stor platform tidak disambungkan; kempen tidak boleh diluluskan.',
      };
    }

    const title = asString(payload.title);
    const objective = asString(payload.objective);
    const proposalId = asString(payload.proposalId);
    if (!title || !objective || !proposalId) {
      return {
        ok: false,
        code: 'INVALID_CAMPAIGN_PAYLOAD',
        message: 'Payload kempen memerlukan title, objective dan proposalId yang sah.',
      };
    }

    const campaignId = `cmp-${proposalId}`;
    const existing = context.store.get<CampaignRecord>('campaigns', campaignId);
    if (existing) {
      return {
        ok: true,
        data: {
          campaignId: existing.id,
          title: existing.title,
          status: existing.status,
          revision: existing.revision,
          replay: true,
        },
      };
    }

    const rawSim = payload.marginSimulation as Partial<MarginSimulationInput> | null | undefined;
    let marginSimulation: MarginSimulationInput | undefined;
    let marginResult = payload.marginResult as CampaignRecord['marginResult'] | undefined;
    if (rawSim && typeof rawSim.netSalesExTaxSen === 'number' && typeof rawSim.cogsSen === 'number') {
      marginSimulation = {
        netSalesExTaxSen: rawSim.netSalesExTaxSen,
        cogsSen: rawSim.cogsSen,
        packagingSen: rawSim.packagingSen ?? 0,
        paymentFeesSen: rawSim.paymentFeesSen ?? 0,
        fulfilmentVariableCostSen: rawSim.fulfilmentVariableCostSen ?? 0,
        deliverySubsidySen: rawSim.deliverySubsidySen ?? 0,
        agentCommissionSen: rawSim.agentCommissionSen ?? 0,
        rewardCostSen: rawSim.rewardCostSen ?? 0,
        expectedReturnLossSen: rawSim.expectedReturnLossSen ?? 0,
        minimumContributionSen: rawSim.minimumContributionSen ?? 0,
        minimumContributionMarginPct: rawSim.minimumContributionMarginPct ?? 25,
      };
      marginResult = evaluateMarginContribution(marginSimulation);
      if (!marginResult.allowed) {
        return {
          ok: false,
          code: marginResult.reasonCode,
          message: `Margin Guardian menolak kempen (${marginResult.reasonCode}).`,
        };
      }
    }

    const productIds = Array.isArray(payload.productIds)
      ? payload.productIds.filter((item): item is string => typeof item === 'string')
      : [];
    const campaign: CampaignRecord = {
      id: campaignId,
      title,
      objective,
      copy: asString(payload.copy) ?? '',
      status: 'approved',
      ownerId: context.actorId,
      revision: 1,
      assets: [],
      productIds,
      catalogueVersion: readCatalogueVersion(context.store),
      approvedBy: context.actorId,
      createdAt: context.at,
      ...(marginSimulation ? { marginSimulation } : {}),
      ...(marginResult ? { marginResult } : {}),
    };
    context.store.save('campaigns', campaign);

    return {
      ok: true,
      data: {
        campaignId: campaign.id,
        title: campaign.title,
        status: campaign.status,
        revision: campaign.revision,
        replay: false,
      },
    };
  }
}

export class MessageDraftExecutor implements Executor {
  readonly actionType = 'message.draft';

  async execute(payload: Record<string, unknown>, context: ExecutorContext): Promise<ExecutorResult> {
    if (!context.store) {
      return {
        ok: false,
        code: 'EXECUTOR_UNAVAILABLE',
        message: 'Stor platform tidak disambungkan; mesej kes tidak boleh dihantar.',
      };
    }

    const caseId = asString(payload.caseId);
    const body = asString(payload.body);
    const proposalId = asString(payload.proposalId);
    if (!caseId || !body || !proposalId) {
      return {
        ok: false,
        code: 'INVALID_MESSAGE_PAYLOAD',
        message: 'Payload mesej memerlukan caseId, body dan proposalId yang sah.',
      };
    }

    const caseRecord = context.store.get<CaseRecord>('cases', caseId);
    if (!caseRecord) {
      return { ok: false, code: 'CASE_NOT_FOUND', message: `Kes '${caseId}' tidak ditemui.` };
    }

    const consent = checkOutboundConsent(context.store, caseRecord.customerId, 'in_app', context.at);
    if (!consent.granted) {
      return {
        ok: false,
        code: 'OUTBOUND_CONSENT_NOT_GRANTED',
        message: `Penghantaran ke pelanggan ${caseRecord.customerId} ditolak: ${consent.detail}`,
      };
    }

    const messageId = `msg-${proposalId}`;
    const existing = context.store.get<CaseMessage>('case_messages', messageId);
    if (existing) {
      return {
        ok: true,
        data: {
          messageId: existing.id,
          caseId: existing.caseId,
          channel: existing.channel,
          replay: true,
        },
      };
    }

    const message: CaseMessage = {
      id: messageId,
      caseId: caseRecord.id,
      authorId: context.actorId,
      body,
      createdAt: context.at,
      channel: 'in_app',
    };
    context.store.save('case_messages', message);

    return {
      ok: true,
      data: {
        messageId: message.id,
        caseId: message.caseId,
        channel: message.channel,
        replay: false,
      },
    };
  }
}

export function registerDefaultExecutors(registry: ExecutorRegistry): ExecutorRegistry {
  const defaults: Executor[] = [
    new RefundExecutor(),
    new QuarantineExecutor(),
    new TaskCreateExecutor(),
    new CampaignDraftExecutor(),
    new MessageDraftExecutor(),
  ];
  for (const executor of defaults) {
    if (!registry.has(executor.actionType)) {
      registry.register(executor);
    }
  }
  return registry;
}
