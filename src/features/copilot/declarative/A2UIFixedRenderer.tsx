import React from 'react';
import {
  validateA2UIComponent,
  type A2UIComponentName,
} from '../../../../shared/copilot-contracts';
import type { DealerCommissionSummary } from '../../../../shared/growth-contracts';
import { CommissionSummaryCard } from '../cards/CommissionSummaryCard';
import { JevAssessmentCard } from '../cards/JevAssessmentCard';
import {
  MarginSummaryCard,
  parseMarginInputFailure,
} from '../cards/MarginSummaryCard';
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

/**
 * Senarai prop yang boleh dipaparkan bagi setiap komponen.
 *
 * Medan yang TIDAK berada dalam senarai ini diabaikan sepenuhnya dan tidak
 * pernah dipaparkan. Senarai ini ialah satu-satunya gate: renderer hanya
 * mem projecting medan yang dibenarkan.
 */
const JEV_ASSESSMENT_PROPS = [
  'issueClass',
  'rootCause',
  'sopAction',
  'evaluationState',
  'evidencePhotoRequired',
  'confidenceScore',
] as const;

const MARGIN_SIMULATOR_PROPS = [
  'contributionSen',
  'contributionMarginPct',
  'requiredContributionSen',
  'requiredMarginPct',
  'status',
  'minMarginSen',
  'minMarginPercent',
] as const;

const MARGIN_SUMMARY_PROPS = [
  'contributionSen',
  'contributionMarginPct',
  'requiredContributionSen',
  'requiredMarginPct',
  'status',
  'simulationPerformed',
  'reason',
  'reasonCode',
  'invalidKeys',
  'missingInputKeys',
  'requiredInputKeys',
  'failure',
  'marginFailure',
  'inputFailure',
  'error',
] as const;

const OPERATIONS_BRIEF_PROPS = ['title', 'briefDate', 'metrics', 'readOnlyNotice'] as const;

/**
 * Prop RefundImpactPanel yang dipaparkan.
 *
 * `orderId`, `orderResolutionReason`, `refundIntentReason` dan
 * `provenanceDetail` dihantar oleh pelayan sebagai konteks kanonik. Ia
 * TIDAK pernah menjadikan kad lebih berkuasa — amaun kewangan tetap
 * withholding sehingga ada resit kanonik — tetapi ia mesti tidak menjatuhkan
 * kad kepada "malformed".
 */
const REFUND_IMPACT_PROPS = [
  'issueClass',
  'rootCause',
  'hitlRequired',
  'estimatedImpactSen',
  'sopAction',
  'orderId',
  'orderResolutionReason',
  'refundIntentReason',
  'provenanceDetail',
] as const;

const TRACKING_BADGE_PROPS = [
  'orderId',
  'stage',
  'trackingTokenRedactedHash',
  'expiryDaysRemaining',
] as const;

const ORDER_TRACKING_CARD_PROPS = ['orderId', 'consignmentNo', 'found', 'status', 'reasonCode'] as const;

const COMMISSION_PROPS = ['summary'] as const;
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

/**
 * Memilih HANYA prop yang berada dalam senarai allowlist.
 *
 * Medan yang tidak disokong oleh kontrak (contoh `evaluator`,
 * `incidentType` atau `provenanceDetail` yang dihantar oleh versi pelayan
 * yang lebih lama) DIABAIKAN — ia tidak pernah dipaparkan, tetapi ia juga
 * tidak lagi menjatuhkan keseluruhan kad. "Insufficient data" muncul hanya
 * apabila medan yang benar-benar diperlukan tiada.
 */
