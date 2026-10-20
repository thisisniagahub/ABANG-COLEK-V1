/**
 * Acceptance Register Renderer — ABANGCOLEK v2.4
 *
 * Renders the acceptance register + checklist counters from ONE machine-readable
 * source of truth (`reports/implementation/acceptance-status.json`) plus the
 * machine-derived verification output
 * (`reports/implementation/acceptance-verification.json`).
 *
 * Why this exists
 * ---------------
 * The previous register was hand-written and overstated 78-row coverage by ~55
 * rows: it marked all 32 ADV capabilities `verified_local` while the registry
 * registered 6, and it cited `package.json` as a test path. A hand-maintained
 * ledger cannot be audited. This renderer makes the ledger DERIVED, and the
 * validator below makes an unsupported claim a hard error.
 *
 * Rules enforced by construction
 * -------------------------------
 *  - Every one of the 85 acceptance IDs must be present. A missing ID is an error.
 *  - A row may only claim `implemented_verified` if it names a real test file
 *    AND that test file belongs to a suite that was observed green in the
 *    verification run. A row pointing at a red or absent suite cannot be
 *    `implemented_verified` — the renderer downgrades it and reports it.
 *  - The named `testName` must be a testcase that ACTUALLY RAN in the cited
 *    file. A name that matches no observed testcase is a hard error — UNLESS
 *    the row declares `testNameKind: "prose"`, in which case the `testName` is
 *    a human summary and is never resolved; the cited FILE must then exist on
 *    disk and must itself have been observed green. A row with NO
 *    `testNameKind` is treated as `"title"` (strict), so the rule keeps its
 *    force until the ledger is migrated row by row.
 *  - The cited test file must belong to the acceptance AREA the row claims.
 *  - The cited test file must have actually executed tests: zero executed
 *    tests, execution errors, skipped tests, or assertion failures all reject
 *    the claim.
 *  - Every `evidenceRef` must resolve to a file that exists under the repo root.
 *  - The receipt must be BOUND to one source tree (`sourceStable === true`) and,
 *    when the register declares a `sourceManifest`, that manifest must equal the
 *    observed one.
 *  - `blocked_external` requires a non-empty `externalGate` string.
 *  - `partial` requires a non-empty `gap`.
 *  - A row must cite at least one `evidenceRef`.
 *
 * Usage:
 *   bun scripts/maintenance/render-acceptance-register.ts [--check] [--out <md>]
 *
 *   --check   Validate only; exit 1 if any rule is violated. Does not write.
 *
 * The register is written ONLY when validation produced zero errors, and it is
 * written ATOMICALLY (temp file in the same directory + rename), so a failing
 * run can never overwrite the canonical register and a crash can never leave a
 * truncated one behind.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  matchTestCase,
  parseTestNameKind,
  writeFileAtomic,
  type ParsedTestNameKind,
  type TestCaseRecord,
  type TestNameKind,
} from './verify-acceptance.ts';

export type AcceptanceStatus =
  | 'implemented_verified'
  | 'implemented_unverified'
  | 'partial'
  | 'not_run'
  | 'blocked_external';

export type AcceptanceTier = 'core' | 'extension';

export interface AcceptanceRow {
  id: string;
  tier: AcceptanceTier;
  title: string;
  status: AcceptanceStatus;
  /** The status string exactly as it appeared in the status file. */
  statusRaw: string;
  source: string;
  testFile: string | null;
  testName: string | null;
  /**
   * How `testName` must be treated:
   *   - `"title"` — the verbatim name of a testcase; it MUST resolve to an
   *     observed testcase in `testFile`.
   *   - `"prose"` — a human summary; it is never resolved, and `testFile` must
   *     exist on disk instead.
   *   - `null` — the ledger did not say; treated as `"title"` (strict).
   */
  testNameKind?: TestNameKind | null;
  /** The raw `testNameKind` value exactly as found in the ledger. */
  testNameKindRaw?: string | null;
  testKind: 'real' | 'fixture' | 'none';
  gap: string | null;
  externalGate: string | null;
  evidenceRefs: string[];
  /** Preserved but not interpreted — the orchestrator owns these fields. */
  environment?: string | null;
  integrationStage?: string | null;
  supersedes?: { date: string; previousStatus: string; reason: string };
}

export interface AcceptanceStatusFile {
  generatedAt: string;
  sourceCommit: string;
  /** Optional source-tree digest the register was written against. */
  sourceManifest?: string | null;
  rows: AcceptanceRow[];
}

export interface FileResultLite {
  file: string;
  tests: number;
  failures: number;
  errors?: number;
  skipped?: number;
  assertions: number;
  testCases?: TestCaseRecord[];
}

export interface SuiteObservationLite {
  id: string;
  command: string;
  exitCode: number | null;
  status: 'pass' | 'fail' | 'unavailable';
  passCount: number | null;
  failCount: number | null;
  expectCount: number | null;
  filesScanned: number | null;
  summary: string;
  reason?: string;
  fileResults?: FileResultLite[];
}

export interface VerificationLite {
  generatedAt: string;
  gitCommit: string | null;
  gitBranch: string | null;
  gitDirty: boolean | null;
  sourceManifestBefore?: { digest: string; fileCount: number } | null;
  sourceManifestAfter?: { digest: string; fileCount: number } | null;
  sourceStable?: boolean;
  suites: SuiteObservationLite[];
  totals: {
    suitesRun: number;
    suitesPassed: number;
    suitesFailed: number;
    suitesUnavailable: number;
    testsPassed: number;
    testsFailed: number;
    assertions: number;
  };
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  action: string;
}

