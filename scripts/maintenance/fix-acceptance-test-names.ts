/**
 * One-off: correct the `testName` field on acceptance-status.json to the ACTUAL
 * test names, and apply two honesty corrections:
 *   - CPK-01 is `partial`: the LOCAL contract is verified, but the LIVE provider
 *     round trip is externally gated (Gemini free-tier 429).
 *   - CPK-03's hosted half is externally gated.
 * Run once; safe to re-run.
 *
 * THE DISCRIMINATOR (`testNameKind`)
 * ----------------------------------
 * Every `testName` this script writes is declared together with its
 * `testNameKind`, so the ledger gate knows what it is reading:
 *   - "title" — the value IS the verbatim name of a testcase and must resolve
 *     to one that ran in the cited file.
 *   - "prose" — the value is a human summary of what the cited file proves; it
 *     is never resolved, and the cited FILE must exist on disk instead.
 *
 * The classification below was established by checking each value against the
 * test titles that actually exist in the cited file: only the entries marked
 * `title` appear verbatim as a `test(...)` / `describe(...)` title.
 */
import * as fs from 'node:fs';
// The discriminator's value set is owned by the acceptance harness, so this
// script can never drift from the gate it feeds.
import { TEST_NAME_KINDS, type TestNameKind } from './verify-acceptance.ts';

const p = 'reports/implementation/acceptance-status.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

const ADV_TEST = (id: string, name: string) =>
  `${id} ${name} — pengesahan ketat + pelaksanaan sebenar`;

const perTool = (id: string) => {
  const row = data.rows.find((r: any) => r.id === id);
  return row ? ADV_TEST(id, row.title) : null;
};

// 1. The 32 ADV rows cite one templated per-capability test; give the real name.
//    The templated title is emitted verbatim by
//    `tests/platform/adv-tools-capability-coverage.test.ts`
//    (`${tool.logicalCapabilityId} ${tool.registrationName} — pengesahan ketat +
//    pelaksanaan sebenar`), so it IS a testcase title.
for (const row of data.rows) {
  if (row.id.startsWith('ADV-') && row.testFile === 'tests/platform/adv-tools-capability-coverage.test.ts') {
    row.testName = ADV_TEST(row.id, row.title);
    row.testNameKind = 'title' as TestNameKind;
  }
}

