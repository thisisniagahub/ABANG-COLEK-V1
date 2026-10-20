import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

export type ResolutionKind = 'relative' | 'alias' | 'bare';
export type ImportForm = 'static' | 'export-from' | 'dynamic' | 'require';

export interface BoundaryViolation {
  /** Repo-relative POSIX path of the importing file. */
  file: string;
  /** The import specifier exactly as written in the source. */
  importedPath: string;
  /** Repo-relative POSIX path the specifier resolves to (null when unresolvable). */
  resolvedPath: string | null;
  /** How the specifier was resolved. */
  resolution: ResolutionKind;
  /** Whether the specifier came from a dynamic `import()` / `require()` call. */
  form: ImportForm;
  rule: string;
  line: number;
  column: number;
  message: string;
}

export interface LegacyBoundaryException {
  file: string;
  importedPath: string;
  rule: string;
  owner: string;
  reason: string;
  removalBatch: string;
}

export interface LegacyCycleBaseline {
  /** Stable identifier, also the sort key used to match a detected cycle. */
  id: string;
  /** Module-interface node ids forming the accepted cycle, in traversal order. */
  path: string[];
  owner: string;
  reason: string;
  removalBatch: string;
}

export interface BoundaryCycleEdge {
  from: string;
  to: string;
  file: string;
  importedPath: string;
  line: number;
  column: number;
}

export interface BoundaryCycle {
  id: string;
  /** Representative closed walk through the component, e.g. A -> B -> A. */
  path: string[];
  /** Every module interface that belongs to the strongly connected component. */
  members: string[];
  edges: BoundaryCycleEdge[];
}

export interface BoundaryFinding {
  kind: string;
  message: string;
}

export interface BoundaryCheckResult {
  ok: boolean;
  /** Layout stage whose rule set was enforced. */
  layout: 'current' | 'target';
  violations: BoundaryViolation[];
  exemptions: LegacyBoundaryException[];
  cycles: BoundaryCycle[];
  findings: BoundaryFinding[];
  totalFilesScanned: number;
  totalEdgesResolved: number;
}

/**
 * A single source file the checker can analyse. `path` is repo-relative and
 * POSIX-normalised so that fixtures can be injected verbatim.
 */
export interface SourceFileInput {
  path: string;
  content: string;
}

/**
 * Layout stage whose rules are enforced.
 *
 * `current` — the layout the repository has today: `src/features/*` are peer
 *   modules under one shell and the composition root still lives inside
 *   `src/features/platform`. Always-on rules: client->server, shared->app/server
 *   and the server-side module-interface cycle rule.
 *
 * `target` — the layout prescribed by docs/design/repository-structure.md after
 *   Fasa 01 Stage B: `src/app/` is the composition root and every feature is
 *   isolated. Adds the feature-isolation rules and adds the client layers to
 *   the module-interface cycle graph.
 *
 * `auto` (the default) resolves to `target` when the tree already contains a
 * `src/app/` layer, otherwise to `current`.
 */
export type LayoutStage = 'current' | 'target' | 'auto';

export interface CheckOptions {
  /**
   * Injected file set. When present the checker NEVER walks the filesystem:
   * it analyses exactly these files. This is what makes negative testing
   * (synthetic violating trees) possible.
   */
  files?: SourceFileInput[];
  /** Extra tsconfig-style path mappings merged over the ones read from disk. */
  aliasPaths?: Record<string, string[]>;
  /** Set to false to disable alias resolution entirely (used by self-tests). */
  resolveAliases?: boolean;
  /** Which layout stage's rules to enforce. Defaults to `auto`. */
  layout?: LayoutStage;
}

/**
 * Delivery phases of docs/prompts/*.md.
 *
 * Provenance: PROJECT-CHECKLIST.md section 3 ("Urutan dan fasa semasa") and the
 * per-phase receipts under reports/implementation/. The registry exists so that a
 * registered legacy exception can never point at a phase that is already closed:
 * an exception whose removal batch is finished is a stale promise, not a plan.
 */
export interface PhaseInfo {
  id: string;
  promptFile: string;
  status: 'completed' | 'active' | 'open';
  note: string;
}

