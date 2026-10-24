/**
 * Coverage proof for all 32 logical capabilities.
 *
 * For every ADV id the suite proves that:
 *   1. the tool is registered with a real definition,
 *   2. strict validation rejects unknown keys, missing required fields and
 *      wrong types,
 *   3. the tool executes against a real platform store and returns either a
 *      structured result with provenance or a specific business failure code —
 *      never a crash and never a fabricated success.
 */

import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import { ALL_ADVANCED_TOOL_DEFINITIONS } from '../../server/agents/tools/definitions';
import type {
  CampaignRecord,
  CaseRecord,
  CatalogueProduct,
  DayCloseRecord,
  JobRecord,
  KnowledgeEntry,
  OrderRecord,
  RestockRecord,
  StockLot,
  TaskRecord,
} from '../../shared/platform-contracts';
import type { CommissionPolicy } from '../../shared/platform-contracts';
import type { CommissionTransaction } from '../../shared/dealer-contracts';
import type { PaymentRecord } from '../../server/platform/commerce';

const FOUNDER_ID = 'usr-cov-founder';
const STAFF_ID = 'usr-cov-staff';
const CUSTOMER_ID = 'usr-cov-customer';
const DEVELOPER_ID = 'usr-cov-developer';
const ORG_ID = 'dealer-org-cov';

const ORDER_ID = 'ord-cov-001';
const CASE_ID = 'case-cov-001';
const TASK_ID = 'task-cov-001';
const LOT_ID = 'lot-cov-001';
const BATCH_ID = 'batch-cov-001';
const RESTOCK_ID = 'rst-cov-001';
const JOB_ID = 'job-cov-001';
const DAYCLOSE_ID = 'dc-cov-001';
const PAYMENT_ID = 'pay-cov-001';

function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = [], dealerOrgId: string | null = null): void {
  store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), dealerOrgId, 'active', 1);
}

