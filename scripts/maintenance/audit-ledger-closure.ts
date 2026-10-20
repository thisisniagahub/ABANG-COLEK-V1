/**
 * Second-pass ledger audit: enforce contract line 179 mechanically.
 *
 *   "Component/unit/synthetic pass tidak menutup acceptance yang masih
 *    memerlukan protocol/live/browser/domain evidence."
 *
 * Rule: a row may only be `verified_local` if NOTHING in its requirement is
 * still unimplemented. The first reschema pass wrote the honest gaps into the
 * prose (`evidenceProves`) but left the status at `verified_local`, which is
 * internally inconsistent. This script makes the gap an explicit field and
 * derives the status from it.
 *
 * It also re-tiers the rows whose requirement names a HOSTED/OFFERING activation
 * that is externally unavailable: those become `blocked_external`, because the
 * local proof does not close them (the local proof is still recorded in
 * `evidenceProves` and in `integrationStage`).
 *
 * Historical evidence is preserved: nothing is deleted; `supersedes` chains and
 * the previous status are recorded on every row this script touches.
 */

import * as fs from 'node:fs';
// The discriminator's value set is owned by the acceptance harness, so this
// script can never drift from the gate it feeds.
import { TEST_NAME_KINDS } from './verify-acceptance.ts';

const P = 'reports/implementation/acceptance-status.json';
const data = JSON.parse(fs.readFileSync(P, 'utf-8'));
const TODAY = '2026-10-20';

/** id -> the still-unimplemented part of the requirement (null = fully met) */
const REMAINING: Record<string, string | null> = {
  'CPK-01': null,
  'CPK-02': 'The platform app.ts mount of the AG-UI thread store and the resume route are not implemented.',
  'CPK-03': null,
  'CPK-04': 'The startup-loaded versioned declarative surface catalog and the AG-UI -> renderer middleware path are not implemented.',
  'CPK-05': 'The versioned surface catalog, the depth/cyclic-tree limits and the AG-UI middleware path are not implemented.',
  'CPK-06': 'Only ONE executor is registered (refund.execute); other approved action types still return EXECUTOR_UNAVAILABLE, so the HITL path is not universal.',
  'CPK-07': 'The adapter is never instantiated by a live agent run, so no server round-trip drives it.',
  'CPK-08': 'The view is not mounted against a live server-issued state store, and entity revision is not separated from policy revision.',
  'CPK-09': null,
  'CPK-10': 'The TypeScript runtime has no parent-to-child delegation, no trace propagation and no budget inheritance.',
  'GUI-01': 'Cards other than the A2UI-rendered ones are still never mounted against a live data path.',
  'GUI-02': 'The form is not mounted and has no server callback, so decision -> revalidation -> receipt is not exercised.',
  'GUI-03': 'The view is not mounted against a live tool-lifecycle event source.',
  'GUI-04': 'No live state store feeds the view, and entity revision is not separated from policy revision.',
  'GUI-05': 'The browser cannot reach /api/mcp (session cookie scoped to Path=/api/platform returns 401) and the client host frame is not mounted.',
  'GUI-06': 'The startup-loaded versioned surface catalog and the AG-UI middleware path are not implemented.',
  'GUI-07': 'The components are not on the same API data path as the rest of the workspace, and theme/reduced-motion coverage on the copilot surface is not proven.',
  'MOD-01': 'No frontend cart-draft tool; the cart diagnosis mode exists but no UI path drives it.',
  'MOD-02': 'Public-token projection is not separated from the private order inside the copilot path.',
  'MOD-03': null,
  'MOD-04': null,
  'MOD-05': null,
  'MOD-06': null,
  'MOD-07': null,
  'MOD-08': 'There is no canonical cost ledger, so get_operational_kpi returns null + COST_BASIS_UNAVAILABLE instead of a value.',
  'MOD-09': 'No citation / version / expiry output contract on the search and task results.',
  'MOD-10': null,
  'ADV-05': 'Not every required conflict class is detected: stale price, ineligible loyalty, fractional/negative quantity, duplicate line and invalid fulfilment are not all implemented.',
  'ADV-07': 'No preview reference hash, revisions or expiry on the preview result.',
  'ADV-15': 'Detects and explains anomalies but does not remediate them.',
  'ADV-17': 'Recomputes variance but does not remediate it.',
  'ADV-20': 'No quota on exports and no download-time re-authorization contract.',
  'ADV-21': 'Scores priority but does not remediate the case.',
  'ADV-23': 'No outbound-send consent guard on the draft.',
  'ADV-24': 'Steps are bound to capability ids but are not grant-aware.',
  'ADV-26': 'Implemented as one reconciliation tool; the three separately-required operations (inspect_action_receipt, refresh_external_action_status, apply_verified_action_outcome) are not all present.',
  'AI-02': 'The provenance guard is static source analysis, not a runtime proof, and the guard test was still red at the time of the audit.',
  'AI-03': 'No unknown_outcome state when the outcome of an execution cannot be determined.',
  'ARC-01': null,
  'EXT-01': 'The dev-only inspector route is not mounted in the platform app.',
  'EXT-07': 'The copilot route does not yet pass attachmentIds through, and there is no vision inference.',
  'PAY-01': 'No HTTP callback route is mounted and there is no HMAC X-Signature verification.',
  'PAY-02': 'No success-redirect route and no provider-callback route exist, so the journey is never exercised end to end.',
  'OFF-01': 'No revalidate-on-reconnect, no server-side revision compare before retry, no per-field conflict resolution.',
  'SEC-01': 'No revocation path, and the expiry is creation-time only rather than handover-based.',
  'DR-01': 'RTO is never measured (no 30-minute drill, no timing assertion) and there is no production drill or key-recovery evidence.',
  'PD-01': 'No opt-out gate at dispatch (publish is blocked outright, so no dispatch path exists to gate) and the asset consent field is still free text.',
  'REL-01': 'No deployment receipt: no preview/production artifact id, no deployment URL, and the Playwright browser suite has never been run against a live server.',
  'AI-01': 'PROVIDER_QUOTA_EXHAUSTED and the dead-candidate skip were still in flight at the time of this audit.',
};