export const PHASES: PhaseInfo[] = [
  {
    id: '00',
    promptFile: 'docs/prompts/00-baseline.md',
    status: 'completed',
    note: 'Baseline inventory, hashes and local receipts recorded (00-baseline-receipt.json).',
  },
  {
    id: '01',
    promptFile: 'docs/prompts/01-structure.md',
    status: 'active',
    note: 'Fasa 01 repository restructure: Stage A docs/media, B frontend shell, C server extraction, D shared/tests split.',
  },
  {
    id: '02',
    promptFile: 'docs/prompts/02-copilot-foundation.md',
    status: 'open',
    note: 'Runtime and chat foundation; Fasa 01 Stage C/D still feed this phase.',
  },
  {
    id: '03',
    promptFile: 'docs/prompts/03-domains-and-tools.md',
    status: 'open',
    note: 'Parent phase for the 03A/03B batches.',
  },
  {
    id: '03A',
    promptFile: 'docs/prompts/03-domains-and-tools.md',
    status: 'completed',
    note: 'Integrity batch (margin arithmetic, HITL receipts, payment allocation) closed by 03a-integrity-receipt.json.',
  },
  {
    id: '03B',
    promptFile: 'docs/prompts/03-domains-and-tools.md',
    status: 'completed',
    note: 'Tool registry and canonical module journeys closed by 03b-tools-receipt.json.',
  },
  { id: '04', promptFile: 'docs/prompts/04-ui-and-agents.md', status: 'open', note: 'Generative UI, sub-agents and HITL surface.' },
  { id: '05', promptFile: 'docs/prompts/05-intelligence.md', status: 'open', note: 'Intelligence streams and learning; partially blocked_external.' },
  { id: '06', promptFile: 'docs/prompts/06-release.md', status: 'open', note: 'Final release evidence for the Copilot surface.' },
];

/** Phases that are already closed. A removal batch may not point at one of these. */
export const COMPLETED_PHASES: ReadonlySet<string> = new Set(
  PHASES.filter((p) => p.status === 'completed').map((p) => p.id)
);

/**
 * Map a removal batch label onto the delivery phase that owns it.
 *
 * `01C` -> `01` (Fasa 01, Stage C), `03B` -> `03B` (Fasa 03 batch B),
 * `06`   -> `06`. Returns null when the label carries no phase prefix.
 */
export function phaseOfRemovalBatch(batch: string): string | null {
  const match = /^(\d{2}(?:[AB])?)/.exec(batch.trim());
  return match ? match[1] : null;
}

/**
 * Registered legacy exceptions.
 *
 * Contract (docs/prompts/01-structure.md): "Legacy exception memerlukan exact
 * edge, owner, reason dan removal batch; jangan blanket allow source tree."
 * Every entry therefore names one exact (file, specifier, rule) edge, an owner,
 * a reason, and a removal batch whose delivery phase is still open.
 */
export const LEGACY_EXCEPTIONS: LegacyBoundaryException[] = [
  {
    file: 'src/features/jev/index.ts',
    importedPath: '../../../server/platform/jev/assessment',
    rule: 'FORBIDDEN_CLIENT_IMPORTING_SERVER',
    owner: 'jev-team',
    reason:
      'Client barrel re-exports the pure deterministic JEV evaluator that still physically lives under server/platform/jev. Re-based onto Fasa 01 Stage D (shared/ split): the evaluator moves to shared/ and this re-export disappears. Owner of the extraction is jev-team; no client code may import server code after the move.',
    removalBatch: '01D',
  },
  {
    file: 'src/services/jevEngine.ts',
    importedPath: '../../server/platform/jev/assessment',
    rule: 'FORBIDDEN_CLIENT_IMPORTING_SERVER',
    owner: 'jev-team',
    reason:
      'Client JEV engine calls the pure deterministic JEV evaluator that still physically lives under server/platform/jev. Re-based onto Fasa 01 Stage D (shared/ split): the evaluator moves to shared/ and this import disappears. Owner of the extraction is jev-team; no client code may import server code after the move.',
    removalBatch: '01D',
  },
];

/**
 * Registered legacy cycles in the module-interface graph.
 *
 * A cycle here is a mutual dependency between two MODULE INTERFACES (see
 * moduleInterfaceOf). Intra-module file-level cycles are NOT module-interface
 * cycles and are out of scope for this rule.
 */