function buildHarness(): { store: PlatformStore; registry: ToolRegistry } {
  const store = new PlatformStore(':memory:');
  addMembership(store, FOUNDER_ID, 'founder', ['hq']);
  addMembership(store, STAFF_ID, 'staff', ['hq'], ORG_ID);
  addMembership(store, CUSTOMER_ID, 'customer', [], ORG_ID);
  addMembership(store, DEVELOPER_ID, 'developer', ['hq']);

  const product: CatalogueProduct = {
    id: 'prod-cov',
    name: 'Colek Cov',
    description: 'Produk liputan',
    priceSen: 1500,
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 20,
    revision: 1,
    status: 'published',
  };
  store.save('catalogue', product);
  store.setMetadata('catalogue_version', '1');

  const lot: StockLot = {
    id: LOT_ID,
    productId: product.id,
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'business',
    quantity: 20,
    status: 'available',
    batchId: BATCH_ID,
    expiryAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    revision: 1,
  };
  store.save('lots', lot);

  const order: OrderRecord = {
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
    lines: [{ productId: product.id, name: product.name, quantity: 2, priceSen: 1500, publishedVersion: 1 }],
    amountSen: 3000,
    fulfilment: 'pickup',
    contactRef: 'Pelajar 0123456789',
    outletId: 'hq',
    dealerOrgId: ORG_ID,
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'verified',
    paidAmountSen: 3000,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  store.save('orders', order);

  const payment: PaymentRecord = {
    id: PAYMENT_ID,
    orderId: ORDER_ID,
    amountSen: 3000,
    method: 'bank',
    reference: 'COV-REF-1',
    state: 'confirmed',
    confirmedBy: FOUNDER_ID,
    createdAt: now(),
  };
  store.save('payments', payment);

  store.save('cases', {
    id: CASE_ID,
    orderId: ORDER_ID,
    customerId: CUSTOMER_ID,
    status: 'open',
    revision: 1,
    subject: 'Barang rosak',
    description: 'Sebahagian rosak',
    createdAt: now(),
  } satisfies CaseRecord);

  store.save('tasks', {
    id: TASK_ID,
    entityId: ORDER_ID,
    title: 'Sahkan bayaran',
    assigneeId: STAFF_ID,
    ownerId: FOUNDER_ID,
    status: 'open',
    revision: 1,
    documentIds: [],
    outletId: 'hq',
    createdAt: now(),
  } satisfies TaskRecord);

  store.save('knowledge', {
    id: 'kn-cov-001',
    documentId: 'doc-cov-001',
    version: 1,
    status: 'approved',
    sourceRefs: [{ url: 'local://sop', title: 'SOP', retrievedAt: now(), accessMethod: 'local', termsCheck: 'internal' }],
    title: 'SOP kualiti gudang',
    body: 'SOP semakan kualiti untuk lot dan batch kualiti.',
  } satisfies KnowledgeEntry);

  store.save('campaigns', {
    id: 'cmp-cov-001',
    title: 'Kempen liputan',
    objective: 'Ujian liputan',
    copy: 'Copy kempen liputan',
    status: 'draft',
    ownerId: FOUNDER_ID,
    revision: 1,
    assets: [],
    productIds: [product.id],
    catalogueVersion: 1,
    createdAt: now(),
  } satisfies CampaignRecord);

  store.save('jobs', {
    id: JOB_ID,
    kind: 'case_summary',
    entityId: CASE_ID,
    skillVersion: 'v1',
    scope: 'local',
    ownerId: FOUNDER_ID,
    status: 'failed',
    attempt: 1,
    idempotencyKey: 'cov-idem-1',
    reasonCode: 'WORKER_TIMEOUT',
    createdAt: now(),
  } satisfies JobRecord);

  store.save('dayclose', {
    id: DAYCLOSE_ID,
    outletId: 'hq',
    date: new Date().toISOString().slice(0, 10),
    expectedCashSen: 3000,
    countCashSen: 3000,
    paymentRefs: [PAYMENT_ID],
    discrepancySen: 0,
    status: 'review',
    revision: 1,
  } satisfies DayCloseRecord);

  store.save('restocks', {
    id: RESTOCK_ID,
    dealerOrgId: ORG_ID,
    customerId: CUSTOMER_ID,
    quoteId: 'quo-cov-001',
    lines: [{ productId: product.id, name: product.name, quantity: 5, priceSen: 1500, publishedVersion: 1 }],
    totalSen: 7500,
    status: 'approved',
    revision: 1,
    ownership: 'consigned',
  } satisfies RestockRecord);

  store.save('commission_policies', {
    id: 'cp-cov-001',
    version: 1,
    eligibleProductIds: [product.id],
    rateBasisPoints: 7500,
    approvedAt: now(),
  } satisfies CommissionPolicy);

  store.save('commission_ledger', {
    id: 'cl-cov-001',
    orderId: ORDER_ID,
    dealerOrgId: ORG_ID,
    agentUserId: STAFF_ID,
    policyVersion: 1,
    amountSen: 2250,
    status: 'eligible',
    eligibleAt: now(),
    createdAt: now(),
  } satisfies CommissionTransaction);

  store.save('settings', {
    id: 'business',
    version: 1,
    approvedPolicies: {
      dealer: {
        version: 1,
        minimumQuantity: 10,
        packMultiple: 5,
        priceBasisPoints: 7500,
        ownership: 'consigned',
        returnRules: 'Semak unit pemulangan',
        approvedAt: now(),
      },
    },
    locale: 'ms-MY',
    timezone: 'Asia/Kuala_Lumpur',
  });

  store.save('skill_candidates', {
    id: 'sk-cov-001',
    title: 'Calon kemahiran liputan',
    body: 'Kemahiran inirp玫 untuk rujukan dalaman. Skop terhad, ralat dikendalikan dan tiada data sulit.',
    kind: 'skill',
  });

  store.save('runtime_controls', {
    id: 'runtime',
    version: 1,
    workerAdmission: 'running',
    activeRelease: 'platform-local-v1',
    availableReleases: ['platform-local-v1'],
    externalFlags: { nativeWhatsapp: false, postizPublish: false, agentReachResearch: false, hermes: false },
    updatedAt: now(),
  });

  const executors = new ExecutorRegistry();
  executors.register(new RefundExecutor());
  const runtime = createToolRuntime({ store, approvalStore: new MemoryApprovalStore(), executors });
  return { store, registry: new ToolRegistry(6, { runtime }) };
}

const SAMPLE_INPUTS: Record<string, Record<string, unknown>> = {
  discover_capabilities: {},
  search_records: { kind: 'orders' },
  build_context_bundle: { entityId: ORDER_ID },
  explain_record: { entityId: ORDER_ID },
  diagnose_checkout: { orderId: ORDER_ID },
  reconcile_payments: { orderId: ORDER_ID },
  preview_refund: { orderId: ORDER_ID, amountSen: 100 },
  propose_refund: { orderId: ORDER_ID, amountSen: 100, reason: 'Ujian liputan' },
  assess_expiry_risk: { horizonDays: 30 },
  plan_restock: { targetQuantity: 20 },
  trace_batch: { batchId: BATCH_ID },
  propose_quarantine: { lotId: LOT_ID, reason: 'Ujian kuarantin' },
  simulate_campaign: { netSalesExTaxSen: 10000, cogsSen: 5000 },
  explain_commission: { orderId: ORDER_ID },
  audit_loyalty: { userId: CUSTOMER_ID },
  assess_referral: { orderId: ORDER_ID },
  reconcile_dayclose: { dayCloseId: DAYCLOSE_ID },
  build_finance_digest: {},
  trace_transaction: { paymentId: PAYMENT_ID },
  export_report: { kind: 'orders' },
  triage_case: { caseId: CASE_ID },
  plan_consignment: { restockId: RESTOCK_ID },
  draft_customer_reply: { caseId: CASE_ID },
  build_action_plan: { objective: 'Selesaikan kes pelanggan' },
  execute_approved_action: { proposalId: 'prop-cov', approvalId: 'appr-cov' },
  reconcile_action: { receiptId: 'rcpt-cov' },
  inspect_runtime: {},
  review_skill_candidate: { candidateId: 'sk-cov-001' },
  search_sop: { query: 'kualiti' },
  propose_task: { entityId: ORDER_ID, title: 'Tugas liputan' },
  evaluate_job_retry: { jobId: JOB_ID },
  draft_campaign: { title: 'Kempen liputan', objective: 'Ujian kempen' },
};

const ROLE_FOR: Record<string, 'customer' | 'staff' | 'founder' | 'developer'> = {
  customer: 'customer',
  staff: 'staff',
  founder: 'founder',
  developer: 'developer',
};

/** Business failure codes that are legitimate answers, not crashes. */
const ALLOWED_FAILURE_CODES = new Set([
  'PROPOSAL_NOT_FOUND',
  'APPROVAL_NOT_FOUND',
  'RECEIPT_NOT_FOUND',
  'AUTHORITY_UNRESOLVED',
  'FORBIDDEN_FOUNDER_REQUIRED',
  'PLATFORM_STORE_UNAVAILABLE',
  'EXECUTOR_UNAVAILABLE',
  'RECORD_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'CASE_NOT_FOUND',
  'LOT_NOT_FOUND',
  'BATCH_NOT_FOUND',
  'JOB_NOT_FOUND',
  'DAY_CLOSE_NOT_FOUND',
  'RESTOCK_NOT_FOUND',
  'PAYMENT_NOT_FOUND',
  'CANDIDATE_NOT_FOUND',
  'ENTITY_NOT_FOUND',
  'CANDIDATE_CONTENT_REQUIRED',
  'DEALER_POLICY_UNAVAILABLE',
  'ASSIGNEE_SCOPE',
  'PRODUCT_UNAVAILABLE',
  'INVALID_DUE_DATE',
  'NO_REFUNDABLE_BALANCE',
  'REFUND_EXCEEDS_PAID_BALANCE',
  'CROSS_TENANT_FORBIDDEN',
  'FORBIDDEN',
  'DEALER_SCOPE',
]);

describe('Liputan Keupayaan Logikal (ADV-01..ADV-32)', () => {
  test('Setiap alatan didaftar dengan input contoh yang sah', () => {
    for (const tool of ALL_ADVANCED_TOOL_DEFINITIONS) {
      expect(SAMPLE_INPUTS[tool.registrationName]).toBeDefined();
    }
  });

  test('Sekurang-kurangnya 30 alatan executes dengan Provenance sebenar terhadap stor sebenar', async () => {
    const { registry } = buildHarness();
    const outcomes: Array<{ id: string; ok: boolean; code?: string }> = [];
    for (const tool of ALL_ADVANCED_TOOL_DEFINITIONS) {
      const role = ROLE_FOR[tool.requiredRole] ?? 'customer';
      const actorId =
        role === 'founder' ? FOUNDER_ID : role === 'staff' ? STAFF_ID : role === 'developer' ? DEVELOPER_ID : CUSTOMER_ID;
      const executed = await registry.dispatchTool(tool.registrationName, SAMPLE_INPUTS[tool.registrationName], {
        actorId,
        role,
        runId: `run-cov-summary-${tool.logicalCapabilityId}`,
      });
      outcomes.push({ id: tool.logicalCapabilityId, ok: executed.ok, code: executed.ok ? undefined : executed.code });
    }
    const succeeded = outcomes.filter((outcome) => outcome.ok);
    expect(succeeded.length).toBeGreaterThanOrEqual(30);
    // The only tools that answer NOT_FOUND are the two that reference records
    // which genuinely do not exist yet.
    const failed = outcomes.filter((outcome) => !outcome.ok);
    for (const outcome of failed) {
      console.log(`NOTOK ${outcome.id} -> ${outcome.code}`);
      expect(['EXECUTOR_UNAVAILABLE', 'PROPOSAL_NOT_FOUND', 'RECEIPT_NOT_FOUND'])
        .toContain(outcome.code as string);
    }
  });

  for (const tool of ALL_ADVANCED_TOOL_DEFINITIONS) {
    test(`${tool.logicalCapabilityId} ${tool.registrationName} — pengesahan ketat + pelaksanaan sebenar`, async () => {
      const { registry } = buildHarness();
      const sample = SAMPLE_INPUTS[tool.registrationName];
      const role = ROLE_FOR[tool.requiredRole] ?? 'customer';
      const actorId =
        role === 'founder' ? FOUNDER_ID : role === 'staff' ? STAFF_ID : role === 'developer' ? DEVELOPER_ID : CUSTOMER_ID;

      // 1. Unknown key is rejected.
      const unknown = await registry.dispatchTool(
        tool.registrationName,
        { ...sample, zz_unknown_field: 'x' },
        { actorId, role, runId: `run-cov-${tool.logicalCapabilityId}-unknown` },
      );
      expect(unknown.ok).toBe(false);
      if (!unknown.ok) expect(unknown.code).toBe('TOOL_INPUT_INVALID');

      // 2. Missing required field is rejected (when the tool declares one).
      const requiredKey = Object.entries(tool.inputSchema).find(
        ([key, spec]) => !key.startsWith('$') && spec.required,
      )?.[0];
      if (requiredKey) {
        const missing = { ...sample };
        delete missing[requiredKey];
        const result = await registry.dispatchTool(tool.registrationName, missing, {
          actorId,
          role,
          runId: `run-cov-${tool.logicalCapabilityId}-missing`,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('TOOL_INPUT_INVALID');
      }

      // 3. Wrong type is rejected.
      const typedKey = Object.entries(tool.inputSchema).find(
        ([key, spec]) => !key.startsWith('$') && spec.type === 'string',
      )?.[0];
      if (typedKey) {
        const wrongType = { ...sample, [typedKey]: 12345 };
        const result = await registry.dispatchTool(tool.registrationName, wrongType, {
          actorId,
          role,
          runId: `run-cov-${tool.logicalCapabilityId}-type`,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('TOOL_INPUT_INVALID');
      }

      // 4. Valid input executes: a structured result with provenance, or a
      //    specific business failure code — never a crash, never a fake success.
      const executed = await registry.dispatchTool(tool.registrationName, sample, {
        actorId,
        role,
        runId: `run-cov-${tool.logicalCapabilityId}-exec`,
      });
      if (executed.ok) {
        expect(executed.result).toBeDefined();
        expect(executed.result.provenance).toBeDefined();
        const provenance = executed.result.provenance as { actorId: string; sources: string[]; evaluator: string; at: string };
        expect(provenance.actorId).toBe(actorId);
        expect(Array.isArray(provenance.sources)).toBe(true);
        expect(provenance.evaluator.length).toBeGreaterThan(0);
        expect(provenance.at.length).toBeGreaterThan(0);
        if (tool.registrationName === 'preview_refund') {
          expect(typeof executed.result.previewRefHash).toBe('string');
          expect((executed.result.previewRefHash as string).length).toBe(64);
          expect(executed.result.revisions).toEqual({ orderRevision: 1, policyRevision: 1 });
          expect(typeof executed.result.expiresAt).toBe('string');
        }
      } else {
        expect(executed.code).not.toBe('TOOL_EXECUTION_ERROR');
        expect(ALLOWED_FAILURE_CODES.has(executed.code)).toBe(true);
      }
    });
  }
});
