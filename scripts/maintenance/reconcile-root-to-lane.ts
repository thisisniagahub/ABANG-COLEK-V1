/**
 * Reconcile dirty root tree -> integration lane tree (W0-C, Fasa 00).
 *
 * Read-only by default. NEVER resets, stashes, checks out, cleans or deletes.
 * Produces a deterministic manifest of:
 *   - files present in root but missing in lane
 *   - files whose content differs between root and lane
 *   - files present in lane but missing in root (lane-only, must never be deleted)
 *
 * Usage:
 *   bun scripts/maintenance/reconcile-root-to-lane.ts [--root <dir>] [--lane <dir>] [--json <out>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.kilo',
  '.work',
  'var',
  '.agents',
  '.vscode',
  '.manus',
  'coverage',
  '.next',
]);

const IGNORED_FILE_PATTERNS: RegExp[] = [
  /\.DS_Store$/,
  /^\._/,
  /\.log$/,
  /~$/,
];

function walk(root: string, out: string[] = []): string[] {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile()) {
      if (IGNORED_FILE_PATTERNS.some((re) => re.test(entry.name))) continue;
      out.push(full);
    }
  }
  return out;
}

/**
 * Streamed raw hash. Large/binary assets (product media, zips) must never be
 * read fully into memory.
 */
function hashFile(file: string): string {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(1024 * 1024);
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buf, 0, buf.length, null);
      if (bytesRead > 0) h.update(buf.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
}

const BINARY_EXT = new Set([
  '.zip', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.pdf',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.zip', '.gz', '.tar', '.ico', '.avif',
]);

function isBinaryPath(file: string): boolean {
  return BINARY_EXT.has(path.extname(file).toLowerCase());
}

/**
 * Content hash with line endings normalised (CRLF -> LF).
 * The integration lane was populated by copy across platforms, so a large share of
 * raw-hash differences are line-ending noise rather than real content drift.
 * `state: 'line_ending_only'` marks those; `state: 'differs'` is real content drift.
 * Binary assets are hashed raw only (no normalisation) and are streamed to avoid
 * exhausting memory on multi-hundred-megabyte product media.
 */
function hashFileNormalized(file: string): string {
  if (isBinaryPath(file)) return hashFile(file);
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n'));
  return h.digest('hex');
}

export interface ReconcileEntry {
  path: string;
  rootHash: string | null;
  laneHash: string | null;
  rootNormalizedHash: string | null;
  laneNormalizedHash: string | null;
  state: 'root_only' | 'lane_only' | 'differs' | 'identical' | 'line_ending_only';
  size: number | null;
}

export interface ReconcileManifest {
  generatedAt: string;
  root: string;
  lane: string;
  rootFileCount: number;
  laneFileCount: number;
  identical: number;
  lineEndingOnly: number;
  differs: ReconcileEntry[];
  rootOnly: ReconcileEntry[];
  laneOnly: ReconcileEntry[];
}