export const LEGACY_CYCLE_BASELINE: LegacyCycleBaseline[] = [
  {
    id: 'server-platform<->server-automation',
    path: ['server/platform', 'server/automation'],
    owner: 'server-structure-team',
    reason:
      'server/platform/app.ts imports server/automation/{jobs,definitions,automation,adapters} while server/automation/{adapters,automation}.ts import server/platform/{store,auth,commerce,marketing}. The cycle is broken by Fasa 01 Stage C, which extracts HTTP/bootstrap out of server/platform and re-homes automation so that the platform module no longer calls back into automation.',
    removalBatch: '01C',
  },
];

/** Rule identifiers emitted by the checker. */
export const RULES = {
  FORBIDDEN_CLIENT_IMPORTING_SERVER: 'FORBIDDEN_CLIENT_IMPORTING_SERVER',
  FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER: 'FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER',
  FORBIDDEN_FEATURE_IMPORTING_APP: 'FORBIDDEN_FEATURE_IMPORTING_APP',
  FORBIDDEN_FEATURE_IMPORTING_FOREIGN_FEATURE: 'FORBIDDEN_FEATURE_IMPORTING_FOREIGN_FEATURE',
} as const;

/**
 * Module-interface roots on the server side. Each direct child directory of a
 * root is its own module interface.
 */
export const SERVER_MODULE_ROOTS: readonly string[] = [
  'server/modules',
  'server/agents',
  'server/application',
  'server/http',
  'server/bootstrap',
  'server/infrastructure',
  'server/automation',
  'server/legacy',
];

/**
 * Roots that are still monoliths. Every file under such a root belongs to one
 * single module interface, because the sub-directories are internal
 * implementation detail of that module and not interfaces of their own.
 */
export const LEGACY_MONOLITH_ROOTS: readonly string[] = ['server/platform'];

/** Client-side layer roots. */
export const CLIENT_LAYER_ROOTS: readonly string[] = [
  'src/app',
  'src/components',
  'src/data',
  'src/features',
  'src/integrations',
  'src/legacy',
  'src/lib',
  'src/services',
];

/** The architectural roots the checker scans when it walks a tree. */
export const SCANNED_ROOTS: readonly string[] = ['src', 'shared', 'server'];

interface ImportRecord {
  specifier: string;
  line: number;
  column: number;
  form: ImportForm;
}

interface ResolvedEdge {
  importer: string;
  specifier: string;
  resolvedPath: string | null;
  resolution: ResolutionKind;
  form: ImportForm;
  line: number;
  column: number;
}

interface AliasConfig {
  baseUrl: string;
  paths: Record<string, string[]>;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * Parse every import-like specifier out of one source file using the
 * TypeScript parser. Unlike a line-based regex this sees multiline import
 * statements, dynamic `import()` calls, `export ... from` re-exports and
 * `require()` calls, and it reports exact positions.
 */
export function collectImports(filePath: string, content: string): ImportRecord[] {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKindFor(filePath));
  const records: ImportRecord[] = [];

  const push = (literal: ts.StringLiteral, node: ts.Node, form: ImportForm): void => {
    const start = node.getStart(sourceFile, false);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
    records.push({ specifier: literal.text, line: line + 1, column: character + 1, form });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      push(node.moduleSpecifier, node, 'static');
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      push(node.moduleSpecifier, node, 'export-from');
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      push(node.moduleReference.expression, node, 'static');
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (isDynamicImport || isRequireCall) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          push(arg, node, isDynamicImport ? 'dynamic' : 'require');
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return records;
}

/**
 * Read tsconfig `paths` / `baseUrl` for a directory, following `extends`.
 * Returns an empty configuration when no tsconfig is present.
 */
export function readAliasConfig(rootDir: string): AliasConfig {
  const config: AliasConfig = { baseUrl: '.', paths: {} };
  const visited = new Set<string>();

  const load = (tsconfigPath: string): void => {
    const resolved = path.resolve(tsconfigPath);
    if (visited.has(resolved) || !fs.existsSync(resolved)) return;
    visited.add(resolved);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fs.readFileSync(resolved, 'utf-8')) as Record<string, unknown>;
    } catch {
      return;
    }

