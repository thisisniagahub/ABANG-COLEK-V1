import React from 'react';
import {
  validateA2UIComponent,
  type A2UIComponentName,
} from '../../../../shared/copilot-contracts';
import type { DealerCommissionSummary } from '../../../../shared/growth-contracts';
import { CommissionSummaryCard } from '../cards/CommissionSummaryCard';
import { JevAssessmentCard } from '../cards/JevAssessmentCard';
import { MarginSummaryCard } from '../cards/MarginSummaryCard';
import { OrderSummaryCard } from '../cards/OrderSummaryCard';
import { OperationsBriefApp, OPERATIONS_BRIEF_READ_ONLY_NOTICE, parseOperationsBrief } from '../mcp-apps/OperationsBriefApp';

type ProvenanceSource = 'local_authoritative' | 'canonical_evaluator' | 'jev_local_rules' | 'database';
type A2UIActionType = 'approve' | 'reject' | 'navigate' | 'recheck';

interface FixedA2UIAction {
  id: string;
  label: string;
  actionType: A2UIActionType;
  payload?: Record<string, unknown>;
}

interface FixedA2UIEnvelope {
  schemaVersion: 'a2ui.v1';
  component: A2UIComponentName;
  props: Record<string, unknown>;
  provenance: {
    source: ProvenanceSource;
    timestamp: string;
    revision?: string | number;
  };
  actions: FixedA2UIAction[];
}

export type A2UIParseResult =
  | { ok: true; value: FixedA2UIEnvelope }
  | { ok: false; reason: 'malformed' | 'unknown-component' | 'oversized' };

