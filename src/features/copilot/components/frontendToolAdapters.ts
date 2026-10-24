export const FRONTEND_ACTION_TYPES = [
  'navigate',
  'select_record',
  'set_filter',
  'fill_draft',
  'request_decision',
] as const;

export type FrontendActionType = (typeof FRONTEND_ACTION_TYPES)[number];
export type FrontendRoute =
  | 'copilot'
  | 'orders'
  | 'cases'
  | 'inventory'
  | 'tasks'
  | 'documents'
  | 'marketing';

export type FrontendAction =
  | { type: 'navigate'; route: FrontendRoute }
  | { type: 'select_record'; recordType: 'order' | 'product' | 'case' | 'stock_batch'; recordId: string }
  | { type: 'set_filter'; filter: 'orders.status' | 'orders.search' | 'inventory.location' | 'cases.state'; value: string }
  | { type: 'fill_draft'; draftType: 'campaign' | 'refund' | 'restock' | 'customer_reply'; field: string; value: string | number }
  | { type: 'request_decision'; proposalId: string };

export interface FrontendActionHandlers {
  navigate?: (route: FrontendRoute) => void | Promise<void>;
  selectRecord?: (
    recordType: 'order' | 'product' | 'case' | 'stock_batch',
    recordId: string,
  ) => void | Promise<void>;
  setFilter?: (
    filter: 'orders.status' | 'orders.search' | 'inventory.location' | 'cases.state',
    value: string,
  ) => void | Promise<void>;
  fillDraft?: (
    draftType: 'campaign' | 'refund' | 'restock' | 'customer_reply',
    field: string,
    value: string | number,
  ) => void | Promise<void>;
  requestDecision?: (proposalId: string) => void | Promise<void>;
}

export type FrontendDispatchResult =
  | { status: 'handled' }
  | { status: 'invalid' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'duplicate' }
  | { status: 'limit_exceeded' }
  | { status: 'failed' };