    const extendsField = parsed.extends;
    if (typeof extendsField === 'string') {
      const parentPath = path.resolve(path.dirname(resolved), extendsField);
      const parentCandidates = [parentPath, `${parentPath}.json`, path.join(parentPath, 'tsconfig.json')];
      const parent = parentCandidates.find((candidate) => fs.existsSync(candidate));
      if (parent) load(parent);
    }

    const compilerOptions = (parsed.compilerOptions ?? {}) as {
      baseUrl?: string;
      paths?: Record<string, string[]>;
    };
    if (typeof compilerOptions.baseUrl === 'string') {
      config.baseUrl = toPosix(path.relative(rootDir, path.resolve(path.dirname(resolved), compilerOptions.baseUrl)));
    }
    if (compilerOptions.paths && typeof compilerOptions.paths === 'object') {
      for (const [pattern, targets] of Object.entries(compilerOptions.paths)) {
        if (Array.isArray(targets)) {
          config.paths[pattern] = targets.map((t) => toPosix(String(t)));
        }
      }
    }
  };

  for (const name of ['tsconfig.json', 'tsconfig.platform.json']) {
    const candidate = path.resolve(rootDir, name);
    if (fs.existsSync(candidate)) load(candidate);
  }

  if (config.baseUrl === '' || config.baseUrl === '.') config.baseUrl = '.';
  return config;
}

/**
 * Resolve one import specifier against the importing file.
 *
 * - relative specifiers are resolved against the importing file's directory,
 *   at any depth (`../../../../server/x` included);
 * - aliased specifiers are resolved through tsconfig `paths` + `baseUrl`;
 * - bare specifiers (npm packages, `node:` builtins) are not repo-internal.
 */
export function resolveSpecifier(
  specifier: string,
  importerPath: string,
  alias: AliasConfig,
  resolveAliases = true
): { resolution: ResolutionKind; targetPath: string | null } {
  if (specifier.startsWith('.')) {
    const base = path.posix.dirname(toPosix(importerPath));
    const joined = path.posix.normalize(path.posix.join(base, specifier));
    if (joined.startsWith('..')) return { resolution: 'relative', targetPath: null };
    return { resolution: 'relative', targetPath: joined.replace(/\.(js|jsx|mjs)$/, '') };
  }

  if (resolveAliases && Object.keys(alias.paths).length > 0) {
    for (const [pattern, targets] of Object.entries(alias.paths)) {
      const star = pattern.indexOf('*');
      let matched: string | null = null;
      if (star === -1) {
        if (specifier === pattern) matched = '';
      } else {
        const prefix = pattern.slice(0, star);
        const suffix = pattern.slice(star + 1);
        if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
          matched = specifier.slice(prefix.length, specifier.length - suffix.length);
        }
      }
      if (matched === null) continue;
      for (const target of targets) {
        const substituted = target.includes('*') ? target.replace('*', matched) : target;
        const joined = path.posix.normalize(path.posix.join(alias.baseUrl, substituted));
        if (joined.startsWith('..')) continue;
        return { resolution: 'alias', targetPath: joined.replace(/\.(js|jsx|mjs)$/, '') };
      }
    }
  }

  return { resolution: 'bare', targetPath: null };
}

/**
 * The module-interface graph.
 *
 * NODE: a "module interface" is the unit of architectural decomposition.
 *   - `shared` is one node.
 *   - Each direct child directory of a SERVER_MODULE_ROOT is a node
 *     (`server/modules/marketing`, `server/agents/tools`, ...); files that sit
 *     directly inside the root belong to the root node itself.
 *   - A LEGACY_MONOLITH_ROOT (`server/platform`) contributes exactly ONE node
 *     regardless of its internal sub-directories, because those sub-directories
 *     are implementation detail of the monolith, not interfaces.
 *   - On the client side each CLIENT_LAYER_ROOT is a node, and every feature
 *     below `src/features/<name>` is its own node.
 *   - Files that are not inside any of the above (for example `api/` or
 *     `server/index.ts`) are NOT nodes and contribute no edges.
 *
 * EDGE: for every resolved import from file F (node A) to file G (node B) with
 *   A !== B, the graph contains the directed edge A -> B. The edge is annotated
 *   with the exact importer file, specifier and source position.
 *
 * CYCLE: a strongly connected component of that graph with two or more nodes,
 *   i.e. a closed walk A -> ... -> A with at least one edge. Every edge inside
 *   the component is reported with the exact importer file, specifier and
 *   source position so a human can act on it. Self-loops cannot occur because
 *   an intra-node import produces no edge.
 *
 * The client tree is only part of this graph in the `target` layout stage: in
 * the `current` layout `src/features/*` are peer modules of one shell that has
 * not been decomposed yet (Fasa 01 Stage B), so treating them as interfaces
 * would report pre-existing structure as an architectural defect.
 */
