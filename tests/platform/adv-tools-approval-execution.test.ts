/**
 * ADV-08 / ADV-25 — durable proposal, founder approval, real executor.
 *
 * These tests are the anti-fabrication regression suite: they prove that
 * `execute_approved_action` can never emit a `rcpt-<timestamp>` / `confirmed`
 * receipt without a live proposal, a live approval, a matching scope, a fresh
 * authority, a clean compare-and-swap and a registered executor.
 */

import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { ADVANCED_TOOLS_DEFINITIONS } from '../../server/agents/tools/definitions';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { ApprovalService } from '../../server/agents/approval/service';
import { FileApprovalStore, MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import { RefundExecutor } from '../../server/agents/executor/refund';
import type { CatalogueProduct, OrderRecord, StockLot } from '../../shared/platform-contracts';
import type { PaymentRecord } from '../../server/platform/commerce';

const FOUNDER_ID = 'usr-founder-adv';
const STAFF_ID = 'usr-staff-adv';
const CUSTOMER_ID = 'usr-customer-adv';

function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = ['hq'], dealerOrgId: string | null = null): void {
  store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), dealerOrgId, 'active', 1);
}

function buildHarness(): {
  store: PlatformStore;
  registry: ToolRegistry;
  approvalStore: MemoryApprovalStore;
  order: OrderRecord;
} {
  const store = new PlatformStore(':memory:');
  addMembership(store, FOUNDER_ID, 'founder', ['hq']);
  addMembership(store, STAFF_ID, 'staff', ['hq']);
  addMembership(store, CUSTOMER_ID, 'customer', []);

  const product: CatalogueProduct = {
    id: 'prod-adv-colek',
    name: 'Colek Buah Segar 500g',
    description: 'Colek ADV',
    priceSen: 1500,
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 20,
    revision: 1,
    status: 'published',
  };
  store.save('catalogue', product);
  const lot: StockLot = {
    id: 'lot-adv-001',
    productId: product.id,
    ownerId: 'business',
    locationId: 'hq',
    custodyId: 'business',
    quantity: 20,
    status: 'available',
    revision: 1,
  };
  store.save('lots', lot);

  const order: OrderRecord = {
    id: 'ord-adv-001',
    customerId: CUSTOMER_ID,
    lines: [{ productId: product.id, name: product.name, quantity: 2, priceSen: 1500, publishedVersion: 1 }],
    amountSen: 3000,
    fulfilment: 'pickup',
    contactRef: 'Ali 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'verified',
    paidAmountSen: 3000,
    refundAmountSen: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  store.save('orders', order);

  const approvalStore = new MemoryApprovalStore();
  const executors = new ExecutorRegistry();
  executors.register(new RefundExecutor());
  const runtime = createToolRuntime({ store, approvalStore, executors });
  const registry = new ToolRegistry(6, { runtime });
  return { store, registry, approvalStore, order };
}

let runCounter = 0;
function ctxFor(actorId: string, role: 'customer' | 'staff' | 'founder' | 'developer'): { actorId: string; role: any; runId: string } {
  runCounter += 1;
  return { actorId, role, runId: `run-adv-${runCounter}` };
}

describe('ADV-08 propose_refund — durable proposal store', () => {
  test('Cadangan refund direkodkan dengan UUID sebenar dan TIDAK mengubah pesanan', async () => {
    const { registry, store, order } = buildHarness();
    const res = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 500, reason: 'Barang rosak' },
      ctxFor(STAFF_ID, 'staff'),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.proposalId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(res.result.proposalId).not.toMatch(/^prop-ref-\d+$/);
    expect(res.result.status).toBe('pending_approval');
    expect(res.result.amountSen).toBe(500);
    expect(res.result.authoritativeStateMutated).toBe(false);
    expect(res.result.persistence).toBe('in_memory');

    const stored = store.require<OrderRecord>('orders', order.id);
    expect(stored.refundAmountSen).toBe(0);
    expect(stored.revision).toBe(order.revision);
  });

  test('Cadangan melebihi baki dipulangkan ditolak (REFUND_EXCEEDS_PAID_BALANCE)', async () => {
    const { registry, order } = buildHarness();
    const res = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 999999, reason: 'Terlalu banyak' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('REFUND_EXCEEDS_PAID_BALANCE');
  });

  test('Pesanan tidak wujud menghasilkan ORDER_NOT_FOUND, bukan cadangan palsu', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'propose_refund',
      { orderId: 'ord-tiada', amountSen: 100, reason: 'Tiada pesanan' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('ORDER_NOT_FOUND');
  });
});

