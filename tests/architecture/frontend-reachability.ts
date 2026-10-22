/**
 * Reachability engine untuk frontend ABANGCOLEK-PLATFORM.
 *
 * Matlamat: kirakan dead-code frontend yang TIDAK boleh dicapai dari production
 * entrypoint, dan tambah guard supaya kelas ini tidak boleh ditambah semula.
 *
 * Kaedah:
 *  - Universe modul (guarded scope): semua fail .ts/.tsx di bawah `src/`.
 *    `*.d.ts` dikecualikan — ia hanya deklarasi ambient, tiada kod runtime.
 *  - Entrypoints production:
 *      * Browser     : `src/main.tsx`
 *      * Serverless  : setiap fail .ts di bawah `api/`
 *      * Server temp : `server/index.ts`
 *  - Edge hanya untuk VALUE import. `import type {...}`, `export type {...}`
 *    dan specifier `type` inline semuanya TIDAK runtime edge (dibuang semasa build).
 *  - Parsing guna TypeScript Compiler API (`ts.createSourceFile`), bukan regex,
 *    supaya multiline import, `import x = require(...)`, dan `export * from`
 *    dikesan betul.
 *
 * Keterbatasan yang DIDOKUMENTASI (bukan senyap):
 *  - `import(specifier)` dengan specifier bukan literal tidak boleh disimpan
 *    sebagai edge. Repo ini tiada dynamic import bukan-literal (disahkan).
 *  - Fail di luar repo (node_modules) bukan sebahagian universe.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

/** Fail sumber yangScanned untuk pengiraan import graph. */
export interface SourceFile {
  /** Repo-relative POSIX path. */
  path: string;
  content: string;
}

export type ReachabilityClass =
  /** Tiada importer langsung di mana-mana dalam repo. */
  | 'no-importer'
  /** Diimport hanya oleh fail test. */
  | 'test-only'
  /** Diimport hanya oleh kod yang itself tidak boleh dicapai (dead cluster). */
  | 'dead-cluster'
  /** Ada importer production yang boleh dicapai — tiada dead code. */
  | 'reachable';

export interface ModuleReachability {
  /** Repo-relative POSIX path. */
  file: string;
  /** Bilangan baris fail. */
  loc: number;
  reachable: boolean;
  class: ReachabilityClass;
  /** Repo-relative POSIX path semua importer, diurut. */
  importers: string[];
}

export interface ReachabilityViolation {
  /** Modul yang tidak boleh dicapai dan tiada dalam allow-list. */
  file: string;
  loc: number;
  class: ReachabilityClass;
  /** Importer yang disyorkan, jika ada. */
  importers: string[];
}

export interface ReachabilityResult {
  ok: boolean;
  /** Entrypoints production yang digunakan. */
  entrypoints: string[];
  /** Semua modul dalam guarded scope. */
  modules: ModuleReachability[];
  /** Modul dalam guarded scope yang TIDAK boleh dicapai. */
  unreachable: ModuleReachability[];
  /** Modul tidak boleh dicapai yang TIDAK dilindungi allow-list. */
  violations: ReachabilityViolation[];
  /** Bilangan fail yang diimbas. */
  totalFilesScanned: number;
  /** Bilangan import dalaman yang berjaya diselesaikan. */
  totalEdgesResolved: number;
}

export interface ReachabilityOptions {
  /** Ganti senarai fail yang diimbas (digunakan oleh probe test). */
  files?: SourceFile[];
  /** Ganti entrypoints production. */
  entrypoints?: string[];
  /** Akar repo. */
  root: string;
  /** Scope modul yang dilindungi guard. */
  scopePrefixes?: string[];
}

/** Direktori yang tidak pernah sebahagian daripada sumber aplikasi. */
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.kilo',
  'var',
  '.work',
  '.manus',
  'manus-slides',
  'outputs',
  'coverage',
  '.next',
  '.vercel',
]);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx'];

function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

function isSourceFile(filePath: string): boolean {
  if (filePath.endsWith('.d.ts')) return false;
  return SOURCE_EXTENSIONS.includes(path.extname(filePath));
}

/** Kumpul semua fail sumber dalam repo, mengabaikan direktori tidak Relevance. */
export function loadRepoSources(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
      if (!isSourceFile(entry.name)) continue; // buang *.d.ts — deklarasi ambient, bukan modul runtime
      let content: string;
      try {
        content = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      files.push({ path: toPosix(path.relative(root, full)), content });
    }
  };
  walk(root);
  return files;
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

interface RawEdge {
  specifier: string;
  line: number;
}

/**
 * Ekstrak semua VALUE import edge daripada satu fail.
 * Type-only import (import type / export type / specifier `type` inline)
 * TIDAK dikembalikan kerana ia tidak wujud sebagai runtime edge.
 */