export function moduleInterfaceOf(repoPath: string, includeClient = false): string | null {
  const p = toPosix(repoPath);
  if (p === 'shared' || p.startsWith('shared/')) return 'shared';

  for (const monolith of LEGACY_MONOLITH_ROOTS) {
    if (p === monolith || p.startsWith(`${monolith}/`)) return monolith;
  }

  let best: string | null = null;
  for (const root of SERVER_MODULE_ROOTS) {
    if (p === root) {
      if (!best || root.length > best.length) best = root;
    } else if (p.startsWith(`${root}/`)) {
      const rest = p.slice(root.length + 1);
      const node = rest.includes('/') ? `${root}/${rest.split('/')[0]}` : root;
      if (!best || node.length > best.length) best = node;
    }
  }
  if (best) return best;

  if (!includeClient) return null;

  for (const root of CLIENT_LAYER_ROOTS) {
    if (p === root) return root;
    if (p.startsWith(`${root}/`)) {
      const rest = p.slice(root.length + 1);
      if (root === 'src/features' && rest.includes('/')) return `${root}/${rest.split('/')[0]}`;
      return root;
    }
  }

  if (p === 'src' || p.startsWith('src/')) return 'src';
  return null;
}

function isServerPath(p: string): boolean {
  return p === 'server' || p.startsWith('server/');
}

function isClientPath(p: string): boolean {
  return p === 'src' || p.startsWith('src/');
}

function isSharedPath(p: string): boolean {
  return p === 'shared' || p.startsWith('shared/');
}

function isAppPath(p: string): boolean {
  return p === 'src/app' || p.startsWith('src/app/');
}

