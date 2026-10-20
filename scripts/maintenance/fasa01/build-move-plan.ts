import * as crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Fasa 01 Stage C — server/platform -> server/modules staged move manifest.
 *
 * PLANNED ONLY. This script NEVER moves, renames, copies or deletes anything.
 * It produces the evidence a later, separately scheduled write window needs:
 * for every file, the old path, the proposed new path, the current SHA-256,
 * the exact set of importers that must be updated, the verification commands
 * and the rollback condition.
 *
 * The mapping below is derived from docs/design/repository-structure.md
 * ("Concrete source mapping" and the Stage B-D tree) plus the module list
 * under server/modules in the same document. Rows that the design document
 * fixes exactly are marked `fixed-by-design`; the remainder are proposals that
 * still require the inventory step named in 01-structure.md section 01.4
 * ("Inventory methods, callers and transaction boundaries before extracting
 * modules").
 *
 * Usage:
 *   bun scripts/maintenance/fasa01/build-move-plan.ts [--root <repoRoot>] [--out <file>]
 */

export type MoveOperation = 'rename' | 'split' | 'extract-and-facade' | 'extract' | 'docs-move' | 'media-move';

export interface MoveRow {
  oldPath: string;
  newPath: string;
  operation: MoveOperation;
  status: 'fixed-by-design' | 'proposed';
  owner: string;
  /** Consumers whose import statement must be rewritten in the same batch. */
  consumers: string[];
  consumerCount: number;
  sha256Before: string | null;
  /**
   * Expected SHA-256 after the move. Equal to `sha256Before` for pure renames;
   * null when the operation changes file structure (split/extract), because byte
   * parity cannot be claimed for a file that is rewritten.
   */
  sha256AfterExpected: string | null;
  verification: string[];
  rollback: string;
  notes: string;
}

export interface DocsMoveRow {
  oldPath: string;
  newPath: string;
  operation: MoveOperation;
  status: 'fixed-by-design' | 'proposed' | 'already-copied';
  gitTracked: boolean;
  sha256Before: string | null;
  sha256AfterExpected: string | null;
  notes: string;
}

export interface MoveManifest {
  generatedAt: string;
  generator: string;
  repoRoot: string;
  sourceCommit: string;
  executed: false;
  note: string;
  server: MoveRow[];
  docs: DocsMoveRow[];
  media: {
    sourceDirectories: string[];
    sourceArchives: string[];
    targetDirectory: string;
    gitignored: boolean;
    manifestFile: string;
    verification: string[];
    rollback: string;
    notes: string;
  };
}

/** Old path -> new path, operation, owner and note. */
const SERVER_MAPPING: Array<[string, string, MoveOperation, 'fixed-by-design' | 'proposed', string, string]> = [
  ['server/platform/app.ts', 'server/http/app.ts', 'extract-and-facade', 'fixed-by-design', 'migration-integrator', 'Bootstrap/config/request adapters extract first (server/bootstrap/, server/http/routes/); server/http/app.ts stays the single facade until its consumers migrate.'],
  ['server/platform/store.ts', 'server/infrastructure/persistence/store.ts', 'split', 'fixed-by-design', 'migration-integrator', 'Separate the persistence implementation from the reusable domain errors/validation; the DomainError/fail/id/now helper family must land in exactly one shared place, not two.'],
  ['server/platform/commerce.ts', 'server/modules/{catalogue,orders,inventory,payments}/service.ts', 'split', 'fixed-by-design', 'migration-integrator', 'Inventory methods, callers and transaction boundaries BEFORE extracting. Cross-domain checkout/refunds move to server/application/ keeping one transaction/CAS commit. No blanket move.'],
  ['server/platform/dealers.ts', 'server/modules/{dealers,commissions}/service.ts', 'split', 'fixed-by-design', 'migration-integrator', 'Separate dealer operations from commission rules without duplicating ledger authority.'],
  ['server/platform/whatsapp.ts', 'server/infrastructure/integrations/whatsapp-transport.ts', 'split', 'fixed-by-design', 'migration-integrator', 'Transport to infrastructure; notification policy to its owning module only after a method-level audit.'],
  ['server/platform/marginGuardian.ts', 'server/modules/marketing/margin-guardian.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4.'],
  ['server/platform/loyalty.ts', 'server/modules/loyalty/service.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4.'],
  ['server/platform/adkAgent.ts', 'server/agents/copilot/agent.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4; framework identity stays an explicit integration decision.'],
  ['server/platform/freeModelRouter.ts', 'server/agents/providers/model-router.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4.'],
  ['server/platform/supabasePersistence.ts', 'server/infrastructure/persistence/supabase-snapshot.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4.'],
  ['server/platform/backup.ts', 'server/infrastructure/backups/backup.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4; lifecycle preserved and reviewed.'],
  ['server/platform/backupScheduler.ts', 'server/infrastructure/backups/scheduler.ts', 'rename', 'fixed-by-design', 'migration-integrator', 'Fixed map in 01-structure.md section 01.4.'],
  ['server/platform/mcp/operationsBrief.ts', 'server/agents/mcp/operations-brief.ts', 'rename', 'proposed', 'migration-integrator', 'MCP app surface; server/agents/mcp is another writer lane, so this move is sequenced after that lane lands.'],
  ['server/platform/auth.ts', 'server/modules/identity/service.ts', 'rename', 'proposed', 'migration-integrator', 'Widest fan-in in the platform. Must move LAST among the domain services, after every importer has been rewritten to the new path.'],
  ['server/platform/googleIdentity.ts', 'server/modules/identity/google-identity.ts', 'rename', 'proposed', 'migration-integrator', 'Identity verifier; keep beside the identity service.'],
  ['server/platform/domainTools.ts', 'server/agents/tools/domain-tool-definitions.ts', 'rename', 'proposed', 'migration-integrator', 'Tool definitions belong to the authorized agent tool layer; server/agents/tools is another writer lane.'],
  ['server/platform/evidenceFiles.ts', 'server/infrastructure/evidence/service.ts', 'rename', 'proposed', 'migration-integrator', 'Evidence storage is infrastructure per the target tree.'],
  ['server/platform/assetBundle.ts', 'server/infrastructure/evidence/asset-bundle.ts', 'rename', 'proposed', 'migration-integrator', 'Single consumer (evidenceFiles.ts); safe leaf move.'],
  ['server/platform/hostedResponse.ts', 'server/http/hosted-response.ts', 'rename', 'proposed', 'migration-integrator', 'HTTP response adapter; belongs to the http layer.'],
  ['server/platform/flows.ts', 'server/modules/operations/flows.ts', 'rename', 'proposed', 'migration-integrator', 'Order/case flow engine.'],
  ['server/platform/founder-intelligence.ts', 'server/modules/collaboration/founder-intelligence.ts', 'rename', 'proposed', 'migration-integrator', 'Collaborative case/proposal surface; single consumer (app.ts).'],
  ['server/platform/legacyAi.ts', 'server/legacy/legacy-ai.ts', 'rename', 'proposed', 'migration-integrator', 'Explicitly isolated compatibility adapter.'],
  ['server/platform/legacyPilots.ts', 'server/modules/collaboration/legacy-pilots.ts', 'rename', 'proposed', 'migration-integrator', 'Verified-route pilots and founder proposal executor.'],
  ['server/platform/marketing.ts', 'server/modules/marketing/service.ts', 'rename', 'proposed', 'migration-integrator', 'Marketing service beside the margin guardian.'],
  ['server/platform/onboarding.ts', 'server/application/onboarding/service.ts', 'rename', 'proposed', 'migration-integrator', 'Business setup coordination is an application workflow, not a domain module.'],
  ['server/platform/operationalAmendments.ts', 'server/modules/operations/operational-amendments.ts', 'rename', 'proposed', 'migration-integrator', 'Operations amendment ledger.'],
  ['server/platform/operations.ts', 'server/modules/operations/service.ts', 'rename', 'proposed', 'migration-integrator', 'Operations service (QC, shifts, day-close).'],
  ['server/platform/paymentReconciliation.ts', 'server/modules/payments/reconciliation.ts', 'rename', 'proposed', 'migration-integrator', 'Allocation/reversal authority; keep the largest-remainder implementation single-sourced.'],
  ['server/platform/reports.ts', 'server/modules/reports/service.ts', 'rename', 'proposed', 'migration-integrator', 'Report builder.'],
  ['server/platform/runtimeControls.ts', 'server/modules/settings/runtime-controls.ts', 'rename', 'proposed', 'migration-integrator', 'Runtime identity/control surface.'],
  ['server/platform/social.ts', 'server/modules/marketing/social-connections.ts', 'rename', 'proposed', 'migration-integrator', 'Social connections belong to the marketing owner.'],
  ['server/platform/work.ts', 'server/modules/collaboration/service.ts', 'rename', 'proposed', 'migration-integrator', 'Cases/tasks/documents surface.'],
  ['server/platform/jev/assessment.ts', 'server/modules/jev/assessment.ts', 'rename', 'proposed', 'migration-integrator', 'The pure deterministic evaluator ALSO has to reach shared/ so the two client-side LEGACY_EXCEPTIONS (removalBatch 01D) can be deleted.'],
  ['server/platform/jev/evaluations.ts', 'server/modules/jev/evaluations.ts', 'rename', 'proposed', 'migration-integrator', 'JEV evaluation history.'],
  ['server/platform/jev/policyEngine.ts', 'server/modules/jev/policy-engine.ts', 'rename', 'proposed', 'migration-integrator', 'JEV execution policy.'],
  ['server/platform/jev/questionRegistry.ts', 'server/modules/jev/question-registry.ts', 'rename', 'proposed', 'migration-integrator', 'JEV question packs.'],
  ['server/platform/migration/legacyMaps.ts', 'server/modules/settings/migration/legacy-maps.ts', 'rename', 'proposed', 'migration-integrator', 'Legacy status/item mapping.'],
  ['server/platform/migration/migrationReconciler.ts', 'server/modules/settings/migration/reconciler.ts', 'rename', 'proposed', 'migration-integrator', 'Migration dry-run reconciler.'],
];

const DOCS_MAPPING: Array<[string, string, MoveOperation, 'fixed-by-design' | 'proposed' | 'already-copied']> = [
  ['docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md', 'docs/architecture/ABANGCOLEK-PLATFORM-ARCHITECTURE.md', 'docs-move', 'already-copied'],
  ['docs/AI-AGENT-ARCHITECTURE.md', 'docs/architecture/AI-AGENT-ARCHITECTURE.md', 'docs-move', 'already-copied'],
  ['docs/AI-PROVIDER-FREE-MODELS-REGISTER.md', 'docs/architecture/AI-PROVIDER-FREE-MODELS-REGISTER.md', 'docs-move', 'already-copied'],
  ['docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md', 'docs/product/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md', 'docs-move', 'already-copied'],
  ['docs/AI-AGENT-ROADMAP.md', 'docs/product/AI-AGENT-ROADMAP.md', 'docs-move', 'already-copied'],
  ['docs/production-release.md', 'docs/runbooks/production-release.md', 'docs-move', 'already-copied'],
  ['docs/design-qa.md', 'docs/runbooks/design-qa.md', 'docs-move', 'already-copied'],
  ['docs/handoffs/2026-10-18-continuation-prompt.md', 'docs/handover/2026-10-18-continuation-prompt.md', 'docs-move', 'proposed'],
  ['docs/handoffs/2026-10-19-blueprint-finalization-review.md', 'docs/handover/2026-10-19-blueprint-finalization-review.md', 'docs-move', 'proposed'],
];

const VERIFICATION = [
  'bun run lint',
  'bun run build',
  'bun run test:platform',
  'bun test ./tests/architecture',
  'bun run test:e2e --list',
];

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function sha256(absolutePath: string): string | null {
  if (!fs.existsSync(absolutePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'var', '.work'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const IMPORT_RE = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;

function collectConsumers(rootDir: string, oldPath: string): string[] {
  const base = toPosix(oldPath).replace(/\.tsx?$/, '');
  const consumers = new Set<string>();
  for (const file of walk(rootDir)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const rel = toPosix(path.relative(rootDir, file));
    if (rel === toPosix(oldPath)) continue;
    const content = fs.readFileSync(file, 'utf-8');
    for (const match of content.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2] ?? match[3];
      if (!spec || !spec.startsWith('.')) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
      if (resolved === base) consumers.add(rel);
    }
  }
  return [...consumers].sort();
}

export function buildMoveManifest(rootDir: string, sourceCommit: string): MoveManifest {
  const absRoot = path.resolve(rootDir);

  const server: MoveRow[] = SERVER_MAPPING.map(
    ([oldPath, newPath, operation, status, owner, notes]) => {
      const consumers = collectConsumers(absRoot, oldPath);
      const before = sha256(path.join(absRoot, oldPath));
      const pureRename = operation === 'rename';
      return {
        oldPath,
        newPath,
        operation,
        status,
        owner,
        consumers,
        consumerCount: consumers.length,
        sha256Before: before,
        sha256AfterExpected: pureRename ? before : null,
        verification: VERIFICATION,
        rollback: pureRename
          ? `Move ${newPath} back to ${oldPath} and restore the recorded import specifiers; SHA-256 ${before} proves byte parity.`
          : `Restore ${oldPath} from git (the file is tracked) and re-point every consumer listed above; no byte parity claim is made for a rewritten file.`,
        notes,
      };
    }
  );

  const docs: DocsMoveRow[] = DOCS_MAPPING.map(([oldPath, newPath, operation, status]) => {
    const before = sha256(path.join(absRoot, oldPath));
    const after = sha256(path.join(absRoot, newPath));
    const tracked = fs.existsSync(path.join(absRoot, '.git'))
      ? isTracked(absRoot, oldPath)
      : false;
    return {
      oldPath,
      newPath,
      operation,
      status,
      gitTracked: tracked,
      sha256Before: before,
      sha256AfterExpected: after,
      notes:
        status === 'already-copied'
          ? 'Destination copy already exists and is byte-identical; only the tracked source still has to be removed in the same batch.'
          : 'No name collision with docs/handover/.',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/maintenance/fasa01/build-move-plan.ts',
    repoRoot: absRoot,
    sourceCommit,
    executed: false,
    note: 'PLANNED ONLY. Nothing in this manifest has been executed. The server move cannot start until the server/platform lane is idle; the media relocation needs a scheduled write window because it touches gitignored binary assets.',
    server,
    docs,
    media: {
      sourceDirectories: ['PRODUCT LLH-20261017T020159Z-1-001', 'Product Photo-20261017T020223Z-1-001'],
      sourceArchives: ['PRODUCT LLH-20261017T020159Z-1-001.zip', 'Product Photo-20261017T020223Z-1-001.zip'],
      targetDirectory: 'references/media/product-2026-10-17/',
      gitignored: true,
      manifestFile: 'scripts/maintenance/fasa01/product-media-sha256.manifest.json',
      verification: [
        'bun scripts/maintenance/fasa01/build-media-manifest.ts --out <pre>  # before the move',
        'bun scripts/maintenance/fasa01/build-media-manifest.ts --out <post> # after the move',
        'compare the two manifests entry by entry (sourcePath -> targetPath, bytes, sha256)',
      ],
      rollback: 'Move the directories and archives back to the repository root; the SHA-256 manifest proves the bytes are unchanged.',
      notes: 'The media is gitignored, so the relocation produces NO git provenance. The SHA-256 manifest IS the provenance for these paths.',
    },
  };
}

function isTracked(rootDir: string, relPath: string): boolean {
  try {
    const result = spawnSync('git', ['ls-files', '--error-unmatch', '--', relPath], {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  const rootDir = rootIndex >= 0 && argv[rootIndex + 1] ? argv[rootIndex + 1] : process.cwd();
  const outIndex = argv.indexOf('--out');
  const outPath =
    outIndex >= 0 && argv[outIndex + 1]
      ? argv[outIndex + 1]
      : path.resolve(rootDir, 'scripts', 'maintenance', 'fasa01', 'fasa01-move-manifest.json');

  const commitResult = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf-8',
  });
  const sourceCommit = (commitResult.stdout ?? '').trim() || 'unknown';

  const manifest = buildMoveManifest(rootDir, sourceCommit);
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  console.log(
    `Planned ${manifest.server.length} server moves and ${manifest.docs.length} documentation moves. Nothing was executed.`
  );
  console.log(`Manifest written to ${toPosix(path.relative(rootDir, outPath))}`);
}
