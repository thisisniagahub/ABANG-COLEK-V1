/**
 * Acceptance Verification Harness — ABANGCOLEK v2.4
 *
 * Purpose: make the acceptance ledger MACHINE-DERIVED from real command output,
 * so a status can never be asserted without a measured exit code and count.
 *
 * This harness does NOT decide whether a requirement is met. It records exactly
 * what each verification command produced (exit code, pass/fail counts, duration)
 * so the orchestrator can bind evidence to those facts.
 *
 * Rules enforced by construction:
 *  - A suite that fails is reported as failed. There is no "expected failure".
 *  - A suite that cannot run (missing script, missing browser) is reported as
 *    `unavailable` with the exact reason, never as `pass`.
 *  - An `unavailable` suite is ALSO visible in the process exit code. A missing
 *    prerequisite must never read as a clean run.
 *  - No status is inferred. The harness emits observations only.
 *  - The receipt is BOUND to the exact source tree that was exercised. A
 *    deterministic source manifest is computed before and after the run; if the
 *    tree moved while the suites were running the receipt is marked unstable and
 *    the harness exits non-zero, because the result then describes no single
 *    tree at all.
 *
 * Usage:
 *   bun scripts/maintenance/verify-acceptance.ts [--out <path>] [--skip-build] [--skip-e2e]
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export type SuiteStatus = 'pass' | 'fail' | 'unavailable';

/** Outcome of a single `<testcase>` element in bun's junit reporter output. */
export type TestCaseOutcome = 'pass' | 'fail' | 'error' | 'skip';

export interface TestCaseRecord {
  /** The `<testcase name="...">` attribute. */
  name: string;
  /** The enclosing describe path (`<testcase classname="...">`). */
  classname: string;
  /** Repo-relative path of the file the testcase ran in. */
  file: string;
  outcome: TestCaseOutcome;
}

export interface FileResult {
  file: string;
  /** Number of tests bun reported for the file. */
  tests: number;
  failures: number;
  /** Execution errors reported by the reporter (distinct from assertion failures). */
  errors: number;
  /** Skipped tests. A skipped test is NEVER counted as passed. */
  skipped: number;
  assertions: number;
  /** Every testcase bun actually executed in this file. */
  testCases: TestCaseRecord[];
}

export interface SuiteObservation {
  id: string;
  command: string;
  cwd: string;
  exitCode: number | null;
  status: SuiteStatus;
  durationMs: number;
  passCount: number | null;
  failCount: number | null;
  expectCount: number | null;
  filesScanned: number | null;
  summary: string;
  reason?: string;
  /** Per-test-file outcome, parsed from bun's junit reporter. */
  fileResults: FileResult[];
  /** The (per-run unique) junit outfile this suite was measured from. */
  junitOutFile?: string;
  stdoutTail: string;
  stderrTail: string;
}

/** Deterministic digest over the source files the suites actually exercise. */
export interface SourceManifest {
  /** SHA-256 over the sorted `path:sha256` list of the source tree. */
  digest: string;
  /** Number of source files that contributed to the digest. */
  fileCount: number;
}

export interface AcceptanceVerification {
  generatedAt: string;
  repoRoot: string;
  gitCommit: string | null;
  gitBranch: string | null;
  gitDirty: boolean | null;
  nodeVersion: string;
  bunVersion: string;
  /** Source manifest observed immediately BEFORE the suites ran. */
  sourceManifestBefore: SourceManifest | null;
  /** Source manifest observed immediately AFTER the suites ran. */
  sourceManifestAfter: SourceManifest | null;
  /** True only when the tree did not move while the suites were running. */
  sourceStable: boolean;
  suites: SuiteObservation[];
  totals: {
    suitesRun: number;
    suitesPassed: number;
    suitesFailed: number;
    suitesUnavailable: number;
    /** Suites skipped on the operator's explicit request (still not a pass). */
    suitesSkippedByFlag: number;
    testsPassed: number;
    testsFailed: number;
    assertions: number;
  };
}

const ANSI = /\u001b\[[0-9;]*m/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI, '');
}

function tail(text: string, lines = 40): string {
  const arr = stripAnsi(text)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  return arr.slice(-lines).join('\n');
}

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    const known = XML_ENTITIES[body.toLowerCase()];
    return known ?? full;
  });
}

function parseXmlAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out[m[1]] = decodeXmlEntities(m[2]);
  }
  return out;
}