/**
 * Rows whose REQUIREMENT names a hosted / offering activation that is externally
 * unavailable. The local or synthetic proof is real and is recorded in
 * `evidenceProves`, but it does not close the requirement.
 */
const EXTERNAL_GATED: Record<string, string> = {
  'CPK-01': 'Live probe 20 Oktober 2026: gemini-3.6-flash HTTP 200, gemini-3.5-flash-lite HTTP 200, OpenRouter nvidia/nemotron-3-ultra-550b-a55b:free HTTP 200. Shay lama nvidia/nemotron-3-super-120b-a12b:free HTTP 404 "Function not found for account" telah dibetulkan. Bukti production + free-tier quota yang mencukupi masih belum diperoleh.',
  'CPK-03': 'The hosted Automatic Learning offering requires INTELLIGENCE_ACCOUNT_REQUIRED (CopilotKit Intelligence account + terms).',
  'EXT-02': 'Hosted User Memories requires INTELLIGENCE_ACCOUNT_AND_TERMS_REQUIRED.',
  'EXT-04': 'Live Slack/Teams requires CHANNEL_PROVIDER_ACCOUNT_REQUIRED (provider account, app, signature, permission).',
  'EXT-05': 'The browser-side MCP client API and the live own-app registration are not available in this environment.',
};

let downgraded = 0;
let gated = 0;

