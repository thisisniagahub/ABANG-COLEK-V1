import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  checkDependencyBoundaries,
  loadSourceTree,
  LEGACY_EXCEPTIONS,
  RULES,
  type BoundaryCheckResult,
} from '../../scripts/maintenance/check-boundaries';

const FIXTURES = path.resolve(import.meta.dir, 'fixtures');
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');

function scanFixture(name: string): BoundaryCheckResult {
  return checkDependencyBoundaries(path.join(FIXTURES, name));
}

function onlyViolation(result: BoundaryCheckResult) {
  expect(result.violations).toHaveLength(1);
  return result.violations[0];
}

describe('ARC-01 architecture boundary checker — synthetic violation fixtures', () => {
  test('reports a client file that imports server code (rule 1)', () => {
    const result = scanFixture('client-imports-server');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(violation.file).toBe('src/features/legacy/client-imports-server.ts');
    expect(violation.importedPath).toBe('../../../server/platform/commerce');
    expect(violation.resolvedPath).toBe('server/platform/commerce');
    expect(violation.line).toBe(1);
    expect(violation.column).toBeGreaterThan(0);
    expect(violation.message).toContain('server');
    expect(result.ok).toBe(false);
  });

  test('reports a shared contract that imports client code (rule 2)', () => {
    const result = scanFixture('shared-imports-app');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER);
    expect(violation.file).toBe('shared/contracts/shared-imports-app.ts');
    expect(violation.importedPath).toBe('../../src/lib/http/client');
    expect(violation.resolvedPath).toBe('src/lib/http/client');
    expect(violation.line).toBe(1);
    expect(result.ok).toBe(false);
  });

  test('reports a multiline import statement at the statement, not at the "from" line', () => {
    const result = scanFixture('multiline-import');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(violation.file).toBe('src/features/legacy/multiline-import.ts');
    expect(violation.importedPath).toBe('../../../server/platform/assessment');

    // The specifier lives on a different line than the `import` keyword. A
    // line-based scanner cannot see this statement at all; a statement parser
    // anchors it on the statement start.
    const fixtureSource = fs.readFileSync(
      path.join(FIXTURES, 'multiline-import', 'src', 'features', 'legacy', 'multiline-import.ts'),
      'utf-8'
    );
    const fromLine = fixtureSource.split('\n').findIndex((line) => line.includes("from '")) + 1;
    expect(fromLine).toBe(4);
    expect(violation.line).toBe(1);
    expect(violation.line).not.toBe(fromLine);
  });

  test('reports a dynamic import() of server code', () => {
    const result = scanFixture('dynamic-import');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(violation.file).toBe('src/features/legacy/dynamic-import.ts');
    expect(violation.importedPath).toBe('../../../server/platform/assessment');
    expect(violation.form).toBe('dynamic');
    expect(violation.line).toBe(2);
    expect(result.ok).toBe(false);
  });

  test('reports a require() call of server code', () => {
    const result = scanFixture('require-import');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(violation.file).toBe('src/features/legacy/require-import.ts');
    expect(violation.importedPath).toBe('../../../server/platform/assessment');
    // Borang require() mesti dikesan sebagai require, bukan static — ini yang
    // membezakan scanner parser-based daripada regex line-based.
    expect(violation.form).toBe('require');
    expect(violation.line).toBe(1);
    expect(result.ok).toBe(false);
  });

  test('reports a deep relative import that climbs four levels out of the client layer', () => {
    const result = scanFixture('deep-relative-import');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(violation.file).toBe('src/features/deep/relative/deep-relative-import.ts');
    expect(violation.importedPath).toBe('../../../../server/platform/assessment');
    expect(violation.resolvedPath).toBe('server/platform/assessment');
    expect(violation.resolution).toBe('relative');
  });

  test('reports an aliased import that resolves into a forbidden layer', () => {
    const result = scanFixture('aliased-import');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(violation.file).toBe('src/features/legacy/aliased-import.ts');
    expect(violation.importedPath).toBe('@server/platform/assessment');
    expect(violation.resolution).toBe('alias');
    expect(violation.resolvedPath).toBe('server/platform/assessment');
  });

  test('reports an aliased import that pulls client code into a shared contract', () => {
    const result = scanFixture('aliased-shared-import');

    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER);
    expect(violation.file).toBe('shared/contracts/aliased-shared-import.ts');
    expect(violation.importedPath).toBe('@client/lib/http/client');
    expect(violation.resolution).toBe('alias');
    expect(violation.resolvedPath).toBe('src/lib/http/client');
  });

  test('reports a feature that imports the composition root (target layout)', () => {
    const result = scanFixture('feature-imports-app');

    expect(result.layout).toBe('target');
    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_FEATURE_IMPORTING_APP);
    expect(violation.file).toBe('src/features/alpha/alpha.ts');
    expect(violation.resolvedPath).toBe('src/app/router/app-router');
  });

  test('reports a feature that imports another feature internals (target layout)', () => {
    const result = scanFixture('feature-imports-foreign-feature');

    expect(result.layout).toBe('target');
    const violation = onlyViolation(result);
    expect(violation.rule).toBe(RULES.FORBIDDEN_FEATURE_IMPORTING_FOREIGN_FEATURE);
    expect(violation.file).toBe('src/features/alpha/alpha.ts');
    expect(violation.importedPath).toBe('../beta/beta');
    expect(violation.resolvedPath).toBe('src/features/beta/beta');
  });

  test('reports a genuine module-interface cycle with file:line for every edge', () => {
    const result = scanFixture('cycle');

    expect(result.cycles).toHaveLength(1);
    const cycle = result.cycles[0];
    expect(cycle.members).toEqual(['server/modules/alpha', 'server/modules/beta']);
    expect(cycle.path[0]).toBe(cycle.path[cycle.path.length - 1]);
    expect(cycle.edges.length).toBeGreaterThanOrEqual(2);
    for (const edge of cycle.edges) {
      expect(edge.file).toMatch(/^server\/modules\/(alpha|beta)\/service\.ts$/);
      expect(edge.line).toBeGreaterThan(0);
      expect(edge.column).toBeGreaterThan(0);
      expect(edge.importedPath).toContain('../');
    }
    expect(result.ok).toBe(false);
  });

  test('a clean synthetic tree produces zero violations and zero cycles', () => {
    const result = scanFixture('clean');

    expect(result.violations).toHaveLength(0);
    expect(result.cycles).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(result.totalFilesScanned).toBeGreaterThan(0);
  });

  test('the checker is drivable with an injected file set and never touches the filesystem', () => {
    const injected = checkDependencyBoundaries(REPO_ROOT, {
      files: [
        {
          path: 'src/features/injected/injected-violation.ts',
          content: "import { commerceTotal } from '../../../server/platform/commerce';\nexport const t = commerceTotal;\n",
        },
      ],
    });

    expect(injected.totalFilesScanned).toBe(1);
    expect(injected.violations).toHaveLength(1);
    expect(injected.violations[0].rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(injected.violations[0].file).toBe('src/features/injected/injected-violation.ts');
    expect(injected.violations[0].line).toBe(1);
  });
});

