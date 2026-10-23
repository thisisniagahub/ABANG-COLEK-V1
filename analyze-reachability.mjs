import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ts from 'typescript'

const REPO_ROOT = 'D:\\ABANGCOLEK-PLATFORM'
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx']

function toPosix(value) { return value.replace(/\\/g, '/') }

function loadRepoSources(root) {
  const files = []
  const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.work', 'outputs', '.next', '.vercel'])
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (IGNORED_DIRECTORIES.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      const ext = path.extname(entry.name)
      if (!SOURCE_EXTENSIONS.includes(ext)) continue
      let content
      try { content = fs.readFileSync(full, 'utf8') } catch { continue }
      files.push({ path: toPosix(path.relative(root, full)), content })
    }
  }
  walk(root)
  return files
}

function extractValueImports(filePath, content) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const edges = []
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const clause = statement.importClause
      let isValue = false
      if (clause) {
        if (clause.isTypeOnly) continue
        if (clause.name) isValue = true
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) { isValue = true }
          else if (ts.isNamedImports(clause.namedBindings)) {
            isValue = clause.namedBindings.elements.some(el => !el.isTypeOnly)
          }
        }
      } else {
        isValue = true
      }
      if (isValue) {
        edges.push({ specifier: statement.moduleSpecifier.text, line: statement.getStart(sourceFile) + 1 })
      }
      continue
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      if (statement.isTypeOnly) continue
      let isValue = true
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        isValue = statement.exportClause.elements.some(el => !el.isTypeOnly)
      }
      if (isValue) {
        edges.push({ specifier: statement.moduleSpecifier.text, line: statement.getStart(sourceFile) + 1 })
      }
      continue
    }
    if (ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference) && ts.isStringLiteral(statement.moduleReference.expression)) {
      edges.push({ specifier: statement.moduleReference.expression.text, line: statement.getStart(sourceFile) + 1 })
      continue
    }
  }
  return edges
}

const files = loadRepoSources(REPO_ROOT)
const fileSet = new Set(files.map(f => f.path))

// Build import graph
const graph = new Map()
const importers = new Map()
let totalEdgesResolved = 0

for (const file of files) {
  const targets = new Set()
  for (const edge of extractValueImports(file.path, file.content)) {
    if (!edge.specifier.startsWith('.') && !edge.specifier.startsWith('@/')) continue
    // Resolve internal specifier
    let resolved
    if (edge.specifier.startsWith('@/')) {
      resolved = path.posix.join('src', edge.specifier.slice(2))
    } else {
      resolved = path.posix.join(path.posix.dirname(file.path), edge.specifier)
    }
    // Try with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx']
    let found = false
    for (const ext of extensions) {
      const candidate = resolved.endsWith(ext) ? resolved : resolved + ext
      if (fileSet.has(candidate)) { resolved = candidate; found = true; break }
    }
    if (!found) continue
    targets.add(resolved)
    totalEdgesResolved++
    if (!importers.has(resolved)) importers.set(resolved, new Set())
    importers.get(resolved).add(file.path)
  }
  graph.set(file.path, targets)
}

// Default entrypoints
const defaultEntrypoints = ['src/main.tsx']
  .concat(files.map(f => f.path).filter(f => f.startsWith('api/') && f.endsWith('.ts')).sort())
  .concat('server/index.ts')
  .filter(f => fileSet.has(f))

console.log('Entrypoints:', JSON.stringify(defaultEntrypoints))

// BFS from entrypoints
const reachable = new Set()
const queue = []
for (const ep of defaultEntrypoints) {
  if (!reachable.has(ep)) { reachable.add(ep); queue.push(ep) }
}
while (queue.length > 0) {
  const current = queue.shift()
  for (const next of (graph.get(current) || [])) {
    if (!reachable.has(next)) { reachable.add(next); queue.push(next) }
  }
}

// Classify modules under src/
const scoped = files.filter(f => f.path.startsWith('src/'))
console.log('Scoped files (src/):', scoped.length)

const modules = scoped.map(file => {
  const directImporters = [...(importers.get(file.path) || [])].sort()
  const isReachable = reachable.has(file.path)
  let className
  if (isReachable) className = 'reachable'
  else if (directImporters.length === 0) className = 'no-importer'
  else if (directImporters.every(importer => importer.startsWith('tests/'))) className = 'test-only'
  else className = 'dead-cluster'
  const loc = file.content.split('\n').length
  return { file: file.path, loc, reachable: isReachable, class: className, importers: directImporters }
})

// Counts
const totalSrcModules = modules.length
const reachableCount = modules.filter(m => m.reachable).length
const unreachableCount = modules.filter(m => !m.reachable).length
const noImporterCount = unreachable.filter(m => m.class === 'no-importer').length
const testOnlyCount = unreachable.filter(m => m.class === 'test-only').length
const deadClusterCount = unreachable.filter(m => m.class === 'dead-cluster').length

// LOC totals
const unreachableLoc = unreachable.reduce((sum, m) => sum + m.loc, 0)
const reachableLoc = modules.filter(m => m.reachable).reduce((sum, m) => sum + m.loc, 0)

// Per-class breakdown
const classCounts = {}
for (const m of modules) { classCounts[m.class] = (classCounts[m.class] || 0) + 1 }

console.log('=== REACHABILITY ANALYSIS ===')
console.log(`Total src modules scanned: ${totalSrcModules}`)
console.log(`Reachable: ${reachableCount}`)
console.log(`Unreachable: ${unreachableCount}`)
console.log(`  no-importer: ${noImporterCount}`)
console.log(`  test-only: ${testOnlyCount}`)
console.log(`  dead-cluster: ${deadClusterCount}`)
console.log(`Unreachable LOC: ${unreachableLoc}`)
console.log(`Reachable LOC: ${reachableLoc}`)
console.log(`\nClass breakdown:`)
for (const [cls, cnt] of Object.entries(classCounts)) {
  console.log(`  ${cls}: ${cnt}`)
}
console.log(`\nTotal edges resolved: ${totalEdgesResolved}`)

// Show unreachable modules by class
console.log(`\n=== UNREACHABLE MODULES ===`)
for (const m of unreachable) {
  const importerStr = m.importers.length > 0 ? m.importers.slice(0, 3).map(i => path.basename(i)) : 'NONE'
  console.log(`  [${m.class}] ${m.file} (${m.loc} LOC) — importers: ${importerStr}`)
}