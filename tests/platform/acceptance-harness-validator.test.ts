/**
 * Acceptance harness — validator regression tests (FIX 2, FIX 3, FIX 4, FIX 7).
 *
 * These cover the four validation defects that let a false "verified" claim
 * pass the renderer:
 *
 *  - FIX 2: a `testName` that never ran was accepted, and a row could cite an
 *           unrelated green test from another acceptance area.
 *  - FIX 3: `evidenceRefs` were never checked for existence.
 *  - FIX 4: a junit file that reported errors/skips/zero tests parsed as clean.
 *  - FIX 7: the receipt was not bound to the source tree that produced it.
 */

import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';

import {
  ALL_IDS,
  allowedTestFilesFor,
  canonicalizeStatus,
  isFileInAcceptanceArea,
  normalizeStatusFile,
  resolveEvidenceRef,
  validate,
  type AcceptanceRow,
  type AcceptanceStatusFile,
  type VerificationLite,
} from '../../scripts/maintenance/render-acceptance-register';

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');
const DEMO_FILE = 'tests/platform/copilot-demo.test.ts';
const DEMO_CASES = [
  {
    name: 'the demo copilot runtime answers with the canonical payload',
    classname: 'CPK-02 demo suite',
    file: DEMO_FILE,
    outcome: 'pass' as const,
  },
  {
    name: 'the demo copilot runtime skips when the provider is unavailable',
    classname: 'CPK-02 demo suite',
    file: DEMO_FILE,
    outcome: 'skip' as const,
  },
];

function defaultRow(id: string): AcceptanceRow {
  return {
    id,
    tier: id.startsWith('EXT-') ? 'extension' : 'core',
    title: `placeholder requirement ${id}`,
    status: 'implemented_unverified',
    statusRaw: 'implemented_unverified',
    source: 'src/placeholder.ts',
    testFile: null,
    testName: null,
    testKind: 'none',
    gap: null,
    externalGate: null,
    evidenceRefs: ['package.json'],
  };
}

function makeStatus(overrides: Record<string, Partial<AcceptanceRow>> = {}): AcceptanceStatusFile {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    sourceCommit: 'commit-abc',
    sourceManifest: null,
    rows: ALL_IDS.map((id) => ({ ...defaultRow(id), ...(overrides[id] ?? {}) })),
  };
}

function makeVerification(overrides: Partial<VerificationLite> = {}): VerificationLite {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    gitCommit: 'commit-abc',
    gitBranch: 'main',
    gitDirty: true,
    sourceManifestBefore: { digest: 'manifest-A', fileCount: 42 },
    sourceManifestAfter: { digest: 'manifest-A', fileCount: 42 },
    sourceStable: true,
    suites: [
      {
        id: 'lint',
        command: 'bun run lint',
        exitCode: 0,
        status: 'pass',
        passCount: null,
        failCount: null,
        expectCount: null,
        filesScanned: null,
        summary: '',
      },
      {
        id: 'build',
        command: 'bun run build',
        exitCode: 0,
        status: 'pass',
        passCount: null,
        failCount: null,
        expectCount: null,
        filesScanned: null,
        summary: '',
      },
      {
        id: 'test:platform',
        command: 'bun test ./tests/platform',
        exitCode: 0,
        status: 'pass',
        passCount: 2,
        failCount: 0,
        expectCount: 4,
        filesScanned: 1,
        summary: '',
        fileResults: [
          {
            file: DEMO_FILE,
            tests: 2,
            failures: 0,
            errors: 0,
            skipped: 0,
            assertions: 4,
            testCases: DEMO_CASES,
          },
        ],
      },
      {
        id: 'test:frontend',
        command: 'bun test ./tests/frontend',
        exitCode: 0,
        status: 'pass',
        passCount: 1,
        failCount: 0,
        expectCount: 1,
        filesScanned: 1,
        summary: '',
        fileResults: [
          {
            file: 'tests/frontend/gui01-display-only.test.tsx',
            tests: 1,
            failures: 0,
            errors: 0,
            skipped: 0,
            assertions: 1,
            testCases: [
              {
                name: 'renders the handoff JEV assessment as safe, read-only text',
                classname: 'GUI-01 display-only cards',
                file: 'tests/frontend/gui01-display-only.test.tsx',
                outcome: 'pass',
              },
            ],
          },
        ],
      },
    ],
    totals: {
      suitesRun: 4,
      suitesPassed: 4,
      suitesFailed: 0,
      suitesUnavailable: 0,
      testsPassed: 3,
      testsFailed: 0,
      assertions: 5,
    },
    ...overrides,
  };
}

