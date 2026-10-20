/**
 * Reschema the acceptance ledger to the CANONICAL contract vocabulary.
 *
 * Authority: docs/prompts/AGENT-EXECUTION-CONTRACT.md:166-168 and :179, :185
 *   - canonical status enum:
 *     not_started | in_progress | implemented_unverified | verified_synthetic |
 *     verified_local | verified_preview | verified_production | blocked_external |
 *     failed | not_run | superseded
 *   - `integrationStage` is a SEPARATE field:
 *     designed | component_present | sdk_wired | protocol_verified |
 *     live_verified | release_verified
 *   - receipts must carry canonical `status` AND `environment`:
 *     documentation | synthetic | local | preview | production
 *   - "Source presence ialah observation, bukan verified_synthetic."
 *   - "Component/unit/synthetic pass tidak menutup acceptance yang masih
 *      memerlukan protocol/live/browser/domain evidence."
 *   - "Nyatakan progress sebagai acceptance closed/total mengikut kategori;
 *      jangan mengira percentage keseluruhan yang mencampurkan documentation,
 *      source presence, local dan production."
 *
 * The previous ledger used a single `implemented_verified` enum, which collapsed
 * four contract tiers into one and let a synthetic-only proof read as a full
 * acceptance. This script replaces it with the canonical vocabulary and records,
 * per row, exactly WHAT the cited evidence proves.
 *
 * Run once. Safe to re-run (it is idempotent over its own output).
 */

import * as fs from 'node:fs';

type Status =
  | 'not_started'
  | 'in_progress'
  | 'implemented_unverified'
  | 'verified_synthetic'
  | 'verified_local'
  | 'verified_preview'
  | 'verified_production'
  | 'blocked_external'
  | 'failed'
  | 'not_run'
  | 'superseded';

type Env = 'documentation' | 'synthetic' | 'local' | 'preview' | 'production';
type Stage =
  | 'designed'
  | 'component_present'
  | 'sdk_wired'
  | 'protocol_verified'
  | 'live_verified'
  | 'release_verified';

const P = 'reports/implementation/acceptance-status.json';
const data = JSON.parse(fs.readFileSync(P, 'utf-8'));

