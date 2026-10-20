/**
 * Advanced Tool Registry — 32 logical capabilities, live catalogue,
 * server-owned dispatch budget and strict validation.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import { ALL_ADVANCED_TOOL_DEFINITIONS } from '../../server/agents/tools/definitions';

const EXPECTED: Record<string, string> = {
  'ADV-01': 'discover_capabilities',
  'ADV-02': 'search_records',
  'ADV-03': 'build_context_bundle',
  'ADV-04': 'explain_record',
  'ADV-05': 'diagnose_checkout',
  'ADV-06': 'reconcile_payments',
  'ADV-07': 'preview_refund',
  'ADV-08': 'propose_refund',
  'ADV-09': 'assess_expiry_risk',
  'ADV-10': 'plan_restock',
  'ADV-11': 'trace_batch',
  'ADV-12': 'propose_quarantine',
  'ADV-13': 'simulate_campaign',
  'ADV-14': 'explain_commission',
  'ADV-15': 'audit_loyalty',
  'ADV-16': 'assess_referral',
  'ADV-17': 'reconcile_dayclose',
  'ADV-18': 'build_finance_digest',
  'ADV-19': 'trace_transaction',
  'ADV-20': 'export_report',
  'ADV-21': 'triage_case',
  'ADV-22': 'plan_consignment',
  'ADV-23': 'draft_customer_reply',
  'ADV-24': 'build_action_plan',
  'ADV-25': 'execute_approved_action',
  'ADV-26': 'reconcile_action',
  'ADV-27': 'inspect_runtime',
  'ADV-28': 'review_skill_candidate',
  'ADV-29': 'search_sop',
  'ADV-30': 'propose_task',
  'ADV-31': 'evaluate_job_retry',
  'ADV-32': 'draft_campaign',
};

function createContext(role: 'customer' | 'staff' | 'founder' | 'developer', runId = 'run-registry-1'): ToolDispatchContext {
  return { actorId: 'usr-registry-001', role, runId };
}

describe('Registri 32 Keupayaan Logikal (ADV-01..ADV-32)', () => {
  test('Semua 32 id logikal didaftar dengan nama yang dijangka', () => {
    const registry = new ToolRegistry();
    expect(registry.registeredCapabilityCount()).toBe(32);
    for (const [capabilityId, name] of Object.entries(EXPECTED)) {
      const tool = registry.getTool(name);
      expect(tool).toBeDefined();
      expect(tool!.logicalCapabilityId).toBe(capabilityId);
      expect(tool!.registrationName).toBe(name);
      expect(tool!.description.length).toBeGreaterThan(10);
      expect(['Q', 'S', 'D', 'C', 'X']).toContain(tool!.riskClass);
    }
  });

  test('Tiada id logikal berulang dan tiada nama berulang', () => {
    const ids = ALL_ADVANCED_TOOL_DEFINITIONS.map((tool) => tool.logicalCapabilityId);
    const names = ALL_ADVANCED_TOOL_DEFINITIONS.map((tool) => tool.registrationName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    expect(ids.sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  test('discover_capabilities melaporkan katalog LANGSUNG registri', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('discover_capabilities', {}, createContext('founder', 'run-catalog-1'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.registeredCapabilityCount).toBe(32);
    expect(res.result.count).toBe(32);
    const reported = res.result.capabilities as Array<{ id: string; name: string }>;
    expect(reported.length).toBe(32);
    expect(reported.find((entry) => entry.name === 'execute_approved_action')?.id).toBe('ADV-25');
    expect(reported.find((entry) => entry.name === 'simulate_campaign')?.id).toBe('ADV-13');
  });

  test('discover_capabilities boleh ditapis mengikut kelas risiko', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('discover_capabilities', { riskClass: 'C' }, createContext('founder', 'run-catalog-2'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((res.result.capabilities as unknown[]).length).toBeGreaterThan(0);
    for (const entry of res.result.capabilities as Array<{ risk: string }>) {
      expect(entry.risk).toBe('C');
    }
  });

  test('Katalog peranan mencerminkan gating sebenar', () => {
    const registry = new ToolRegistry();
    const customer = registry.listAvailableTools('customer').map((tool) => tool.registrationName);
    const staff = registry.listAvailableTools('staff').map((tool) => tool.registrationName);
    const founder = registry.listAvailableTools('founder').map((tool) => tool.registrationName);

    expect(customer).toContain('discover_capabilities');
    expect(customer).not.toContain('execute_approved_action');
    expect(customer).not.toContain('preview_refund');
    expect(customer).not.toContain('simulate_campaign');
    expect(staff).toContain('preview_refund');
    expect(staff).toContain('propose_refund');
    expect(staff).not.toContain('simulate_campaign');
    expect(staff).not.toContain('execute_approved_action');
    expect(founder.length).toBe(32);
  });
});

describe('Penguatkuasaan Peranan (RBAC)', () => {
  test('Customer tidak boleh menjalankan preview_refund (FORBIDDEN_STAFF_REQUIRED)', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('preview_refund', { orderId: 'ord-1', amountSen: 100 }, createContext('customer', 'run-rbac-1'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('FORBIDDEN_STAFF_REQUIRED');
  });

  test('Staff tidak boleh menjalankan simulate_campaign (FORBIDDEN_FOUNDER_REQUIRED)', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('simulate_campaign', { netSalesSen: 10000, cogsSen: 5000 }, createContext('staff', 'run-rbac-2'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
  });

  test('Peranan palsu (admin/root/guest) gagal tertutup', async () => {
    const registry = new ToolRegistry();
    for (const role of ['admin', 'root', 'guest', 'anonymous', '']) {
      const res = await registry.dispatchTool('simulate_campaign', { netSalesSen: 10000, cogsSen: 5000 }, { actorId: 'u', role: role as any, runId: `run-spoof-${role}` });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
    }
  });

  test('Alatan tidak wujud => TOOL_NOT_FOUND', async () => {
    const registry = new ToolRegistry();
    for (const phantom of ['fake_tool', '__proto__', 'constructor', 'execute_unapproved']) {
      const res = await registry.dispatchTool(phantom, {}, createContext('founder', `run-phantom-${phantom}`));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe('TOOL_NOT_FOUND');
    }
  });
});

describe('Bajet Alatan Dimiliki Pelayan (Max 6 Dispatch / Sesi)', () => {
  test('Panggilan ke-7 disekat dengan TOOL_BUDGET_EXCEEDED', async () => {
    const registry = new ToolRegistry(6);
    const ctx = createContext('founder', 'run-budget-1');
    for (let index = 0; index < 6; index += 1) {
      const res = await registry.dispatchTool('discover_capabilities', {}, ctx);
      expect(res.ok).toBe(true);
    }
    const blocked = await registry.dispatchTool('discover_capabilities', {}, ctx);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe('TOOL_BUDGET_EXCEEDED');
      expect(blocked.message).toContain('6/6');
    }
  });

  test('Pelayar tidak boleh MEMBEKASAN atau MEMSET semula kiraan', async () => {
    const registry = new ToolRegistry(6);
    // Klien menghantar dispatchesCount = 99 dan maxDispatches = 9999 — iaitu TIDAK diberi kuasa.
    const ctx = { actorId: 'usr-1', role: 'founder' as const, runId: 'run-budget-2', dispatchesCount: 99, maxDispatches: 9999 };
    for (let index = 0; index < 6; index += 1) {
      const res = await registry.dispatchTool('discover_capabilities', {}, ctx);
      expect(res.ok).toBe(true);
    }
    const blocked = await registry.dispatchTool('discover_capabilities', {}, ctx);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe('TOOL_BUDGET_EXCEEDED');
    expect(registry.runBudgetState('run-budget-2').used).toBe(6);
    expect(registry.runBudgetState('run-budget-2').limit).toBe(6);
  });

  test('Panggilan yang gagal pengesahan tidak menggunakan bajet', async () => {
    const registry = new ToolRegistry(6);
    const ctx = createContext('founder', 'run-budget-3');
    const invalid = await registry.dispatchTool('simulate_campaign', { unknownField: 1 }, ctx);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.code).toBe('TOOL_INPUT_INVALID');
    expect(registry.runBudgetState('run-budget-3').used).toBe(0);
  });

  test('Setiap sesi ada kiraan berasingan', async () => {
    const registry = new ToolRegistry(2);
    const first = createContext('founder', 'run-budget-4a');
    const second = createContext('founder', 'run-budget-4b');
    expect((await registry.dispatchTool('discover_capabilities', {}, first)).ok).toBe(true);
    expect((await registry.dispatchTool('discover_capabilities', {}, second)).ok).toBe(true);
    expect(registry.runBudgetState('run-budget-4a').used).toBe(1);
    expect(registry.runBudgetState('run-budget-4b').used).toBe(1);
  });

  test('Panggilan tanpa run id pelayan disekat', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('discover_capabilities', {}, { actorId: 'u', role: 'founder', runId: '' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('RUN_ID_REQUIRED');
  });
});

describe('Pengesahan Input Yang Ketat', () => {
  test('Medan tidak dibenarkan ditolak', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('execute_approved_action', { proposalId: 'p', approvalId: 'a', force: true }, createContext('founder', 'run-strict-1'));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('TOOL_INPUT_INVALID');
      expect(String(res.detail)).toContain('force');
    }
  });

  test('Medan diperlukan yang hilang ditolak', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('execute_approved_action', { proposalId: 'p' }, createContext('founder', 'run-strict-2'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('TOOL_INPUT_INVALID');
  });

  test('Jenis data salah ditolak', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('execute_approved_action', { proposalId: 42, approvalId: 'a' }, createContext('founder', 'run-strict-3'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('TOOL_INPUT_INVALID');
  });

  test('Input bukan objek ditolak', async () => {
    const registry = new ToolRegistry();
    for (const bad of [null, 'text', 42, []]) {
      const res = await registry.dispatchTool('execute_approved_action', bad, createContext('founder', `run-strict-4-${String(bad)}`));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe('TOOL_INPUT_INVALID');
    }
  });
});

describe('Margin Guardian Sebenar (ADV-13)', () => {
  test('Batas 24.996% ditolak (2499 bps) — tiada pembulatan apung', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('simulate_campaign', { netSalesExTaxSen: 100000, cogsSen: 75004 }, createContext('founder', 'run-margin-1'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.contributionSen).toBe(24996);
    expect(res.result.marginBasisPoints).toBe(2499);
    expect(res.result.passed).toBe(false);
    expect(res.result.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');
    expect(res.result.evaluator).toBe('margin-guardian:evaluateMarginContribution');
  });

  test('Tepat 25.000% diluluskan (2500 bps)', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('simulate_campaign', { netSalesExTaxSen: 100000, cogsSen: 75000 }, createContext('founder', 'run-margin-2'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.contributionSen).toBe(25000);
    expect(res.result.marginBasisPoints).toBe(2500);
    expect(res.result.passed).toBe(true);
    expect(res.result.reason).toBe('MARGIN_PASSED');
  });

  test('Kos tidak dinyatakan lalai dan DIDEDOKUMENTASI (tiada success assert)', async () => {
    const registry = new ToolRegistry();
    const res = await registry.dispatchTool('simulate_campaign', { netSalesExTaxSen: 10000, cogsSen: 8000 }, createContext('founder', 'run-margin-3'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.passed).toBe(false);
    expect(res.result.reason).toBe('MARGIN_RATIO_FAILED');
    expect((res.result.defaultsApplied as string[]).length).toBeGreaterThan(0);
  });
});

describe('Anti-Fabrikasi: Tiada ID Resit Palsu Dalam Kod Alatan', () => {
  function collectSources(directory: string): string {
    const chunks: string[] = [];
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) {
        chunks.push(collectSources(full));
      } else if (entry.endsWith('.ts')) {
        chunks.push(readFileSync(full, 'utf8'));
      }
    }
    return chunks.join('\n');
  }

  test('Tiada corak resit/receipt ID hasil Date.now()', () => {
    const sources = collectSources(join(process.cwd(), 'server', 'agents'));
    expect(sources).not.toContain("'rcpt-'");
    expect(sources).not.toContain('"rcpt-"');
    expect(sources).not.toMatch(/rcpt-['"`]\s*\+\s*Date\.now/);
    expect(sources).not.toMatch(/prop-ref-['"`]\s*\+\s*Date\.now/);
    expect(sources).not.toMatch(/receiptId:\s*['"`]rcpt/);
  });

  test('Tiada status palsu hardcoded (simulated_ok / valid: true / estimatedDriftSen: 0)', () => {
    const sources = collectSources(join(process.cwd(), 'server', 'agents', 'tools'));
    expect(sources).not.toContain('simulated_ok');
    expect(sources).not.toMatch(/valid:\s*true\b/);
    expect(sources).not.toMatch(/estimatedDriftSen:\s*0\b/);
  });
});