function featureOf(p: string): string | null {
  if (!p.startsWith('src/features/')) return null;
  const rest = p.slice('src/features/'.length);
  const name = rest.split('/')[0];
  return name.length > 0 ? name : null;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/** Read a directory tree into an injectable file set (repo-relative POSIX paths). */
export function loadSourceTree(rootDir: string): SourceFileInput[] {
  const absRoot = path.resolve(rootDir);
  const files: SourceFileInput[] = [];
  for (const scannedRoot of SCANNED_ROOTS) {
    const abs = path.join(absRoot, scannedRoot);
    for (const file of walkDir(abs)) {
      files.push({
        path: toPosix(path.relative(absRoot, file)),
        content: fs.readFileSync(file, 'utf-8'),
      });
    }
  }
  return files;
}

function findException(file: string, importedPath: string, rule: string): LegacyBoundaryException | undefined {
  return LEGACY_EXCEPTIONS.find(
    (ex) => toPosix(ex.file) === file && ex.importedPath === importedPath && ex.rule === rule
  );
}

/**
 * Resolve the layout stage.
 *
 * `auto` becomes `target` as soon as the tree contains the `src/app/` layer
 * (the composition root prescribed by docs/design/repository-structure.md),
 * because from that point on the feature-isolation rules are enforceable.
 */
export function resolveLayoutStage(files: SourceFileInput[], requested: LayoutStage = 'auto'): 'current' | 'target' {
  if (requested === 'current' || requested === 'target') return requested;
  const hasAppLayer = files.some((f) => toPosix(f.path).startsWith('src/app/'));
  return hasAppLayer ? 'target' : 'current';
}

/**
 * Classify one resolved edge against the layer rules.
 * Returns null when the edge is legal.
 */
function classify(
  importer: string,
  target: string,
  enforceFeatureIsolation: boolean
): { rule: string; message: string } | null {
  if (isClientPath(importer) && isServerPath(target)) {
    return {
      rule: RULES.FORBIDDEN_CLIENT_IMPORTING_SERVER,
      message: `client file imports server module "${target}" — client code must not reach server authority`,
    };
  }

  if (isSharedPath(importer) && (isClientPath(target) || isServerPath(target))) {
    return {
      rule: RULES.FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER,
      message: `shared contract imports "${target}" — shared code must stay free of app and server code`,
    };
  }

  if (!enforceFeatureIsolation) return null;

  const importerFeature = featureOf(importer);
  if (importerFeature) {
    if (isAppPath(target)) {
      return {
        rule: RULES.FORBIDDEN_FEATURE_IMPORTING_APP,
        message: `feature "${importerFeature}" imports the composition root "${target}" — features must not import src/app`,
      };
    }
    const targetFeature = featureOf(target);
    if (targetFeature && targetFeature !== importerFeature) {
      return {
        rule: RULES.FORBIDDEN_FEATURE_IMPORTING_FOREIGN_FEATURE,
        message: `feature "${importerFeature}" imports foreign feature "${targetFeature}" — a feature must not import another feature's internals`,
      };
    }
  }

  return null;
}

interface GraphEdge extends ResolvedEdge {
  from: string;
  to: string;
}

/**
 * Detect cycles in the module-interface graph using Tarjan's strongly
 * connected components. A component with two or more nodes is a cycle: its
 * members can reach each other, so the module interfaces are mutually
 * dependent. Each component is reported once, with every intra-component edge
 * annotated with file:line.
 */
function detectCycles(edges: ResolvedEdge[], includeClient: boolean): BoundaryCycle[] {
  const adjacency = new Map<string, GraphEdge[]>();
  const nodes = new Set<string>();

  for (const edge of edges) {
    const from = moduleInterfaceOf(edge.importer, includeClient);
    const to = edge.resolvedPath ? moduleInterfaceOf(edge.resolvedPath, includeClient) : null;
    if (!from || !to || from === to) continue;
    nodes.add(from);
    nodes.add(to);
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ ...edge, from, to });
  }

  let counter = 0;
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];

  const strongConnect = (node: string): void => {
    index.set(node, counter);
    lowlink.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const edge of adjacency.get(node) ?? []) {
      if (!index.has(edge.to)) {
        strongConnect(edge.to);
        lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(edge.to)!));
      } else if (onStack.has(edge.to)) {
        lowlink.set(node, Math.min(lowlink.get(node)!, index.get(edge.to)!));
      }
    }

    if (lowlink.get(node) === index.get(node)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      components.push(component);
    }
  };

  for (const node of nodes) {
    if (!index.has(node)) strongConnect(node);
  }

  const cycles: BoundaryCycle[] = [];
  for (const component of components) {
    if (component.length < 2) continue;
    const members = new Set(component);
    const componentEdges: GraphEdge[] = [];
    for (const node of component) {
      for (const edge of adjacency.get(node) ?? []) {
        if (members.has(edge.to)) componentEdges.push(edge);
      }
    }

    // Representative closed walk inside the component.
    const start = component[0];
    const parent = new Map<string, string>();
    const visited = new Set<string>([start]);
    const queue: string[] = [start];
    let closingEdge: GraphEdge | null = null;
    while (queue.length > 0 && closingEdge === null) {
      const node = queue.shift()!;
      for (const edge of adjacency.get(node) ?? []) {
        if (!members.has(edge.to)) continue;
        if (edge.to === start) {
          closingEdge = edge;
          break;
        }
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          parent.set(edge.to, node);
          queue.push(edge.to);
        }
      }
    }

    let walk: string[];
    if (closingEdge) {
      const chain: string[] = [];
      let cursor = closingEdge.from;
      chain.push(cursor);
      while (cursor !== start) {
        const previous = parent.get(cursor);
        if (previous === undefined) break;
        cursor = previous;
        chain.push(cursor);
      }
      chain.reverse();
      walk = [...chain, start];
    } else {
      walk = [...component, start];
    }

    cycles.push({
      id: walk.join(' -> '),
      path: walk,
      members: [...component].sort(),
      edges: componentEdges.map((e) => ({
        from: e.from,
        to: e.to,
        file: e.importer,
        importedPath: e.specifier,
        line: e.line,
        column: e.column,
      })),
    });
  }

  return cycles;
}

