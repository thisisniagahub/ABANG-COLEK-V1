/**
 * Acceptance harness — junit parser regression tests (FIX 4).
 *
 * The pre-fix parser only read `tests`, `failures` and `assertions` from the
 * `<testsuite>` tag. A file that reported `errors="1" skipped="1" tests="0"`
 * therefore parsed as `{tests:0, failures:0, assertions:0}` — indistinguishable
 * from a clean file — and the validator rejected a cited file only when
 * `failures > 0`. A broken file could be cited as proof of a verified
 * requirement.
 *
 * These tests pin the parser's behaviour on every outcome channel.
 */

import { describe, expect, test } from 'bun:test';

import { parseJunitFiles } from '../../scripts/maintenance/verify-acceptance';

const BROKEN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="0" assertions="0" failures="0" errors="1" skipped="1" time="0.001">
  <testsuite name="tests\\platform\\broken.test.ts" file="tests\\platform\\broken.test.ts" tests="0" assertions="0" failures="0" errors="1" skipped="1" time="0.001" hostname="">
  </testsuite>
</testsuites>`;

const MIXED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="3" assertions="4" failures="1" errors="0" skipped="1" time="0.02">
  <testsuite name="tests\\platform\\mixed.test.ts" file="tests\\platform\\mixed.test.ts" tests="3" assertions="4" failures="1" errors="0" skipped="1" time="0.02" hostname="">
    <testsuite name="mixed suite" file="tests\\platform\\mixed.test.ts" line="2" tests="3" assertions="4" failures="1" errors="0" skipped="1" time="0.02" hostname="">
      <testcase name="passing case" classname="mixed suite" time="0.001" file="tests\\platform\\mixed.test.ts" line="3" assertions="1" />
      <testcase name="skipped case" classname="mixed suite" time="0" file="tests\\platform\\mixed.test.ts" line="4" assertions="0">
        <skipped />
      </testcase>
      <testcase name="failing case" classname="mixed suite" time="0.002" file="tests\\platform\\mixed.test.ts" line="5" assertions="3">
        <failure type="AssertionError" message="boom">AssertionError: boom</failure>
      </testcase>
    </testsuite>
  </testsuite>
</testsuites>`;

describe('parseJunitFiles — broken suites are not clean', () => {
  test('a file reporting errors=1 skipped=1 tests=0 is NOT parsed as clean', () => {
    const files = parseJunitFiles(BROKEN_XML);
    expect(files).toHaveLength(1);
    const file = files[0]!;
    expect(file.file).toBe('tests\\platform\\broken.test.ts');
    // Pre-fix these were all 0 and the file looked indistinguishable from clean.
    expect(file.errors).toBe(1);
    expect(file.skipped).toBe(1);
    expect(file.tests).toBe(0);
    expect(file.failures).toBe(0);
  });

  test('error and skip counts survive the outer/inner testsuite duplication', () => {
    const files = parseJunitFiles(MIXED_XML);
    expect(files).toHaveLength(1);
    const file = files[0]!;
    expect(file.tests).toBe(3);
    expect(file.failures).toBe(1);
    expect(file.errors).toBe(0);
    expect(file.skipped).toBe(1);
  });
});

describe('parseJunitFiles — per-testcase outcomes', () => {
  test('every testcase is recorded with its outcome', () => {
    const files = parseJunitFiles(MIXED_XML);
    const file = files[0]!;
    expect(file.testCases).toHaveLength(3);
    const byName = new Map(file.testCases.map((c) => [c.name, c]));
    expect(byName.get('passing case')?.outcome).toBe('pass');
    expect(byName.get('skipped case')?.outcome).toBe('skip');
    expect(byName.get('failing case')?.outcome).toBe('fail');
  });

  test('a skipped testcase is never reported as passed', () => {
    const file = parseJunitFiles(MIXED_XML)[0]!;
    const skipped = file.testCases.find((c) => c.name === 'skipped case');
    expect(skipped).toBeDefined();
    expect(skipped!.outcome).not.toBe('pass');
    expect(file.testCases.filter((c) => c.outcome === 'pass')).toHaveLength(1);
  });

  test('the classname (describe path) is captured for each testcase', () => {
    const file = parseJunitFiles(MIXED_XML)[0]!;
    expect(file.testCases[0]!.classname).toBe('mixed suite');
  });

  test('xml entities are decoded in names and classnames', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" assertions="1" failures="0">
  <testsuite name="f" file="tests\\platform\\amp.test.ts" tests="1" assertions="1" failures="0">
    <testcase name="reports a &quot;from&quot; line &amp; the &quot;to&quot; line" classname="a &gt; b" file="tests\\platform\\amp.test.ts" assertions="1" />
  </testsuite>
</testsuites>`;
    const file = parseJunitFiles(xml)[0]!;
    expect(file.testCases[0]!.name).toBe('reports a "from" line & the "to" line');
    expect(file.testCases[0]!.classname).toBe('a > b');
  });

  test('an empty document yields no files', () => {
    expect(parseJunitFiles('')).toEqual([]);
    expect(parseJunitFiles('<testsuites tests="0"/>')).toEqual([]);
  });
});