/** id -> [status, environment, integrationStage, whatTheEvidenceProves] */
const DECISION: Record<string, [Status, Env, Stage, string]> = {
  // ---- CPK ----------------------------------------------------------------
  'CPK-01': ['implemented_unverified', 'local', 'sdk_wired', 'The local runtime contract is verified by a deterministic mock transport (real call path, actor gate, 3-call budget, failover, deadline, token caps, truthful unavailable, no echo). The LIVE provider round trip is NOT proven: the pinned primary candidate answers HTTP 429 and the third candidate answers HTTP 404. A live_verified stage is therefore NOT claimed.'],
  'CPK-02': ['implemented_unverified', 'local', 'protocol_verified', 'The AG-UI protocol is verified at the event level (RUN_STARTED / TEXT_MESSAGE_* / RUN_FINISHED from the official @copilotkit/runtime) and the local thread persistence / replay / re-authorise-on-restore layer is implemented and tested. The platform app.ts mount of the thread store and resume route is still pending, and the hosted cross-device half is externally gated.'],
  'CPK-03': ['blocked_external', 'local', 'protocol_verified', 'The LOCAL learning pipeline is real and proven end to end (evidence -> insight -> candidate -> runnable evaluation -> HUMAN publish gate -> version-pinned delivery -> rollback), including a candidate that fails evaluation being unpublishable. The contract additionally requires the actual hosted Automatic Learning offering, which is externally gated: INTELLIGENCE_ACCOUNT_REQUIRED. Local implementation is not the same as the offering, so this row is NOT closed.'],
  'CPK-04': ['verified_local', 'local', 'component_present', 'The A2UI renderer and allowlist are real and tested, and the server-emitted payloads now come from real store reads (no fabricated financial constants). The declarative surface catalog and the AG-UI middleware path are not implemented.'],
  'CPK-05': ['verified_local', 'local', 'component_present', 'The per-component prop allowlist and the canonical component allowlist are real and tested. The startup-loaded versioned surface catalog, depth/cyclic-tree limits and the AG-UI -> renderer middleware path are NOT implemented, so this row is not fully closed.'],
  'CPK-06': ['implemented_unverified', 'local', 'protocol_verified', 'The approval -> CAS -> executor -> durable receipt chain is real and proven for the one registered executor (refund.execute), including idempotent replay, revocation, expiry, scope binding and nonce checks. It is not universal: other approved action types still return EXECUTOR_UNAVAILABLE.'],
  'CPK-07': ['implemented_unverified', 'local', 'component_present', 'The adapter logic (allowlist, duplicate rejection, limit) is real and tested, but the adapter is never instantiated by a live agent run, so no server round-trip drives it.'],
  'CPK-08': ['implemented_unverified', 'local', 'component_present', 'Scope-clearing and authority-field stripping are real and tested, but the view is not mounted against a live server-issued state store and revision separation from entity/policy revision is not implemented.'],
  'CPK-09': ['verified_local', 'local', 'component_present', 'The shared run/thread identity is real and proven: the Pet and the workspace resolve to the same run and thread, the client id is declared a correlation label only, and the controller downgrades trust irreversibly. The untrusted-transcript path and the shared controller are both covered.'],
  'CPK-10': ['implemented_unverified', 'local', 'protocol_verified', 'Real Google ADK delegation exists on the Python side and is proven by a live AG-UI transcript (master -> transfer_to_agent -> specialist). The TypeScript runtime has no parent-to-child delegation, no trace propagation and no budget inheritance, so the row is not fully closed.'],
  // ---- GUI ----------------------------------------------------------------
  'GUI-01': ['verified_local', 'local', 'component_present', 'Display-only card rendering contracts are real and tested (13 tests). Cards are rendered by the A2UI renderer with server payloads that now come from real store reads.'],
  'GUI-02': ['implemented_unverified', 'local', 'component_present', 'Input validation and the double-submission gate are real and tested, but the form is not mounted and has no server callback, so decision -> revalidation -> receipt is not exercised.'],
  'GUI-03': ['implemented_unverified', 'local', 'component_present', 'Status wording, no-raw-error-leak and XSS safety are real and tested, but the view is not mounted against a live tool-lifecycle event source.'],
  'GUI-04': ['implemented_unverified', 'local', 'component_present', 'Scoped state rendering contracts are real and tested, but no live state store feeds the view and entity revision is not separated from policy revision.'],
  'GUI-05': ['implemented_unverified', 'local', 'protocol_verified', 'The MCP protocol is genuinely verified: initialize, tools/list, tools/call, resources/list, resources/read over the official SDK, with a ui:// MCP-App resource carrying real ext-apps metadata and a CSP. The browser cannot reach it yet (the session cookie is scoped to Path=/api/platform so /api/mcp returns 401) and the client host frame is not mounted.'],
  'GUI-06': ['verified_local', 'local', 'component_present', 'The allowlist, per-component prop allowlist, inert rendering, depth limit, size limit and prototype-pollution rejection are real and tested. The startup-loaded versioned surface catalog and the AG-UI middleware path are not implemented.'],
  'GUI-07': ['verified_local', 'local', 'component_present', 'Design-token and accessible-region contracts are real and tested. The components are mounted in the copilot surface.'],
  // ---- MOD ----------------------------------------------------------------
  'MOD-01': ['verified_local', 'local', 'component_present', 'Catalogue, cart draft and a REAL checkout conflict (stock short -> STOK_MENCUKUPI) are proven against a real in-memory store with a real published product, lot and order.'],
  'MOD-02': ['verified_local', 'local', 'component_present', 'Order status and consignment tracking are proven against a seeded real bus_shipments record, and the unknown-record path returns NOT_FOUND rather than a fabricated status.'],
  'MOD-03': ['verified_local', 'local', 'component_present', 'Available units, reservation expiry rollback and quarantine exclusion from saleable stock are proven against real records.'],
  'MOD-04': ['verified_local', 'local', 'component_present', 'The JEV assessment path and a DRAFT-ONLY refund proposal are proven against a real store: the order, balance and ledgers are proven unchanged by the proposal.'],
  'MOD-05': ['verified_local', 'local', 'component_present', 'Commission summary is COMPUTED from a seeded ledger including a contra-reversal, and the other org is proven not to leak.'],
  'MOD-06': ['verified_local', 'local', 'component_present', 'Points balance, tier status and integer-sen conversion are computed from a seeded ledger, the float case is proven to floor rather than round, and the no-ledger path refuses to invent a tier.'],
  'MOD-07': ['verified_local', 'local', 'component_present', 'The FIN-01 margin gate is proven against the canonical evaluator: below-25% is blocked, exactly-25% passes, the cash minimum is enforced separately, and a founder override is recorded.'],
  'MOD-08': ['verified_local', 'local', 'component_present', 'Day-close and the finance digest are computed from seeded canonical records.'],
  'MOD-09': ['verified_local', 'local', 'component_present', 'Task proposal (not created) and SOP search are proven against canonical records.'],
  'MOD-10': ['verified_local', 'local', 'component_present', 'Automation job and integration behaviour are proven. The external publish/send transports are explicitly local stubs that report no external effect, which is the honest contract.'],
  // ---- ADV ----------------------------------------------------------------
  'ADV-01': ['verified_local', 'local', 'component_present', 'discover_capabilities reports the LIVE registry (32 registrations) and honours the role filter.'],
  'ADV-02': ['verified_local', 'local', 'component_present', 'search_records performs a scoped search over canonical records and rejects unknown input keys.'],
  'ADV-03': ['verified_local', 'local', 'component_present', 'build_context_bundle assembles a record bundle with the record ids and revisions actually read.'],
  'ADV-04': ['verified_local', 'local', 'component_present', 'explain_record derives facts and reason codes from one real record.'],
  'ADV-05': ['verified_local', 'local', 'component_present', 'diagnose_checkout is proven in BOTH modes: order-scoped and cart-scoped, and it detects a REAL stock conflict rather than returning unconditional valid:true.'],
  'ADV-06': ['verified_local', 'local', 'component_present', 'reconcile_payments reports ledger-vs-order drift from real records.'],
  'ADV-07': ['verified_local', 'local', 'component_present', 'preview_refund computes the largest-remainder allocation and the real residual drift; the old simulated_ok / zero-drift constant is gone.'],
  'ADV-08': ['verified_local', 'local', 'component_present', 'propose_refund creates a durable proposal with a real id, and the order, balance and ledgers are proven unchanged.'],
  'ADV-09': ['verified_local', 'local', 'component_present', 'assess_expiry_risk computes expiry and value at risk from real lots.'],
  'ADV-10': ['verified_local', 'local', 'component_present', 'plan_restock derives from the approved dealer policy and real lots.'],
  'ADV-11': ['verified_local', 'local', 'component_present', 'trace_batch traverses real lot movements, QC and receipts.'],
  'ADV-12': ['verified_local', 'local', 'component_present', 'propose_quarantine produces a reviewable draft and leaves the lot untouched.'],
  'ADV-13': ['verified_local', 'local', 'component_present', 'simulate_campaign uses the canonical margin evaluator with BigInt basis points; the 25.000% boundary is exact.'],
  'ADV-14': ['verified_local', 'local', 'component_present', 'explain_commission reads the real ledger, policy and derived benefit.'],
  'ADV-15': ['verified_local', 'local', 'component_present', 'audit_loyalty reconciles a FIFO balance and reports anomalies.'],
  'ADV-16': ['verified_local', 'local', 'component_present', 'assess_referral evaluates validity, blocks self-referral and computes a fraud score.'],
  'ADV-17': ['verified_local', 'local', 'component_present', 'reconcile_dayclose recomputes expected cash and reports variance.'],
  'ADV-18': ['verified_local', 'local', 'component_present', 'build_finance_digest produces a real scoped finance summary.'],
  'ADV-19': ['verified_local', 'local', 'component_present', 'trace_transaction links payment to order, commission, loyalty and movements.'],
  'ADV-20': ['verified_local', 'local', 'component_present', 'export_report builds a real report and records a durable artifact with a hash.'],
  'ADV-21': ['verified_local', 'local', 'component_present', 'triage_case scores priority from payment, fulfilment, age and evidence.'],
  'ADV-22': ['verified_local', 'local', 'component_present', 'plan_consignment derives outstanding, settled and returns from real ledgers.'],
  'ADV-23': ['verified_local', 'local', 'component_present', 'draft_customer_reply drafts from real facts and does not deliver.'],
  'ADV-24': ['verified_local', 'local', 'component_present', 'build_action_plan binds steps to real capability ids.'],
  'ADV-25': ['verified_local', 'local', 'protocol_verified', 'The POSITIVE path is proven: a proposal approved through the ApprovalService executes through the real executor and produces a durable receipt with a real id, with idempotent replay returning the ORIGINAL receipt. The NEGATIVE path is also proven (EXECUTOR_UNAVAILABLE, no fabricated receipt) for the no-approval case.'],
  'ADV-26': ['verified_local', 'local', 'component_present', 'reconcile_action reports receipt vs live order/payment drift.'],
  'ADV-27': ['verified_local', 'local', 'component_present', 'inspect_runtime reports real runtime, job and approval health.'],
  'ADV-28': ['verified_local', 'local', 'protocol_verified', 'The existing 6-check reviewer is CALLED through the tool registry (not duplicated) and the promotion path behind it exists behind a human gate with a runnable evaluation.'],
  'ADV-29': ['verified_local', 'local', 'component_present', 'search_sop reads approved knowledge and QC SOPs.'],
  'ADV-30': ['verified_local', 'local', 'component_present', 'propose_task validates entity scope and assignee and does not create the task.'],
  'ADV-31': ['verified_local', 'local', 'component_present', 'evaluate_job_retry derives eligibility from status, attempt, lease and reason code.'],
  'ADV-32': ['verified_local', 'local', 'component_present', 'draft_campaign drafts, simulates the canonical margin against live prices, and does not publish.'],
  // ---- Master -------------------------------------------------------------
  'FIN-01': ['verified_local', 'local', 'component_present', 'Both margin gates are proven: the amount threshold, the 25.000% ratio boundary (24.996% blocked), the zero-sales guard and the staff-vs-founder override.'],
  'PAY-01': ['blocked_external', 'local', 'component_present', 'The reconciler class is real and proven (dedupe, mismatch rejection, late payment, no oversell), but there is NO HTTP callback route mounted and no HMAC X-Signature verification, so the class is unreachable in production. The live provider side additionally needs a Billplz sandbox credential.'],
  'PAY-02': ['blocked_external', 'local', 'component_present', 'The domain rule (PAYMENT_NOT_VERIFIED) is proven, but there is no success-redirect route and no provider-callback route, so the journey is never exercised end to end. The live provider side additionally needs a Billplz sandbox credential.'],
  'PAY-03': ['verified_local', 'local', 'component_present', 'Largest-remainder allocation is proven to sum exactly to the total with 0-cent drift, cumulative contra is tracked, and replay is idempotent.'],
  'STK-01': ['verified_local', 'local', 'component_present', 'Available units, reservation expiry rollback, FEFO consume and quarantine exclusion from saleable stock are proven against real records.'],
  'OFF-01': ['implemented_unverified', 'local', 'component_present', 'The client-side request fingerprint, Idempotency-Key and PENDING_RECONCILIATION gate are real and tested, but there is no revalidate-on-reconnect, no server-side revision compare before retry and no per-field conflict resolution.'],
  'REF-01': ['not_run', 'documentation', 'designed', 'No risk engine, no OTP, no device/velocity/age signals, no reason codes and no appeal path exist. Only referral-code syntax validation is implemented, and that belongs to REF-02.'],
  'REF-02': ['verified_local', 'local', 'component_present', 'Referral validation and self-referral rejection are proven, and dealer and customer rewards use separate ledgers.'],
  'LOY-01': ['verified_local', 'local', 'component_present', 'Atomic redemption, expiry boundary and idempotent reversal are proven against a real ledger.'],
  'SEC-01': ['implemented_unverified', 'local', 'component_present', 'Token generation, at-rest hashing, expiry rejection and non-leakage are proven, but there is NO revocation path and the expiry is creation-time only rather than handover-based.'],
  'SEC-02': ['verified_local', 'local', 'component_present', 'Per-org dealer scoping is proven, and the revoked-membership gate is now enforced (membership.status === "active") with a regression test.'],
  'DR-01': ['implemented_unverified', 'local', 'component_present', 'Transactional backup, evidence-hash verification and restore with PRAGMA integrity_check are proven, but RTO is never MEASURED (no 30-minute drill, no timing assertion) and there is no production drill or key-recovery evidence.'],
  'AI-01': ['implemented_unverified', 'local', 'protocol_verified', 'The runtime model router is real: strict candidate order, a 3-call budget counting every attempt, a deadline, token caps and a free-only policy. The LEGACY server/platform/freeModelRouter fallback was corrected to attribute its locally derived answer to local_rules instead of a live provider, but the PROVIDER_QUOTA_EXHAUSTED reason code and the dead-candidate skip are still in flight.'],
  'AI-02': ['implemented_unverified', 'local', 'component_present', 'The fabricated constants in adkAgent.ts, domainTools.ts, operationsBrief.ts and runtimeTransports.ts were replaced with real reads and a static CI guard now fails the build on 17 banned values, on a numeric literal assigned to a computed-result key, and on an unbacked provenance.source. The guard test itself is still RED and the guard is static analysis, not a runtime proof.'],
  'AI-03': ['verified_local', 'local', 'protocol_verified', 'Expiry, already-decided, founder-only and the no-fabricated-receipt rule are proven, and the approval path now carries a real CAS, a real executor and a durable receipt.'],
  'PD-01': ['implemented_unverified', 'local', 'component_present', 'Preference and consent storage are real, and the telemetry collector now has an allowlist, opt-out and delete. But there is NO opt-out gate at dispatch (publish is blocked outright, so no dispatch path exists to gate) and the asset consent field is still free text.'],
  'OPS-01': ['verified_local', 'local', 'component_present', 'Quarantine is proven to exclude saleable stock from other batches, returns move to HQ quarantine, and movements are recorded.'],
  'ARC-01': ['verified_local', 'local', 'protocol_verified', 'The checker was rewritten on the TypeScript compiler API and is driven by eleven committed negative fixture trees (multiline import, dynamic import, deep relative, aliased, shared->client, feature->app, feature->foreign-feature, a real module-interface cycle, and a clean control). The two stale removalBatch 03B exceptions were re-based to 01D, with a guard that fails the build if an exception names a completed phase. The one remaining real cycle (server/platform <-> server/automation) is registered with an owner and a removal batch.'],
  'REL-01': ['implemented_unverified', 'local', 'component_present', 'The production build, the fail-closed runtime config and the Vercel entry are real and tested, but there is NO deployment receipt: no preview/production artifact id, no deployment URL, and the Playwright browser suite has never been run against a live server.'],
  // ---- EXT ----------------------------------------------------------------
  'EXT-01': ['implemented_unverified', 'local', 'component_present', 'The inspector, its redaction rules and its production refusal are real and tested, but the dev-only route is not mounted in the platform app.'],
  'EXT-02': ['verified_local', 'local', 'component_present', 'The LOCAL memory store is real and proven: provenance, the consent gate, sensitive-field refusal, retention and per-user delete. The hosted User Memories offering is externally gated, so this row proves the local path only.'],
  'EXT-03': ['verified_local', 'local', 'component_present', 'The telemetry collector is real: the 40-row mock seed is gone, the prohibited fields (user_query, tokens_used) no longer exist in the schema, and the allowlist, opt-out, delete and single-write-path behaviours are proven.'],
  'EXT-04': ['verified_synthetic', 'synthetic', 'sdk_wired', 'The channel ADAPTER contract is real and proven on a synthetic transport (send, inbound receive, conversation->thread mapping, HMAC signature check, staleness window, permission check). The test name itself says synthetic: this is a contract proof, NOT a live Slack/Teams activation and NOT a delivery. Live activation is externally gated by CHANNEL_PROVIDER_ACCOUNT_REQUIRED.'],
  'EXT-05': ['implemented_unverified', 'local', 'component_present', 'The browser support probe, the typed WEBMCP_BROWSER_UNSUPPORTED outcome and the grant model are real and tested, but the browser MCP client API and the tool registration against the own-app surface are not wired.'],
  'EXT-06': ['verified_local', 'local', 'component_present', 'The browser Web Speech path is real and proven: the mic permission indicator, one-click revoke, the shared run identity with the copilot thread, the untrusted-transcript marking and the processing-location disclosure. No external STT/TTS is claimed.'],
  'EXT-07': ['implemented_unverified', 'local', 'component_present', 'The upload security model and the attachment reference surface (hash, permission, revocation) are real and tested, and a revoked attachment fails the whole reference set. The copilot route does not yet pass attachmentIds through and there is NO vision inference, which is externally gated.'],
};