export const ALL_IDS: string[] = [
  ...Array.from({ length: 10 }, (_, i) => `CPK-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `GUI-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, i) => `MOD-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 32 }, (_, i) => `ADV-${String(i + 1).padStart(2, '0')}`),
  'FIN-01',
  'PAY-01',
  'PAY-02',
  'PAY-03',
  'STK-01',
  'OFF-01',
  'REF-01',
  'REF-02',
  'LOY-01',
  'SEC-01',
  'SEC-02',
  'DR-01',
  'AI-01',
  'AI-02',
  'AI-03',
  'PD-01',
  'OPS-01',
  'ARC-01',
  'REL-01',
  ...Array.from({ length: 7 }, (_, i) => `EXT-${String(i + 1).padStart(2, '0')}`),
];

/* -------------------------------------------------------------------------- */
/* Acceptance areas — the scope check                                          */
/* -------------------------------------------------------------------------- */

/**
 * THE ACCEPTANCE-AREA MAPPING (the scope check)
 * ---------------------------------------------
 * Each acceptance ID prefix (or individual master ID) maps to the set of test
 * directories/files that are allowed to carry its evidence. A row that cites a
 * test file outside its area is rejected: a green but UNRELATED test proves
 * nothing about the row's scope.
 *
 * Entries are repo-relative path PREFIXES. A cited file matches an entry when
 * it equals the entry or continues with `-`, `.` or `/` — so
 * `tests/frontend/gui` matches `tests/frontend/gui01-display-only.test.tsx` but
 * never `tests/frontend/guixyz.test.tsx`.
 */
export interface AcceptanceAreaRule {
  /** Human label of the area, used in the error message. */
  label: string;
  /** Allowed test-file path prefixes. */
  allowed: string[];
}

export const ACCEPTANCE_AREA_RULES: Record<string, AcceptanceAreaRule> = {
  CPK: {
    label: 'Copilot platform (runtime, AG-UI, learning, A2UI, tool adapters)',
    allowed: [
      'tests/platform/copilot',
      'tests/platform/copilotkit-runtime-route',
      'tests/platform/intelligence-agui-threads',
      'tests/platform/intelligence-learning-pipeline',
      'tests/platform/adv-tools-approval-execution',
      'tests/frontend/copilot',
      'tests/frontend/a2ui',
      'tests/frontend/gui02-interactive',
      'tests/frontend/gui03-04-state-tool',
      'tests/frontend/frontend-tool-adapters',
    ],
  },
  GUI: {
    label: 'Generative UI surfaces',
    allowed: [
      'tests/frontend/gui',
      'tests/frontend/copilot-gui',
      'tests/frontend/a2ui',
      'tests/platform/mcp-protocol',
      'tests/platform/copilotkit-runtime-route',
    ],
  },
  MOD: {
    label: 'Copilot domain modules',
    allowed: ['tests/copilot/mod-'],
  },
  ADV: {
    label: 'Advanced tool capabilities',
    allowed: [
      'tests/platform/adv-tools-',
      'tests/platform/advanced-tools-registry',
      'tests/platform/adversarial-m1-integrity',
      'tests/platform/intelligence-learning-pipeline',
    ],
  },
  EXT: {
    label: 'Extension gates',
    allowed: [
      'tests/platform/ext-',
      'tests/ext/ext-',
      'tests/platform/intelligence-ext-local',
      'tests/platform/adversarial-m1-integrity',
    ],
  },
};

/**
 * Master (non-prefixed) acceptance IDs each own a dedicated set of test files.
 */
export const ACCEPTANCE_AREA_BY_ID: Record<string, AcceptanceAreaRule> = {
  'FIN-01': { label: 'Finance / margin', allowed: ['tests/platform/growth-margin', 'tests/platform/finance-review', 'tests/platform/financial-integrity-v24'] },
  'PAY-01': { label: 'Payment reconciliation', allowed: ['tests/platform/payment-reconciliation-v24', 'tests/platform/finance-review'] },
  'PAY-02': { label: 'Payment reconciliation', allowed: ['tests/platform/payment-reconciliation-v24', 'tests/platform/finance-review', 'tests/platform/backend-lifecycle'] },
  'PAY-03': { label: 'Refund allocation', allowed: ['tests/platform/refund-allocation-v24', 'tests/platform/payment-reconciliation-v24'] },
  'STK-01': { label: 'Stock / inventory', allowed: ['tests/copilot/mod-03-inventory', 'tests/platform/domain-tools', 'tests/platform/backend-domains'] },
  'OFF-01': { label: 'Offline / resilience', allowed: ['tests/platform/offline-cache', 'tests/platform/client-session-race', 'tests/platform/client-retry'] },
  'REF-01': { label: 'Referral', allowed: ['tests/copilot/mod-06-loyalty', 'tests/platform/loyalty-redemption'] },
  'REF-02': { label: 'Referral', allowed: ['tests/copilot/mod-06-loyalty', 'tests/platform/loyalty-redemption'] },
  'LOY-01': { label: 'Loyalty', allowed: ['tests/copilot/mod-06-loyalty', 'tests/platform/loyalty-redemption'] },
  'SEC-01': { label: 'Security', allowed: ['tests/copilot/mod-02-orders', 'tests/platform/backend-security', 'tests/platform/host-security'] },
  'SEC-02': { label: 'Security', allowed: ['tests/copilot/mod-05-dealers', 'tests/platform/backend-security', 'tests/platform/host-security', 'tests/platform/agent-runtime'] },
  'DR-01': { label: 'Backup / restore', allowed: ['tests/platform/backup-restore'] },
  'AI-01': { label: 'Agent intelligence', allowed: ['tests/platform/copilot-runtime-pipeline', 'tests/platform/intelligence-learning-pipeline', 'tests/platform/founder-intelligence'] },
  'AI-02': { label: 'Agent intelligence (truthfulness)', allowed: ['tests/platform/provenance-truth-commerce-cancellation', 'tests/platform/provenance-truth-guard', 'tests/platform/founder-intelligence'] },
  'AI-03': { label: 'Agent intelligence (HITL)', allowed: ['tests/platform/hitl-execution-v24', 'tests/platform/agent-runtime'] },
  'PD-01': { label: 'Product decisions / amendments', allowed: ['tests/platform/operational-amendments'] },
  'OPS-01': { label: 'Operations / automation', allowed: ['tests/copilot/mod-03-inventory', 'tests/platform/automation-completion'] },
  'ARC-01': { label: 'Architecture boundaries', allowed: ['tests/architecture/dependency-boundaries'] },
  'REL-01': { label: 'Release readiness', allowed: ['tests/platform/vercel-entry'] },
};

/**
 * Per-ID exceptions: an ID may legitimately cite a file outside its area's
 * default set. Each exception names the exact file.
 */
export const ACCEPTANCE_AREA_EXCEPTIONS: Record<string, string[]> = {
  'ADV-05': ['tests/copilot/mod-01-storefront.test.ts'],
  'ADV-08': ['tests/copilot/mod-04-qc-jev.test.ts'],
};

export function acceptanceAreaFor(id: string): AcceptanceAreaRule | null {
  const byId = ACCEPTANCE_AREA_BY_ID[id];
  if (byId) return byId;
  const prefix = id.split('-')[0];
  return ACCEPTANCE_AREA_RULES[prefix] ?? null;
}

export function allowedTestFilesFor(id: string): string[] {
  const base = acceptanceAreaFor(id);
  if (!base) return [];
  return [...base.allowed, ...(ACCEPTANCE_AREA_EXCEPTIONS[id] ?? [])];
}

/** Does `testFile` fall inside the acceptance area `id` claims? */
export function isFileInAcceptanceArea(id: string, testFile: string): boolean {
  const allowed = allowedTestFilesFor(id);
  if (allowed.length === 0) return false;
  const f = testFile.replace(/\\/g, '/').replace(/^\.\//, '');
  return allowed.some((entry) => {
    const e = entry.replace(/\\/g, '/');
    if (f === e) return true;
    if (!f.startsWith(e)) return false;
    // An entry that already ends in a separator-ish character is a literal
    // prefix (e.g. "tests/platform/adv-tools-"); otherwise the match must stop
    // on a path boundary so "tests/frontend/gui" matches "gui01-…" but never
    // "guixyz".
    if (e.endsWith('-') || e.endsWith('.') || e.endsWith('/')) return true;
    const next = f.charAt(e.length);
    return next === '-' || next === '.' || next === '/' || (next >= '0' && next <= '9');
  });
}

/* -------------------------------------------------------------------------- */
/* Status-file normalisation (tolerates the current and the incoming schema)  */
/* -------------------------------------------------------------------------- */

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value.trim().length > 0 ? value : null;
  if (value === null || value === undefined) return null;
  return String(value);
}

/**
 * Map an arbitrary status string onto the five internal statuses.
 *
 * The incoming canonical contract may use a different vocabulary
 * (e.g. `verified_local`). Anything that claims verification — and is not
 * explicitly "unverified" — is treated as a VERIFIED claim and therefore has to
 * survive the full test-evidence gauntlet. Anything unrecognised is downgraded
 * to `implemented_unverified`, which never asserts verification.
 */
export function canonicalizeStatus(raw: unknown): { status: AcceptanceStatus; known: boolean } {
  const value = asString(raw).trim();
  const lower = value.toLowerCase();
  if (!lower) return { status: 'implemented_unverified', known: false };
  if (lower.includes('unverified')) return { status: 'implemented_unverified', known: true };
  if (lower.includes('verified')) return { status: 'implemented_verified', known: true };
  if (lower.includes('blocked')) return { status: 'blocked_external', known: true };
  if (lower.includes('partial')) return { status: 'partial', known: true };
  if (lower.includes('not_run') || lower.includes('notrun') || lower.includes('not run')) {
    return { status: 'not_run', known: true };
  }
  return { status: 'implemented_unverified', known: false };
}

function normalizeRow(raw: Record<string, unknown>): AcceptanceRow {
  const testBlock = (raw.test ?? {}) as Record<string, unknown>;
  const id = asString(raw.id ?? raw.acceptanceId ?? raw.key).trim();
  const tierRaw = asString(raw.tier).toLowerCase();
  const tier: AcceptanceTier =
    tierRaw === 'extension' || tierRaw === 'ext' ? 'extension' : 'core';
  const statusInfo = canonicalizeStatus(raw.status ?? raw.state ?? raw.verification);
  const testKindRaw = asString(raw.testKind ?? testBlock.kind).toLowerCase();
  const testKind: 'real' | 'fixture' | 'none' =
    testKindRaw === 'real' || testKindRaw === 'fixture' ? testKindRaw : 'none';
  const evidence = raw.evidenceRefs ?? raw.evidence ?? [];
  const evidenceRefs = Array.isArray(evidence)
    ? evidence.map((e) => asString(e)).filter((e) => e.length > 0)
    : [];
  const supersedesRaw = raw.supersedes as Record<string, unknown> | undefined;
  const supersedes =
    supersedesRaw && typeof supersedesRaw === 'object'
      ? {
          date: asString(supersedesRaw.date),
          previousStatus: asString(supersedesRaw.previousStatus),
          reason: asString(supersedesRaw.reason),
        }
      : undefined;

  // THE DISCRIMINATOR — an absent `testNameKind` means STRICT (the `testName`
  // must resolve to an observed testcase). An unrecognised value is kept as
  // raw text so the validator can fail the row closed.
  const rawKind = raw.testNameKind ?? raw.test_name_kind ?? testBlock.nameKind ?? testBlock.testNameKind;
  const parsedKind = parseTestNameKind(rawKind);

  return {
    id,
    tier,
    title: asString(raw.title ?? raw.name ?? raw.requirement),
    status: statusInfo.status,
    statusRaw: asString(raw.status ?? raw.state ?? raw.verification),
    source: asString(raw.source ?? raw.implementation),
    testFile: asStringOrNull(raw.testFile ?? testBlock.file ?? raw.test_file),
    testName: asStringOrNull(raw.testName ?? testBlock.name ?? raw.test_name),
    testNameKind: parsedKind.kind,
    testNameKindRaw: parsedKind.raw,
    testKind,
    gap: asStringOrNull(raw.gap),
    externalGate: asStringOrNull(raw.externalGate ?? raw.external_gate),
    evidenceRefs,
    environment: asStringOrNull(raw.environment),
    integrationStage: asStringOrNull(raw.integrationStage ?? raw.integration_stage),
    ...(supersedes ? { supersedes } : {}),
  };
}

function looksLikeRow(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const id = asString(rec.id ?? rec.acceptanceId ?? rec.key);
  return /^[A-Z]{2,4}-\d{2,3}$/.test(id.trim());
}

/**
 * Normalise the status file. The canonical contract under migration keeps
 * `rows`, but the renderer also finds a row array under an alternative key so a
 * contract migration does not silently produce an empty register.
 */
export function normalizeStatusFile(raw: unknown): AcceptanceStatusFile {
  const rec = (raw ?? {}) as Record<string, unknown>;
  let rowsRaw: unknown[] = [];
  if (Array.isArray(rec.rows)) {
    rowsRaw = rec.rows;
  } else {
    for (const value of Object.values(rec)) {
      if (Array.isArray(value) && value.length > 0 && value.every(looksLikeRow)) {
        rowsRaw = value;
        break;
      }
    }
  }
  const sourceManifestRaw = rec.sourceManifest;
  const sourceManifest =
    typeof sourceManifestRaw === 'string'
      ? sourceManifestRaw
      : sourceManifestRaw && typeof sourceManifestRaw === 'object'
        ? asString((sourceManifestRaw as Record<string, unknown>).digest)
        : null;
  return {
    generatedAt: asString(rec.generatedAt ?? rec.generated_at),
    sourceCommit: asString(rec.sourceCommit ?? rec.source_commit),
    sourceManifest: sourceManifest || null,
    rows: rowsRaw.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(normalizeRow),
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/** Which verification suite a test file belongs to, so a row can be checked against a real run. */
export function suiteForTestFile(testFile: string | null): string | null {
  if (!testFile) return null;
  const f = testFile.replace(/\\/g, '/');
  if (f.startsWith('tests/copilot/')) return 'test:copilot';
  if (f.startsWith('tests/frontend/')) return 'test:frontend';
  if (f.startsWith('tests/architecture/')) return 'test:architecture';
  if (f.startsWith('tests/jev/')) return 'test:jev';
  if (f.startsWith('tests/ext/')) return 'test:ext';
  if (f.startsWith('tests/platform/')) return 'test:platform';
  if (f.startsWith('tests/e2e/')) return 'test:e2e:list';
  if (f.startsWith('tests/landing-brand-theme')) return 'test:landing-brand-theme';
  if (f.startsWith('tests/dashboard-model')) return 'test:dashboard-model';
  return null;
}

/** Strip a trailing `#anchor` from an evidence reference before resolving it. */
export function evidenceRefPath(ref: string): string {
  return ref.split('#')[0].trim();
}

/** True when the reference points outside the repo (an external URL). */
export function isExternalEvidenceRef(ref: string): boolean {
  return /^https?:\/\//i.test(ref.trim());
}

/**
 * Resolve an evidence reference against the repo root and report whether the
 * referenced file actually exists.
 */
export function resolveEvidenceRef(
  repoRoot: string,
  ref: string,
): { exists: boolean; resolved: string; external: boolean } {
  if (isExternalEvidenceRef(ref)) {
    return { exists: true, resolved: ref.trim(), external: true };
  }
  const rel = evidenceRefPath(ref);
  if (!rel) return { exists: false, resolved: ref, external: false };
  const resolved = path.isAbsolute(rel) ? path.resolve(rel) : path.resolve(repoRoot, rel);
  let exists = false;
  try {
    exists = fs.existsSync(resolved);
  } catch {
    exists = false;
  }
  return { exists, resolved, external: false };
}

function describeTestCases(cases: TestCaseRecord[] | undefined, limit = 8): string {
  if (!cases || cases.length === 0) return '(the reporter emitted no testcases for this file)';
  const shown = cases.slice(0, limit).map((c) => `"${c.name}"`);
  const more = cases.length > limit ? ` … (+${cases.length - limit} more)` : '';
  return shown.join(', ') + more;
}

/**
 * Resolve a row's `testNameKind`.
 *
 * The RAW value wins when present (that is what the ledger actually says);
 * otherwise the already-parsed kind is used. An absent kind resolves to
 * `null`, which the validator treats as STRICT ("title").
 */
export function rowTestNameKind(row: {
  testNameKind?: TestNameKind | null;
  testNameKindRaw?: string | null;
}): ParsedTestNameKind {
  const raw = (row.testNameKindRaw ?? '').trim();
  return parseTestNameKind(raw.length > 0 ? raw : row.testNameKind ?? null);
}

/**
 * How a row's `testName` is treated by the ledger gate.
 *
 *   - `title`    — the name MUST resolve to an observed testcase.
 *   - `prose`    — the name is a human summary and is NEVER resolved; the
 *                  cited FILE must exist instead.
 *   - `unresolved`— a strict row whose name matched no observed testcase.
 *   - `invalid`  — the row declares a `testNameKind` this contract does not
 *                  define (fail closed).
 */
export type RowTestNameTreatment =
  | { mode: 'title'; resolved: TestCaseRecord }
  | { mode: 'prose' }
  | { mode: 'unresolved' }
  | { mode: 'invalid' };

/**
 * Classify one row's `testName` against the testcases observed in its file.
 *
 * This is the single place where the discriminator is applied, so the ledger
 * gate and any other consumer cannot drift apart.
 */
export function classifyRowTestName(
  row: { testName?: string | null; testNameKind?: TestNameKind | null; testNameKindRaw?: string | null },
  cases: TestCaseRecord[],
): RowTestNameTreatment {
  const kind = rowTestNameKind(row);
  if (kind.invalid) return { mode: 'invalid' };
  if (kind.kind === 'prose') return { mode: 'prose' };
  const name = row.testName ?? '';
  const hit = matchTestCase(name, { testCases: cases });
  if (!hit) return { mode: 'unresolved' };
  return { mode: 'title', resolved: hit };
}

export function validate(
  status: AcceptanceStatusFile,
  verification: VerificationLite | null,
  repoRoot: string = process.cwd(),
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  const suiteById = new Map<string, SuiteObservationLite>();
  for (const s of verification?.suites ?? []) suiteById.set(s.id, s);

  // A register may only be written from a tree whose type check and build are
  // green. A register that claims verified rows while `bun run lint` fails is
  // exactly the overclaim this renderer exists to prevent.
  if (!verification) {
    issues.push({
      id: '(verification)',
      severity: 'error',
      message: 'no acceptance-verification.json found',
      action: 'run scripts/maintenance/verify-acceptance.ts first',
    });
  } else {
    for (const gate of ['lint', 'build']) {
      const suite = suiteById.get(gate);
      if (!suite) {
        issues.push({
          id: '(verification)',
          severity: 'error',
          message: `no observation for the ${gate} gate`,
          action: 'run scripts/maintenance/verify-acceptance.ts first',
        });
      } else if (suite.status !== 'pass') {
        issues.push({
          id: '(verification)',
          severity: 'error',
          message: `the ${gate} gate is ${suite.status} (exit=${suite.exitCode}) — the register cannot be written from a red tree`,
          action: 'land the lint/build fix before publishing acceptance statuses',
        });
      }
    }

    // The receipt must describe ONE source tree. Without a stable manifest the
    // evidence is not bound to any code, so it cannot support a register.
    if (verification.sourceStable !== true) {
      issues.push({
        id: '(verification)',
        severity: 'error',
        message:
          'the verification receipt is not bound to a single source tree (sourceStable is not true) — the tree changed while the suites ran, or the receipt predates source binding',
        action: 're-run scripts/maintenance/verify-acceptance.ts on a quiet tree',
      });
    }

    const observedManifests = [
      verification.sourceManifestAfter?.digest,
      verification.sourceManifestBefore?.digest,
    ].filter((d): d is string => typeof d === 'string' && d.length > 0);
    if (status.sourceManifest) {
      if (observedManifests.length === 0) {
        issues.push({
          id: '(verification)',
          severity: 'error',
          message: 'the register declares a sourceManifest but the receipt carries none',
          action: 're-run scripts/maintenance/verify-acceptance.ts',
        });
      } else if (!observedManifests.includes(status.sourceManifest)) {
        issues.push({
          id: '(verification)',
          severity: 'error',
          message: `the register declares sourceManifest ${status.sourceManifest.slice(0, 16)}… but the receipt observed ${observedManifests
            .map((d) => d.slice(0, 16) + '…')
            .join(' / ')} — this receipt is for a DIFFERENT source tree`,
          action: 're-run the harness against the current tree, or re-generate the register from this receipt',
        });
      }
    }
    if (status.sourceCommit && verification.gitCommit && status.sourceCommit !== verification.gitCommit) {
      issues.push({
        id: '(verification)',
        severity: 'warning',
        message: `the register was written for commit ${status.sourceCommit.slice(0, 12)}… but the receipt observed ${verification.gitCommit.slice(0, 12)}…`,
        action: 'confirm the register matches the tree it claims to describe',
      });
    }

    // A receipt that carries no per-testcase evidence cannot support a named
    // test claim at all. Say so once, at the top, instead of only per row.
    const hasFileResults = (verification.suites ?? []).some((s) => (s.fileResults ?? []).length > 0);
    const hasTestCases = (verification.suites ?? []).some((s) =>
      (s.fileResults ?? []).some((f) => (f.testCases ?? []).length > 0),
    );
    if (hasFileResults && !hasTestCases) {
      issues.push({
        id: '(verification)',
        severity: 'error',
        message:
          'the receipt carries no per-testcase evidence — a named test cannot be shown to have run',
        action: 're-run scripts/maintenance/verify-acceptance.ts (the current harness records every testcase name)',
      });
    }
  }

  for (const row of status.rows) {
    if (seen.has(row.id)) {
      issues.push({
        id: row.id,
        severity: 'error',
        message: `duplicate row id ${row.id}`,
        action: 'remove the duplicate row',
      });
    }
    seen.add(row.id);

    if (!row.title) {
      issues.push({ id: row.id, severity: 'error', message: 'missing title', action: 'add a title' });
    }
    if (!row.source) {
      issues.push({
        id: row.id,
        severity: 'error',
        message: 'missing source reference',
        action: 'cite the implementing file:line, or write NONE',
      });
    }
    if (row.evidenceRefs.length === 0) {
      issues.push({
        id: row.id,
        severity: 'error',
        message: 'no evidenceRef cited',
        action: 'cite at least one evidence path',
      });
    }
    for (const ref of row.evidenceRefs) {
      const resolved = resolveEvidenceRef(repoRoot, ref);
      if (!resolved.exists) {
        issues.push({
          id: row.id,
          severity: 'error',
          message: `evidenceRef does not exist: ${ref} (resolved to ${resolved.resolved})`,
          action: 'cite an evidence file that is actually present in the repo',
        });
      }
    }
    if (row.status === 'partial' && !row.gap) {
      issues.push({
        id: row.id,
        severity: 'error',
        message: 'status=partial without a named gap',
        action: 'state exactly which part is missing',
      });
    }
    if (row.status === 'blocked_external' && !row.externalGate) {
      issues.push({
        id: row.id,
        severity: 'error',
        message: 'status=blocked_external without an externalGate',
        action: 'name the exact external prerequisite and its evidence',
      });
    }
    if (row.status === 'not_run' && row.testFile) {
      issues.push({
        id: row.id,
        severity: 'warning',
        message: 'status=not_run but a test file is cited',
        action: 'either implement it or clear the test reference',
      });
    }

    // THE DISCRIMINATOR — an unknown `testNameKind` fails the row closed. It
    // is checked on EVERY row, not only on the verified ones: a ledger that
    // declares a kind the contract does not define is a contract violation.
    const declaredKind = rowTestNameKind(row);
    if (declaredKind.invalid) {
      issues.push({
        id: row.id,
        severity: 'error',
        message: `unknown testNameKind "${declaredKind.raw}" — expected "title" or "prose"`,
        action: 'use "title" for a verbatim testcase name, or "prose" for a human summary of the cited file',
      });
    }

    // SCOPE CHECK — the cited test file must belong to the acceptance area the
    // row claims. Severity: error when the row asserts verification (that is
    // the claim a reader would act on), warning otherwise.
    if (row.testFile) {
      const area = acceptanceAreaFor(row.id);
      if (!area) {
        issues.push({
          id: row.id,
          severity: 'warning',
          message: `no acceptance area is defined for ${row.id} — the scope of ${row.testFile} cannot be checked`,
          action: 'add the id to ACCEPTANCE_AREA_RULES / ACCEPTANCE_AREA_BY_ID',
        });
      } else if (!isFileInAcceptanceArea(row.id, row.testFile)) {
        issues.push({
          id: row.id,
          severity: row.status === 'implemented_verified' ? 'error' : 'warning',
          message: `cited test file ${row.testFile} is outside the ${row.id} acceptance area (${area.label}); expected one of ${allowedTestFilesFor(row.id).join(', ')}`,
          action: 'cite a test in the acceptance area for this requirement',
        });
      }
    }

    if (row.status === 'implemented_verified') {
      if (!row.testFile || !row.testName) {
        issues.push({
          id: row.id,
          severity: 'error',
          message: 'implemented_verified without a named test file and test name',
          action: 'cite the exact test file and test name, or downgrade the row',
        });
      }
      if (row.testKind === 'fixture') {
        issues.push({
          id: row.id,
          severity: 'error',
          message: 'implemented_verified but the cited test is a fixture/self-referential check',
          action: 'rewrite the test to drive the real path, or downgrade the row',
        });
      }
      const suiteId = suiteForTestFile(row.testFile);
      if (!suiteId) {
        issues.push({
          id: row.id,
          severity: 'error',
          message: 'test file does not map to any verification suite',
          action: 'move the test under tests/ so the harness runs it',
        });
      } else {
        const suite = suiteById.get(suiteId);
        if (!suite) {
          issues.push({
            id: row.id,
            severity: 'error',
            message: `no verification observation for suite ${suiteId}`,
            action: 'run scripts/maintenance/verify-acceptance.ts before rendering',
          });
        } else {
          // Prefer the PER-FILE outcome: a red suite says nothing about this row
          // unless the file that covers this row is the red one.
          const wanted = row.testFile!.replace(/\\/g, '/');
          const fileResults = suite.fileResults ?? [];
          if (fileResults.length > 0) {
            const observed = fileResults.find((f) => f.file.replace(/\\/g, '/') === wanted);
            if (!observed) {
              issues.push({
                id: row.id,
                severity: 'error',
                message: `cited test file was not observed in suite ${suiteId}`,
                action: 'the cited test file did not run — check the path, or it is skipped',
              });
            } else {
              // FIX 4 — a file that reported nothing is not a pass.
              if (observed.failures > 0) {
                issues.push({
                  id: row.id,
                  severity: 'error',
                  message: `cited test file has ${observed.failures} failing test(s) in suite ${suiteId}`,
                  action: 'the row cannot be implemented_verified while its own test file is red',
                });
              }
              if ((observed.errors ?? 0) > 0) {
                issues.push({
                  id: row.id,
                  severity: 'error',
                  message: `cited test file reported ${observed.errors} execution error(s) in suite ${suiteId}`,
                  action: 'fix the erroring test — an errored run proves nothing',
                });
              }
              if ((observed.skipped ?? 0) > 0) {
                issues.push({
                  id: row.id,
                  severity: 'error',
                  message: `cited test file skipped ${observed.skipped} test(s) in suite ${suiteId} — a skipped test is never a pass`,
                  action: 'un-skip the test or downgrade the row',
                });
              }
              if (observed.tests === 0) {
                issues.push({
                  id: row.id,
                  severity: 'error',
                  message: `cited test file executed 0 tests in suite ${suiteId} — zero executed tests is not a pass`,
                  action: 'point the row at a test file that actually runs assertions',
                });
              }

              // FIX 2 — the named test must be a testcase that ACTUALLY RAN.
              // The discriminator decides HOW the name is read:
              //   "title" (or an absent kind) -> it must resolve to an observed
              //                                        testcase;
              //   "prose"                     -> it is never resolved; the cited
              //                                        FILE must exist on disk.
              const cases = observed.testCases;
              const treatment = classifyRowTestName(row, cases ?? []);
              if (treatment.mode === 'invalid') {
                // Already reported above; nothing further to say here.
              } else if (treatment.mode === 'prose') {
                // A prose row is evidence by FILE. The file must exist.
                const citedFile = row.testFile!.replace(/\\/g, '/');
                const resolvedFile = path.resolve(repoRoot, citedFile);
                let fileExists = false;
                try {
                  fileExists = fs.existsSync(resolvedFile);
                } catch {
                  fileExists = false;
                }
                if (!fileExists) {
                  issues.push({
                    id: row.id,
                    severity: 'error',
                    message: `testNameKind="prose" but the cited test file does not exist on disk: ${row.testFile}`,
                    action: 'cite a test file that exists, or replace the prose summary with the verbatim testcase title',
                  });
                }
              } else if (!cases || cases.length === 0) {
                issues.push({
                  id: row.id,
                  severity: 'error',
                  message: `no per-testcase evidence was recorded for ${row.testFile} — the named test cannot be shown to have run`,
                  action: 're-run scripts/maintenance/verify-acceptance.ts so the receipt records the testcase names',
                });
              } else if (row.testName) {
                if (treatment.mode === 'unresolved') {
                  issues.push({
                    id: row.id,
                    severity: 'error',
                    message: `testName "${row.testName}" did not match any testcase that ran in ${row.testFile} — observed: ${describeTestCases(cases)}`,
                    action: 'cite the exact testcase name (as reported by the junit reporter), mark the row testNameKind="prose", or downgrade the row',
                  });
                } else if (treatment.resolved.outcome === 'skip') {
                  issues.push({
                    id: row.id,
                    severity: 'error',
                    message: `testName "${row.testName}" matched a SKIPPED testcase in ${row.testFile}`,
                    action: 'un-skip the test or downgrade the row',
                  });
                }
              }
            }
          } else if (suite.status !== 'pass') {
            issues.push({
              id: row.id,
              severity: 'error',
              message: `cited suite ${suiteId} is ${suite.status} (exit=${suite.exitCode}) and exposes no per-file results`,
              action: 'the row cannot be implemented_verified while its suite is red',
            });
          }
        }
      }
    }
  }

  for (const id of ALL_IDS) {
    if (!seen.has(id)) {
      issues.push({
        id,
        severity: 'error',
        message: 'acceptance ID missing from the status file',
        action: 'add a row for every one of the 85 IDs',
      });
    }
  }
  for (const id of seen) {
    if (!ALL_IDS.includes(id)) {
      issues.push({
        id,
        severity: 'error',
        message: 'unknown acceptance ID',
        action: 'remove the row or correct the id',
      });
    }
  }

  return issues;
}

export function summarize(rows: AcceptanceRow[]): Record<AcceptanceStatus, number> {
  const out = {
    implemented_verified: 0,
    implemented_unverified: 0,
    partial: 0,
    not_run: 0,
    blocked_external: 0,
  } as Record<AcceptanceStatus, number>;
  for (const r of rows) out[r.status]++;
  return out;
}

export function renderMarkdown(
  status: AcceptanceStatusFile,
  verification: VerificationLite | null,
  issues: ValidationIssue[],
): string {
  const core = status.rows.filter((r) => r.tier === 'core');
  const ext = status.rows.filter((r) => r.tier === 'extension');
  const s = summarize(status.rows);
  const sc = summarize(core);
  const se = summarize(ext);

  const suiteLine = (id: string) => {
    const suite = verification?.suites.find((x) => x.id === id);
    if (!suite) return '_(not run)_';
    const counts =
      suite.passCount !== null
        ? ` — ${suite.passCount} pass / ${suite.failCount} fail / ${suite.expectCount} expect`
        : '';
    return `\`${suite.command}\` → exit ${suite.exitCode}${counts}`;
  };

  const lines: string[] = [];
  lines.push('# Acceptance Register — ABANGCOLEK v2.4');
  lines.push('');
  lines.push('> **GENERATED FILE — do not hand-edit.**');
  lines.push('> Source of truth: `reports/implementation/acceptance-status.json`.');
  lines.push('> Renderer: `scripts/maintenance/render-acceptance-register.ts`.');
  lines.push('> Machine-derived verification: `reports/implementation/acceptance-verification.json`.');
  lines.push('');
  lines.push(`- Generated: \`${status.generatedAt}\``);
  lines.push(`- Source commit: \`${status.sourceCommit}\``);
  if (status.sourceManifest) {
    lines.push(`- Source manifest: \`${status.sourceManifest}\``);
  }
  if (verification) {
    lines.push(
      `- Verification run: \`${verification.generatedAt}\` @ \`${verification.gitCommit ?? '?'}\` (branch \`${verification.gitBranch ?? '?'}\`, dirty=${verification.gitDirty})`,
    );
    lines.push(
      `- Observed totals: **${verification.totals.testsPassed} tests pass, ${verification.totals.testsFailed} fail, ${verification.totals.assertions} assertions** across ${verification.totals.suitesRun} suites (${verification.totals.suitesFailed} failed, ${verification.totals.suitesUnavailable} unavailable).`,
    );
    const before = verification.sourceManifestBefore?.digest ?? '?';
    const after = verification.sourceManifestAfter?.digest ?? '?';
    lines.push(
      `- Source binding: manifest before \`${before}\`, after \`${after}\`, **sourceStable=${verification.sourceStable === true}** (${verification.sourceManifestAfter?.fileCount ?? 0} source files).`,
    );
  }
  lines.push('');
  lines.push('## Status tiers');
  lines.push('');
  lines.push('| Tier | Meaning |');
  lines.push('|---|---|');
  lines.push('| `implemented_verified` | A real implementation exists in source AND the cited test file was observed green in the verification run. The cited `testName` is either a testcase that actually ran in that file (`testNameKind: "title"`, the default) or a prose summary of what the file proves (`testNameKind: "prose"`, in which case the file must exist on disk). |');
  lines.push('| `implemented_unverified` | Real implementation exists, but no test proves the required behaviour. |');
  lines.push('| `partial` | Part of the requirement is implemented; the exact missing part is named. |');
  lines.push('| `not_run` | No implementation. |');
  lines.push('| `blocked_external` | The only thing missing is a genuinely external prerequisite, named with its evidence. |');
  lines.push('');
  lines.push('## Counters');
  lines.push('');
  lines.push('| Scope | verified | unverified | partial | not_run | blocked_external | total |');
  lines.push('|---|---|---|---|---|---|---|');
  lines.push(
    `| Core (78) | ${sc.implemented_verified} | ${sc.implemented_unverified} | ${sc.partial} | ${sc.not_run} | ${sc.blocked_external} | ${core.length} |`,
  );
  lines.push(
    `| Extensions (7) | ${se.implemented_verified} | ${se.implemented_unverified} | ${se.partial} | ${se.not_run} | ${se.blocked_external} | ${ext.length} |`,
  );
  lines.push(
    `| **All (${status.rows.length})** | **${s.implemented_verified}** | **${s.implemented_unverified}** | **${s.partial}** | **${s.not_run}** | **${s.blocked_external}** | **${status.rows.length}** |`,
  );
  lines.push('');
  const titleRows = status.rows.filter((r) => r.testNameKind === 'title').length;
  const proseRows = status.rows.filter((r) => r.testNameKind === 'prose').length;
  const strictRows = status.rows.filter((r) => r.testNameKind !== 'title' && r.testNameKind !== 'prose').length;
  lines.push(
    `Test-name evidence: **${titleRows}** row(s) cite a verbatim testcase title (resolved against an observed testcase), ` +
      `**${proseRows}** row(s) cite a prose summary (the cited file is the evidence and must exist on disk), ` +
      `**${strictRows}** row(s) declare no \`testNameKind\` and are therefore treated as strict titles.`,
  );
  lines.push('');
  lines.push('## Verification suites observed');
  lines.push('');
  lines.push('| Suite | Command | Result |');
  lines.push('|---|---|---|');
  for (const suite of verification?.suites ?? []) {
    const counts =
      suite.passCount !== null
        ? ` — ${suite.passCount} pass / ${suite.failCount} fail / ${suite.expectCount} expect`
        : suite.reason ?? '';
    lines.push(`| \`${suite.id}\` | \`${suite.command}\` | ${suite.status} (exit ${suite.exitCode})${counts} |`);
  }
  lines.push('');

  const showEnv = status.rows.some((r) => r.environment || r.integrationStage);

  const renderTable = (rows: AcceptanceRow[], title: string) => {
    lines.push(`## ${title}`);
    lines.push('');
    lines.push(
      showEnv
        ? '| ID | Requirement | Status | Env / Stage | Source | Test | Gap / external gate |'
        : '| ID | Requirement | Status | Source | Test | Gap / external gate |',
    );
    lines.push('|---|---|---|---|---|---|---|');
    for (const r of rows) {
      const statusCell =
        r.statusRaw && r.statusRaw !== r.status ? `${r.status} _(raw: ${r.statusRaw})_` : r.status;
      const test = r.testFile
        ? `\`${r.testFile}\`${r.testName ? ` — ${r.testName}` : ''} _(testKind: ${r.testKind}${r.testNameKind === 'prose' ? ', testNameKind: prose (human summary — NOT a resolved testcase)' : r.testNameKind === 'title' ? ', testNameKind: title (resolved testcase)' : ''})_`
        : '—';
      const gap =
        r.status === 'blocked_external'
          ? `**EXTERNAL:** ${r.externalGate}`
          : r.gap
            ? r.gap
            : '—';
      const cells = showEnv
        ? `| ${r.id} | ${r.title} | \`${statusCell}\` | ${r.environment ?? '—'}${r.integrationStage ? ` / ${r.integrationStage}` : ''} | ${r.source} | ${test} | ${gap} |`
        : `| ${r.id} | ${r.title} | \`${statusCell}\` | ${r.source} | ${test} | ${gap} |`;
      lines.push(cells);
    }
    lines.push('');
  };

  renderTable(core, 'Core acceptance (78)');
  renderTable(ext, 'Extension gates (7)');

  lines.push('## Validation');
  lines.push('');
  if (issues.length === 0) {
    lines.push(
      'All renderer rules pass: every ID present, every `implemented_verified` row cites a test file that was observed green in a suite, every `testNameKind: "title"` row names a testcase that actually ran, every `testNameKind: "prose"` row cites a file that exists on disk, every row without a `testNameKind` is treated as a strict title, every cited test file is inside the acceptance area for that ID, every `evidenceRef` exists, the receipt is bound to one stable source tree, every `partial` row names a gap, every `blocked_external` row names an external gate.',
    );
  } else {
    lines.push('| ID | Severity | Problem | Required action |');
    lines.push('|---|---|---|---|');
    for (const i of issues) {
      lines.push(`| ${i.id} | ${i.severity} | ${i.message} | ${i.action} |`);
    }
  }
  lines.push('');
  lines.push('## Correction history');
  lines.push('');
  const withSupersedes = status.rows.filter((r) => r.supersedes);
  if (withSupersedes.length === 0) {
    lines.push('_No dated corrections recorded._');
  } else {
    lines.push('| ID | Date | Previous status | Reason |');
    lines.push('|---|---|---|---|');
    for (const r of withSupersedes) {
      lines.push(
        `| ${r.id} | ${r.supersedes!.date} | \`${r.supersedes!.previousStatus}\` | ${r.supersedes!.reason} |`,
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv: string[]): {
  check: boolean;
  out: string;
  status: string;
  verification: string;
  repoRoot: string | null;
} {
  let check = false;
  let out = 'docs/prompts/ACCEPTANCE-REGISTER.md';
  let status = 'reports/implementation/acceptance-status.json';
  let verification = 'reports/implementation/acceptance-verification.json';
  let repoRoot: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') check = true;
    else if (argv[i] === '--out') out = argv[++i];
    else if (argv[i] === '--status') status = argv[++i];
    else if (argv[i] === '--verification') verification = argv[++i];
    else if (argv[i] === '--repo-root') repoRoot = argv[++i];
  }
  return { check, out, status, verification, repoRoot };
}

if (import.meta.main) {
  const cwd = process.cwd();
  const { check, out, status: statusArg, verification: verificationArg, repoRoot: repoRootArg } =
    parseArgs(process.argv.slice(2));

  // The repo root is the base for resolving evidence references. It defaults to
  // the working directory and can be pointed elsewhere for isolated runs.
  const root = repoRootArg ? path.resolve(cwd, repoRootArg) : cwd;
  const statusPath = path.resolve(root, statusArg);
  const verifyPath = path.resolve(root, verificationArg);

  if (!fs.existsSync(statusPath)) {
    console.error(`Missing ${statusPath}`);
    process.exit(1);
  }
  const status = normalizeStatusFile(JSON.parse(fs.readFileSync(statusPath, 'utf-8')));
  const verification = fs.existsSync(verifyPath)
    ? (JSON.parse(fs.readFileSync(verifyPath, 'utf-8')) as VerificationLite)
    : null;

  const issues = validate(status, verification, root);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  console.log(`Rows: ${status.rows.length} / 85 expected`);
  const s = summarize(status.rows);
  console.log(
    `verified=${s.implemented_verified} unverified=${s.implemented_unverified} partial=${s.partial} not_run=${s.not_run} blocked_external=${s.blocked_external}`,
  );
  console.log(`Validation: ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const i of issues.slice(0, 40)) {
    console.log(`  [${i.severity.toUpperCase()}] ${i.id}: ${i.message} -> ${i.action}`);
  }
  if (issues.length > 40) console.log(`  … ${issues.length - 40} more`);

  if (check) {
    process.exit(errors.length > 0 ? 1 : 0);
  }

  // VALIDATE FIRST, THEN WRITE. A failing validation must never overwrite the
  // canonical register — the old renderer wrote the file and only then exited
  // non-zero, so a broken run could still replace the good register.
  if (errors.length > 0) {
    console.error(
      `\nREFUSING TO WRITE ${out}: ${errors.length} validation error(s). The register was NOT modified.`,
    );
    process.exit(1);
  }

  const md = renderMarkdown(status, verification, issues);
  const outPath = path.resolve(root, out);
  // Atomic: write a temp file in the SAME directory, then rename it over the
  // target. A crash mid-write can never leave a truncated register behind.
  writeFileAtomic(outPath, md);
  console.log(`\nWritten: ${outPath}`);
}