function baselineCovers(cycle: BoundaryCycle): LegacyCycleBaseline | undefined {
  return LEGACY_CYCLE_BASELINE.find((entry) => {
    const registered = [...entry.path].sort().join('|');
    return registered === cycle.members.join('|');
  });
}

/**
 * Check architectural dependency boundaries across the project layers.
 *
 * Rules enforced:
 *   1. FORBIDDEN_CLIENT_IMPORTING_SERVER — `src/**` must not import `server/**`.
 *   2. FORBIDDEN_SHARED_IMPORTING_APP_OR_SERVER — `shared/**` must not import
 *      `src/**` or `server/**`.
 *   3. FORBIDDEN_FEATURE_IMPORTING_APP / FORBIDDEN_FEATURE_IMPORTING_FOREIGN_FEATURE
 *      — a feature must not import the composition root or another feature.
 *   4. Cycle rule — no cycles in the module-interface graph (see
 *      moduleInterfaceOf for the precise node/edge/cycle definition).
 *
 * The checker parses source with the TypeScript parser, so multiline import
 * statements, dynamic `import()`, `export ... from` re-exports, `require()`
 * calls, arbitrarily deep relative paths and tsconfig path aliases are all
 * detected with exact file:line positions.
 *
 * @param rootDir repository root used for path resolution and alias config.
 * @param options `files` injects a synthetic file set (no filesystem walk);
 *                `aliasPaths` adds alias mappings; `resolveAliases: false`
 *                disables alias resolution.
 */
export function checkDependencyBoundaries(
  rootDir: string = process.cwd(),
  options: CheckOptions = {}
): BoundaryCheckResult {
  const absRoot = path.resolve(rootDir);
  const alias = readAliasConfig(absRoot);
  if (options.aliasPaths) {
    for (const [pattern, targets] of Object.entries(options.aliasPaths)) {
      alias.paths[pattern] = targets.map((t) => toPosix(String(t)));
    }
  }
  const resolveAliases = options.resolveAliases !== false;

  const files: SourceFileInput[] = options.files
    ? options.files.map((f) => ({ path: toPosix(f.path), content: f.content }))
    : loadSourceTree(absRoot);

  const layout = resolveLayoutStage(files, options.layout);
  const enforceFeatureIsolation = layout === 'target';

  const violations: BoundaryViolation[] = [];
  const exemptions: LegacyBoundaryException[] = [];
  const findings: BoundaryFinding[] = [];
  const edges: ResolvedEdge[] = [];

  for (const file of files) {
    const records = collectImports(file.path, file.content);
    for (const record of records) {
      const { resolution, targetPath } = resolveSpecifier(
        record.specifier,
        file.path,
        alias,
        resolveAliases
      );
      edges.push({
        importer: file.path,
        specifier: record.specifier,
        resolvedPath: targetPath,
        resolution,
        form: record.form,
        line: record.line,
        column: record.column,
      });

      if (!targetPath) continue;
      const classified = classify(file.path, targetPath, enforceFeatureIsolation);
      if (!classified) continue;

      const violation: BoundaryViolation = {
        file: file.path,
        importedPath: record.specifier,
        resolvedPath: targetPath,
        resolution,
        form: record.form,
        rule: classified.rule,
        line: record.line,
        column: record.column,
        message: classified.message,
      };

      const exception = findException(file.path, record.specifier, classified.rule);
      if (exception) {
        exemptions.push(exception);
        continue;
      }
      violations.push(violation);
    }
  }

  const detectedCycles = detectCycles(edges, enforceFeatureIsolation);
  const cycles: BoundaryCycle[] = [];
  for (const cycle of detectedCycles) {
    const baseline = baselineCovers(cycle);
    if (baseline) {
      findings.push({
        kind: 'REGISTERED_LEGACY_CYCLE',
        message: `module-interface cycle "${cycle.id}" is registered in the legacy baseline (${baseline.removalBatch}, owner ${baseline.owner})`,
      });
      continue;
    }
    cycles.push(cycle);
  }

  // A registered exception whose exact edge no longer exists is reported as a
  // finding: the register must not keep stale promises that silently mask a
  // future re-introduction of the very edge it documents. An exception whose
  // file is not part of the scanned tree at all is simply out of scope (it
  // belongs to another repository root, e.g. a synthetic fixture).
  const scannedFiles = new Set(files.map((f) => f.path));
  const seenEdges = new Set(edges.map((e) => `${e.importer}|${e.specifier}`));
  for (const exception of LEGACY_EXCEPTIONS) {
    const exceptionFile = toPosix(exception.file);
    if (!scannedFiles.has(exceptionFile)) continue;
    if (!seenEdges.has(`${exceptionFile}|${exception.importedPath}`)) {
      findings.push({
        kind: 'STALE_REGISTERED_EXCEPTION',
        message: `registered exception "${exception.file}" -> "${exception.importedPath}" no longer matches any import in the scanned tree; retire it from LEGACY_EXCEPTIONS`,
      });
    }
  }

  const graphNodes = new Set<string>();
  for (const edge of edges) {
    const from = moduleInterfaceOf(edge.importer, enforceFeatureIsolation);
    const to = edge.resolvedPath ? moduleInterfaceOf(edge.resolvedPath, enforceFeatureIsolation) : null;
    if (from) graphNodes.add(from);
    if (to) graphNodes.add(to);
  }
  for (const baseline of LEGACY_CYCLE_BASELINE) {
    const bothPresent = baseline.path.every((node) => graphNodes.has(node));
    if (!bothPresent) continue;
    const stillPresent = detectedCycles.some((c) => baselineCovers(c) === baseline);
    if (!stillPresent) {
      findings.push({
        kind: 'STALE_REGISTERED_CYCLE',
        message: `registered legacy cycle "${baseline.id}" is no longer detected; retire it from LEGACY_CYCLE_BASELINE`,
      });
    }
  }

  return {
    ok: violations.length === 0 && cycles.length === 0,
    layout,
    violations,
    exemptions,
    cycles,
    findings,
    totalFilesScanned: files.length,
    totalEdgesResolved: edges.filter((e) => e.resolvedPath !== null).length,
  };
}

