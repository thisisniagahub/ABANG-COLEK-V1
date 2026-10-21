import { expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

// Ujian suite penuh pack THEFOUNDER (.claude/skills).
// Setiap semakan dikeluarkan sebagai judgment bergaya JEV LOCAL_RULES
// (shared/jev-contracts.ts): value + confidence: null + probabilities: null
// + reason code. "Tidak dikira" mesti null — bukan 0, bukan false (BL-23).

const root = path.resolve(import.meta.dir, '../..');
const skillsDir = path.join(root, '.claude', 'skills');
const EXCLUDE_DIRS = new Set(['.claude-plugin']);
const BUILD_CHAIN = new Set([
  'xray', 'blueprint', 'interface', 'rebuild', 'backend', 'trial',
  'parity', 'rebrand', 'storefront', 'ship',
]);
const META = new Set(['skill-creator', 'assembly', 'radar', 'flywheel', 'runway']);
const PACK_FILES = [
  'README.md', 'CHAIN.md', 'SUB-AGENTS.md',
  '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json',
] as const;

// Modul stdlib yang dibenarkan dalam skrip pack. Apa-apa di luar senarai
// ini (terutama network/subprocess) adalah kegagalan, bukan amaran.
const STDLIB_PY = new Set([
  'argparse', 'json', 'os', 're', 'sys', 'math', 'csv', 'struct', 'zlib',
  'collections', 'pathlib', 'itertools', 'unicodedata', 'difflib',
  'textwrap', 'dataclasses', 'typing', 'fnmatch', 'hashlib', 'base64',
  'colorsys', 'datetime', 'time', 'statistics', 'heapq', 'string',
  'random', 'importlib', 'glob', 'io', 'copy', 'functools', 'warnings',
  'contextlib',
]);

export interface JevVerdict {
  value: 'PASS' | 'FAIL' | null;
  confidence: null;
  probabilities: null;
  reason: string;
}
const pass = (reason: string): JevVerdict => ({ value: 'PASS', confidence: null, probabilities: null, reason });
const fail = (reason: string): JevVerdict => ({ value: 'FAIL', confidence: null, probabilities: null, reason });
const noul = (reason: string): JevVerdict => ({ value: null, confidence: null, probabilities: null, reason });

interface SkillFile {
  folder: string;
  raw: string;
  frontmatter: string;
  body: string;
  description: string;
  triggers: string[];
}

function readSkill(folder: string): SkillFile | null {
  const file = path.join(skillsDir, folder, 'SKILL.md');
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const frontmatter = fmMatch[1];
  const body = raw.slice(fmMatch[0].length);
  const descMatch = frontmatter.match(/description: >-[\r\n]((?:  [^\r\n]*[\r\n]?)+)/);
  // Runtuhkan whitespace: description dilipat berbilang baris, jadi
  // "Use when\n  the user says" mesti dibaca sebagai satu frasa.
  const description = descMatch ? descMatch[1].replace(/^  /gm, '').replace(/\s+/g, ' ').trim() : '';
  const triggers = [...description.matchAll(/"([^"\n]{2,80})"/g)].map((m) => m[1].toLowerCase());
  return { folder, raw, frontmatter, body, description, triggers };
}

const folders = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !EXCLUDE_DIRS.has(d.name))
  .map((d) => d.name)
  .sort();

const skills: SkillFile[] = [];
for (const folder of folders) {
  const skill = readSkill(folder);
  if (skill) skills.push(skill);
}

// Setiap semakan direkodkan untuk laporan akhir.
const ledger: { skill: string; check: string; verdict: JevVerdict }[] = [];
function record(skill: string, check: string, verdict: JevVerdict) {
  ledger.push({ skill, check, verdict });
}

function stripCredit(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.includes('Jakeschincariol/replica-skill'))
    .join('\n');
}

const LEGACY_RE =
  /\bTHEFOUNDER-(board|brand|cfo|competitors|consumer|launch|marketing|offer|ops|plan|pricing)\b|\breplica-(recon|architect|design|build|backend|test|diff|entrepreneur|brand|launch|deploy)\b|\breplica\//;

// ---- Semakan per skill ----