function pickAllowedProps(
  props: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.hasOwn(props, key)) picked[key] = props[key];
  }
  return picked;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0 && entry.length <= 100)
    .slice(0, 40);
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
  const props = pickAllowedProps(envelope.props, TRACKING_BADGE_PROPS);
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
  // Allowlist "pilih sahaja": prop yang tidak disokong (contoh `evaluator`
  // atau `provenanceDetail` versi lama) diabaikan — ia tidak lagi menjatuhkan
  // kad kepada "malformed" apabila data yang diperlukan memang ada.
  const props = pickAllowedProps(envelope.props, REFUND_IMPACT_PROPS);
  const valid = safeLabel(props.issueClass, jevIssueClasses)
    && safeLabel(props.rootCause, jevRootCauses)
    && props.hitlRequired === true
    && (props.estimatedImpactSen === undefined
      || (safeInteger(props.estimatedImpactSen) && props.estimatedImpactSen >= 0))
    && (props.sopAction === undefined
      || (typeof props.sopAction === 'string' && props.sopAction.length <= 500));

  // Konteks pesanan hanya dipaparkan apabila pelayan benar-benar resolved
  // satu pesanan. `UNRESOLVED` ialah sentinel pelayan — ia TIDAK dipaparkan
  // sebagai ID pesanan.
  const orderId = typeof props.orderId === 'string' && props.orderId.trim().length > 0
    && props.orderId !== 'UNRESOLVED'
    ? props.orderId
    : null;
  const orderResolutionReason = typeof props.orderResolutionReason === 'string'
    && props.orderResolutionReason.trim().length > 0
    ? props.orderResolutionReason.slice(0, 64)
    : null;
  const refundIntentReason = typeof props.refundIntentReason === 'string'
    && props.refundIntentReason.trim().length > 0
    ? props.refundIntentReason.slice(0, 64)
    : null;

  return (
    <article className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]">
      <h3 className="text-sm font-semibold">Refund impact · review only</h3>
      <p className="mt-2 text-sm text-[var(--ui-muted)]">
        {valid
          ? 'Financial impact is withheld until a canonical receipt is available. Approval and execution are not provided by this renderer.'
          : 'Refund impact data is malformed or incomplete; no amount or action is shown.'}
      </p>
      {valid && (orderId || orderResolutionReason || refundIntentReason) && (
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {orderId && (
            <div>
              <dt className="text-xs text-[var(--ui-muted)]">Pesanan dirujuk</dt>
              <dd className="break-all text-sm">{orderId}</dd>
            </div>
          )}
          {orderResolutionReason && (
            <div>
              <dt className="text-xs text-[var(--ui-muted)]">Sebab penemu pesanan</dt>
              <dd className="font-mono text-sm">{orderResolutionReason}</dd>
            </div>
          )}
          {refundIntentReason && (
            <div>
              <dt className="text-xs text-[var(--ui-muted)]">Sebab niat bayaran balik</dt>
              <dd className="font-mono text-sm">{refundIntentReason}</dd>
            </div>
          )}
        </dl>
      )}
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
      const selected = pickAllowedProps(props, OPERATIONS_BRIEF_PROPS);
      const parsedBrief = parseOperationsBrief({
        ...selected,
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
    case 'JevAssessmentCard': {
      // BL-26: `issueClass` mesti dipaparkan apabila dihantar, dan medan
      // yang tidak disokong (contoh `incidentType` versi lama) hanya
      // diabaikan — ia tidak lagi menjatuhkan kad kepada "insufficient data"
      // apabila data yang diperlukan memang ada.
      const selected = pickAllowedProps(props, JEV_ASSESSMENT_PROPS);
      return (
        <JevAssessmentCard
          issueClass={safeLabel(selected.issueClass, jevIssueClasses)
            ? selected.issueClass : undefined}
          rootCause={safeLabel(selected.rootCause, jevRootCauses) ? selected.rootCause : undefined}
          sopAction={typeof selected.sopAction === 'string' && selected.sopAction.length <= 500
            ? selected.sopAction : undefined}
          evaluationState={safeLabel(selected.evaluationState, jevEvaluationStates)
            ? selected.evaluationState : undefined}
          evidencePhotoRequired={typeof selected.evidencePhotoRequired === 'boolean'
            ? selected.evidencePhotoRequired : undefined}
          confidenceScore={safeConfidence(selected.confidenceScore)}
          {...provenance}
        />
      );
    }
    case 'MarginSimulator': {
      const selected = pickAllowedProps(props, MARGIN_SIMULATOR_PROPS);
      // Alias kanonikal daripada kontrak shared: `minMarginSen` /
      // `minMarginPercent` ialah nama yang sama seperti ambang tunai dan
      // ambang peratusan.
      const requiredContributionSen = safeInteger(selected.requiredContributionSen)
        ? selected.requiredContributionSen
        : (safeInteger(selected.minMarginSen) ? selected.minMarginSen : undefined);
      const requiredMarginPct = typeof selected.requiredMarginPct === 'number'
        && Number.isFinite(selected.requiredMarginPct)
        ? selected.requiredMarginPct
        : (typeof selected.minMarginPercent === 'number' && Number.isFinite(selected.minMarginPercent)
          ? selected.minMarginPercent : undefined);
      return (
        <MarginSummaryCard
          contributionSen={safeInteger(selected.contributionSen) ? selected.contributionSen : undefined}
          contributionMarginPct={typeof selected.contributionMarginPct === 'number'
            && Number.isFinite(selected.contributionMarginPct) ? selected.contributionMarginPct : undefined}
          requiredContributionSen={requiredContributionSen}
          requiredMarginPct={requiredMarginPct}
          status={safeLabel(selected.status, marginStatuses) ? selected.status : undefined}
          {...provenance}
        />
      );
    }
    case 'MarginSummaryCard': {
      // BL-24b: komponen ini membawa kegagalan input yang berjenis. Ia mesti
      // dipaparkan sebagai "input tidak disediakan" / "input tidak sah"
      // together with the invalid keys — never a 0% margin.
      const selected = pickAllowedProps(props, MARGIN_SUMMARY_PROPS);
      const failure = parseMarginInputFailure(selected);
      const simulationPerformed = selected.simulationPerformed === true
        ? true
        : selected.simulationPerformed === false
          ? false
          : undefined;
      return (
        <MarginSummaryCard
          contributionSen={safeInteger(selected.contributionSen) ? selected.contributionSen : undefined}
          contributionMarginPct={typeof selected.contributionMarginPct === 'number'
            && Number.isFinite(selected.contributionMarginPct) ? selected.contributionMarginPct : undefined}
          requiredContributionSen={safeInteger(selected.requiredContributionSen)
            ? selected.requiredContributionSen : undefined}
          requiredMarginPct={typeof selected.requiredMarginPct === 'number'
            && Number.isFinite(selected.requiredMarginPct) ? selected.requiredMarginPct : undefined}
          status={safeLabel(selected.status, marginStatuses) ? selected.status : undefined}
          failure={failure ?? undefined}
          simulationPerformed={simulationPerformed}
          requiredInputKeys={readStringList(selected.requiredInputKeys)}
          {...provenance}
        />
      );
    }
    case 'OrderTrackingBadge':
      return <TrackingProjection envelope={envelope} />;
    case 'OrderTrackingCard': {
      // Kad ini hanya membawa "tidak dijumpai" — pelayan tidak menghantar
      // unjuran pesanan, jadi kad tidak boleh menunjukkan pesanan rekaan.
      const selected = pickAllowedProps(props, ORDER_TRACKING_CARD_PROPS);
      const reasonCode = typeof selected.reasonCode === 'string' && selected.reasonCode.length > 0
        ? selected.reasonCode.slice(0, 64)
        : 'RECORD_NOT_FOUND';
      const reference = typeof selected.orderId === 'string' && selected.orderId.length > 0
        ? selected.orderId
        : (typeof selected.consignmentNo === 'string' && selected.consignmentNo.length > 0
          ? selected.consignmentNo : undefined);
      return (
        <OrderSummaryCard
          projectionState="empty"
          message={`Pesanan tidak dijumpai (${reasonCode})${reference ? ` · ${reference}` : ''}. Tiada unjuran pesanan untuk dipaparkan.`}
          {...provenance}
        />
      );
    }
    case 'CommissionCard': {
      const selected = pickAllowedProps(props, COMMISSION_PROPS);
      const summary = selected.summary;
      if (!isRecord(summary) || !isCommissionSummary(summary)) {
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