describe('ADV-25 execute_approved_action — anti-fabrication', () => {
  test('Kontrak kanonik: tiada kelulusan sebenar => EXECUTOR_UNAVAILABLE pada kedua-dua laluan (registri + panggilan langsung), TIADA resit rekaan', async () => {
    // (1) Registry path: a founder asking to execute an approval that does not
    //     correspond to any real approval record.
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: 'prop-valid-001', approvalId: 'appr-valid-001' },
      { actorId: 'usr-adversary-01', role: 'founder', runId: 'run-adv-canonical-1' },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('EXECUTOR_UNAVAILABLE');
      expect(res.message).toContain('unavailable');
      expect((res as { receiptId?: unknown }).receiptId).toBeUndefined();
      expect((res as { status?: unknown }).status).toBeUndefined();
      const json = JSON.stringify(res);
      expect(json).not.toContain('rcpt-');
      expect(json).not.toContain('confirmed');
    }

    // (2) Direct definition path: the tool body must RETURN a structured
    //     failure object (never throw, never fabricate a receipt).
    const tool = ADVANCED_TOOLS_DEFINITIONS.execute_approved_action;
    const direct = await tool.execute(
      { proposalId: 'prop-direct-001', approvalId: 'appr-direct-001' },
      { actorId: 'founder-01', role: 'founder' },
    );
    expect(direct.ok).toBe(false);
    expect(direct.code).toBe('EXECUTOR_UNAVAILABLE');
    expect((direct as { receiptId?: unknown }).receiptId).toBeUndefined();
    expect((direct as { status?: unknown }).status).not.toBe('confirmed');
    const directJson = JSON.stringify(direct);
    expect(directJson).not.toContain('rcpt-');
    expect(directJson).not.toContain('confirmed');
  });

  test('Cadangan tidak wujud => EXECUTOR_UNAVAILABLE/PROPOSAL_NOT_FOUND dan TIDAK ada resit', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: 'prop-tiada', approvalId: 'appr-tiada' },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('EXECUTOR_UNAVAILABLE');
      expect((res as { reason?: string }).reason).toBe('PROPOSAL_NOT_FOUND');
      expect(JSON.stringify(res)).not.toContain('rcpt-');
      expect(JSON.stringify(res)).not.toContain('confirmed');
    }
  });

  test('Kelulusan tidak wujud => EXECUTOR_UNAVAILABLE/APPROVAL_NOT_FOUND', async () => {
    const { registry, approvalStore } = buildHarness();
    const proposal = approvalStore.saveProposal({
      id: id(),
      kind: 'refund.execute',
      scope: 'order:ord-adv-001#refund',
      payload: { orderId: 'ord-adv-001', amountSen: 100 },
      amountSen: 100,
      currency: 'MYR',
      proposedBy: STAFF_ID,
      proposerRole: 'staff',
      status: 'pending_approval',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      sourceRefs: [],
    });
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: proposal.id, approvalId: 'appr-hilang' },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('EXECUTOR_UNAVAILABLE');
      expect((res as { reason?: string }).reason).toBe('APPROVAL_NOT_FOUND');
    }
  });

  test('Kelulusan yang tidak sepadan dengan cadangan => EXECUTOR_UNAVAILABLE/APPROVAL_PROPOSAL_MISMATCH', async () => {
    const { registry, approvalStore } = buildHarness();
    const proposal = approvalStore.saveProposal({
      id: id(),
      kind: 'refund.execute',
      scope: 'order:ord-adv-001#refund',
      payload: { orderId: 'ord-adv-001', amountSen: 100 },
      amountSen: 100,
      currency: 'MYR',
      proposedBy: STAFF_ID,
      proposerRole: 'staff',
      status: 'pending_approval',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      sourceRefs: [],
    });
    const other = approvalStore.saveProposal({
      id: id(),
      kind: 'refund.execute',
      scope: 'order:lain#refund',
      payload: { orderId: 'ord-adv-001', amountSen: 100 },
      amountSen: 100,
      currency: 'MYR',
      proposedBy: STAFF_ID,
      proposerRole: 'staff',
      status: 'pending_approval',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      sourceRefs: [],
    });
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId: other.id,
      scope: other.scope,
      proposalVersion: other.version,
      proposalNonce: other.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: proposal.id, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('EXECUTOR_UNAVAILABLE');
      expect((res as { reason?: string }).reason).toBe('APPROVAL_PROPOSAL_MISMATCH');
    }
  });

  test('Pelaksanaan sebenar menghasilkan resit UUID, refund sebenar, dan TIDAK rcpt-<timestamp>', async () => {
    const { registry, approvalStore, store, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 1200, reason: 'Rosak separa' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;

    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: `order:${order.id}#refund`,
      proposalVersion: approvalStore.getProposal(proposalId)!.version,
      proposalNonce: approvalStore.getProposal(proposalId)!.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    // The proposal must be in the approved state for the CAS binding to hold.
    approvalStore.saveProposal({ ...approvalStore.getProposal(proposalId)!, status: 'approved', version: approval.proposalVersion });

    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.status).toBe('confirmed');
    expect(res.result.receiptId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(String(res.result.receiptId)).not.toMatch(/^rcpt-/);
    expect(JSON.stringify(res)).not.toContain('rcpt-');

    // The canonical order really changed.
    const updated = store.require<OrderRecord>('orders', order.id);
    expect(updated.refundAmountSen).toBe(1200);
    expect(updated.paymentState).toBe('part_refunded');
    expect(updated.revision).toBe(order.revision + 1);

    // A real refund payment record exists with a deterministic id.
    const refunds = store.all<PaymentRecord>('payments').filter((payment) => payment.state === 'refunded');
    expect(refunds.length).toBe(1);
    expect(refunds[0].id).toBe(`refund-${proposalId}`);
    expect(refunds[0].amountSen).toBe(1200);

    // The receipt is durable in the approval store.
    const receipt = approvalStore.getReceipt(res.result.receiptId as string);
    expect(receipt).not.toBeNull();
    expect(receipt!.status).toBe('confirmed');
    expect(approvalStore.getProposal(proposalId)!.status).toBe('executed');
  });

  test('Idempotensi: pelaksanaan kedua memulangkan resit ASAL dan tidak menaip bayaran kedua', async () => {
    const { registry, approvalStore, store, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 900, reason: 'Ulang' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;
    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: stored.scope,
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });

    const first = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.result.receiptId).toBe(first.result.receiptId);
    expect(second.result.code).toBe('ALREADY_EXECUTED');
    expect(second.result.replay).toBe(true);
    expect(second.result.duplicateCommandCreated).toBe(false);

    const refunds = store.all<PaymentRecord>('payments').filter((payment) => payment.state === 'refunded');
    expect(refunds.length).toBe(1);
    expect(store.require<OrderRecord>('orders', order.id).refundAmountSen).toBe(900);
  });

  test('Kelulusan dicabut => APPROVAL_REVOKED', async () => {
    const { registry, approvalStore, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 300, reason: 'Ditolak kemudian' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;
    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: stored.scope,
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });
    approvalStore.saveApproval({ ...approval, status: 'revoked', revokedAt: now(), revokedBy: FOUNDER_ID, revocationReason: 'Dibatalkan' });

    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('APPROVAL_REVOKED');
  });

  test('Kelulusan luput tempoh => APPROVAL_EXPIRED', async () => {
    const { registry, approvalStore, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 300, reason: 'Luput' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;
    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: stored.scope,
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });

    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('APPROVAL_EXPIRED');
  });

  test('Skop kelulusan dipalsukan => SCOPE_MISMATCH', async () => {
    const { registry, approvalStore, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 300, reason: 'Skop' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;
    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: 'order:ord-lain#refund',
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });

    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('SCOPE_MISMATCH');
  });

  test('Cadangan diubah selepas kelulusan => CAS_CONFLICT', async () => {
    const { registry, approvalStore, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 300, reason: 'Versi' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;
    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: stored.scope,
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });
    // A concurrent edit moves the proposal forward.
    approvalStore.saveProposal({ ...approvalStore.getProposal(proposalId)!, version: approval.proposalVersion + 1 });

    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('CAS_CONFLICT');
  });

  test('Tiada eksekutor berdaftar => EXECUTOR_UNAVAILABLE', async () => {
    const { registry, approvalStore } = buildHarness();
    const proposal = approvalStore.saveProposal({
      id: id(),
      kind: 'pricing.adjust',
      scope: 'x:1',
      payload: {},
      amountSen: 0,
      currency: 'MYR',
      proposedBy: STAFF_ID,
      proposerRole: 'staff',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      sourceRefs: [],
    });
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId: proposal.id,
      scope: proposal.scope,
      proposalVersion: proposal.version,
      proposalNonce: proposal.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: proposal.id, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('EXECUTOR_UNAVAILABLE');
  });

  test('Peranan bukan founder ditolak oleh registri (FORBIDDEN_FOUNDER_REQUIRED)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: 'p', approvalId: 'a' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
  });

  test('Aktor dengan keahlian bukan founder ditolak (FORBIDDEN_FOUNDER_REQUIRED)', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: 'p', approvalId: 'a' },
      ctxFor(CUSTOMER_ID, 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
  });

  test('Aktor tanpa keahlian aktif langsung => AUTHORITY_UNRESOLVED', async () => {
    const { registry } = buildHarness();
    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: 'p', approvalId: 'a' },
      ctxFor('usr-tiada-keahlian', 'founder'),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('AUTHORITY_UNRESOLVED');
  });
});