const MAX_BYTES = 16_384;
const MAX_DEPTH = 8;
const MAX_NODES = 256;
const MAX_ARRAY_ITEMS = 32;
const MAX_OBJECT_KEYS = 40;
const MAX_STRING_LENGTH = 2_048;
const sources = new Set<ProvenanceSource>([
  'local_authoritative',
  'canonical_evaluator',
  'jev_local_rules',
  'database',
]);
const actionTypes = new Set<A2UIActionType>(['approve', 'reject', 'navigate', 'recheck']);
const jevIssueClasses = ['LEAKAGE', 'CAP_DEFECT', 'TASTE_ANOMALY', 'LABEL_MISPRINT'] as const;
const jevRootCauses = [
  'UNDETERMINED',
  'SUPPLIER_BATCH_CONTAMINATION',
  'PACKAGING_CRIMP_FAILURE',
] as const;
const marginStatuses = [
  'PASSED',
  'INSUFFICIENT_CASH_MARGIN',
  'INSUFFICIENT_PERCENT_MARGIN',
] as const;
const trackingStages = ['draft', 'accepted', 'packing', 'dispatched', 'received'] as const;
const jevEvaluationStates = ['reviewed', 'pending_quarantine'] as const;
const commissionAmountKeys = [
  'totalEarnedSen',
  'pendingSen',
  'eligibleSen',
  'approvedSen',
  'paidSen',
  'reversedContraSen',
  'netPayableSen',
  'unsettledDeficitSen',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function safeJson(value: unknown): boolean {
  let nodes = 0;
  const visit = (current: unknown, depth: number): boolean => {
    nodes += 1;
    if (nodes > MAX_NODES || depth > MAX_DEPTH) return false;
    if (current === null || typeof current === 'boolean') return true;
    if (typeof current === 'string') return current.length <= MAX_STRING_LENGTH;
    if (typeof current === 'number') return Number.isFinite(current);
    if (Array.isArray(current)) {
      return current.length <= MAX_ARRAY_ITEMS
        && current.every((item) => visit(item, depth + 1));
    }
    if (!isRecord(current) || Object.keys(current).length > MAX_OBJECT_KEYS) return false;
    return Object.entries(current).every(([key, item]) =>
      key !== '__proto__'
      && key !== 'prototype'
      && key !== 'constructor'
      && key.length <= 100
      && visit(item, depth + 1));
  };
  return visit(value, 0);
}

function validRevision(value: unknown): value is string | number {
  return (typeof value === 'string' && value.trim().length > 0 && value.length <= 100)
    || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

function parseAction(value: unknown): FixedA2UIAction | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  const payload = value.payload;
  if (keys.some((key) => !['id', 'label', 'actionType', 'payload'].includes(key))) return null;
  if (
    typeof value.id !== 'string'
    || value.id.trim().length === 0
    || value.id.length > 100
    || typeof value.label !== 'string'
    || value.label.trim().length === 0
    || value.label.length > 120
    || typeof value.actionType !== 'string'
    || !actionTypes.has(value.actionType as A2UIActionType)
    || (payload !== undefined && !isRecord(payload))
  ) return null;
  return {
    id: value.id,
    label: value.label,
    actionType: value.actionType as A2UIActionType,
    ...(isRecord(payload) ? { payload } : {}),
  };
}

export function parseA2UIFixedSchema(input: unknown): A2UIParseResult {
  if (!safeJson(input)) {
    const serialized = (() => {
      try {
        return JSON.stringify(input);
      } catch {
        return undefined;
      }
    })();
    return serialized && new TextEncoder().encode(serialized).byteLength > MAX_BYTES
      ? { ok: false, reason: 'oversized' }
      : { ok: false, reason: 'malformed' };
  }

  const serialized = (() => {
    try {
      return JSON.stringify(input);
    } catch {
      return undefined;
    }
  })();
  if (!serialized) return { ok: false, reason: 'malformed' };
  if (new TextEncoder().encode(serialized).byteLength > MAX_BYTES) {
    return { ok: false, reason: 'oversized' };
  }
  if (!isRecord(input)) return { ok: false, reason: 'malformed' };
  const component = input.component ?? input.componentName;
  if (typeof component === 'string' && !validateA2UIComponent(component)) {
    return { ok: false, reason: 'unknown-component' };
  }
  if (Object.keys(input).some((key) =>
    !['schemaVersion', 'component', 'componentName', 'props', 'provenance', 'actions'].includes(key))) {
    return { ok: false, reason: 'malformed' };
  }
  const props = input.props;
  const provenance = input.provenance;
  const rawActions = input.actions;
  if (
    input.schemaVersion !== 'a2ui.v1'
    || typeof component !== 'string'
    || !validateA2UIComponent(component)
    || !isRecord(props)
    || !isRecord(provenance)
    || Object.keys(provenance).some((key) => !['source', 'timestamp', 'revision'].includes(key))
    || typeof provenance.source !== 'string'
    || !sources.has(provenance.source as ProvenanceSource)
    || typeof provenance.timestamp !== 'string'
    || !Number.isFinite(Date.parse(provenance.timestamp))
    || (provenance.revision !== undefined && !validRevision(provenance.revision))
    || (rawActions !== undefined && (!Array.isArray(rawActions) || rawActions.length > 5))
  ) return { ok: false, reason: 'malformed' };

  const actions: FixedA2UIAction[] = [];
  if (rawActions !== undefined) {
    if (!Array.isArray(rawActions) || rawActions.length > 5) {
      return { ok: false, reason: 'malformed' };
    }
    for (const rawAction of rawActions) {
      const action = parseAction(rawAction);
      if (!action) return { ok: false, reason: 'malformed' };
      actions.push(action);
    }
  }

  return {
    ok: true,
    value: {
      schemaVersion: 'a2ui.v1',
      component,
      props,
      provenance: {
        source: provenance.source as ProvenanceSource,
        timestamp: provenance.timestamp,
        ...(provenance.revision !== undefined
          ? { revision: provenance.revision as string | number }
          : {}),
      },
      actions,
    },
  };
}

function isAllowedProps(props: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(props).every((key) => allowed.includes(key));
}

function safeLabel<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** A null confidence is an explicit "no calibrated model" state; a number is only kept inside 0..1. */
function safeConfidence(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) return value;
  return undefined;
}