function attrInt(attrs: Record<string, string>, name: string): number {
  const raw = attrs[name];
  if (raw === undefined) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse bun's junit reporter output into a per-test-file outcome map.
 *
 * This is what lets an acceptance row be checked against the file that actually
 * covers it, instead of against a whole-suite green/red that says nothing about
 * that row.
 *
 * Every outcome channel is captured, not just assertion failures:
 *  - `failures` — assertion failures;
 *  - `errors`   — execution errors (a test that blew up before asserting);
 *  - `skipped`  — tests that were skipped (never counted as passed);
 *  - `tests`    — how many tests the reporter says ran.
 *
 * A file that reports `errors="1" skipped="1" tests="0"` is NOT clean, and this
 * parser makes that visible instead of collapsing it to zeroes.
 */
export function parseJunitFiles(xml: string): FileResult[] {
  if (!xml) return [];

  // 1. Aggregate <testsuite> attributes, keyed by the file they describe.
  const agg = new Map<
    string,
    { tests: number; failures: number; errors: number; skipped: number; assertions: number }
  >();
  const suiteFilePositions: Array<{ pos: number; file: string }> = [];
  const suiteRe = /<testsuite\b([^>]*?)(\/?)>/g;
  let sm: RegExpExecArray | null;
  while ((sm = suiteRe.exec(xml)) !== null) {
    const attrs = parseXmlAttrs(sm[1]);
    const file = attrs.file;
    if (!file) continue;
    suiteFilePositions.push({ pos: sm.index, file });
    const prev = agg.get(file) ?? {
      tests: 0,
      failures: 0,
      errors: 0,
      skipped: 0,
      assertions: 0,
    };
    // Nested suites repeat the same file attribute; keep the LARGEST aggregate
    // seen for that file (the outermost element is the file-level roll-up).
    agg.set(file, {
      tests: Math.max(prev.tests, attrInt(attrs, 'tests')),
      failures: Math.max(prev.failures, attrInt(attrs, 'failures')),
      errors: Math.max(prev.errors, attrInt(attrs, 'errors')),
      skipped: Math.max(prev.skipped, attrInt(attrs, 'skipped')),
      assertions: Math.max(prev.assertions, attrInt(attrs, 'assertions')),
    });
  }

  // 2. Individual <testcase> elements, with their own outcome.
  const casesByFile = new Map<string, TestCaseRecord[]>();
  const caseRe = /<testcase\b([^>]*?)(\/?)>/g;
  let cm: RegExpExecArray | null;
  while ((cm = caseRe.exec(xml)) !== null) {
    const attrs = parseXmlAttrs(cm[1]);
    const selfClosing = cm[2] === '/';
    let body = '';
    if (!selfClosing) {
      const closeIdx = xml.indexOf('</testcase>', caseRe.lastIndex);
      if (closeIdx !== -1) {
        body = xml.slice(caseRe.lastIndex, closeIdx);
        caseRe.lastIndex = closeIdx + '</testcase>'.length;
      }
    }
    let file = attrs.file;
    if (!file) {
      // Fall back to the nearest preceding <testsuite file="...">.
      let best: string | null = null;
      for (const s of suiteFilePositions) {
        if (s.pos < cm.index) best = s.file;
        else break;
      }
      file = best ?? '';
    }
    if (!file) continue;
    const outcome: TestCaseOutcome = /<skipped\b/.test(body)
      ? 'skip'
      : /<error\b/.test(body)
        ? 'error'
        : /<failure\b/.test(body)
          ? 'fail'
          : 'pass';
    const list = casesByFile.get(file) ?? [];
    list.push({
      name: attrs.name ?? '',
      classname: attrs.classname ?? '',
      file,
      outcome,
    });
    casesByFile.set(file, list);
  }

  const files = new Set<string>([...agg.keys(), ...casesByFile.keys()]);
  const out: FileResult[] = [];
  for (const file of files) {
    const a = agg.get(file) ?? {
      tests: 0,
      failures: 0,
      errors: 0,
      skipped: 0,
      assertions: 0,
    };
    const cases = casesByFile.get(file) ?? [];
    const counted = {
      fail: cases.filter((c) => c.outcome === 'fail').length,
      error: cases.filter((c) => c.outcome === 'error').length,
      skip: cases.filter((c) => c.outcome === 'skip').length,
      pass: cases.filter((c) => c.outcome === 'pass').length,
    };
    const countedTests = counted.pass + counted.fail + counted.error + counted.skip;
    out.push({
      file,
      // The reporter's own count wins when it is larger; a reporter that
      // reports tests="0" while emitting testcases still yields the real count.
      tests: Math.max(a.tests, countedTests),
      failures: Math.max(a.failures, counted.fail),
      errors: Math.max(a.errors, counted.error),
      skipped: Math.max(a.skipped, counted.skip),
      assertions: a.assertions,
      testCases: cases,
    });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/* -------------------------------------------------------------------------- */
/* Test-name matching                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Strip a trailing evidence suffix such as "(tests/platform/foo.test.ts)" or
 * "(tests/platform/foo.test.ts, 26 tests)" from a cited test name.
 *
 * Only a parenthetical that CONTAINS a path separator is stripped, so a real
 * test name that merely contains parentheses (e.g. "…(Quarantine Isolation)")
 * survives untouched.
 */
export function stripEvidenceSuffix(testName: string): string {
  return testName.replace(/\s*\([^()]*[\\/][^()]*\)\s*$/, '').trim();
}

/**
 * Normalise a test name for comparison: case-insensitive, punctuation- and
 * whitespace-insensitive.
 *
 *   "ADV-01 discover_capabilities — pengesahan ketat"
 *     -> "adv 01 discover capabilities pengesahan ketat"
 */
export function normalizeTestName(name: string): string {
  return stripEvidenceSuffix(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * THE TEST-NAME DISCRIMINATOR
 * ---------------------------
 * A ledger row says what its `testName` IS, via the `testNameKind` field:
 *
 *   - `"title"` — the `testName` is the VERBATIM name of a testcase. It MUST
 *     resolve to a testcase that was OBSERVED to run in the cited file. A name
 *     that resolves to nothing is a hard error.
 *   - `"prose"` — the `testName` is a human summary of what the cited file
 *     proves. It is NEVER resolved against an observed testcase; instead the
 *     cited `testFile` must exist on disk (and the file itself must have been
 *     observed green). The row is recorded as prose, not as a resolved
 *     testcase.
 *
 * A row with NO `testNameKind` is treated as `"title"` — the STRICT default.
 * The rule "a `testName` that matches NO observed testcase is a hard error"
 * therefore keeps its full force until the ledger is migrated row by row.
 *
 * This discriminator exists because the ledger carries BOTH kinds of value in
 * the same field: a verbatim test title ("ADV-01 discover_capabilities — …")
 * and a prose paraphrase ("Frontend tool adapter allowlist, duplicate and
 * limit rules"). Without the discriminator the gate cannot tell them apart,
 * so the rule is unenforceable in both directions.
 */
export type TestNameKind = 'title' | 'prose';

/** The values the `testNameKind` field may carry. */
export const TEST_NAME_KINDS: readonly TestNameKind[] = ['title', 'prose'];

export interface ParsedTestNameKind {
  /** The resolved kind; `null` when the field is absent or not a known kind. */
  kind: TestNameKind | null;
  /** True when the field carried no value (the strict default applies). */
  absent: boolean;
  /** True when the field carried a value this contract does not define. */
  invalid: boolean;
  /** The raw value exactly as it was found in the ledger. */
  raw: string;
}

/**
 * Parse a ledger row's `testNameKind`.
 *
 * An absent/empty value is NOT an error: it means "treat this row strictly,
 * as a verbatim testcase title" (the pre-migration behaviour). An UNRECOGNISED
 * value IS an error — it fails closed rather than silently degrading a row
 * from "must resolve" to "may be prose".
 */
export function parseTestNameKind(value: unknown): ParsedTestNameKind {
  if (value === undefined || value === null) {
    return { kind: null, absent: true, invalid: false, raw: '' };
  }
  const raw = typeof value === 'string' ? value.trim() : String(value).trim();
  if (!raw) return { kind: null, absent: true, invalid: false, raw: '' };
  const lower = raw.toLowerCase();
  if (lower === 'title') return { kind: 'title', absent: false, invalid: false, raw };
  if (lower === 'prose') return { kind: 'prose', absent: false, invalid: false, raw };
  return { kind: null, absent: false, invalid: true, raw };
}

/**
 * THE TEST-NAME MATCHING RULE
 * ---------------------------
 * A row's `testName` matches a cited file iff, after stripping a trailing
 * `(path…)` evidence suffix, the normalised name equals — or contains, with a
 * minimum length of 8 characters on the shorter side — the normalised `name` or
 * `classname` of at least one testcase that was OBSERVED to run in that file.
 *
 *   1. `normalize()` lowercases, replaces every non-alphanumeric run with a
 *      single space, and trims.
 *   2. The candidate keys are, for every observed testcase in the file:
 *        - the testcase `name`      (e.g. "ADV-01 discover_capabilities — …")
 *        - the testcase `classname`  (the enclosing describe path)
 *   3. A match is: `a === b`, OR (`a` contains `b` OR `b` contains `a`) where
 *      the shorter of the two normalised strings is at least 8 characters long.
 *      The 8-character floor stops a 3-letter fragment from "matching" an
 *      unrelated test.
 *   4. A `testName` that matches NO observed testcase in the cited file is a
 *      hard error — a test that never ran cannot support a verified claim.
 *      This rule applies to every row whose `testNameKind` is `"title"` or
 *      ABSENT; a row explicitly marked `"prose"` is never resolved (see THE
 *      TEST-NAME DISCRIMINATOR above).
 */
export function testNameMatchesTestCase(testName: string, record: TestCaseRecord): boolean {
  const wanted = normalizeTestName(testName);
  if (!wanted) return false;
  for (const key of [record.name, record.classname]) {
    const candidate = normalizeTestName(key);
    if (!candidate) continue;
    if (candidate === wanted) return true;
    const shorter = candidate.length < wanted.length ? candidate : wanted;
    const longer = candidate.length < wanted.length ? wanted : candidate;
    if (shorter.length >= 8 && longer.includes(shorter)) return true;
  }
  return false;
}

/** The first observed testcase in the file that the cited `testName` matches. */
export function matchTestCase(
  testName: string,
  fileResult: Pick<FileResult, 'testCases'>,
): TestCaseRecord | null {
  for (const record of fileResult.testCases) {
    if (testNameMatchesTestCase(testName, record)) return record;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Source manifest                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Paths excluded from the source manifest: dependency trees, build output, logs,
 * generated reports/docs, and test-output directories. Everything else that is
 * tracked (or untracked but not ignored) participates in the digest.
 */
export const SOURCE_MANIFEST_EXCLUDED_PREFIXES: string[] = [
  '.git/',
  'node_modules/',
  'dist/',
  'dist-ssr/',
  'var/',
  'reports/',
  'docs/',
  'coverage/',
  'test-results/',
  'playwright-report/',
  '.playwright/',
  '.next/',
  '.output/',
  'tmp/',
];

export function isSourceManifestExcluded(relPath: string): boolean {
  const p = relPath.replace(/\\/g, '/');
  return SOURCE_MANIFEST_EXCLUDED_PREFIXES.some((prefix) => p === prefix.slice(0, -1) || p.startsWith(prefix));
}

function runDirect(cmd: string, args: string[], cwd: string, timeoutMs: number): {
  exitCode: number | null;
  stdout: string;
  stderr: string;
} {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    timeout: timeoutMs,
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  return {
    exitCode: res.status ?? null,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function parsePorcelainPaths(stdout: string): string[] {
  const out: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) continue;
    const code = line.slice(0, 2);
    let p = line.slice(3);
    if (code === '??') {
      out.push(p);
      continue;
    }
    const arrow = p.lastIndexOf(' -> ');
    if (arrow !== -1) p = p.slice(arrow + 4);
    out.push(p);
  }
  return out;
}

/**
 * Compute a deterministic digest over the source tree the suites exercise.
 *
 * Algorithm
 * ---------
 *  1. `git ls-files` enumerates every TRACKED path (index view).
 *  2. `git status --porcelain --untracked-files=all` adds every UNTRACKED
 *     (and not gitignored) path, so a file written mid-run by another writer
 *     is part of the digest.
 *  3. Paths under the exclusion list (node_modules, dist, var/, .git, reports/,
 *     docs/, test-output dirs) are dropped.
 *  4. Every remaining file is hashed with SHA-256. A file that is in the index
 *     but missing from the worktree hashes to the literal `missing`.
 *  5. The sorted `path:hash` lines are folded into ONE SHA-256 digest.
 *
 * The digest therefore changes iff the *content* of the exercised source tree
 * changes — not merely its mtime, and not for changes to excluded paths.
 */
export function computeSourceManifest(repoRoot: string): SourceManifest {
  const tracked = runDirect('git', ['-c', 'core.quotepath=false', 'ls-files'], repoRoot, 120_000);
  const status = runDirect(
    'git',
    ['-c', 'core.quotepath=false', 'status', '--porcelain', '--untracked-files=all'],
    repoRoot,
    120_000,
  );

  const paths = new Set<string>();
  if (tracked.exitCode === 0) {
    for (const line of tracked.stdout.split(/\r?\n/)) {
      if (line.trim()) paths.add(line.trim());
    }
  }
  if (status.exitCode === 0) {
    for (const p of parsePorcelainPaths(status.stdout)) {
      if (p) paths.add(p);
    }
  }

  const included = [...paths].filter((p) => !isSourceManifestExcluded(p)).sort();
  const lines: string[] = [];
  for (const rel of included) {
    const abs = path.join(repoRoot, rel);
    let hash: string;
    try {
      hash = createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    } catch {
      hash = 'missing';
    }
    lines.push(`${rel}:${hash}`);
  }
  const digest = createHash('sha256').update(lines.join('\n')).digest('hex');
  return { digest, fileCount: included.length };
}

/* -------------------------------------------------------------------------- */
/* Process / IO helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Write a file atomically: write to a temp file in the SAME directory, then
 * rename it over the target. A crash mid-write can therefore never leave a
 * truncated canonical artefact behind.
 */
export function writeFileAtomic(target: string, content: string): void {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(target)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`,
  );
  try {
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, target);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* best effort */
    }
    throw err;
  }
}

function run(cmd: string, args: string[], cwd: string, timeoutMs: number): {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
} {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    timeout: timeoutMs,
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  return {
    exitCode: res.status ?? null,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    timedOut: res.signal === 'SIGTERM' || res.status === null,
  };
}

/** A token that is unique per harness process AND per run. */
export function newRunToken(): string {
  return `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The junit outfile for a suite. The path is UNIQUE per run, so two concurrent
 * harness processes can never read each other's results.
 */
export function junitOutFilePath(junitDir: string, suiteId: string, runToken: string): string {
  const safe = suiteId.replace(/[^a-z0-9.-]/gi, '_');
  return path.join(junitDir, `${safe}.${runToken}.xml`);
}

/** Parse bun's test summary block. Returns null when the summary is absent. */
export function parseBunTestSummary(output: string): {
  pass: number | null;
  fail: number | null;
  expect: number | null;
  files: number | null;
  summary: string;
} {
  const text = stripAnsi(output);
  const passMatch = text.match(/(\d+)\s+pass/);
  const failMatch = text.match(/(\d+)\s+fail/);
  const expectMatch = text.match(/(\d+)\s+expect\(\)\s+calls/);
  const filesMatch = text.match(/Ran\s+(\d+)\s+tests?\s+across\s+(\d+)\s+files?/);
  const summaryLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^Ran\s+\d+\s+tests?/.test(l));
  return {
    pass: passMatch ? Number(passMatch[1]) : null,
    fail: failMatch ? Number(failMatch[1]) : null,
    expect: expectMatch ? Number(expectMatch[1]) : null,
    files: filesMatch ? Number(filesMatch[2]) : null,
    summary: summaryLine ?? '',
  };
}

export interface SuiteSpec {
  id: string;
  cmd: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  /** Optional predicate on the working tree that decides whether the suite is runnable. */
  requires?: (repoRoot: string) => { ok: boolean; reason?: string };
}

export function buildSuites(
  repoRoot: string,
  opts: { skipBuild: boolean; skipE2e: boolean },
): SuiteSpec[] {
  const suites: SuiteSpec[] = [
    { id: 'lint', cmd: 'bun', args: ['run', 'lint'], cwd: repoRoot, timeoutMs: 600_000 },
    {
      id: 'build',
      cmd: 'bun',
      args: ['run', 'build'],
      cwd: repoRoot,
      timeoutMs: 900_000,
      requires: () => (opts.skipBuild ? { ok: false, reason: 'skipped by --skip-build' } : { ok: true }),
    },
    { id: 'test:jev', cmd: 'bun', args: ['test', './tests/jev'], cwd: repoRoot, timeoutMs: 600_000 },
    { id: 'test:platform', cmd: 'bun', args: ['test', './tests/platform'], cwd: repoRoot, timeoutMs: 900_000 },
    {
      id: 'test:copilot',
      cmd: 'bun',
      args: ['test', './tests/copilot'],
      cwd: repoRoot,
      timeoutMs: 600_000,
      requires: (root) => {
        const dir = path.join(root, 'tests', 'copilot');
        return fs.existsSync(dir)
          ? { ok: true }
          : { ok: false, reason: 'tests/copilot does not exist' };
      },
    },
    {
      id: 'test:frontend',
      cmd: 'bun',
      args: ['test', './tests/frontend'],
      cwd: repoRoot,
      timeoutMs: 600_000,
      requires: (root) => {
        const dir = path.join(root, 'tests', 'frontend');
        return fs.existsSync(dir)
          ? { ok: true }
          : { ok: false, reason: 'tests/frontend does not exist' };
      },
    },
    {
      id: 'test:architecture',
      cmd: 'bun',
      args: ['test', './tests/architecture'],
      cwd: repoRoot,
      timeoutMs: 300_000,
      requires: (root) => {
        const dir = path.join(root, 'tests', 'architecture');
        return fs.existsSync(dir)
          ? { ok: true }
          : { ok: false, reason: 'tests/architecture does not exist' };
      },
    },
    {
      id: 'test:ext',
      cmd: 'bun',
      args: ['test', './tests/ext'],
      cwd: repoRoot,
      timeoutMs: 300_000,
      requires: (root) => {
        const dir = path.join(root, 'tests', 'ext');
        return fs.existsSync(dir)
          ? { ok: true }
          : { ok: false, reason: 'tests/ext does not exist' };
      },
    },
    {
      id: 'test:landing-brand-theme',
      cmd: 'bun',
      args: ['test', './tests/landing-brand-theme.test.ts'],
      cwd: repoRoot,
      timeoutMs: 300_000,
      requires: (root) => {
        const f = path.join(root, 'tests', 'landing-brand-theme.test.ts');
        return fs.existsSync(f) ? { ok: true } : { ok: false, reason: 'test file does not exist' };
      },
    },
    {
      id: 'test:dashboard-model',
      cmd: 'bun',
      args: ['test', './tests/dashboard-model.test.ts'],
      cwd: repoRoot,
      timeoutMs: 300_000,
      requires: (root) => {
        const f = path.join(root, 'tests', 'dashboard-model.test.ts');
        return fs.existsSync(f) ? { ok: true } : { ok: false, reason: 'test file does not exist' };
      },
    },
    {
      id: 'test:e2e:list',
      cmd: 'bun',
      args: ['run', 'test:e2e', '--list'],
      cwd: repoRoot,
      timeoutMs: 300_000,
      requires: () => (opts.skipE2e ? { ok: false, reason: 'skipped by --skip-e2e' } : { ok: true }),
    },
  ];
  return suites;
}

function gitInfo(repoRoot: string): { commit: string | null; branch: string | null; dirty: boolean | null } {
  const commit = run('git', ['rev-parse', 'HEAD'], repoRoot, 30_000);
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot, 30_000);
  const status = run('git', ['status', '--porcelain'], repoRoot, 60_000);
  return {
    commit: commit.exitCode === 0 ? commit.stdout.trim() : null,
    branch: branch.exitCode === 0 ? branch.stdout.trim() : null,
    dirty: status.exitCode === 0 ? status.stdout.trim().length > 0 : null,
  };
}

export interface VerifyOptions {
  skipBuild: boolean;
  skipE2e: boolean;
  /** Test seam: override the suite list (used by the harness regression tests). */
  suites?: SuiteSpec[];
}

export function verifyAcceptance(
  repoRoot: string,
  opts: VerifyOptions,
): AcceptanceVerification {
  const suites: SuiteObservation[] = [];
  const junitDir = path.join(os.tmpdir(), 'kilo-acceptance-junit');
  fs.mkdirSync(junitDir, { recursive: true });
  const runToken = newRunToken();
  /** suite id -> the junit file that suite's results were read from. */
  const junitFilesBySuite = new Map<string, string>();

  // The source tree is fingerprinted BEFORE any suite runs, so the receipt can
  // be bound to the exact code that was exercised.
  const manifestBefore = computeSourceManifest(repoRoot);

  for (const spec of opts.suites ?? buildSuites(repoRoot, opts)) {
    const started = Date.now();
    const gate = spec.requires ? spec.requires(repoRoot) : { ok: true };
    const isTestSuite = spec.id.startsWith('test:') && spec.id !== 'test:e2e:list';

    if (!gate.ok) {
      suites.push({
        id: spec.id,
        command: `${spec.cmd} ${spec.args.join(' ')}`,
        cwd: spec.cwd,
        exitCode: null,
        status: 'unavailable',
        durationMs: 0,
        passCount: null,
        failCount: null,
        expectCount: null,
        filesScanned: null,
        summary: '',
        reason: gate.reason ?? 'prerequisite not satisfied',
        fileResults: [],
        stdoutTail: '',
        stderrTail: '',
      });
      continue;
    }

    // The junit reporter gives a per-test-file outcome map. That is the evidence
    // an acceptance row is actually checked against. The outfile is unique per
    // run so concurrent harness processes cannot read each other's results.
    const junitPath = junitOutFilePath(junitDir, spec.id, runToken);
    const runArgs = isTestSuite
      ? [...spec.args, '--reporter=junit', `--reporter-outfile=${junitPath}`]
      : spec.args;

    const r = run(spec.cmd, runArgs, spec.cwd, spec.timeoutMs);
    const durationMs = Date.now() - started;
    const combined = `${r.stdout}\n${r.stderr}`;

    let fileResults: FileResult[] = [];
    if (isTestSuite && fs.existsSync(junitPath)) {
      try {
        fileResults = parseJunitFiles(fs.readFileSync(junitPath, 'utf-8'));
      } catch {
        fileResults = [];
      }
      junitFilesBySuite.set(spec.id, junitPath);
    }
    // The junit file is scratch evidence: never leave it behind for the next run.
    if (isTestSuite) {
      try {
        fs.rmSync(junitPath, { force: true });
      } catch {
        /* best effort */
      }
    }

    if (r.timedOut) {
      suites.push({
        id: spec.id,
        command: `${spec.cmd} ${spec.args.join(' ')}`,
        cwd: spec.cwd,
        exitCode: null,
        status: 'unavailable',
        durationMs,
        passCount: null,
        failCount: null,
        expectCount: null,
        filesScanned: null,
        summary: '',
        reason: `timed out after ${spec.timeoutMs}ms`,
        fileResults,
        junitOutFile: junitFilesBySuite.get(spec.id),
        stdoutTail: tail(r.stdout),
        stderrTail: tail(r.stderr),
      });
      continue;
    }

    const parsed = isTestSuite
      ? parseBunTestSummary(combined)
      : { pass: null, fail: null, expect: null, files: null, summary: '' };

    let status: SuiteStatus;
    if (spec.id === 'test:e2e:list') {
      status = r.exitCode === 0 ? 'pass' : 'unavailable';
    } else {
      status = r.exitCode === 0 ? 'pass' : 'fail';
    }

    suites.push({
      id: spec.id,
      command: `${spec.cmd} ${spec.args.join(' ')}`,
      cwd: spec.cwd,
      exitCode: r.exitCode,
      status,
      durationMs,
      passCount: parsed.pass,
      failCount: parsed.fail,
      expectCount: parsed.expect,
      filesScanned: parsed.files,
      summary: parsed.summary,
      reason:
        spec.id === 'test:e2e:list' && r.exitCode !== 0
          ? 'playwright could not enumerate specs'
          : undefined,
      fileResults,
      junitOutFile: junitFilesBySuite.get(spec.id),
      stdoutTail: tail(r.stdout),
      stderrTail: tail(r.stderr),
    });
  }

  // Fingerprint the tree AGAIN. If it moved while the suites were running, the
  // result does not describe a single source tree and must not be published.
  const manifestAfter = computeSourceManifest(repoRoot);
  const sourceStable =
    manifestBefore !== null &&
    manifestAfter !== null &&
    manifestBefore.digest === manifestAfter.digest;

  const testSuites = suites.filter((s) => s.id.startsWith('test:') && s.status !== 'unavailable');
  const totals = {
    suitesRun: suites.filter((s) => s.status !== 'unavailable').length,
    suitesPassed: suites.filter((s) => s.status === 'pass').length,
    suitesFailed: suites.filter((s) => s.status === 'fail').length,
    suitesUnavailable: suites.filter((s) => s.status === 'unavailable').length,
    suitesSkippedByFlag: suites.filter((s) => (s.reason ?? '').startsWith('skipped by')).length,
    testsPassed: testSuites.reduce((acc, s) => acc + (s.passCount ?? 0), 0),
    testsFailed: testSuites.reduce((acc, s) => acc + (s.failCount ?? 0), 0),
    assertions: testSuites.reduce((acc, s) => acc + (s.expectCount ?? 0), 0),
  };

  const git = gitInfo(repoRoot);
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    gitCommit: git.commit,
    gitBranch: git.branch,
    gitDirty: git.dirty,
    nodeVersion: process.version,
    bunVersion: run('bun', ['--version'], repoRoot, 20_000).stdout.trim() || 'unknown',
    sourceManifestBefore: manifestBefore,
    sourceManifestAfter: manifestAfter,
    sourceStable,
    suites,
    totals,
  };
}

/**
 * Decide the process exit code for a verification run.
 *
 * A run is a FAILURE when any suite failed, when any test failed, when any
 * suite was UNAVAILABLE (a missing prerequisite is not a pass), or when the
 * source tree moved while the suites were running (the receipt then describes
 * no single tree).
 */
export function acceptanceExitCode(result: {
  totals: {
    suitesFailed: number;
    testsFailed: number;
    suitesUnavailable: number;
  };
  sourceStable: boolean;
  sourceManifestBefore?: SourceManifest | null;
  sourceManifestAfter?: SourceManifest | null;
}): { code: number; reasons: string[] } {
  const reasons: string[] = [];
  if (result.totals.suitesFailed > 0) {
    reasons.push(`${result.totals.suitesFailed} failed suite(s)`);
  }
  if (result.totals.testsFailed > 0) {
    reasons.push(`${result.totals.testsFailed} failed test(s)`);
  }
  if (result.totals.suitesUnavailable > 0) {
    reasons.push(`${result.totals.suitesUnavailable} unavailable suite(s)`);
  }
  if (!result.sourceStable) {
    reasons.push(
      `the source tree changed while the suites ran (before=${result.sourceManifestBefore?.digest ?? '?'} after=${result.sourceManifestAfter?.digest ?? '?'})`,
    );
  }
  return { code: reasons.length > 0 ? 1 : 0, reasons };
}

function parseArgs(argv: string[]): { out: string; skipBuild: boolean; skipE2e: boolean } {
  let out = 'reports/implementation/acceptance-verification.json';
  let skipBuild = false;
  let skipE2e = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out = argv[++i];
    else if (argv[i] === '--skip-build') skipBuild = true;
    else if (argv[i] === '--skip-e2e') skipE2e = true;
  }
  return { out, skipBuild, skipE2e };
}

if (import.meta.main) {
  const repoRoot = process.cwd();
  const { out, skipBuild, skipE2e } = parseArgs(process.argv.slice(2));
  const result = verifyAcceptance(repoRoot, { skipBuild, skipE2e });

  const lines: string[] = [];
  lines.push(`commit ${result.gitCommit ?? '?'} (${result.gitBranch ?? '?'}) dirty=${result.gitDirty}`);
  lines.push(
    `source manifest before=${result.sourceManifestBefore?.digest ?? '?'} ` +
      `after=${result.sourceManifestAfter?.digest ?? '?'} stable=${result.sourceStable} ` +
      `files=${result.sourceManifestAfter?.fileCount ?? 0}`,
  );
  for (const s of result.suites) {
    const counts =
      s.passCount !== null ? ` ${s.passCount} pass / ${s.failCount} fail / ${s.expectCount} expect` : '';
    lines.push(
      `  [${s.status.toUpperCase().padEnd(11)}] ${s.id.padEnd(26)} exit=${s.exitCode ?? '-'} ${s.durationMs}ms${counts}` +
        (s.reason ? `  (${s.reason})` : ''),
    );
  }
  lines.push(
    `totals: ${result.totals.suitesPassed}/${result.totals.suitesRun} suites pass, ` +
      `${result.totals.testsPassed} tests pass, ${result.totals.testsFailed} fail, ` +
      `${result.totals.assertions} assertions, ${result.totals.suitesUnavailable} unavailable`,
  );
  console.log(lines.join('\n'));

  const outPath = path.resolve(repoRoot, out);
  writeFileAtomic(outPath, JSON.stringify(result, null, 2));
  console.log(`\nWritten: ${outPath}`);

  // A failed OR unavailable suite must be visible in the exit code so CI cannot
  // silently ignore it. An unavailable suite means a prerequisite was missing,
  // so the evidence is incomplete — that is never a pass. The same applies when
  // the source tree moved while the suites were running.
  const verdict = acceptanceExitCode(result);
  if (verdict.code !== 0) {
    console.error(`\nFAILED: ${verdict.reasons.join('; ')}.`);
    process.exit(verdict.code);
  }
}