describe('Aliran penuh ApprovalService (propose -> approve -> execute)', () => {
  test('Cadangan diluluskan melalui ApprovalService dan dilaksanakan dengan resit kekal', async () => {
    const store = new PlatformStore(':memory:');
    addMembership(store, FOUNDER_ID, 'founder', ['hq']);
    addMembership(store, STAFF_ID, 'staff', ['hq']);
    const product: CatalogueProduct = {
      id: 'prod-e2e', name: 'Colek E2E', description: 'E2E', priceSen: 1500, currency: 'MYR',
      packSize: 1, publishedVersion: 1, availableQuantity: 5, revision: 1, status: 'published',
    };
    store.save('catalogue', product);
    store.save('orders', {
      id: 'ord-e2e', customerId: 'cust-e2e',
      lines: [{ productId: product.id, name: product.name, quantity: 2, priceSen: 1500, publishedVersion: 1 }],
      amountSen: 3000, fulfilment: 'pickup', contactRef: 'E2E', outletId: 'hq',
      fulfilmentStatus: 'requested', revision: 1, paymentState: 'verified',
      paidAmountSen: 3000, refundAmountSen: 0, createdAt: now(), updatedAt: now(),
    } satisfies OrderRecord);

    const approvalStore = new MemoryApprovalStore();
    const approvalService = new ApprovalService(approvalStore);
    const executors = new ExecutorRegistry();
    executors.register(new RefundExecutor());
    const registry = new ToolRegistry(6, { runtime: createToolRuntime({ store, approvalStore, executors }) });

    // 1. Staff proposes.
    const proposed = await registry.dispatchTool(
      'propose_refund',
      { orderId: 'ord-e2e', amountSen: 1500, reason: 'E2E penuh' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const proposalId = proposed.result.proposalId as string;

    // 2. Founder approves through the real approval service.
    const approval = approvalService.approve({
      proposalId,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    expect(approval.status).toBe('approved');
    expect(approval.scope).toBe(`order:ord-e2e#refund`);
    const approvedProposal = approvalService.getProposal(proposalId)!;
    expect(approvedProposal.status).toBe('approved');
    expect(approvedProposal.approvalId).toBe(approval.id);
    expect(approval.proposalVersion).toBe(approvedProposal.version);

    // 3. Founder executes.
    const executed = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.result.status).toBe('confirmed');
    expect(executed.result.receiptId).toMatch(/^[0-9a-f]{8}-/i);
    expect(store.require<OrderRecord>('orders', 'ord-e2e').refundAmountSen).toBe(1500);
    expect(approvalService.getProposal(proposalId)!.status).toBe('executed');
    expect(approvalService.getProposal(proposalId)!.receiptId).toBe(executed.result.receiptId);
  });

  test('Cadangan yang ditolak oleh founder tidak boleh dilaksanakan', async () => {
    const store = new PlatformStore(':memory:');
    addMembership(store, FOUNDER_ID, 'founder', ['hq']);
    addMembership(store, STAFF_ID, 'staff', ['hq']);
    const approvalStore = new MemoryApprovalStore();
    const approvalService = new ApprovalService(approvalStore);
    const executors = new ExecutorRegistry();
    executors.register(new RefundExecutor());
    const registry = new ToolRegistry(6, { runtime: createToolRuntime({ store, approvalStore, executors }) });

    const proposal = approvalService.createProposal({
      kind: 'refund.execute',
      scope: 'order:ord-x#refund',
      payload: { orderId: 'ord-x', amountSen: 100 },
      amountSen: 100,
      proposedBy: STAFF_ID,
      proposerRole: 'staff',
    });
    const approval = approvalService.approve({
      proposalId: proposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    approvalService.rejectProposal(proposal.id, FOUNDER_ID, 'Tidak diluluskan');

    const executed = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: proposal.id, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(executed.ok).toBe(false);
    if (!executed.ok) expect(executed.code).toBe('PROPOSAL_REJECTED');
  });

  test('Cadangan yang dicabut kelulusannya tidak boleh dilaksanakan', async () => {
    const store = new PlatformStore(':memory:');
    addMembership(store, FOUNDER_ID, 'founder', ['hq']);
    addMembership(store, STAFF_ID, 'staff', ['hq']);
    const approvalStore = new MemoryApprovalStore();
    const approvalService = new ApprovalService(approvalStore);
    const executors = new ExecutorRegistry();
    executors.register(new RefundExecutor());
    const registry = new ToolRegistry(6, { runtime: createToolRuntime({ store, approvalStore, executors }) });

    const proposal = approvalService.createProposal({
      kind: 'refund.execute',
      scope: 'order:ord-y#refund',
      payload: { orderId: 'ord-y', amountSen: 100 },
      amountSen: 100,
      proposedBy: STAFF_ID,
      proposerRole: 'staff',
    });
    const approval = approvalService.approve({
      proposalId: proposal.id,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    approvalService.revokeApproval(approval.id, FOUNDER_ID, 'Penarikan kelulusan');

    const executed = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId: proposal.id, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(executed.ok).toBe(false);
    if (!executed.ok) expect(executed.code).toBe('APPROVAL_REVOKED');
  });
});

describe('Stor kelulusan fail (persistence: file)', () => {
  test('Cadangan dan resit kekal dalam fail JSON', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'adv-approval-'));
    const filePath = join(directory, 'approvals.json');
    const store = new PlatformStore(':memory:');
    addMembership(store, FOUNDER_ID, 'founder', ['hq']);
    addMembership(store, STAFF_ID, 'staff', ['hq']);
    store.save('orders', {
      id: 'ord-file', customerId: 'cust-file',
      lines: [{ productId: 'prod-file', name: 'Colek', quantity: 1, priceSen: 1000, publishedVersion: 1 }],
      amountSen: 1000, fulfilment: 'pickup', contactRef: 'File', outletId: 'hq',
      fulfilmentStatus: 'requested', revision: 1, paymentState: 'verified',
      paidAmountSen: 1000, refundAmountSen: 0, createdAt: now(), updatedAt: now(),
    } satisfies OrderRecord);

    const approvalStore = new FileApprovalStore(filePath);
    const approvalService = new ApprovalService(approvalStore);
    const executors = new ExecutorRegistry();
    executors.register(new RefundExecutor());
    const registry = new ToolRegistry(6, { runtime: createToolRuntime({ store, approvalStore, executors }) });

    const proposed = await registry.dispatchTool(
      'propose_refund',
      { orderId: 'ord-file', amountSen: 400, reason: 'Stor fail' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    expect(proposed.result.persistence).toBe('file');
    const proposalId = proposed.result.proposalId as string;

    const approval = approvalService.approve({
      proposalId,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
    });
    const executed = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.result.persistence).toBe('file');

    // The proposal, approval and receipt survive in the JSON file.
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(raw.proposals.some((proposal: { id: string }) => proposal.id === proposalId)).toBe(true);
    expect(raw.approvals.some((entry: { id: string }) => entry.id === approval.id)).toBe(true);
    expect(raw.receipts.some((receipt: { id: string }) => receipt.id === executed.result.receiptId)).toBe(true);

    // A fresh store instance sees the same records (durability across instances).
    const reopened = new FileApprovalStore(filePath);
    expect(reopened.getProposal(proposalId)).not.toBeNull();
    expect(reopened.findReceiptByProposal(proposalId)!.id).toBe(executed.result.receiptId);

    rmSync(directory, { recursive: true, force: true });
  });
});

describe('ADV-26 reconcile_action — resit terhadap keadaan platform', () => {  test('Selepas pelaksanaan, penyelarasan melaporkan konsisten', async () => {
    const { registry, approvalStore, order } = buildHarness();
    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: order.id, amountSen: 700, reason: 'Rekonsiliasi' },
      ctxFor(STAFF_ID, 'staff'),
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;
    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: stored.scope,
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });

    const execution = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(execution.ok).toBe(true);
    if (!execution.ok) return;

    const reconciliation = await registry.dispatchTool(
      'reconcile_action',
      { receiptId: execution.result.receiptId },
      ctxFor(FOUNDER_ID, 'founder'),
    );
    expect(reconciliation.ok).toBe(true);
    if (!reconciliation.ok) return;
    expect(reconciliation.result.status).toBe('consistent');
    expect(reconciliation.result.drifts).toEqual([]);
  });
});