function errorsFor(status: AcceptanceStatusFile, verification: VerificationLite | null, id: string): string[] {
  return validate(status, verification, REPO_ROOT)
    .filter((i) => i.severity === 'error' && i.id === id)
    .map((i) => i.message);
}

/* -------------------------------------------------------------------------- */

describe('FIX 2 — the named test must have actually run', () => {
  const verifiedRow = (patch: Partial<AcceptanceRow>): Partial<AcceptanceRow> => ({
    status: 'implemented_verified',
    statusRaw: 'implemented_verified',
    testKind: 'real',
    testFile: DEMO_FILE,
    testName: 'the demo copilot runtime answers with the canonical payload',
    ...patch,
  });

  test('a testName that matches no observed testcase is a hard error', () => {
    const status = makeStatus({
      'CPK-02': verifiedRow({
        testName: 'a test name that exists nowhere in the entire repository',
      }),
    });
    const errors = errorsFor(status, makeVerification(), 'CPK-02');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('did not match any testcase');
  });

  test('a testName that matches an observed testcase passes', () => {
    const status = makeStatus({ 'CPK-02': verifiedRow({}) });
    const errors = errorsFor(status, makeVerification(), 'CPK-02');
    expect(errors).toEqual([]);
  });

  test('a testName matching the describe path (classname) passes', () => {
    const status = makeStatus({ 'CPK-02': verifiedRow({ testName: 'CPK-02 demo suite' }) });
    expect(errorsFor(status, makeVerification(), 'CPK-02')).toEqual([]);
  });

  test('a "(path)" evidence suffix is stripped before matching', () => {
    const status = makeStatus({
      'CPK-02': verifiedRow({
        testName: `the demo copilot runtime answers with the canonical payload (${DEMO_FILE})`,
      }),
    });
    expect(errorsFor(status, makeVerification(), 'CPK-02')).toEqual([]);
  });

  test('a testName that matches a SKIPPED testcase is rejected', () => {
    const status = makeStatus({
      'CPK-02': verifiedRow({
        testName: 'the demo copilot runtime skips when the provider is unavailable',
      }),
    });
    const errors = errorsFor(status, makeVerification(), 'CPK-02');
    expect(errors.join(' ')).toContain('SKIPPED');
  });

  test('a row citing a green test from another acceptance area is rejected', () => {
    const status = makeStatus({
      'CPK-02': verifiedRow({
        testFile: 'tests/frontend/gui01-display-only.test.tsx',
        testName: 'renders the handoff JEV assessment as safe, read-only text',
      }),
    });
    const errors = errorsFor(status, makeVerification(), 'CPK-02');
    expect(errors.join(' ')).toContain('outside the CPK-02 acceptance area');
  });
});