describe('ARC-01 architecture boundary checker — real repository tree', () => {
  test('the real repository has no unauthorized cross-boundary import', () => {
    const result = checkDependencyBoundaries(REPO_ROOT);

    expect(result.totalFilesScanned).toBeGreaterThan(0);
    expect(result.totalEdgesResolved).toBeGreaterThan(0);
    if (!result.ok) {
      console.error('Unauthorized violations detected:', result.violations, result.cycles);
    }
    expect(result.violations).toHaveLength(0);
    expect(result.cycles).toHaveLength(0);
    expect(result.ok).toBe(true);
  }, 30_000);

  test('every violation the real tree produces is covered by a registered exception', () => {
    const result = checkDependencyBoundaries(REPO_ROOT);

    const registered = new Set(
      LEGACY_EXCEPTIONS.map((ex) => `${ex.file}|${ex.importedPath}|${ex.rule}`)
    );
    for (const violation of result.violations) {
      expect(registered.has(`${violation.file}|${violation.importedPath}|${violation.rule}`)).toBe(true);
    }
    expect(result.exemptions.length).toBeGreaterThanOrEqual(0);
  }, 30_000);

  test('the registered JEV exceptions are consumed as exemptions, not as violations', () => {
    const result = checkDependencyBoundaries(REPO_ROOT);

    const exempted = result.exemptions.map((ex) => `${ex.file}|${ex.importedPath}`);
    expect(exempted).toContain('src/features/jev/index.ts|../../../server/platform/jev/assessment');
    expect(exempted).toContain('src/services/jevEngine.ts|../../server/platform/jev/assessment');
  }, 30_000);

  test('regression guard: a NEW cross-boundary import without a registered exception fails the check', () => {
    const realFiles = loadSourceTree(REPO_ROOT);
    const probe = {
      path: 'src/features/boundary-guard-probe/probe.ts',
      content: "import { commerceTotal } from '../../../server/platform/commerce';\nexport const total = commerceTotal;\n",
    };

    const before = checkDependencyBoundaries(REPO_ROOT, { files: realFiles });
    expect(before.violations).toHaveLength(0);

    const after = checkDependencyBoundaries(REPO_ROOT, { files: [...realFiles, probe] });
    expect(after.violations).toHaveLength(1);
    expect(after.violations[0].rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(after.violations[0].file).toBe(probe.path);
    expect(after.ok).toBe(false);
  }, 30_000);

  test('regression guard: a NEW shared->client import without a registered exception fails the check', () => {
    const realFiles = loadSourceTree(REPO_ROOT);
    const probe = {
      path: 'shared/contracts/boundary-guard-probe.ts',
      content: "import { appRouter } from '../../src/features/platform/AppRouter';\nexport const r = appRouter;\n",
    };

    const after = checkDependencyBoundaries(REPO_ROOT, { files: [...realFiles, probe] });
    expect(after.violations).toHaveLength(1);
    expect(after.violations[0].rule).toBe(RULES.FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER);
    expect(after.violations[0].file).toBe(probe.path);
  });
});