for (const skill of skills) {
  // C01: nama frontmatter == nama folder
  const nameMatch = skill.frontmatter.match(/^name:\s*(\S+)/m);
  record(skill.folder, 'C01_nama_frontmatter', nameMatch && nameMatch[1] === skill.folder
    ? pass(`name: ${nameMatch[1]} == folder`)
    : fail(`name: ${nameMatch?.[1] ?? 'tiada'} != folder ${skill.folder}`));

  // C02: description wujud dan mengandungi ungkapan pencetus
  record(skill.folder, 'C02_description', skill.description.length > 40 && /Use when the user says/.test(skill.description)
    ? pass(`description ${skill.description.length} aksara, ada "Use when the user says"`)
    : fail('description terlalu pendek atau tiada ungkapan pencetus'));

  // C03: sekurang-kurangnya 3 trigger phrase berkutip
  record(skill.folder, 'C03_trigger_phrases', skill.triggers.length >= 3
    ? pass(`${skill.triggers.length} trigger phrase`)
    : fail(`hanya ${skill.triggers.length} trigger phrase`));

  // C04: fence wajib untuk rantai binaan + meta. Rantai pengasas warisan
  // tidak mempunyai fence — direkodkan sebagai TIDAK DIKIRA (null), bukan FAIL.
  const needsFence = BUILD_CHAIN.has(skill.folder) || META.has(skill.folder);
  const hasFence = /##\s+The fence/.test(skill.body);
  if (needsFence) {
    record(skill.folder, 'C04_fence', hasFence
      ? pass('section "## The fence" wujud')
      : fail('section "## The fence" tiada'));
  } else {
    record(skill.folder, 'C04_fence', noul('rantai pengasas tanpa fence - semakan tidak terpakai'));
  }

  // C05: tiada rujukan nama lama (di luar baris kredit)
  record(skill.folder, 'C05_tiada_nama_lama', LEGACY_RE.test(stripCredit(skill.raw))
    ? fail('masih ada rujukan nama lama / replica-*')
    : pass('bersih daripada nama lama'));

  // C06: skrip Python stdlib-sahaja, tiada eval/exec/os.system
  const pyDir = path.join(skillsDir, skill.folder);
  const pyFiles = fs.existsSync(pyDir)
    ? fs.readdirSync(pyDir).filter((f) => f.endsWith('.py'))
    : [];
  let pyVerdict = noul('tiada skrip python dalam skill ini');
  if (pyFiles.length > 0) {
    const offenders: string[] = [];
    for (const py of pyFiles) {
      const src = fs.readFileSync(path.join(pyDir, py), 'utf8');
      for (const m of src.matchAll(/^(?:import|from)\s+([A-Za-z_][\w.]*)/gm)) {
        const top = m[1].split('.')[0];
        if (!STDLIB_PY.has(top)) offenders.push(`${py}: import ${top}`);
      }
      if (/eval\(|exec\(|os\.system|__import__/.test(src)) offenders.push(`${py}: eval/exec/os.system`);
    }
    pyVerdict = offenders.length === 0
      ? pass(`${pyFiles.length} skrip, stdlib sahaja, tiada eval/exec`)
      : fail(offenders.join('; '));
  }
  record(skill.folder, 'C06_python_stdlib', pyVerdict);

  // C11: keserasian merentas model — tiada laluan mutlak mesin ini tertinggal
  // (?![\\/]) mengecualikan URL (https://) — hanya drive path Windows yang gagal.
  const absPath = /[A-Za-z]:[\\/](?![\\/])/.test(stripCredit(skill.raw));
  record(skill.folder, 'C11_tiada_laluan_mutlak', absPath
    ? fail('SKILL.md mengandungi laluan mutlak mesin (pemindahan merentas agent pecah)')
    : pass('tiada laluan mutlak — boleh alih ke mana-mana agent'));

  // C12: README.md wajib bagi setiap skill (muka depan mesra manusia)
  const hasReadme = fs.existsSync(path.join(skillsDir, skill.folder, 'README.md'));
  record(skill.folder, 'C12_readme', hasReadme
    ? pass('README.md wujud')
    : fail('README.md tiada'));
}

// ---- Semakan merentas skill ----

// C07: clash gate - tiada trigger phrase dipinjam lebih dari satu skill
const phraseOwners = new Map<string, string[]>();
for (const skill of skills) {
  for (const phrase of skill.triggers) {
    const owners = phraseOwners.get(phrase) ?? [];
    owners.push(skill.folder);
    phraseOwners.set(phrase, owners);
  }
}
const clashes = [...phraseOwners.entries()].filter(([, owners]) => new Set(owners).size > 1);
record('PACK', 'C07_clash_gate', clashes.length === 0
  ? pass(`${phraseOwners.size} trigger phrase unik merentas ${skills.length} skill`)
  : fail(clashes.slice(0, 5).map(([p, o]) => `"${p}" dipinjam ${o.join(',')}`).join(' | ')));

// C08: fail aras pack wujud dan manifest JSON sah
const missingPack: string[] = [];
for (const rel of PACK_FILES) {
  if (!fs.existsSync(path.join(skillsDir, rel))) missingPack.push(rel);
}
let manifestVerdict = noul('tiada manifest');
const pluginPath = path.join(skillsDir, '.claude-plugin', 'plugin.json');
if (fs.existsSync(pluginPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(pluginPath, 'utf8')) as { name?: string; version?: string };
    manifestVerdict = parsed.name === 'thefounder'
      ? pass(`plugin.json sah (v${parsed.version})`)
      : fail(`plugin.json name=${parsed.name}`);
  } catch (error) {
    manifestVerdict = fail(`plugin.json tidak sah JSON: ${String(error)}`);
  }
}
record('PACK', 'C08_pack_files', missingPack.length === 0 ? manifestVerdict : fail(`tiada: ${missingPack.join(', ')}`));

// C09: CHAIN.md meliputi setiap skill
const chainPath = path.join(skillsDir, 'CHAIN.md');
let chainVerdict = fail('CHAIN.md tiada');
if (fs.existsSync(chainPath)) {
  const chain = fs.readFileSync(chainPath, 'utf8');
  // Nama folder sudah mengandungi prefix THEFOUNDER- — jangan diduakan.
  const notCovered = skills.filter((s) => !chain.includes(s.folder));
  chainVerdict = notCovered.length === 0
    ? pass(`CHIAN meliputi ${skills.length} skill`)
    : fail(`tidak diliputi: ${notCovered.map((s) => s.folder).join(', ')}`);
}
record('PACK', 'C09_chain_coverage', chainVerdict);

// C10: bilangan skill == 27 dan tiada folder skill yatim (folder bukan skill
// seperti bin/ dan .claude-plugin/ tidak dikira)
const orphanFolders = folders.filter((f) => f.startsWith('THEFOUNDER-') && !readSkill(f));
record('PACK', 'C10_populasi_pack', skills.length === 27 && orphanFolders.length === 0
  ? pass(`27 skill, tiada folder yatim`)
  : fail(`${skills.length} skill, yatim: ${orphanFolders.join(', ') || 'tiada'}`));

// C13: pakej npx — manifest sah, CLI wajib wujud
const pkgPath = path.join(skillsDir, 'package.json');
const binPath = path.join(skillsDir, 'bin', 'thefounder.js');
let pkgVerdict = fail('package.json tiada');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name?: string; bin?: Record<string, string>; engines?: { node?: string };
    };
    const binOk = fs.existsSync(binPath) && !!pkg.bin?.thefounder;
    pkgVerdict = pkg.name === 'thefounder' && binOk && !!pkg.engines?.node
      ? pass(`pakej npx sah (bin -> ${pkg.bin?.thefounder}, node ${pkg.engines?.node}+)`)
      : fail(`manifest tidak lengkap (name=${pkg.name}, bin wujud=${binOk})`);
  } catch (error) {
    pkgVerdict = fail(`package.json tidak sah JSON: ${String(error)}`);
  }
}
record('PACK', 'C13_pakej_npx', pkgVerdict);

