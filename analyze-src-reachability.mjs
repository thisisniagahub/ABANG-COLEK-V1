import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

const REPO_ROOT = path.resolve('.');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx'];
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.kilo', '.work', '.manus', 'manus-slides', 'outputs', '.next', '.vercel']);

function toPosix(value) { return value.replace(/\\\\/g, '/'); }

function isSourceFile(filePath) {
  if (filePath.endsWith('.d.ts')) return false;
  return SOURCE_EXTENSIONS.includes(path.extname(filePath));
}

function loadRepoSources(root) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
      if (!isSourceFile(entry.name)) continue;
      let content;
      try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
      files.push({ path: toPosix(path.relative(root, full)), content });
    }
  };
  walk(root);
  return files;
}

function scriptKindFor(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function extractValueImports(filePath, content) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKindFor(filePath));
  const edges = [];
  const lineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const clause = statement.importClause;
      let isValue = false;
      if (clause) {
        if (clause.isTypeOnly) continue;
        if (clause.name) isValue = true;
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) { isValue = true; }
          else if (ts.isNamedImports(clause.namedBindings)) {
            isValue = clause.namedBindings.elements.some((element) => !element.isTypeOnly);
          }
        }
      } else {
        isValue = true;
      }
      if (isValue) {
        edges.push({ specifier: statement.moduleSpecifier.text, line: lineOf(statement) });
      }
      continue;
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
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
    if (ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference) && ts.isStringLiteral(statement.moduleReference.expression)) {
      edges.push({ specifier: statement.moduleReference.expression.text, line: lineOf(statement) });
      continue;
    }
  }
  
  const visit = (node) => {
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

function isInternalSpecifier(specifier) { return specifier.startsWith('.') || specifier.startsWith('@/'); }

function resolveInternal(specifier, fromFile, fileSet) {
  const base = specifier.startsWith('@/')
    ? path.posix.join('src', specifier.slice(2))
    : path.posix.join(path.posix.dirname(fromFile), specifier);
  const candidates = [];
  for (const ext of SOURCE_EXTENSIONS) {
    candidates.push(base, `${base}${ext}`, `${base}/index${ext}`);
  }
  if (base.endsWith('.js')) {
    const withoutExt = base.slice(0, -'.js'.length);
    for (const ext of SOURCE_EXTENSIONS) { candidates.push(`${withoutExt}${ext}`); }
  }
  for (const candidate of candidates) {
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

function isTestFile(filePath) { return filePath.startsWith('tests/') || /\\.test\\.[tj]sx?$/.test(filePath); }

const files = loadRepoSources(REPO_ROOT);
const fileSet = new Set(files.map((f) => f.path));

// Only src/ modules
const srcFiles = files.filter((f) => f.path.startsWith('src/') && !f.path.endsWith('.d.ts'));
const srcFileSet = new Set(srcFiles.map((f) => f.path));

// Build import graph (VALUE imports only) for src/
const graph = new Map();
const importers = new Map();
let totalEdgesResolved = 0;

for (const file of srcFiles) {
  const targets = new Set();
  for (const edge of extractValueImports(file.path, file.content)) {
    if (!isInternalSpecifier(edge.specifier)) continue;
    const resolved = resolveInternal(edge.specifier, file.path, srcFileSet);
    if (!resolved) continue;
    targets.add(resolved);
    totalEdgesResolved += 1;
    if (!importers.has(resolved)) importers.set(resolved, new Set());
    importers.get(resolved)?.add(file.path);
  }
  graph.set(file.path, targets);
}

// Entrypoints: only src/main.tsx (as confirmed in the task)
const entrypoints = ['src/main.tsx'];

// BFS from src/main.tsx
const reachableSet = new Set();
const queue = [];
if (!reachableSet.has('src/main.tsx')) { reachableSet.add('src/main.tsx'); queue.push('src/main.tsx'); }
while (queue.length > 0) {
  const current = queue.shift();
  for (const next of graph.get(current) ?? []) {
    if (!reachableSet.has(next)) { reachableSet.add(next); queue.push(next); }
  }
}

// Klassifikasi per src/ module
const modules = srcFiles.map((file) => {
  const directImporters = [...(importers.get(file.path) ?? [])].sort();
  const isReachable = reachableSet.has(file.path);
  let reachabilityClass;
  if (isReachable) { reachabilityClass = 'reachable'; }
  else if (directImporters.length === 0) { reachabilityClass = 'no-importer'; }
  else if (directImporters.every(isTestFile)) { reachabilityClass = 'test-only'; }
  else { reachabilityClass = 'dead-cluster'; }
  return {
    file: file.path,
    loc: file.content.split('\n').length,
    reachable: isReachable,
    class: reachabilityClass,
    importers: directImporters,
  };
});

// Categorize
const reachableModules = modules.filter((m) => m.class === 'reachable');
const unreachableModules = modules.filter((m) => m.class !== 'reachable');
const noImporter = unreachableModules.filter((m) => m.class === 'no-importer');
const testOnly = unreachableModules.filter((m) => m.class === 'test-only');
const deadCluster = unreachableModules.filter((m) => m.class === 'dead-cluster');

console.log('=== FRONTEND REACHABILITY ANALYSIS ===');
console.log('Scope: src/ directory only (matching test expectations)');
console.log('');
console.log('Total src modules:', modules.length);
console.log('Reachable from src/main.tsx:', reachableModules.length);
console.log('Unreachable:', unreachableModules.length);
console.log('');
console.log('Classification:');
console.log('  no-importer (truly dead, no importer):', noImporter.length);
console.log('  test-only (imported only by tests):', testOnly.length);
console.log('  dead-cluster (in dead cluster):', deadCluster.length);
console.log('  reachable (some edge case):', reachableModules.length);
console.log('');
console.log('Unreachable LOC:');
const unreachableLoc = unreachableModules.reduce((sum, m) => sum + m.loc, 0);
console.log('  Total unreachable LOC:', unreachableLoc);
console.log('');
console.log('Per-directory breakdown (src/):');
const dirBreakdown = {};
for (const m of modules) {
  const dir = m.file.split('/')[1];
  if (!dirBreakdown[dir]) dirBreakdown[dir] = { total: 0, reachable: 0, unreachable: 0, byClass: {} };
  dirBreakdown[dir].total += 1;
  if (m.class === 'reachable') dirBreakdown[dir].reachable += 1;
  else dirBreakdown[dir].unreachable += 1;
  dirBreakdown[dir].byClass[m.class] = (dirBreakdown[dir].byClass[m.class] || 0) + 1;
}
for (const [dir, info] of Object.entries(dirBreakdown)) {
  console.log(`  ${dir}: ${info.total} total, ${info.reachable} reachable, ${info.unreachable} unreachable`);
  if (Object.keys(info.byClass).length > 0) {
    console.log(`    byClass: ${JSON.stringify(info.byClass)}`);
  }
}
console.log('');

// Show unreachable details by class
console.log('no-importer modules (first 20):');
noImporter.slice(0, 20).forEach((m) => {
  console.log(`  [${m.class}] ${m.file} (${m.loc} LOC)`);
});
console.log('');

console.log('test-only modules:');
testOnly.forEach((m) => {
  console.log(`  [${m.class}] ${m.file} (${m.loc} LOC)`);
});
console.log('');

console.log('dead-cluster modules:');
deadCluster.forEach((m) => {
  console.log(`  [${m.class}] ${m.file} (${m.loc} LOC)`);
});
console.log('');

// Show reachable modules
console.log('reachable modules (first 20):');
reachableModules.slice(0, 20).forEach((m) => {
  console.log(`  [${m.class}] ${m.file} (${m.loc} LOC)`);
});