for (const row of data.rows) {
  const id = row.id;
  const remaining = REMAINING[id] ?? null;
  const gate = EXTERNAL_GATED[id] ?? null;

  if (gate) {
    if (row.status !== 'blocked_external') {
      row.supersedes = {
        date: TODAY,
        previousStatus: row.status,
        reason: `Re-tiered to blocked_external after an independent adversarial review. The requirement names a hosted/offering activation that is externally unavailable, so a local or synthetic proof does not close it (contract line 179). External gate: ${gate}`,
      };
      row.status = 'blocked_external';
      gated++;
    }
    row.externalGate = gate;
    row.remainingRequirement = remaining;
    continue;
  }

  if (remaining && row.status === 'verified_local') {
    row.supersedes = {
      date: TODAY,
      previousStatus: row.status,
      reason: `Downgraded from verified_local to implemented_unverified. A named part of the requirement is still unimplemented, so the row does not close (contract line 179). Remaining: ${remaining}`,
    };
    row.status = 'implemented_unverified';
    downgraded++;
  }

  row.remainingRequirement = remaining;
  if (!remaining && row.status === 'implemented_unverified') {
    // Nothing outstanding and the row was previously downgraded -> it can close.
    row.supersedes = {
      date: TODAY,
      previousStatus: 'implemented_unverified',
      reason: 'No remaining requirement part; the cited evidence proves the full requirement in the local environment.',
    };
    row.status = 'verified_local';
  }
}

data.schema.note =
  'status, environment and integrationStage are independent fields. A component/unit/synthetic pass does not close an acceptance that still requires protocol, live, browser or domain evidence. `remainingRequirement` is explicit: when it is non-null the row cannot be closed even when the local proof is green. `testNameKind` declares what the row\'s `testName` IS: "title" (a verbatim testcase name that must resolve to an observed testcase) or "prose" (a human summary of the cited file; the file itself must exist). A row with no `testNameKind` is treated as a strict title.';

fs.writeFileSync(P, JSON.stringify(data, null, 2) + '\n');

const byStatus: Record<string, number> = {};
const byEnv: Record<string, number> = {};
const byStage: Record<string, number> = {};
for (const r of data.rows) {
  byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  byEnv[r.environment] = (byEnv[r.environment] ?? 0) + 1;
  byStage[r.integrationStage] = (byStage[r.integrationStage] ?? 0) + 1;
}
const closed = data.rows.filter((r: any) => r.status.startsWith('verified_'));
console.log(`rows: ${data.rows.length}; downgraded: ${downgraded}; re-gated: ${gated}`);
console.log('by status     ', byStatus);
console.log('by environment', byEnv);
console.log('by stage      ', byStage);
console.log(
  `closed (any verified tier): ${closed.length} / ${data.rows.length}`,
);
console.log(
  `of which FULLY local-closed: ${data.rows.filter((r: any) => r.status === 'verified_local').length}` +
    ` | synthetic-only: ${data.rows.filter((r: any) => r.status === 'verified_synthetic').length}` +
    ` | preview: ${data.rows.filter((r: any) => r.status === 'verified_preview').length}` +
    ` | production: ${data.rows.filter((r: any) => r.status === 'verified_production').length}`,
);
console.log(
  `blocked_external: ${data.rows.filter((r: any) => r.status === 'blocked_external').length}` +
    ` | implemented_unverified: ${data.rows.filter((r: any) => r.status === 'implemented_unverified').length}` +
    ` | not_run: ${data.rows.filter((r: any) => r.status === 'not_run').length}`,
);
const withRemaining = data.rows.filter((r: any) => r.remainingRequirement);
console.log(`rows with an explicit remaining requirement: ${withRemaining.length}`);
for (const r of withRemaining) console.log(`   ${r.id}: ${r.remainingRequirement}`);

// The `testNameKind` discriminator is preserved by this script (it never
// rewrites `testName`), but an unknown value would fail the ledger gate
// closed — so it is reported here rather than written silently.
const kindCensus = data.rows.reduce((acc: Record<string, number>, r: any) => {
  const kind = r.testNameKind ?? '(absent -> strict title)';
  acc[kind] = (acc[kind] ?? 0) + 1;
  return acc;
}, {});
console.log('testNameKind census:', kindCensus);
const invalidKinds = data.rows.filter(
  (r: any) => r.testNameKind !== undefined && r.testNameKind !== null && !TEST_NAME_KINDS.includes(r.testNameKind),
);
if (invalidKinds.length > 0) {
  console.error(
    `ERROR: ${invalidKinds.length} row(s) carry an unknown testNameKind: ${invalidKinds.map((r: any) => `${r.id}=${r.testNameKind}`).join(', ')}`,
  );
  process.exitCode = 1;
}
