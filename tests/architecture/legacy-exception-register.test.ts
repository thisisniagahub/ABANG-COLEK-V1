import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  checkDependencyBoundaries,
  loadSourceTree,
  COMPLETED_PHASES,
  LEGACY_CYCLE_BASELINE,
  LEGACY_EXCEPTIONS,
  PHASES,
  phaseOfRemovalBatch,
  RULES,
} from '../../scripts/maintenance/check-boundaries';

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');

describe('ARC-01 legacy exception register — the register itself is guarded', () => {
  test('the phase registry is not vacuous: the previously stale 03B batch is a completed phase', () => {
    expect(COMPLETED_PHASES.has('03B')).toBe(true);
    expect(COMPLETED_PHASES.has('03A')).toBe(true);
    expect(COMPLETED_PHASES.has('00')).toBe(true);
    expect(COMPLETED_PHASES.has('01')).toBe(false);
    expect(COMPLETED_PHASES.has('04')).toBe(false);
    expect(PHASES.length).toBeGreaterThan(0);
  });

  test('every registered phase points at a prompt document that exists in the repository', () => {
    for (const phase of PHASES) {
      expect(fs.existsSync(path.join(REPO_ROOT, phase.promptFile))).toBe(true);
      expect(phase.note.length).toBeGreaterThan(0);
    }
  });

  test('every registered exception has an owner, a reason and a removal batch', () => {
    expect(LEGACY_EXCEPTIONS.length).toBeGreaterThan(0);
    for (const exception of LEGACY_EXCEPTIONS) {
      expect(exception.file.trim().length).toBeGreaterThan(0);
      expect(exception.importedPath.trim().length).toBeGreaterThan(0);
      expect(exception.rule.trim().length).toBeGreaterThan(0);
      expect(exception.owner.trim().length).toBeGreaterThan(0);
      expect(exception.reason.trim().length).toBeGreaterThan(20);
      expect(exception.removalBatch.trim().length).toBeGreaterThan(0);
    }
  });

  test('no registered exception points its removal batch at an already-completed phase', () => {
    for (const exception of LEGACY_EXCEPTIONS) {
      const phase = phaseOfRemovalBatch(exception.removalBatch);
      expect(phase).not.toBeNull();
      expect(COMPLETED_PHASES.has(phase!)).toBe(false);
    }
    for (const baseline of LEGACY_CYCLE_BASELINE) {
      const phase = phaseOfRemovalBatch(baseline.removalBatch);
      expect(phase).not.toBeNull();
      expect(COMPLETED_PHASES.has(phase!)).toBe(false);
    }
  });

  test('the two JEV exceptions were re-based off the completed 03B batch onto an open phase', () => {
    const jev = LEGACY_EXCEPTIONS.filter((ex) => ex.file.includes('jev'));
    expect(jev).toHaveLength(2);
    for (const exception of jev) {
      expect(exception.removalBatch).not.toBe('03B');
      expect(exception.removalBatch).toBe('01D');
      expect(phaseOfRemovalBatch(exception.removalBatch)).toBe('01');
      expect(COMPLETED_PHASES.has('01')).toBe(false);
      expect(exception.reason).toContain('Fasa 01');
      expect(exception.owner).toBe('jev-team');
    }
  });

  test('a removal batch maps onto a phase prefix, so 01D belongs to phase 01 and 03B to phase 03B', () => {
    expect(phaseOfRemovalBatch('01D')).toBe('01');
    expect(phaseOfRemovalBatch('03B')).toBe('03B');
    expect(phaseOfRemovalBatch('03A')).toBe('03A');
    expect(phaseOfRemovalBatch('06')).toBe('06');
    expect(phaseOfRemovalBatch('nonsense')).toBeNull();
  });

  test('the register holds no stale promise: every registered edge still exists in the real tree', () => {
    const result = checkDependencyBoundaries(REPO_ROOT);

    const stale = result.findings.filter((finding) => finding.kind === 'STALE_REGISTERED_EXCEPTION');
    expect(stale).toEqual([]);
    const staleCycles = result.findings.filter((finding) => finding.kind === 'STALE_REGISTERED_CYCLE');
    expect(staleCycles).toEqual([]);
  });

  test('the register is exact-edge: an exception does not blanket-allow the whole file', () => {
    const realFiles = loadSourceTree(REPO_ROOT);
    const probe = {
      // Same file as a registered exception, DIFFERENT specifier: must still be
      // reported, because an exception names one exact edge.
      path: 'src/features/jev/index.ts',
      content:
        "export { assessState } from '../../../server/platform/jev/assessment-extra';\n",
    };

    const after = checkDependencyBoundaries(REPO_ROOT, { files: [...realFiles, probe] });
    expect(after.violations).toHaveLength(1);
    expect(after.violations[0].rule).toBe(RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER);
    expect(after.violations[0].importedPath).toBe('../../../server/platform/jev/assessment-extra');
  });

  test('every registered legacy cycle carries an owner, a reason and an open removal batch', () => {
    expect(LEGACY_CYCLE_BASELINE.length).toBeGreaterThan(0);
    for (const baseline of LEGACY_CYCLE_BASELINE) {
      expect(baseline.id.trim().length).toBeGreaterThan(0);
      expect(baseline.path.length).toBeGreaterThanOrEqual(2);
      expect(baseline.owner.trim().length).toBeGreaterThan(0);
      expect(baseline.reason.trim().length).toBeGreaterThan(20);
      expect(baseline.removalBatch.trim().length).toBeGreaterThan(0);
    }
  });

  test('the registered legacy cycle is still detected and reported as a registered baseline, not a violation', () => {
    const result = checkDependencyBoundaries(REPO_ROOT);

    const registered = result.findings.filter((finding) => finding.kind === 'REGISTERED_LEGACY_CYCLE');
    expect(registered.length).toBeGreaterThan(0);
    expect(result.cycles).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});