// 2. Correct the specific test names that were described rather than quoted.
//    `kind` says whether the value is a verbatim testcase title ("title") or a
//    prose summary of the cited file ("prose").
const exact: Record<string, { testName: string; testFile?: string; kind: TestNameKind }> = {
  'CPK-01': {
    kind: 'prose',
    testName:
      'Copilot Runtime Pipeline — real provider path, no echo, fail-closed (tests/platform/copilot-runtime-pipeline.test.ts, 26 tests)',
  },
  'CPK-03': {
    kind: 'title',
    testName:
      'a candidate that FAILS evaluation is not publishable (tests/platform/intelligence-learning-pipeline.test.ts)',
  },
  'CPK-04': {
    kind: 'prose',
    testName: 'A2UI fixed schema allowlist + inert rendering (tests/frontend/a2ui-components.test.tsx)',
  },
  'CPK-05': {
    kind: 'prose',
    testName:
      'the allowlist still holds exactly the approved components + a component outside the allowlist is refused by the renderer (tests/frontend/a2ui-components.test.tsx)',
  },
  'CPK-09': {
    kind: 'prose',
    testName:
      'run started in the Pet -> continued in the workspace (tests/frontend/copilot-run-identity-shared.test.tsx)',
  },
  'ADV-25': {
    kind: 'title',
    testName:
      'Founder execution: NEVER generates fake receipt and strictly returns EXECUTOR_UNAVAILABLE (tests/platform/adversarial-m1-integrity.test.ts)',
  },
  'ADV-28': {
    kind: 'title',
    testName:
      'a candidate that FAILS evaluation is not publishable (tests/platform/intelligence-learning-pipeline.test.ts)',
  },
  'MOD-01': {
    kind: 'prose',
    testName:
      'diagnose_checkout detects a real stock conflict (tests/copilot/mod-01-storefront.test.ts)',
  },
  'MOD-04': {
    kind: 'title',
    testName:
      'Alatan propose_refund hanya mencipta draf cadangan tanpa memutasi transaksi terus (tests/copilot/mod-04-qc-jev.test.ts)',
  },
  'MOD-05': {
    kind: 'prose',
    testName:
      'get_agent_commission_summary computes the net-payable equation from a seeded ledger (tests/copilot/mod-05-dealers.test.ts)',
  },
  'MOD-06': {
    kind: 'prose',
    testName:
      'calculate_points_balance / get_loyalty_tier_status compute integer sen from a seeded ledger (tests/copilot/mod-06-loyalty.test.ts)',
  },
  'MOD-02': {
    kind: 'prose',
    testName:
      'track_consignment reads a real bus_shipments record (tests/copilot/mod-02-orders.test.ts)',
  },
  'ARC-01': {
    kind: 'title',
    testName:
      'reports a multiline import statement at the statement, not at the "from" line (tests/architecture/dependency-boundaries.test.ts, fixture-driven)',
  },
  'AI-03': {
    kind: 'prose',
    testName:
      'HITL expiry, double decision, non-founder denial, no fabricated receipt (tests/platform/hitl-execution-v24.test.ts)',
  },
  'AI-01': {
    kind: 'prose',
    testName:
      'Free model router: provider failover, budget, free-only policy (tests/platform/copilot-runtime-pipeline.test.ts)',
  },
  'PAY-01': {
    kind: 'prose',
    testName:
      'Provider callback dedupe by transaction id; amount/currency mismatch rejection; late payment without stock resurrection (tests/platform/payment-reconciliation-v24.test.ts)',
  },
  'PAY-02': {
    kind: 'prose',
    testName:
      'Payment acceptance requires verification (tests/platform/payment-reconciliation-v24.test.ts)',
  },
  'PAY-03': {
    kind: 'prose',
    testName:
      'Largest-remainder allocation sums exactly to the total with 0-cent drift (tests/platform/refund-allocation-v24.test.ts)',
  },
  'FIN-01': {
    kind: 'prose',
    testName:
      'Margin contribution gates: amount threshold, 25.000% ratio, zero-sales, staff-vs-founder override (tests/platform/growth-margin.test.ts)',
  },
  'STK-01': {
    kind: 'prose',
    testName:
      'Available units, reservation expiry rollback, quarantine excluded from saleable stock (tests/copilot/mod-03-inventory.test.ts)',
  },
  'OPS-01': {
    kind: 'prose',
    testName:
      'Quarantine never reduces saleable stock from another batch; return moves to HQ quarantine (tests/copilot/mod-03-inventory.test.ts)',
  },
  'REF-02': {
    kind: 'prose',
    testName:
      'Referral validation and self-referral rejection (tests/copilot/mod-06-loyalty.test.ts)',
  },
  'LOY-01': {
    kind: 'prose',
    testName:
      'Loyalty points balance, tier, redemption value and expiry boundary (tests/copilot/mod-06-loyalty.test.ts)',
  },
  'SEC-01': {
    kind: 'prose',
    testName:
      'Tracking token length, hash storage, expiry rejection, hash not leaked (tests/copilot/mod-02-orders.test.ts)',
  },
  'SEC-02': {
    kind: 'prose',
    testName:
      'Dealer terms and commission scoped to the dealer org (tests/copilot/mod-05-dealers.test.ts)',
  },
  'DR-01': {
    kind: 'prose',
    testName:
      'Transactional backup, evidence hash verification, restore with PRAGMA integrity_check (tests/platform/backup-restore.test.ts)',
  },
  'OFF-01': {
    kind: 'prose',
    testName:
      'Offline cache, retry idempotency, session race (tests/platform/offline-cache.test.ts)',
  },
  'PD-01': {
    kind: 'prose',
    testName:
      'Notification preferences and allowed topics stored per user (tests/platform/operational-amendments.test.ts)',
  },
  'MOD-07': {
    kind: 'prose',
    testName:
      'Margin gate blocks a below-threshold campaign; a compliant campaign passes (tests/copilot/mod-07-marketing.test.ts)',
  },
  'MOD-08': {
    kind: 'prose',
    testName:
      'Day-close and finance digest from seeded canonical records (tests/copilot/mod-08-finance.test.ts)',
  },
  'MOD-09': {
    kind: 'prose',
    testName:
      'Task proposal and SOP search against canonical records (tests/copilot/mod-09-tasks-sop.test.ts)',
  },
  'MOD-10': {
    kind: 'prose',
    testName:
      'Automation job and integration behaviour (tests/copilot/mod-10-automations.test.ts)',
  },
  'EXT-01': {
    kind: 'prose',
    testName:
      'Local inspector redacts secrets and writes nothing (tests/platform/intelligence-ext-local.test.ts)',
  },
  'EXT-02': {
    kind: 'prose',
    testName:
      'Memory provenance, consent gate, sensitive-field refusal, retention, per-user delete (tests/platform/intelligence-ext-local.test.ts)',
  },
  'EXT-03': {
    kind: 'prose',
    testName:
      'Seed removed, prohibited fields absent, opt-out, delete, allowlist, single write path (tests/platform/ext-03-telemetry.test.ts)',
  },
  'EXT-04': {
    kind: 'prose',
    testName:
      'Channel adapter contract on a synthetic transport: send, inbound, thread mapping, signature, staleness, permission (tests/platform/intelligence-ext-local.test.ts)',
  },
  'EXT-05': {
    kind: 'prose',
    testName:
      'Browser support probe and typed unavailable outcome; grant model (tests/ext/ext-webmcp-probe.test.ts)',
  },
  'EXT-06': {
    kind: 'prose',
    testName:
      'Mic permission indicator, revoke, shared run identity, untrusted transcript, processing disclosure (tests/platform/ext-06-voice.test.ts)',
  },
  'EXT-07': {
    kind: 'prose',
    testName:
      'Attachment reference carries hash, permission and revocation; a revoked attachment fails the set (tests/platform/ext-07-attachments.test.ts)',
  },
  'GUI-05': {
    kind: 'prose',
    testName:
      'MCP initialize / tools/list / tools/call / resources/read transcript (tests/platform/mcp-protocol.test.ts)',
  },
  'AI-02': {
    kind: 'prose',
    testName:
      'Provenance truth guard: no literal financial results, no unbacked provenance.source (tests/platform/provenance-truth-commerce-cancellation.test.ts)',
  },
  'REL-01': {
    kind: 'prose',
    testName:
      'Vercel entry, fail-closed runtime config and runtime identity (tests/platform/vercel-entry.test.ts)',
  },
};