const MAX_HANDLED_EVENTS = 256;
const ROUTES: readonly FrontendRoute[] = [
  'copilot',
  'orders',
  'cases',
  'inventory',
  'tasks',
  'documents',
  'marketing',
];
const RECORD_TYPES = ['order', 'product', 'case', 'stock_batch'] as const;
const FILTERS = [
  'orders.status',
  'orders.search',
  'inventory.location',
  'cases.state',
] as const;
const DRAFT_FIELDS: Record<Extract<FrontendAction, { type: 'fill_draft' }>['draftType'], readonly string[]> = {
  campaign: ['name', 'message', 'discountPct'],
  refund: ['reason', 'amountSen'],
  restock: ['quantity', 'note'],
  customer_reply: ['message'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function isBoundedString(value: unknown, maximum = 128): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

export function parseFrontendAction(value: unknown): FrontendAction | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  if (
    value.type === 'navigate' &&
    hasExactKeys(value, ['type', 'route']) &&
    ROUTES.includes(value.route as FrontendRoute)
  ) {
    return { type: 'navigate', route: value.route as FrontendRoute };
  }

  if (
    value.type === 'select_record' &&
    hasExactKeys(value, ['type', 'recordType', 'recordId']) &&
    RECORD_TYPES.includes(value.recordType as (typeof RECORD_TYPES)[number]) &&
    isBoundedString(value.recordId)
  ) {
    return {
      type: 'select_record',
      recordType: value.recordType as FrontendAction & never,
      recordId: value.recordId,
    };
  }

  if (
    value.type === 'set_filter' &&
    hasExactKeys(value, ['type', 'filter', 'value']) &&
    FILTERS.includes(value.filter as (typeof FILTERS)[number]) &&
    isBoundedString(value.value, 256)
  ) {
    return {
      type: 'set_filter',
      filter: value.filter as (typeof FILTERS)[number],
      value: value.value,
    };
  }

  if (
    value.type === 'fill_draft' &&
    hasExactKeys(value, ['type', 'draftType', 'field', 'value']) &&
    typeof value.draftType === 'string' &&
    Object.hasOwn(DRAFT_FIELDS, value.draftType) &&
    typeof value.field === 'string' &&
    DRAFT_FIELDS[value.draftType as keyof typeof DRAFT_FIELDS].includes(value.field) &&
    (isBoundedString(value.value, 1000) ||
      (typeof value.value === 'number' && Number.isSafeInteger(value.value) && value.value >= 0))
  ) {
    return {
      type: 'fill_draft',
      draftType: value.draftType as keyof typeof DRAFT_FIELDS,
      field: value.field,
      value: value.value,
    };
  }

  if (
    value.type === 'request_decision' &&
    hasExactKeys(value, ['type', 'proposalId']) &&
    isBoundedString(value.proposalId)
  ) {
    return { type: 'request_decision', proposalId: value.proposalId };
  }

  return null;
}

export function createFrontendToolAdapter(options: {
  capabilities: readonly FrontendActionType[];
  handlers: FrontendActionHandlers;
}) {
  const handledEvents = new Set<string>();

  return {
    async dispatch(request: { eventId: unknown; action: unknown }): Promise<FrontendDispatchResult> {
      if (!isBoundedString(request.eventId)) return { status: 'invalid' };
      const action = parseFrontendAction(request.action);
      if (!action) return { status: 'invalid' };
      if (handledEvents.has(request.eventId)) return { status: 'duplicate' };
      if (handledEvents.size >= MAX_HANDLED_EVENTS) return { status: 'limit_exceeded' };
      if (!options.capabilities.includes(action.type)) return { status: 'denied' };

      const handler =
        action.type === 'navigate'
          ? options.handlers.navigate
          : action.type === 'select_record'
            ? options.handlers.selectRecord
            : action.type === 'set_filter'
              ? options.handlers.setFilter
              : action.type === 'fill_draft'
                ? options.handlers.fillDraft
                : options.handlers.requestDecision;
      if (!handler) return { status: 'unavailable' };

      handledEvents.add(request.eventId);
      try {
        if (action.type === 'navigate') await options.handlers.navigate?.(action.route);
        else if (action.type === 'select_record') {
          await options.handlers.selectRecord?.(action.recordType, action.recordId);
        } else if (action.type === 'set_filter') {
          await options.handlers.setFilter?.(action.filter, action.value);
        } else if (action.type === 'fill_draft') {
          await options.handlers.fillDraft?.(action.draftType, action.field, action.value);
        } else {
          await options.handlers.requestDecision?.(action.proposalId);
        }
        return { status: 'handled' };
      } catch {
        return { status: 'failed' };
      }
    },
  };
}

export interface AgentFrontendToolEnvelope {
  eventId: unknown;
  action: unknown;
}

export interface AgentFrontendRoundTripResult {
  runId: string;
  results: Array<{
    eventId: string;
    outcome: FrontendDispatchResult;
  }>;
}

/**
 * CPK-07: Extracts allowlisted frontend tool envelopes from an AG-UI event or
 * agent run response so a live server round-trip can drive the frontend adapter.
 */
export function extractAguiFrontendToolActions(event: unknown): AgentFrontendToolEnvelope[] {
  if (!isRecord(event)) return [];
  const list: AgentFrontendToolEnvelope[] = [];
  if (Array.isArray(event.frontendActions)) {
    for (const entry of event.frontendActions) {
      if (isRecord(entry) && 'eventId' in entry && 'action' in entry) {
        list.push({ eventId: entry.eventId, action: entry.action });
      }
    }
  }
  if (event.type === 'TOOL_CALL_RESULT' && isRecord(event.result)) {
    const result = event.result;
    if (Array.isArray(result.frontendActions)) {
      for (const entry of result.frontendActions) {
        if (isRecord(entry) && 'eventId' in entry && 'action' in entry) {
          list.push({ eventId: entry.eventId, action: entry.action });
        }
      }
    } else if ('eventId' in result && 'action' in result) {
      list.push({ eventId: result.eventId, action: result.action });
    }
  }
  return list;
}

/**
 * CPK-07: Executes a live agent run and dispatches all returned frontend tool
 * envelopes through the typed capability-gated adapter.
 */
export async function runAgentFrontendToolRoundTrip(options: {
  adapter: ReturnType<typeof createFrontendToolAdapter>;
  invokeAgentRun: () => Promise<{
    runId: string;
    frontendActions?: readonly AgentFrontendToolEnvelope[];
    events?: readonly unknown[];
  }>;
}): Promise<AgentFrontendRoundTripResult> {
  const response = await options.invokeAgentRun();
  const envelopes: AgentFrontendToolEnvelope[] = [
    ...(response.frontendActions ?? []),
  ];
  for (const event of response.events ?? []) {
    envelopes.push(...extractAguiFrontendToolActions(event));
  }
  const results: AgentFrontendRoundTripResult['results'] = [];
  for (const envelope of envelopes) {
    const outcome = await options.adapter.dispatch(envelope);
    results.push({
      eventId: typeof envelope.eventId === 'string' ? envelope.eventId : String(envelope.eventId ?? ''),
      outcome,
    });
  }
  return {
    runId: response.runId,
    results,
  };
}