// ---- Assertions bun:test (gate merah/hijau) ----

test('setiap skill: frontmatter, description, trigger, nama lama, python stdlib', () => {
  const failures = ledger.filter((e) => !e.skill.startsWith('PACK') && e.verdict.value === 'FAIL');
  expect(failures).toEqual([]);
});

test('clash gate: tiada trigger phrase dikongsi antara skill', () => {
  expect(clashes).toEqual([]);
});

test('fail aras pack wujud dan CHAIN.md meliputi semua skill', () => {
  expect(missingPack).toEqual([]);
  const chainFail = ledger.find((e) => e.check === 'C09_chain_coverage');
  expect(chainFail?.verdict.value).toBe('PASS');
  expect(skills.length).toBe(27);
});

test('laporan pack ditulis ke reports/', () => {
  const jsonPath = path.join(root, 'reports', 'thefounder-skill-pack-test-20261021.json');
  const mdPath = path.join(root, 'reports', 'thefounder-skill-pack-test-20261021.md');
  const counts = {
    skills: skills.length,
    checks: ledger.length,
    pass: ledger.filter((e) => e.verdict.value === 'PASS').length,
    fail: ledger.filter((e) => e.verdict.value === 'FAIL').length,
    uncomputed: ledger.filter((e) => e.verdict.value === null).length,
    clashes: clashes.length,
  };
  const lines = [
    '# Laporan Ujian Pack THEFOUNDER — 21 Oktober 2026',
    '',
    'Setiap baris ialah judgment gaya JEV LOCAL_RULES: `value` PASS/FAIL/null,',
    '`confidence: null`, `probabilities: null` (semantik null BL-23 — "tidak',
    'dikira" kekal null, bukan 0).',
    '',
    '| Skill | Semakan | Keputusan | Sebab |',
    '| --- | --- | --- | --- |',
    ...ledger.map((e) => `| ${e.skill} | ${e.check} | ${e.verdict.value ?? 'NULL'} | ${e.verdict.reason.replace(/\|/g, '/')} |`),
    '',
    `Jumlah: ${counts.skills} skill, ${counts.checks} semakan — ${counts.pass} PASS, ${counts.fail} FAIL, ${counts.uncomputed} NULL.`,
    '',
  ];
  fs.writeFileSync(jsonPath, JSON.stringify({ counts, ledger }, null, 2));
  fs.writeFileSync(mdPath, lines.join('\n'));
  expect(counts.fail).toBe(0);
});
