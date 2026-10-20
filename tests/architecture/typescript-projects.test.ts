import { expect, test } from 'bun:test';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dir, '../..');
const cases = [
  ['server/tsconfig.json', 'server/platform/app.ts'],
  ['shared/tsconfig.json', 'shared/platform-contracts.ts'],
  ['scripts/tsconfig.json', 'scripts/dev.ts'],
  ['api/tsconfig.json', 'api/platform.ts'],
  ['tests/tsconfig.json', 'tests/platform/routes.test.ts'],
] as const;

test('editor discovers a strict Bun project for server, API, scripts and backend tests', () => {
  for (const [config, file] of cases) {
    const absoluteFile = path.join(root, file);
    const discovered = ts.findConfigFile(path.dirname(absoluteFile), ts.sys.fileExists);
    expect(path.resolve(discovered!)).toBe(path.join(root, config));
    const read = ts.readConfigFile(discovered!, ts.sys.readFile);
    expect(read.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(discovered!));
    expect(parsed.errors).toEqual([]);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.types).toContain('bun');
    expect(parsed.fileNames.map(fileName => path.resolve(fileName))).toContain(absoluteFile);
  }
});

test('frontend alias resolves without deprecated baseUrl', () => {
  const config = path.join(root, 'tsconfig.json');
  const read = ts.readConfigFile(config, ts.sys.readFile);
  expect(read.config.compilerOptions.baseUrl).toBeUndefined();
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const resolved = ts.resolveModuleName('@/features/landing/LandingPage', path.join(root, 'src/App.tsx'), parsed.options, ts.sys);
  expect(path.resolve(resolved.resolvedModule!.resolvedFileName)).toBe(path.join(root, 'src/features/landing/LandingPage.tsx'));
});