/** Direct execution CLI support. */
if (import.meta.main) {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  const rootDir = rootIndex >= 0 && argv[rootIndex + 1] ? argv[rootIndex + 1] : process.cwd();
  const asJson = argv.includes('--json');

  const result = checkDependencyBoundaries(rootDir);

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  const stage = result.layout;

  console.log(`Scanned ${result.totalFilesScanned} files, resolved ${result.totalEdgesResolved} internal imports.`);
  console.log(
    `Layout stage: ${stage} (feature-isolation rules ${stage === 'target' ? 'ENFORCED' : 'not enforced — src/app/ layer absent'}).`
  );

  if (result.exemptions.length > 0) {
    console.log(`Audited ${result.exemptions.length} registered legacy exceptions:`);
    for (const ex of result.exemptions) {
      console.log(`  [EXEMPTION: ${ex.removalBatch}] ${ex.file} -> ${ex.importedPath} (owner ${ex.owner})`);
    }
  }

  if (result.findings.length > 0) {
    console.log(`Register findings (${result.findings.length}):`);
    for (const finding of result.findings) {
      console.log(`  [${finding.kind}] ${finding.message}`);
    }
  }

  if (result.cycles.length > 0) {
    console.error(`Found ${result.cycles.length} module-interface cycles:`);
    for (const cycle of result.cycles) {
      console.error(`  [FORBIDDEN_MODULE_CYCLE] ${cycle.id}`);
      for (const edge of cycle.edges) {
        console.error(`      ${edge.file}:${edge.line}:${edge.column} -> ${edge.importedPath}  (${edge.from} -> ${edge.to})`);
      }
    }
  }

  if (!result.ok) {
    console.error(`Found ${result.violations.length} unauthorized boundary violations:`);
    for (const v of result.violations) {
      console.error(
        `  [${v.rule}] ${v.file}:${v.line}:${v.column} -> ${v.importedPath} (resolves to ${v.resolvedPath ?? 'unresolved'}, ${v.resolution}/${v.form})`
      );
      console.error(`      ${v.message}`);
    }
    process.exit(1);
  }

  console.log('Zero unauthorized boundary violations found. Architecture dependency boundaries intact.');
  process.exit(0);
}