function isCommissionSummary(value: unknown): value is DealerCommissionSummary {
  return isRecord(value)
    && typeof value.dealerOrgId === 'string'
    && value.dealerOrgId.trim().length > 0
    && commissionAmountKeys.every((key) => safeInteger(value[key]));
}

interface TrackingProps {
  orderId: string;
  stage: 'draft' | 'accepted' | 'packing' | 'dispatched' | 'received';
  trackingTokenRedactedHash: string;
  expiryDaysRemaining: number;
}

function isTrackingProps(props: Record<string, unknown>): props is Record<string, unknown> & TrackingProps {
  return isAllowedProps(props, [
    'orderId',
    'stage',
    'trackingTokenRedactedHash',
    'expiryDaysRemaining',
  ])
    && typeof props.orderId === 'string'
    && props.orderId.trim().length > 0
    && safeLabel(props.stage, trackingStages)
    && typeof props.trackingTokenRedactedHash === 'string'
    && props.trackingTokenRedactedHash.trim().length > 0
    && safeInteger(props.expiryDaysRemaining)
    && props.expiryDaysRemaining >= 0;
}

function sourceProps(envelope: FixedA2UIEnvelope) {
  return {
    source: envelope.provenance.source,
    revision: envelope.provenance.revision ?? envelope.provenance.timestamp,
  };
}

function TrackingProjection({ envelope }: { envelope: FixedA2UIEnvelope }) {
  const props = envelope.props;
  if (!isTrackingProps(props)) {
    return <OrderSummaryCard projectionState="insufficient-data" {...sourceProps(envelope)} />;
  }

  return (
    <article className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]">
      <h3 className="text-sm font-semibold">Order tracking</h3>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div><dt className="text-xs text-[var(--ui-muted)]">Order</dt><dd className="break-all text-sm">{props.orderId}</dd></div>
        <div><dt className="text-xs text-[var(--ui-muted)]">Stage</dt><dd className="text-sm">{props.stage}</dd></div>
        <div><dt className="text-xs text-[var(--ui-muted)]">Tracking token</dt><dd className="text-sm">Redacted</dd></div>
        <div><dt className="text-xs text-[var(--ui-muted)]">Expiry remaining</dt><dd className="text-sm">{props.expiryDaysRemaining} days</dd></div>
      </dl>
      <p className="mt-3 text-xs text-[var(--ui-muted)]">
        Source: {envelope.provenance.source} · Revision: {String(sourceProps(envelope).revision)}
      </p>
    </article>
  );
}

function RefundImpactPanel({ envelope }: { envelope: FixedA2UIEnvelope }) {
  const props = envelope.props;
  const valid = isAllowedProps(props, [
    'issueClass',
    'rootCause',
    'hitlRequired',
    'estimatedImpactSen',
    'sopAction',
  ])
    && safeLabel(props.issueClass, jevIssueClasses)
    && safeLabel(props.rootCause, jevRootCauses)
    && props.hitlRequired === true
    && (props.estimatedImpactSen === undefined
      || (safeInteger(props.estimatedImpactSen) && props.estimatedImpactSen >= 0))
    && (props.sopAction === undefined
      || (typeof props.sopAction === 'string' && props.sopAction.length <= 500));

  return (
    <article className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]">
      <h3 className="text-sm font-semibold">Refund impact · review only</h3>
      <p className="mt-2 text-sm text-[var(--ui-muted)]">
        {valid
          ? 'Financial impact is withheld until a canonical receipt is available. Approval and execution are not provided by this renderer.'
          : 'Refund impact data is malformed or incomplete; no amount or action is shown.'}
      </p>
      <p className="mt-2 text-xs text-[var(--ui-muted)]">
        Source: {envelope.provenance.source} · Revision: {String(sourceProps(envelope).revision)}
      </p>
    </article>
  );
}

function RendererFallback({ reason }: { reason: string }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-muted)]"
    >
      {reason}
    </section>
  );
}

export interface A2UIFixedRendererProps {
  payload: unknown;
}