const unknown = Object.keys(DECISION).filter(
  (id) => !data.rows.some((r: any) => r.id === id),
);
if (unknown.length) {
  console.error(`DECISION has ids not present in the ledger: ${unknown.join(', ')}`);
  process.exit(1);
}

let changed = 0;
for (const row of data.rows) {
  const d = DECISION[row.id];
  if (!d) {
    console.error(`no decision for ${row.id}`);
    process.exit(1);
  }
  const [status, environment, integrationStage, whatItProves] = d;
  if (row.status !== status || row.environment !== environment || row.integrationStage !== integrationStage) changed++;
  row.status = status;
  row.environment = environment;
  row.integrationStage = integrationStage;
  row.evidenceProves = whatItProves;
  delete row.testKind;
}

data.schema = {
  authority: 'docs/prompts/AGENT-EXECUTION-CONTRACT.md:166-168,179,185',
  statusEnum: [
    'not_started',
    'in_progress',
    'implemented_unverified',
    'verified_synthetic',
    'verified_local',
    'verified_preview',
    'verified_production',
    'blocked_external',
    'failed',
    'not_run',
    'superseded',
  ],
  environmentEnum: ['documentation', 'synthetic', 'local', 'preview', 'production'],
  integrationStageEnum: [
    'designed',
    'component_present',
    'sdk_wired',
    'protocol_verified',
    'live_verified',
    'release_verified',
  ],
  note: 'status, environment and integrationStage are independent fields. A component/unit/synthetic pass does not close an acceptance that still requires protocol, live, browser or domain evidence.',
};

