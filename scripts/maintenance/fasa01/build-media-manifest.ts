import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Fasa 01 Stage A — product media relocation manifest generator.
 *
 * READ-ONLY with respect to the product media. This script never moves, copies,
 * renames or writes anything inside the media trees; it only hashes the bytes
 * and records them so that a later, separately scheduled relocation can be
 * verified byte-for-byte before and after.
 *
 * Why a hash manifest is the provenance here: the media trees and the archives
 * are matched by .gitignore rules (the `PRODUCT LLH-` and `Product Photo-`
 * directory prefixes, plus a global `*.zip` rule), so a relocation of them
 * produces NO git history. For gitignored paths the SHA-256 manifest IS the
 * provenance.
 *
 * Usage:
 *   bun scripts/maintenance/fasa01/build-media-manifest.ts [--root <repoRoot>] [--out <file>]
 */

export const MEDIA_TARGET_DIR = 'references/media/product-2026-10-17/';

export interface MediaSource {
  /** Repo-relative POSIX path of the media directory at the repository root. */
  directory: string;
  /** Repo-relative POSIX path of the archive at the repository root. */
  archive?: string;
}

export const MEDIA_SOURCES: MediaSource[] = [
  {
    directory: 'PRODUCT LLH-20261017T020159Z-1-001',
    archive: 'PRODUCT LLH-20261017T020159Z-1-001.zip',
  },
  {
    directory: 'Product Photo-20261017T020223Z-1-001',
    archive: 'Product Photo-20261017T020223Z-1-001.zip',
  },
];

export interface MediaManifestEntry {
  /** Repo-relative POSIX path of the file as it exists today. */
  sourcePath: string;
  /** Repo-relative POSIX path the file occupies after the Stage A relocation. */
  targetPath: string;
  bytes: number;
  sha256: string;
  kind: 'media' | 'archive';
}

export interface MediaManifest {
  generatedAt: string;
  generator: string;
  algorithm: 'sha256';
  targetDirectory: string;
  gitignored: true;
  note: string;
  totals: {
    mediaFiles: number;
    archives: number;
    entries: number;
    bytes: number;
  };
  entries: MediaManifestEntry[];
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function walkFiles(dir: string, base: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, base, out);
    } else if (entry.isFile()) {
      out.push(toPosix(path.relative(base, full)));
    }
  }
  return out;
}

export function sha256File(absolutePath: string): string {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(absolutePath);
  hash.update(buffer);
  return hash.digest('hex');
}

export function buildMediaManifest(rootDir: string): MediaManifest {
  const absRoot = path.resolve(rootDir);
  const entries: MediaManifestEntry[] = [];

  for (const source of MEDIA_SOURCES) {
    const absDir = path.join(absRoot, source.directory);
    const relFiles = walkFiles(absDir, absRoot);
    for (const relFile of relFiles) {
      entries.push({
        sourcePath: relFile,
        targetPath: `${MEDIA_TARGET_DIR}${relFile}`,
        bytes: fs.statSync(path.join(absRoot, relFile)).size,
        sha256: sha256File(path.join(absRoot, relFile)),
        kind: 'media',
      });
    }
    if (source.archive) {
      const absArchive = path.join(absRoot, source.archive);
      if (fs.existsSync(absArchive)) {
        entries.push({
          sourcePath: source.archive,
          targetPath: `${MEDIA_TARGET_DIR}${source.archive}`,
          bytes: fs.statSync(absArchive).size,
          sha256: sha256File(absArchive),
          kind: 'archive',
        });
      }
    }
  }

  const mediaFiles = entries.filter((e) => e.kind === 'media').length;
  const archives = entries.filter((e) => e.kind === 'archive').length;

  return {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/maintenance/fasa01/build-media-manifest.ts',
    algorithm: 'sha256',
    targetDirectory: MEDIA_TARGET_DIR,
    gitignored: true,
    note:
      'Product media and archives are gitignored (".gitignore: PRODUCT LLH-*/", "Product Photo-*/", "*.zip"). A relocation of them produces no git provenance, so this SHA-256 manifest is the provenance: re-run the generator before and after the move and compare byte-for-byte.',
    totals: {
      mediaFiles,
      archives,
      entries: entries.length,
      bytes: entries.reduce((sum, e) => sum + e.bytes, 0),
    },
    entries,
  };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  const rootDir = rootIndex >= 0 && argv[rootIndex + 1] ? argv[rootIndex + 1] : process.cwd();
  const outIndex = argv.indexOf('--out');
  const outPath =
    outIndex >= 0 && argv[outIndex + 1]
      ? argv[outIndex + 1]
      : path.resolve(rootDir, 'scripts', 'maintenance', 'fasa01', 'product-media-sha256.manifest.json');

  const manifest = buildMediaManifest(rootDir);
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  console.log(
    `Hashed ${manifest.totals.mediaFiles} media files + ${manifest.totals.archives} archives (${manifest.totals.bytes} bytes).`
  );
  console.log(`Manifest written to ${toPosix(path.relative(rootDir, outPath))}`);
}