export function A2UIFixedRenderer({ payload }: A2UIFixedRendererProps) {
  const parsed = parseA2UIFixedSchema(payload);
  if (parsed.ok === false) {
    const message = parsed.reason === 'unknown-component'
      ? 'This A2UI component is not allowlisted.'
      : parsed.reason === 'oversized'
        ? 'This A2UI payload exceeds the display limit.'
        : 'This A2UI payload is malformed and was not rendered.';
    return <RendererFallback reason={message} />;
  }

  const { value: envelope } = parsed;
  const props = envelope.props;
  const provenance = sourceProps(envelope);

  switch (envelope.component) {
    case 'OperationsBriefCard': {
      if (!isAllowedProps(props, ['title', 'briefDate', 'metrics', 'readOnlyNotice'])) {
        return <OperationsBriefApp state={{ status: 'insufficient_data' }} />;
      }
      const parsedBrief = parseOperationsBrief({
        ...props,
        readOnlyNotice: OPERATIONS_BRIEF_READ_ONLY_NOTICE,
        ...provenance,
      });
      return (
        <OperationsBriefApp
          state={parsedBrief.ok
            ? { status: 'ready', brief: parsedBrief.value }
            : { status: 'insufficient_data' }}
        />
      );
    }
    case 'RefundImpactPanel':
      return <RefundImpactPanel envelope={envelope} />;
    case 'JevAssessmentCard':
      if (!isAllowedProps(props, [
        'issueClass',
        'rootCause',
        'sopAction',
        'evaluationState',
        'evidencePhotoRequired',
        'confidenceScore',
      ])) return <JevAssessmentCard projectionState="insufficient-data" {...provenance} />;
      return (
        <JevAssessmentCard
          issueClass={safeLabel(props.issueClass, jevIssueClasses)
            ? props.issueClass : undefined}
          rootCause={safeLabel(props.rootCause, jevRootCauses) ? props.rootCause : undefined}
          sopAction={typeof props.sopAction === 'string' && props.sopAction.length <= 500 ? props.sopAction : undefined}
          evaluationState={safeLabel(props.evaluationState, jevEvaluationStates)
            ? props.evaluationState : undefined}
          evidencePhotoRequired={typeof props.evidencePhotoRequired === 'boolean'
            ? props.evidencePhotoRequired : undefined}
          confidenceScore={safeConfidence(props.confidenceScore)}
          {...provenance}
        />
      );
    case 'MarginSimulator': {
      if (!isAllowedProps(props, [
        'contributionSen',
        'contributionMarginPct',
        'requiredContributionSen',
        'requiredMarginPct',
        'status',
      ])) return <MarginSummaryCard projectionState="insufficient-data" {...provenance} />;
      return (
        <MarginSummaryCard
          contributionSen={safeInteger(props.contributionSen) ? props.contributionSen : undefined}
          contributionMarginPct={typeof props.contributionMarginPct === 'number'
            && Number.isFinite(props.contributionMarginPct) ? props.contributionMarginPct : undefined}
          requiredContributionSen={safeInteger(props.requiredContributionSen)
            ? props.requiredContributionSen : undefined}
          requiredMarginPct={typeof props.requiredMarginPct === 'number'
            && Number.isFinite(props.requiredMarginPct) ? props.requiredMarginPct : undefined}
          status={safeLabel(props.status, marginStatuses) ? props.status : undefined}
          {...provenance}
        />
      );
    }
    case 'OrderTrackingBadge':
      return <TrackingProjection envelope={envelope} />;
    case 'CommissionCard': {
      if (!isAllowedProps(props, ['summary'])) {
        return <CommissionSummaryCard projectionState="insufficient-data" {...provenance} />;
      }
      const summary = props.summary;
      if (!isRecord(summary)) {
        return <CommissionSummaryCard projectionState="insufficient-data" {...provenance} />;
      }
      if (!isCommissionSummary(summary)) {
        return <CommissionSummaryCard projectionState="insufficient-data" {...provenance} />;
      }
      return (
        <CommissionSummaryCard
          summary={summary}
          {...provenance}
        />
      );
    }
  }
}