export function extractValueImports(filePath: string, content: string): RawEdge[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath)
  );
  const edges: RawEdge[] = [];

  const lineOf = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const clause = statement.importClause;
      let isValue = false;
      if (clause) {
        // `import type { X } from 'y'` — seluruh clause type-only.
        if (clause.isTypeOnly) continue;
        if (clause.name) isValue = true;
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            isValue = true;
          } else if (ts.isNamedImports(clause.namedBindings)) {
            // `import { type A, B } from 'y'` — B masih value.
            isValue = clause.namedBindings.elements.some((element) => !element.isTypeOnly);
          }
        }
      } else {
        // `import 'y'` — side-effect import, sentiasa runtime edge.
        isValue = true;
      }
      if (isValue) {
        edges.push({ specifier: statement.moduleSpecifier.text, line: lineOf(statement) });
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      // `export type { X } from 'y'` — type-only.
      if (statement.isTypeOnly) continue;
      let isValue = true;
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        isValue = statement.exportClause.elements.some((element) => !element.isTypeOnly);
      }
      if (isValue) {
        edges.push({ specifier: statement.moduleSpecifier.text, line: lineOf(statement) });
      }
      continue;
    }

    if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      ts.isStringLiteral(statement.moduleReference.expression)
    ) {
      edges.push({ specifier: statement.moduleReference.expression.text, line: lineOf(statement) });
      continue;
    }
  }

  // Dynamic `import('x')` dan `require('x')` dengan literal statik.
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (isDynamicImport || isRequire) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) {
          edges.push({ specifier: argument.text, line: lineOf(node) });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return edges;
}

/** Sama ada specifier menunjuk ke fail dalam repo (bukan pakej luar). */
function isInternalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('@/');
}

/** Adakah specifier ini fail dalam repo? (path relatif / alias `@/` sahaja) */
function resolveInternal(
  specifier: string,
  fromFile: string,
  fileSet: Set<string>
): string | null {
  const base = specifier.startsWith('@/')
    ? path.posix.join('src', specifier.slice(2))
    : path.posix.join(path.posix.dirname(fromFile), specifier);

  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];
  // `import './x.js'` pada TS bundler resolution sebenarnya menunjuk `./x.ts`.
  if (base.endsWith('.js')) {
    const withoutExt = base.slice(0, -'.js'.length);
    candidates.push(...SOURCE_EXTENSIONS.map((ext) => `${withoutExt}${ext}`));
  }
  for (const candidate of candidates) {
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

function isTestFile(filePath: string): boolean {
  return filePath.startsWith('tests/') || /\.test\.[tj]sx?$/.test(filePath);
}

/**
 * Kirakan reachability dari production entrypoints.
 */
export function analyzeReachability(options: ReachabilityOptions): ReachabilityResult {
  const { root } = options;
  const scopePrefixes = options.scopePrefixes ?? ['src/'];
  const files = options.files ?? loadRepoSources(root);
  const fileSet = new Set(files.map((file) => file.path));

  // --- Import graph ---
  const graph = new Map<string, Set<string>>();
  const importers = new Map<string, Set<string>>();
  let totalEdgesResolved = 0;

  for (const file of files) {
    const targets = new Set<string>();
    for (const edge of extractValueImports(file.path, file.content)) {
      if (!isInternalSpecifier(edge.specifier)) continue;
      const resolved = resolveInternal(edge.specifier, file.path, fileSet);
      if (!resolved) continue;
      targets.add(resolved);
      totalEdgesResolved += 1;
      if (!importers.has(resolved)) importers.set(resolved, new Set());
      importers.get(resolved)!.add(file.path);
    }
    graph.set(file.path, targets);
  }

  // --- Entrypoints ---
  const defaultEntrypoints = [
    'src/main.tsx',
    ...files
      .map((file) => file.path)
      .filter((file) => file.startsWith('api/') && file.endsWith('.ts'))
      .sort(),
    'server/index.ts',
  ].filter((file) => fileSet.has(file));
  const entrypoints = (options.entrypoints ?? defaultEntrypoints).filter((file) => fileSet.has(file));

  // --- BFS ---
  const reachable = new Set<string>();
  const queue: string[] = [];
  for (const entrypoint of entrypoints) {
    if (!reachable.has(entrypoint)) {
      reachable.add(entrypoint);
      queue.push(entrypoint);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  // --- Klasifikasi ---
  const scoped = files.filter((file) =>
    scopePrefixes.some((prefix) => file.path.startsWith(prefix))
  );

  const modules: ModuleReachability[] = scoped.map((file) => {
    const directImporters = [...(importers.get(file.path) ?? [])].sort();
    const isReachable = reachable.has(file.path);
    let reachabilityClass: ReachabilityClass;
    if (isReachable) {
      reachabilityClass = 'reachable';
    } else if (directImporters.length === 0) {
      reachabilityClass = 'no-importer';
    } else if (directImporters.every(isTestFile)) {
      reachabilityClass = 'test-only';
    } else {
      reachabilityClass = 'dead-cluster';
    }
    return {
      file: file.path,
      loc: file.content.split('\n').length,
      reachable: isReachable,
      class: reachabilityClass,
      importers: directImporters,
    };
  });

  const unreachable = modules.filter((module) => !module.reachable);

  return {
    ok: true,
    entrypoints,
    modules,
    unreachable,
    violations: [],
    totalFilesScanned: files.length,
    totalEdgesResolved,
  };
}

/** Cari entri allow-list yang sudah lapuk (modulnya kini boleh dicapai). */
export function findStaleAllowListEntries(
  result: ReachabilityResult,
  allowList: readonly { file: string }[]
): string[] {
  const unreachable = new Set(result.unreachable.map((module) => module.file));
  return allowList.map((entry) => entry.file).filter((file) => !unreachable.has(file));
}

/** Namakan modul yang tidak boleh dicapai dan tiada dalam allow-list. */
export function findUnprotectedDeadModules(
  result: ReachabilityResult,
  allowList: readonly string[]
): ReachabilityViolation[] {
  const allowed = new Set(allowList);
  return result.unreachable
    .filter((module) => !allowed.has(module.file))
    .map((module) => ({
      file: module.file,
      loc: module.loc,
      class: module.class,
      importers: module.importers,
    }));
}