describe('FIX 2 — the acceptance-area mapping', () => {
  test('each prefix maps to its documented area', () => {
    expect(isFileInAcceptanceArea('ADV-01', 'tests/platform/adv-tools-capability-coverage.test.ts')).toBe(true);
    expect(isFileInAcceptanceArea('MOD-01', 'tests/copilot/mod-01-storefront.test.ts')).toBe(true);
    expect(isFileInAcceptanceArea('CPK-01', 'tests/platform/copilot-runtime-pipeline.test.ts')).toBe(true);
    expect(isFileInAcceptanceArea('CPK-04', 'tests/frontend/a2ui-components.test.tsx')).toBe(true);
    expect(isFileInAcceptanceArea('GUI-01', 'tests/frontend/gui01-display-only.test.tsx')).toBe(true);
    expect(isFileInAcceptanceArea('EXT-03', 'tests/platform/ext-03-telemetry.test.ts')).toBe(true);
    expect(isFileInAcceptanceArea('ARC-01', 'tests/architecture/dependency-boundaries.test.ts')).toBe(true);
  });

  test('a file outside the area is rejected', () => {
    expect(isFileInAcceptanceArea('MOD-01', 'tests/platform/copilot-demo.test.ts')).toBe(false);
    expect(isFileInAcceptanceArea('GUI-01', 'tests/copilot/mod-01-storefront.test.ts')).toBe(false);
    expect(isFileInAcceptanceArea('CPK-02', 'tests/frontend/gui01-display-only.test.tsx')).toBe(false);
    expect(isFileInAcceptanceArea('ADV-01', 'tests/copilot/mod-01-storefront.test.ts')).toBe(false);
  });

  test('the per-ID exception list is honoured', () => {
    expect(isFileInAcceptanceArea('ADV-05', 'tests/copilot/mod-01-storefront.test.ts')).toBe(true);
    expect(allowedTestFilesFor('ADV-05')).toContain('tests/copilot/mod-01-storefront.test.ts');
  });

  test('each requirement may cite the test file the ledger actually cites', () => {
    // The acceptance area must cover the file the ledger row names, or the
    // gate reports a false "outside the acceptance area" error.
    expect(isFileInAcceptanceArea('PAY-02', 'tests/platform/backend-lifecycle.test.ts')).toBe(true);
    expect(allowedTestFilesFor('PAY-02')).toContain('tests/platform/backend-lifecycle');
    expect(isFileInAcceptanceArea('OFF-01', 'tests/platform/client-retry.test.ts')).toBe(true);
    expect(allowedTestFilesFor('OFF-01')).toContain('tests/platform/client-retry');
    expect(isFileInAcceptanceArea('SEC-02', 'tests/platform/agent-runtime.test.ts')).toBe(true);
    expect(allowedTestFilesFor('SEC-02')).toContain('tests/platform/agent-runtime');
  });
});

describe('FIX 3 — evidenceRefs must exist', () => {
  test('a missing evidence file is a hard error naming the ref', () => {
    const status = makeStatus({
      'CPK-02': { evidenceRefs: ['reports/this-file-does-not-exist.json'] },
    });
    const errors = errorsFor(status, makeVerification(), 'CPK-02');
    expect(errors.join(' ')).toContain('reports/this-file-does-not-exist.json');
    expect(errors.join(' ')).toContain('does not exist');
  });

  test('an existing evidence file passes', () => {
    const status = makeStatus({
      'CPK-02': { evidenceRefs: ['package.json', 'reports/audits/2026-10-20-double-check-findings.md'] },
    });
    expect(errorsFor(status, makeVerification(), 'CPK-02')).toEqual([]);
  });

  test('resolveEvidenceRef reports existence against the repo root', () => {
    expect(resolveEvidenceRef(REPO_ROOT, 'package.json').exists).toBe(true);
    expect(resolveEvidenceRef(REPO_ROOT, 'reports/nope.json').exists).toBe(false);
    expect(resolveEvidenceRef(REPO_ROOT, 'https://example.com/x').external).toBe(true);
  });
});