fs.writeFileSync(P, JSON.stringify(data, null, 2) + '\n');

const byStatus: Record<string, number> = {};
const byEnv: Record<string, number> = {};
const byStage: Record<string, number> = {};
for (const r of data.rows) {
  byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  byEnv[r.environment] = (byEnv[r.environment] ?? 0) + 1;
  byStage[r.integrationStage] = (byStage[r.integrationStage] ?? 0) + 1;
}
console.log(`rows: ${data.rows.length}; changed: ${changed}`);
console.log('by status   ', byStatus);
console.log('by environment', byEnv);
console.log('by stage    ', byStage);

// Per-category counters, per contract line 185: never one blended percentage.
const core = data.rows.filter((r: any) => r.tier === 'core');
const ext = data.rows.filter((r: any) => r.tier === 'extension');
const closed = (r: any) => r.status.startsWith('verified_');
const tally = (rows: any[]) => ({
  total: rows.length,
  closed: rows.filter(closed).length,
  verified_synthetic: rows.filter((r: any) => r.status === 'verified_synthetic').length,
  verified_local: rows.filter((r: any) => r.status === 'verified_local').length,
  verified_preview: rows.filter((r: any) => r.status === 'verified_preview').length,
  verified_production: rows.filter((r: any) => r.status === 'verified_production').length,
  implemented_unverified: rows.filter((r: any) => r.status === 'implemented_unverified').length,
  blocked_external: rows.filter((r: any) => r.status === 'blocked_external').length,
  not_run: rows.filter((r: any) => r.status === 'not_run').length,
});
console.log('core', tally(core));
console.log('ext ', tally(ext));