export function reconcile(root: string, lane: string): ReconcileManifest {
  const rootFiles = walk(root);
  const laneFiles = walk(lane);

  const rootMap = new Map<string, string>();
  for (const f of rootFiles) {
    rootMap.set(path.relative(root, f).replace(/\\/g, '/'), f);
  }
  const laneMap = new Map<string, string>();
  for (const f of laneFiles) {
    laneMap.set(path.relative(lane, f).replace(/\\/g, '/'), f);
  }

  const differs: ReconcileEntry[] = [];
  const rootOnly: ReconcileEntry[] = [];
  const laneOnly: ReconcileEntry[] = [];
  let identical = 0;
  let lineEndingOnly = 0;

  for (const [rel, abs] of rootMap) {
    const laneAbs = laneMap.get(rel);
    if (!laneAbs) {
      rootOnly.push({
        path: rel,
        rootHash: hashFile(abs),
        laneHash: null,
        rootNormalizedHash: hashFileNormalized(abs),
        laneNormalizedHash: null,
        state: 'root_only',
        size: fs.statSync(abs).size,
      });
      continue;
    }
    const rootHash = hashFile(abs);
    const laneHash = hashFile(laneAbs);
    const rootNorm = hashFileNormalized(abs);
    const laneNorm = hashFileNormalized(laneAbs);
    if (rootNorm === laneNorm) {
      if (rootHash === laneHash) {
        identical++;
      } else {
        lineEndingOnly++;
        differs.push({
          path: rel,
          rootHash,
          laneHash,
          rootNormalizedHash: rootNorm,
          laneNormalizedHash: laneNorm,
          state: 'line_ending_only',
          size: fs.statSync(abs).size,
        });
      }
    } else {
      differs.push({
        path: rel,
        rootHash,
        laneHash,
        rootNormalizedHash: rootNorm,
        laneNormalizedHash: laneNorm,
        state: 'differs',
        size: fs.statSync(abs).size,
      });
    }
  }

  for (const [rel, abs] of laneMap) {
    if (!rootMap.has(rel)) {
      laneOnly.push({
        path: rel,
        rootHash: null,
        laneHash: hashFile(abs),
        rootNormalizedHash: null,
        laneNormalizedHash: hashFileNormalized(abs),
        state: 'lane_only',
        size: fs.statSync(abs).size,
      });
    }
  }

  differs.sort((a, b) => a.path.localeCompare(b.path));
  rootOnly.sort((a, b) => a.path.localeCompare(b.path));
  laneOnly.sort((a, b) => a.path.localeCompare(b.path));

  return {
    generatedAt: new Date().toISOString(),
    root,
    lane,
    rootFileCount: rootMap.size,
    laneFileCount: laneMap.size,
    identical,
    lineEndingOnly,
    differs,
    rootOnly,
    laneOnly,
  };
}

function parseArgs(argv: string[]): { root: string; lane: string; json: string | null } {
  let root = 'D:/ABANGCOLEK-PLATFORM';
  let lane = 'D:/ABANGCOLEK-WORKTREES/multi-cli-integration-20261020';
  let json: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = argv[++i];
    else if (argv[i] === '--lane') lane = argv[++i];
    else if (argv[i] === '--json') json = argv[++i];
  }
  return { root, lane, json };
}

if (import.meta.main) {
  const { root, lane, json } = parseArgs(process.argv.slice(2));
  const manifest = reconcile(root, lane);
  const summary = {
    generatedAt: manifest.generatedAt,
    root: manifest.root,
    lane: manifest.lane,
    rootFileCount: manifest.rootFileCount,
    laneFileCount: manifest.laneFileCount,
    identical: manifest.identical,
    lineEndingOnly: manifest.lineEndingOnly,
    differsCount: manifest.differs.length,
    rootOnlyCount: manifest.rootOnly.length,
    laneOnlyCount: manifest.laneOnly.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  const realDiffers = manifest.differs.filter(d => d.state === 'differs');
  const leOnly = manifest.differs.filter(d => d.state === 'line_ending_only');
  if (realDiffers.length) {
    console.log('\nREAL CONTENT DIFFERS:');
    for (const d of realDiffers) console.log(`  ${d.path}`);
  }
  if (leOnly.length) {
    console.log(`\nLINE-ENDING-ONLY (${leOnly.length}) — not real drift, listed in manifest only.`);
  }
  if (manifest.rootOnly.length) {
    console.log('\nROOT ONLY (candidate to sync into lane):');
    for (const d of manifest.rootOnly) console.log(`  ${d.path}`);
  }
  if (manifest.laneOnly.length) {
    console.log('\nLANE ONLY (must be preserved, never deleted):');
    for (const d of manifest.laneOnly) console.log(`  ${d.path}`);
  }
  if (json) {
    fs.mkdirSync(path.dirname(path.resolve(json)), { recursive: true });
    fs.writeFileSync(path.resolve(json), JSON.stringify(manifest, null, 2));
    console.log(`\nFull manifest written to ${json}`);
  }
}