describe('FIX 4 — a broken test file cannot support a verified claim', () => {
  const brokenVerification = (file: Record<string, unknown>): VerificationLite => {
    const verification = makeVerification();
    const platform = verification.suites.find((s) => s.id === 'test:platform')!;
    platform.fileResults = [file as never];
    return verification;
  };

  test('a file reporting errors=1 skipped=1 tests=0 is rejected', () => {
    const status = makeStatus({
      'CPK-02': {
        status: 'implemented_verified',
        statusRaw: 'implemented_verified',
        testKind: 'real',
        testFile: DEMO_FILE,
        testName: 'anything at all',
      },
    });
    const verification = brokenVerification({
      file: DEMO_FILE,
      tests: 0,
      failures: 0,
      errors: 1,
      skipped: 1,
      assertions: 0,
      testCases: [],
    });
    const errors = errorsFor(status, verification, 'CPK-02').join(' ');
    expect(errors).toContain('execution error');
    expect(errors).toContain('skipped 1 test');
    expect(errors).toContain('executed 0 tests');
  });

  test('a file with an assertion failure is rejected', () => {
    const status = makeStatus({
      'CPK-02': {
        status: 'implemented_verified',
        statusRaw: 'implemented_verified',
        testKind: 'real',
        testFile: DEMO_FILE,
        testName: 'the demo copilot runtime answers with the canonical payload',
      },
    });
    const verification = brokenVerification({
      file: DEMO_FILE,
      tests: 1,
      failures: 1,
      errors: 0,
      skipped: 0,
      assertions: 2,
      testCases: [DEMO_CASES[0]!],
    });
    expect(errorsFor(status, verification, 'CPK-02').join(' ')).toContain('failing test');
  });

  test('a file with zero executed tests is not a pass', () => {
    const status = makeStatus({
      'CPK-02': {
        status: 'implemented_verified',
        statusRaw: 'implemented_verified',
        testKind: 'real',
        testFile: DEMO_FILE,
        testName: 'the demo copilot runtime answers with the canonical payload',
      },
    });
    const verification = brokenVerification({
      file: DEMO_FILE,
      tests: 0,
      failures: 0,
      errors: 0,
      skipped: 0,
      assertions: 0,
      testCases: [],
    });
    expect(errorsFor(status, verification, 'CPK-02').join(' ')).toContain('executed 0 tests');
  });
});

describe('FIX 7 — the receipt must be bound to one source tree', () => {
  test('an unstable receipt is rejected', () => {
    const verification = makeVerification({
      sourceStable: false,
      sourceManifestAfter: { digest: 'manifest-B', fileCount: 43 },
    });
    const errors = validate(makeStatus(), verification, REPO_ROOT)
      .filter((i) => i.severity === 'error' && i.id === '(verification)')
      .map((i) => i.message);
    expect(errors.join(' ')).toContain('not bound to a single source tree');
  });

  test('a receipt without source binding at all is rejected', () => {
    const verification = makeVerification();
    delete (verification as { sourceStable?: boolean }).sourceStable;
    const errors = validate(makeStatus(), verification, REPO_ROOT)
      .filter((i) => i.severity === 'error' && i.id === '(verification)')
      .map((i) => i.message);
    expect(errors.join(' ')).toContain('not bound to a single source tree');
  });

  test('a register declaring a different sourceManifest is rejected', () => {
    const status = makeStatus();
    status.sourceManifest = 'manifest-from-another-tree';
    const errors = validate(status, makeVerification(), REPO_ROOT)
      .filter((i) => i.severity === 'error' && i.id === '(verification)')
      .map((i) => i.message);
    expect(errors.join(' ')).toContain('DIFFERENT source tree');
  });

  test('a register declaring the observed sourceManifest is accepted', () => {
    const status = makeStatus();
    status.sourceManifest = 'manifest-A';
    const errors = validate(status, makeVerification(), REPO_ROOT)
      .filter((i) => i.severity === 'error' && i.id === '(verification)')
      .map((i) => i.message);
    expect(errors).toEqual([]);
  });
});