for (const [id, patch] of Object.entries(exact)) {
  const row = data.rows.find((r: any) => r.id === id);
  if (row) {
    row.testName = patch.testName;
    // The discriminator travels with the name: a rewritten name must never
    // leave a stale kind behind.
    row.testNameKind = patch.kind;
    if (patch.testFile) row.testFile = patch.testFile;
  }
}

// 3. Honesty corrections.
const cpk01 = data.rows.find((r: any) => r.id === 'CPK-01');
cpk01.status = 'partial';
cpk01.gap =
  'The LOCAL contract is verified: a real provider call, an actor gate, a 3-call budget with failover, a deadline, token caps, and a truthful unavailable path with distinct reason codes — none of it echoes the prompt. The LIVE provider round trip was observed succeeding from the local runtime on 20 October 2026: the pinned primary candidate gemini-3.6-flash answered HTTP 200 and the third candidate nvidia/nemotron-3-ultra-550b-a55b:free answered HTTP 200 after the dead nemotron-3-super candidate was replaced. PRODUCTION proof against the deployed runtime and a sustained free-tier quota are still outstanding.';
cpk01.externalGate =
  'Live probe 20 Oktober 2026: gemini-3.6-flash HTTP 200, gemini-3.5-flash-lite HTTP 200, OpenRouter nvidia/nemotron-3-ultra-550b-a55b:free HTTP 200. Production receipt + free-tier quota yang mencukupi masih belum diperoleh.';

const cpk03 = data.rows.find((r: any) => r.id === 'CPK-03');
cpk03.externalGate =
  'The hosted Automatic Learning half requires INTELLIGENCE_ACCOUNT_REQUIRED (CopilotKit Intelligence account + terms); only the local pipeline is implemented';

fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
console.log(`Updated ${p}`);
console.log(
  `verified=${data.rows.filter((r: any) => r.status === 'implemented_verified').length} partial=${data.rows.filter((r: any) => r.status === 'partial').length} not_run=${data.rows.filter((r: any) => r.status === 'not_run').length}`,
);
// The discriminator census: a row with no `testNameKind` is treated as a
// STRICT title by the ledger gate, so it is reported here rather than hidden.
const byKind = data.rows.reduce((acc: Record<string, number>, r: any) => {
  const kind = r.testNameKind ?? '(absent -> strict title)';
  acc[kind] = (acc[kind] ?? 0) + 1;
  return acc;
}, {});
console.log('testNameKind census:', byKind);
const invalid = data.rows.filter(
  (r: any) => r.testNameKind !== undefined && r.testNameKind !== null && !TEST_NAME_KINDS.includes(r.testNameKind),
);
if (invalid.length > 0) {
  console.error(
    `ERROR: ${invalid.length} row(s) carry an unknown testNameKind: ${invalid.map((r: any) => `${r.id}=${r.testNameKind}`).join(', ')}`,
  );
  process.exitCode = 1;
}