describe('a receipt without per-testcase evidence cannot support a named test', () => {
  const legacyVerification = (): VerificationLite => {
    const verification = makeVerification();
    const platform = verification.suites.find((s) => s.id === 'test:platform')!;
    // A receipt produced by the pre-fix harness: per-file counts, no testcases.
    platform.fileResults = [
      { file: DEMO_FILE, tests: 2, failures: 0, assertions: 4 },
    ];
    const frontend = verification.suites.find((s) => s.id === 'test:frontend')!;
    frontend.fileResults = [
      { file: 'tests/frontend/gui01-display-only.test.tsx', tests: 1, failures: 0, assertions: 1 },
    ];
    return verification;
  };

  test('the receipt-level error names the missing evidence', () => {
    const errors = validate(makeStatus(), legacyVerification(), REPO_ROOT)
      .filter((i) => i.severity === 'error' && i.id === '(verification)')
      .map((i) => i.message);
    expect(errors.join(' ')).toContain('no per-testcase evidence');
  });

  test('the row-level error blocks the verified claim', () => {
    const status = makeStatus({
      'CPK-02': {
        status: 'implemented_verified',
        statusRaw: 'implemented_verified',
        testKind: 'real',
        testFile: DEMO_FILE,
        testName: 'the demo copilot runtime answers with the canonical payload',
      },
    });
    const errors = errorsFor(status, legacyVerification(), 'CPK-02');
    expect(errors.join(' ')).toContain('no per-testcase evidence');
  });
});

describe('status-file normalisation (current and incoming contract shapes)', () => {
  test('the canonical `rows` array is read', () => {
    const normalized = normalizeStatusFile({
      generatedAt: '2026-01-01T00:00:00.000Z',
      sourceCommit: 'abc',
      rows: [{ id: 'CPK-01', title: 'x', status: 'implemented_unverified', source: 'y.ts', evidenceRefs: [] }],
    });
    expect(normalized.rows).toHaveLength(1);
    expect(normalized.rows[0]!.id).toBe('CPK-01');
    expect(normalized.rows[0]!.status).toBe('implemented_unverified');
  });

  test('an alternative row-array key is still found', () => {
    const normalized = normalizeStatusFile({
      generatedAt: '2026-01-01T00:00:00.000Z',
      sourceCommit: 'abc',
      acceptance: [{ id: 'MOD-01', title: 'x', status: 'implemented_verified', source: 'y.ts' }],
    });
    expect(normalized.rows).toHaveLength(1);
    expect(normalized.rows[0]!.id).toBe('MOD-01');
  });

  test('a `verified_local` status is treated as a verified claim', () => {
    expect(canonicalizeStatus('verified_local').status).toBe('implemented_verified');
    expect(canonicalizeStatus('verified_local').known).toBe(true);
    expect(canonicalizeStatus('implemented_unverified').status).toBe('implemented_unverified');
    expect(canonicalizeStatus('blocked_external').status).toBe('blocked_external');
    expect(canonicalizeStatus('partial').status).toBe('partial');
  });

  test('an unknown status never claims verification', () => {
    expect(canonicalizeStatus('something-else').status).toBe('implemented_unverified');
    expect(canonicalizeStatus('something-else').known).toBe(false);
    expect(canonicalizeStatus(undefined).status).toBe('implemented_unverified');
  });

  test('the environment / integrationStage fields are preserved, not interpreted', () => {
    const normalized = normalizeStatusFile({
      rows: [
        {
          id: 'CPK-01',
          title: 'x',
          status: 'verified_local',
          source: 'y.ts',
          environment: 'local',
          integrationStage: 'wave-2',
          test: { file: 'tests/platform/copilot-demo.test.ts', name: 'demo' },
        },
      ],
    });
    expect(normalized.rows[0]!.statusRaw).toBe('verified_local');
    expect(normalized.rows[0]!.environment).toBe('local');
    expect(normalized.rows[0]!.integrationStage).toBe('wave-2');
    expect(normalized.rows[0]!.testFile).toBe('tests/platform/copilot-demo.test.ts');
    expect(normalized.rows[0]!.testName).toBe('demo');
  });
});
