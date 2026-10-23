/**
 * Penulis resit acceptance — DIUKUR, bukan ditaip tangan.
 *
 * Skrip ini menggantikan lapan skrip `write-*-evidence-20261021.ts` yang lama
 * (adv15, cg, cpk10-python, ext-pd, mod02, sec01, surface, kilo). Skrip lama
 * menulis `exitCode: 0` dan `'N pass / 0 fail'` sebagai literal tanpa pernah
 * menjalankan ujian yang dipetik — itu bukti fabrikasi (AGENTS.md §3).
 *
 * PRINSIP:
 *  - Setiap resit mesti datang daripada larian SEBENAR: arahan dijalankan,
 *    exit code direkod apa adanya, kiraan pass/fail/expect diekstrak daripada
 *    output sebenar.
 *  - Kalau larian TIDAK hijau, skrip TIDAK boleh memuatkan "hijau": status
 *    resit turun taraf kepada `implemented_unverified`, jurang ledger ditulis
 *    dengan punca sebenar, dan skrip keluar dengan kod bukan 0.
 *  - "Tidak dikira" bukan sifar: bila output tidak memberi kiraan, resit
 *    menulis `unknown`, bukan `0 pass`.
 *  - Kiraan dalam naratif ledger (`(6 ujian)`, `23 pytest lulus`) juga
 *    diukur — ia disisip daripada larian sebenar, bukan daripada literal.
 *  - Skema fail resit kekal seperti sedia ada (nama medan sama, tiada medan
 *    baharu); hanya nilai yang diukur.
 *
 * ARAHAN:
 *   bun scripts/maintenance/write-measured-evidence-20261021.ts
 *   bun scripts/maintenance/write-measured-evidence-20261021.ts --only adv15,sec01
 *   bun scripts/maintenance/write-measured-evidence-20261021.ts --out-root <dir>
 *   bun scripts/maintenance/write-measured-evidence-20261021.ts --ledger <path>
 *   bun scripts/maintenance/write-measured-evidence-20261021.ts --self-test
 *
 * `--out-root` menukar tempat resit ditulis; `--ledger` menukar tempat ledger
 * dibaca dan ditulis. Kedua-duanya wujud supaya larian boleh diuji tanpa
 * menyentuh tree canonical.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { parseJunitFiles, type FileResult, type TestCaseRecord } from './verify-acceptance.ts';

/* -------------------------------------------------------------------------- */
/* Skema                                                                       */
/* -------------------------------------------------------------------------- */

export type ParserKind = 'bun' | 'pytest';

/** Satu fail resit yang akan ditulis selepas larian diukur. */
export interface Receipt {
  /** Kunci unik dalam jadual data. */
  key: string;
  /** Laluan fail resit relatif kepada `--out-root`. */
  file: string;
  /** ID requirement seperti dalam ledger. */
  requirementId: string;
  /** Status yang ditulis ke resit bila larian hijau. */
  status?: string;
  /** Tajuk ringkas (hanya dalam resit CG). */
  title?: string;
  /** Susunan kunci JSON (`standard` = majoriti, `cg` = gaya resit CG). */
  keyOrder?: 'standard' | 'cg';
  testName: string;
  /** Fail ujian utama yang dipetik (fail pertama). */
  testPath: string;
  /** Semua fail ujian yang dijalankan untuk resit ini. */
  testPaths: string[];
  /** Arahan sebenar yang dijalankan. */
  command: string[];
  artifactRefs: string[];
  limitations: string;
  /** Awalan pitang untuk kiraan per-ID (contoh `EXT-01`). */
  countPrefix?: string;
  /** Tambahan pada rentetan `result`. */
  resultSuffix?: string;
  /** Adakah kiraan `expect() calls` masuk dalam rentetan `result`? */
  includeExpect?: boolean;
  /** Format rentetan `result` untuk resit ini. */
  resultFormat?: 'bun' | 'pytest';
  /** Cara mengurai output larian. */
  parser: ParserKind;
}

/** Tampalan pada baris ledger. */
export interface LedgerPatch {
  /** Baris ledger yang disentuh. */
  rowId: string;
  /** Kunci resit yang menentukan status hijau/t merah bagi baris ini. */
  gateKey: string;
  status?: string;
  gap?: string;
  remainingRequirement?: string;
  evidenceProves?: string;
  /** Laluan bukti yang perlu ditambah ke `evidenceRefs`. */
  addEvidenceRef?: string;
}

/** Satu lorong: sekumpulan resit + tampalan ledger. */
export interface Lane {
  key: string;
  receipts: Receipt[];
  ledger?: LedgerPatch[];
}

/* -------------------------------------------------------------------------- */
/* Pengukuran                                                                  */
/* -------------------------------------------------------------------------- */

export interface Measurement {
  /** Kod keluar sebenar proses. */
  exitCode: number;
  /** Kiraan lulus — `null` bila output tidak memberi ringkasan. */
  pass: number | null;
  /** Kiraan gagal — `null` bila output tidak memberi ringkasan. */
  fail: number | null;
  /** Kiraan panggilan `expect()`. */
  expectCalls: number | null;
  /** Kiraan ujian yang dilangkau. */
  skip: number | null;
  /** Kiraan ujian `todo`. */
  todo: number | null;
  /** Bilangan fail yang diimbas. */
  files: number | null;
  /** Kiraan lulus mengikut fail (normalisasi POSIX). */
  passByFile: Map<string, number>;
  /** Kiraan lulus mengikut awalan ID ujian. */
  passByPrefix: Map<string, number>;
  /** Bilangan amaran (pytest sahaja). */
  warnings: number | null;
  /** Tempoh larian dalam saat (pytest sahaja). */
  durationSeconds: number | null;
  /** Ringkasan boleh dibaca mesin. */
  summary: string;
  /** Adakah larian ini hijau? */
  green: boolean;
  /** Punca larian tidak hijau (untuk jurang ledger). */
  reason: string;
  /** Output mentah (dipangkas). */
  stdout: string;
}

function countFromSummaryLine(stdout: string, label: string): number | null {
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    const match = new RegExp(`^(\\d+)\\s+${label}$`).exec(line);
    if (match) return Number(match[1]);
  }
  return null;
}

/**
 * Kiraan lulus bagi satu fail: jumlah ujian yang lulus, dikira daripada
 * rekoder (tests) tolak gagal, ralat, dilangkau dan todo. `testCases`
 * digunakan sebagai sumber kedua supaya perbezaan antara rekoder dan
 * pemeriksa tidak mengoyekan hitungan. `testCases` digunakan sebagai sumber kedua supaya
 * perbezaan antara rekoder dan pemeriksa tidak mengoyekan hitungan.
 */
function passCountOf(file: FileResult): number {
  const counted = file.testCases.filter((t) => t.outcome === 'pass').length;
  const derived = file.tests - file.failures - (file.errors ?? 0) - file.skipped;
  return Math.max(0, Math.min(derived, counted > 0 ? counted : derived));
}

/** Fail yang paling absurdo (tanpa laluan) supaya jurang ledger berguna. */
function firstFailureLine(stdout: string): string | null {
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('(fail)')) return line.slice(0, 200);
  }
  return null;
}

function buildMeasurement(args: {
  exitCode: number;
  pass: number | null;
  fail: number | null;
  expectCalls: number | null;
  skip: number | null;
  todo: number | null;
  files: number | null;
  passByFile: Map<string, number>;
  passByPrefix: Map<string, number>;
  warnings?: number | null;
  durationSeconds?: number | null;
  stdout: string;
}): Measurement {
  const skip = args.skip ?? 0;
  const todo = args.todo ?? 0;
  const missingSummary = args.pass === null || args.fail === null;
  let reason = '';
  if (args.exitCode !== 0) {
    reason = `larian keluar dengan kod ${args.exitCode}`;
  } else if (missingSummary) {
    reason = 'output larian tiada ringkasan pass/fail';
  } else if ((args.fail ?? 0) > 0) {
    reason = `${args.fail} ujian gagal`;
  } else if (skip > 0) {
    reason = `${skip} ujian dilangkau (skip bukan lulus)`;
  } else if (todo > 0) {
    reason = `${todo} ujian masih todo`;
  }
  const failure = firstFailureLine(args.stdout);
  const summary = missingSummary
    ? 'unknown'
    : `${args.pass} pass / ${args.fail} fail${args.expectCalls === null ? '' : ` / ${args.expectCalls} expect() calls`}`;
  return {
    exitCode: args.exitCode,
    pass: args.pass,
    fail: args.fail,
    expectCalls: args.expectCalls,
    skip,
    todo,
    files: args.files,
    passByFile: args.passByFile,
    passByPrefix: args.passByPrefix,
    warnings: args.warnings ?? null,
    durationSeconds: args.durationSeconds ?? null,
    summary,
    green: reason === '',
    reason: reason === '' ? '' : `${reason}${failure ? ` — ${failure}` : ''}`,
    stdout: args.stdout,
  };
}

function runProcess(cmd: string, args: string[], cwd: string): { exitCode: number; stdout: string } {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  if (res.error) {
    return { exitCode: -1, stdout: `${res.error.message}\n` };
  }
  const stdout = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  return { exitCode: res.status ?? -1, stdout };
}

/** Mengukur larian `bun test` (dengan laporan junit untuk kiraan per-fail). */
export function measureBunTest(testPaths: string[], cwd: string, keepJunit = false): Measurement {
  const junitFile = join(tmpdir(), `kilo-evidence-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.xml`);
  const args = ['test', '--isolate', '--timeout', '15000'];
  for (const p of testPaths) {
    const normalized = p.replace(/\\/g, '/');
    args.push(isAbsolute(p) ? normalized : `./${normalized}`);
  }
  args.push(`--reporter=junit`, `--reporter-outfile=${junitFile}`);

  const { exitCode, stdout } = runProcess('bun', args, cwd);

  const passByFile = new Map<string, number>();
  const passByPrefix = new Map<string, number>();
  let files: number | null = null;
  if (existsSync(junitFile)) {
    try {
      const parsed = parseJunitFiles(readFileSync(junitFile, 'utf-8'));
      for (const file of parsed) {
        const key = file.file.replace(/\\/g, '/');
        passByFile.set(key, passCountOf(file));
        for (const testCase of file.testCases) {
          if (testCase.outcome !== 'pass') continue;
          for (const prefix of prefixCandidates(testCase)) {
            passByPrefix.set(prefix, (passByPrefix.get(prefix) ?? 0) + 1);
          }
        }
      }
      files = parsed.length;
    } catch {
      /* ringkasan stdout masih boleh digunakan */
    }
    if (!keepJunit) {
      try {
        rmSync(junitFile, { force: true });
      } catch {
        /* best effort */
      }
    }
  }

  const ranMatch = /Ran\s+(\d+)\s+tests?\s+across\s+(\d+)\s+files?/.exec(stdout);
  return buildMeasurement({
    exitCode,
    pass: countFromSummaryLine(stdout, 'pass'),
    fail: countFromSummaryLine(stdout, 'fail'),
    expectCalls: countFromSummaryLine(stdout, 'expect\\(\\) calls'),
    skip: countFromSummaryLine(stdout, 'skip'),
    todo: countFromSummaryLine(stdout, 'todo'),
    files: files ?? (ranMatch ? Number(ranMatch[2]) : null),
    passByFile,
    passByPrefix,
    stdout,
  });
}

/** Awalan ID yang boleh dikenal pasti daripada satu testcase. */
function prefixCandidates(testCase: TestCaseRecord): string[] {
  const out: string[] = [];
  for (const raw of [testCase.classname, testCase.name]) {
    const match = /^([A-Z]{2,4}-\d{2,3})(?:\b|[\s:—-])/.exec(raw);
    if (match) out.push(match[1]);
  }
  return out;
}

/** Mengukur larian pytest (`bun run test:adk`). */
export function measurePytest(scriptName: string, cwd: string): Measurement {
  const { exitCode, stdout } = runProcess('bun', ['run', scriptName], cwd);
  const passed = /(\d+)\s+passed/.exec(stdout);
  const failed = /(\d+)\s+failed/.exec(stdout);
  const warnings = /(\d+)\s+warnings?/.exec(stdout);
  const duration = /in\s+([\d.]+)s/.exec(stdout);
  const passByFile = new Map<string, number>();
  const passByPrefix = new Map<string, number>();
  return buildMeasurement({
    exitCode,
    pass: passed ? Number(passed[1]) : null,
    // pytest only prints a "failed" count when there IS a failure; "23 passed"
    // alone means zero failures, not "unknown".
    fail: failed ? Number(failed[1]) : passed ? 0 : null,
    expectCalls: null,
    skip: null,
    todo: null,
    files: null,
    passByFile,
    passByPrefix,
    warnings: warnings ? Number(warnings[1]) : null,
    durationSeconds: duration ? Number(duration[1]) : null,
    stdout,
  });
}

/* -------------------------------------------------------------------------- */
/* Templat naratif                                                             */
/* -------------------------------------------------------------------------- */

export interface TemplateContext {
  /** Kiraan lulus terlingkup (per-ID jika `countPrefix` diberi). */
  count: number | null;
  measurement: Measurement;
  receipt: Receipt;
}

/**
 * Menyisip nilai terukur ke dalam naratif.
 * Token yang tidak boleh diselesaikan adalah RALAT — bukan "{token}" yang
 * tertinggal dalam ledger, dan bukan `0`.
 */
export function resolveTemplate(text: string, ctx: TemplateContext): string {
  return text.replace(/\{([^{}]+)\}/g, (_match, token: string) => {
    const value = lookupToken(token, ctx);
    if (value === undefined) {
      throw new Error(`token naratif tidak dapat diselesaikan: {${token}}`);
    }
    return value === null ? 'unknown' : String(value);
  });
}

function lookupToken(token: string, ctx: TemplateContext): number | string | null | undefined {
  const m = ctx.measurement;
  switch (token) {
    case 'count':
      return ctx.count;
    case 'totalPass':
      return m.pass;
    case 'totalFail':
      return m.fail;
    case 'expect':
      return m.expectCalls;
    case 'todo':
      return m.todo;
    case 'skip':
      return m.skip;
    case 'files':
      return m.files;
    case 'exit':
      return m.exitCode;
    default:
      break;
  }
  if (token.startsWith('file:')) {
    const key = token.slice('file:'.length).replace(/\\/g, '/');
    return m.passByFile.get(key) ?? null;
  }
  if (token.startsWith('prefix:')) {
    const key = token.slice('prefix:'.length);
    return m.passByPrefix.get(key) ?? null;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Jadual data                                                                 */
/* -------------------------------------------------------------------------- */

const EVIDENCE_DIR = 'reports/implementation/evidence';
const EVIDENCE_CG_DIR = 'reports/implementation/evidence-cg';

export const LANES: Lane[] = [
  {
    key: 'adv15',
    receipts: [
      {
        key: 'adv15',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/ADV-15.json`,
        requirementId: 'ADV-15',
        status: 'verified_local',
        testName:
          'ADV-15: audit sahaja tidak menulis; remediate:true merekodkan rekod luput CHF kungtif (LOYALTY_EXPIRY_RECORDED) dan lejar mengandungi satu rekod expired',
        testPath: 'tests/platform/adv-row-contracts-3.test.ts',
        testPaths: ['tests/platform/adv-row-contracts-3.test.ts'],
        command: ['bun', 'test', '--isolate', '--timeout', '15000', './tests/platform/adv-row-contracts-3.test.ts'],
        artifactRefs: [
          'server/agents/tools/capabilities/advRemediation.ts',
          'server/agents/tools/capabilities/growth.ts',
          'shared/growth-contracts.ts',
        ],
        limitations:
          'Bukti ini meliputi rekod luput CHF kungtif. Pelarasan baki oleh founder (LOYALTY_BALANCE_ADJUSTED) dan penolakan pelarasan tanpa kebenaran (LOYALTY_ADJUSTMENT_REJECTED) belum mempunyai ujian berasingan.',
        countPrefix: 'ADV-15',
        parser: 'bun',
      },
    ],
    ledger: [
      {
        rowId: 'ADV-15',
        gateKey: 'adv15',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'audit_loyalty kini BOLEH remediasi: `remediate: true` merekodkan rekod luput yang tertinggal (LOYALTY_EXPIRY_RECORDED), mutasi ditandakan, dan selepas remediasi lejar mengandungi satu rekod `expired` yang sah. Audit tanpa remediasi TIDAK menulis apa-apa. Bukti: tests/platform/adv-row-contracts-3.test.ts ({count} ujian). Skop TERHAD: bukti ini meliputi rekod luput CHF kungtif. Pelarasan baki oleh founder (LOYALTY_BALANCE_ADJUSTED) dan penolakan pelarasan tanpa kebenaran (LOYALTY_ADJUSTMENT_REJECTED) belum mempunyai ujian berasingan.',
        addEvidenceRef: `${EVIDENCE_DIR}/ADV-15.json`,
      },
    ],
  },
  {
    key: 'cg',
    receipts: [
      {
        key: 'cg-01',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_CG_DIR}/CG-01.json`,
        requirementId: 'CG-01',
        title: 'Aktivasi/provision unik store awam',
        keyOrder: 'cg',
        testName:
          'CG-01: kelulusan menghasilkan SATU store dengan store ID stabil; retry ⇒ TIDAK store kedua; slug collision ⇒ DEALER_STORE_SLUG_TAKEN; slug terpelihara ⇒ DEALER_STORE_SLUG_RESERVED; input tidak sah ⇒ DEALER_STORE_INPUT_INVALID',
        testPath: 'tests/platform/dealer-store-provisioning.test.ts',
        testPaths: ['tests/platform/dealer-store-provisioning.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/dealer-store-provisioning.test.ts',
        ],
        artifactRefs: [
          'server/platform/dealerStores.ts',
          'server/platform/dealers.ts',
          'shared/dealer-store-contracts.ts',
        ],
        limitations:
          'Provisioning berlaku dalam blok atomik kelulusan yang sama, jadi retry/kelulusan serentak tidak menghasilkan dua store. Bukti ini TIDAK meliputi: store peribadi (private catalogue overrides), lifecycle suspend/revoke store, atau pengalihan slug yang mengubah redirect laluan lama (belum ada laluan redirect). Store ID kekal stabil apabila slug ditukar; itu disahkan oleh re-provision store yang sama.',
        parser: 'bun',
      },
      {
        key: 'cg-02',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_CG_DIR}/CG-02.json`,
        requirementId: 'CG-02',
        title: 'Public store / private workspace',
        keyOrder: 'cg',
        testName:
          'CG-02: public store dibaca TANPA sesi (slug ⇒ 404 STORE_NOT_FOUND); dealer workspace senarai store sendiri sahaja; pelanggan lain nampak kosong',
        testPath: 'tests/platform/dealer-store-provisioning.test.ts',
        testPaths: ['tests/platform/dealer-store-provisioning.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/dealer-store-provisioning.test.ts',
        ],
        artifactRefs: [
          'server/platform/app.ts',
          'server/platform/dealerStores.ts',
          'shared/dealer-store-contracts.ts',
        ],
        limitations:
          'API public store mengembalikan projek store + katalog yang diterbitkan dengan availability; UI public store (`/kedai/:slug`) dan navigasi dealer workspace yang berbeza BELUM dibina — ini kerja frontend (lane frontend). Projek awam mengandungi 4 medan sahaja (storeId, slug, displayName, status); tiada data peribadi owner.',
        parser: 'bun',
      },
    ],
  },
  {
    key: 'cpk10-python',
    receipts: [
      {
        key: 'cpk10-python',
        resultFormat: 'pytest',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/CPK-10-python.json`,
        requirementId: 'CPK-10',
        status: 'implemented_unverified',
        testName: 'test_master_agent_delegates_to_a_specialist_through_adk',
        testPath: 'agents/google-adk/tests/test_agents.py',
        testPaths: ['agents/google-adk/tests/test_agents.py'],
        command: ['bun', 'run', 'test:adk'],
        artifactRefs: [
          'agents/google-adk/runtime.py',
          'agents/google-adk/tests/test_agents.py',
          'server/agents/copilot/runtime.ts',
        ],
        limitations:
          'Bukti ini meliputi separuh PYTHON sahaja: delegasi master → specialist melalui ADK sebenar dengan jejak (delegatedBy, delegatedAgent, a2ui.provenance, adk.tool, adk.sessionId). Runtime TypeScript (server/agents/copilot/runtime.ts) MASIH tiada parent→child delegation, trace propagation atau warisan bajet — itu baki sebenar yang menyebabkan baris kekal implemented_unverified. Suite Python kini boleh dijalankan melalui skrip npm `bun run test:adk` (sebelum ini tiada skrip atau CI job yang memanggilnya).',
        parser: 'pytest',
      },
    ],
    ledger: [
      {
        rowId: 'CPK-10',
        gateKey: 'cpk10-python',
        status: 'implemented_unverified',
        gap:
          'Separuh PYTHON sudah terbukti: delegasi master → specialist melalui ADK sebenar (delegatedBy "abangcolek_ops", delegatedAgent "commerce_reader", a2ui.provenance.delegatedBy, adk.tool + adk.sessionId) dan intent takresolved dilapor dengan reason code, bukan direka. {count} pytest lulus melalui `bun run test:adk` (venv workspace agents/google-adk/.venv). Yang BELUM dipenuhi: runtime TypeScript (server/agents/copilot) tiada parent→child delegation, tiada trace propagation dan tiada warisan bajet — jadi baris ini kekal implemented_unverified.',
        evidenceProves:
          'Python: delegasi ADK sebenar diuji — test_master_agent_delegates_to_a_specialist_through_adk menghantar POST /agent/abangcolek_ops dan asserts delegatedBy/delegatedAgent/provenance/adk.tool/adk.sessionId; {count} pytest lulus (bun run test:adk). Skop TERHAD: ini bukti separuh PYTHON sahaja; runtime TypeScript belum mempunyai delegasi parent→child, trace propagation atau warisan bajet.',
        addEvidenceRef: `${EVIDENCE_DIR}/CPK-10-python.json`,
      },
    ],
  },
  {
    key: 'ext-pd',
    receipts: [
      {
        key: 'ext-01',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/EXT-01.json`,
        requirementId: 'EXT-01',
        status: 'verified_local',
        testName: 'Kontrak baris EXT-01 (kelakuan khusus baris)',
        testPath: 'tests/platform/ext-pd-contracts.test.ts',
        testPaths: ['tests/platform/ext-pd-contracts.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/ext-pd-contracts.test.ts',
        ],
        artifactRefs: ['server/platform/app.ts', 'server/platform/dispatchConsent.ts', 'shared/pd-contracts.ts'],
        limitations:
          'Bukti ini meliputi laluan HTTP dan gate authority. Ia TIDAK meliputi panel Inspector UI (Rich Threads / Automatic Learning) yang memerlukan perkhidmatan Intelligence dan kekal blocked_external.',
        countPrefix: 'EXT-01',
        resultSuffix: '(seluruh fail baris EXT-01 + PD-01)',
        parser: 'bun',
      },
      {
        key: 'pd-01',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/PD-01.json`,
        requirementId: 'PD-01',
        status: 'verified_local',
        testName: 'Kontrak baris PD-01 (kelakuan khusus baris)',
        testPath: 'tests/platform/ext-pd-contracts.test.ts',
        testPaths: ['tests/platform/ext-pd-contracts.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/ext-pd-contracts.test.ts',
        ],
        artifactRefs: ['server/platform/app.ts', 'server/platform/dispatchConsent.ts', 'shared/pd-contracts.ts'],
        limitations:
          'Bukti ini meliputi gate aset dan gate opt-out pada laluan dispatch. Ia TIDAK meliputi barisan antrean dispatch (queued dispatch) yang belum diuji, mahupun penolakan oleh中层 role di luar founder/staff.',
        countPrefix: 'PD-01',
        resultSuffix: '(seluruh fail baris EXT-01 + PD-01)',
        parser: 'bun',
      },
    ],
    ledger: [
      {
        rowId: 'EXT-01',
        gateKey: 'ext-01',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'Laluan inspector dev kini DI-MOUNT dan하였다: GET /api/platform/dev/inspector ⇒ 200 dengan snapshot untuk founder, 403 FORBIDDEN untuk pelanggan, 401 tanpa sesi, dan 404 INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION apabila NODE_ENV=production (gate di semak SEBELUM sesi diselesaikan, jadi production tidak membocorkan apa-apa). Bukti: tests/platform/ext-pd-contracts.test.ts ({count} ujian). Skop TERHAD: Bukti ini meliputi laluan HTTP dan gate authority. Ia TIDAK meliputi panel Inspector UI (Rich Threads / Automatic Learning) yang memerlukan perkhidmatan Intelligence dan kekal blocked_external.',
        addEvidenceRef: `${EVIDENCE_DIR}/EXT-01.json`,
      },
      {
        rowId: 'PD-01',
        gateKey: 'pd-01',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'Gate penghantaran kini mempunyai dua halangan berurutan yang keduanya terbukti: (1) kebenaran aset berstruktur — tiada rekod granted ⇒ ASSET_CONSENT_NOT_GRANTED (unknown bukan kebenaran; teks bebas asset.consent yang lama TIDAK dikira); (2) opt-out penerima — penerima dengan inAppEnabled=false ⇒ DISPATCH_OPTED_OUT dan fungsi penghantaran TIDAK dijalankan (dispatched === false). Dengan konsen granted + keutamaan dibenarkan, penghantaran dibenarkan. Bukti: tests/platform/ext-pd-contracts.test.ts ({count} ujian). Skop TERHAD: Bukti ini meliputi gate aset dan gate opt-out pada laluan dispatch. Ia TIDAK meliputi barisan antrean dispatch (queued dispatch) yang belum diuji, mahupun penolakan oleh中层 role di luar founder/staff.',
        addEvidenceRef: `${EVIDENCE_DIR}/PD-01.json`,
      },
    ],
  },
  {
    key: 'mod02',
    receipts: [
      {
        key: 'mod02',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/MOD-02.json`,
        requirementId: 'MOD-02',
        status: 'verified_local',
        testName:
          'MOD-02: unjuran awam tiada order id; unjuran yang membocorkan id ⇒ PUBLIC_PROJECTION_LEAK_BLOCKED; token lapus ⇒ TRACKING_TOKEN_EXPIRED, token tiada ⇒ ORDER_NOT_FOUND',
        testPath: 'tests/copilot/mod-02-public-projection.test.ts',
        testPaths: ['tests/copilot/mod-02-public-projection.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/copilot/mod-02-public-projection.test.ts',
        ],
        artifactRefs: [
          'server/platform/publicOrderProjection.ts',
          'server/platform/adkAgent.ts',
          'server/platform/commerce.ts',
        ],
        limitations:
          'Bukti ini meliputi sempadan unjuran awam dan laluan copilot (kad tracking，展示 publicRef, bukan order id). Path revocation token tracking dan expiry berasaskan handover (baris SEC-01) adalah isu berasingan dan masih belum ditutup. $2 dan expiry berasaskan handover (baris SEC-01) adalah isu berasingan dan masih belum ditutup.',
        countPrefix: 'MOD-02',
        parser: 'bun',
      },
    ],
    ledger: [
      {
        rowId: 'MOD-02',
        gateKey: 'mod02',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'Unjuran awam kini diasingkan daripada order peribadi DI DALAM laluan copilot: kad tracking dalam chat showing `publicRef` (opaque, daripada hash token) dan BUKAN order id; satu implementasi sahaja (publicOrderProjection.publicRefFromTokenHash) digunakan oleh adkAgent. Unjuran awam tidak mengandungi id/orderId, guard itu menolak apa-apa medan peribadi (PUBLIC_PROJECTION_LEAK_BLOCKED), token lapus ⇒ TRACKING_TOKEN_EXPIRED, token tiada ⇒ ORDER_NOT_FOUND (bukan unjuran reka). Bukti: tests/copilot/mod-02-public-projection.test.ts ({count} ujian). Skop TERHAD: bukti ini meliputi sempadan unjuran awam dan laluan copilot; path revocation token tracking (SEC-01) masih berasingan.',
        addEvidenceRef: `${EVIDENCE_DIR}/MOD-02.json`,
      },
    ],
  },
  {
    key: 'sec01',
    receipts: [
      {
        key: 'sec01',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/SEC-01.json`,
        requirementId: 'SEC-01',
        status: 'verified_local',
        testName:
          'SEC-01: token disimpan sebagai hash sahaja; token dicabut => unjuran awam tidak dibina; revocation kedua => TRACKING_TOKEN_ALREADY_REVOKED; handover memperbaharui tempoh token; pembatalan TIDAK mencabut token (pesanan yang dibatalkan masih boleh dijejak)',
        testPath: 'tests/platform/sec-01-tracking-token.test.ts',
        testPaths: [
          'tests/platform/sec-01-tracking-token.test.ts',
          'tests/platform/order-tracking-token.test.ts',
        ],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/sec-01-tracking-token.test.ts',
          './tests/platform/order-tracking-token.test.ts',
        ],
        artifactRefs: [
          'server/platform/commerce.ts',
          'server/platform/publicOrderProjection.ts',
          'shared/platform-contracts.ts',
          'shared/mod-contracts.ts',
        ],
        limitations:
          'Bukti ini meliputi token penjejakan awam: hashing at rest, tempoh hidup mengikut handover, laluan revocation (eksplisit + automatik pada pembatalan) dan tiada unjuran selepas revocation. Ia TIDAK meliputi penerbitan token baharu selepas pesanan dibuat (token hanya diterbitkan semasa penciptaan pesanan), dan pembatalan pesanan tidak mencabut token (pesanan yang dibatalkan masih boleh dijejak). $2 selepas pesanan dibuat (token hanya diterbitkan semasa penciptaan pesanan), dan pembatalan pesanan tidak mencabut token (pesanan yang dibatalkan masih boleh dijejak).',
        parser: 'bun',
      },
    ],
    ledger: [
      {
        rowId: 'SEC-01',
        gateKey: 'sec01',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'Token penjejakan kini mempunyai ketiga-tiga sifat yang baris ini minta: (1) hashed at rest — hanya hash yang disimpan, token mentah tiada dalam store; (2) tempoh hidup mengikut HANDOVER — setiap serahhandover (accepted/packing/packed/dispatched/received) memperbaharui tetingkap penjejakan 14 hari, bukanpenciptaan sahaja; (3) laluan revocation — `Commerce.revokeTrackingToken` (pemilik/operasi) menanda token dicabut, revocation kedua ⇒ TRACKING_TOKEN_ALREADY_REVOKED, dan token yang dicabut tidak lagi membina unjuran awam (TRACKING_TOKEN_REVOKED). Bukti: tests/platform/sec-01-tracking-token.test.ts ({count} ujian, incl. negatif) + tests/platform/order-tracking-token.test.ts ({file:tests/platform/order-tracking-token.test.ts} ujian yang证明 pesanan yang dibatalkan masih boleh dijejak - token tidak dicabut secara automatik). Skop TERHAD: bukti ini meliputi token penjejakan awam; tiada API awam untuk menerbitkan token baharu (token hanya issue semasa createOrder) — itu baki operasi, bukan jurang baris ini.',
        addEvidenceRef: `${EVIDENCE_DIR}/SEC-01.json`,
      },
    ],
  },
  {
    key: 'surface',
    receipts: [
      {
        key: 'surface',
        resultFormat: 'bun',
        includeExpect: false,
        file: `${EVIDENCE_DIR}/CPK-04.json`,
        requirementId: 'CPK-04',
        status: 'verified_local',
        testName:
          'BL-16: katalog dimuatkan dengan versi dan had global; payload fixed-schema yang sah diteruskan; komponen luar catalog ditolak; payload tanpa surfaceId mahupun component ditolak; pokok berkitar ditolak; versi skema salah ditolak',
        testPath: 'tests/platform/surface-catalog-mount.test.ts',
        testPaths: [
          'tests/platform/surface-catalog-mount.test.ts',
          'tests/platform/copilot-adk.test.ts',
          'tests/frontend/a2ui-components.test.tsx',
        ],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/surface-catalog-mount.test.ts',
          './tests/platform/copilot-adk.test.ts',
          './tests/frontend/a2ui-components.test.tsx',
        ],
        artifactRefs: [
          'server/platform/surfaceCatalog.ts',
          'server/platform/surfaceMiddleware.ts',
          'server/platform/adkAgent.ts',
          'shared/surface-contracts.ts',
        ],
        limitations:
          'Bukti ini meliputi pemasangan catalog + middleware dan penguatkuasaan had struktur §4:93 (depth, bajet nod, komponen dibenarkan, kitaran, versi skema) pada laluan a2ui platform. Ia TIDAK meliputi operasi-container A2UI (createSurface/updateComponents/updateDataModel) yang masih menjadi model payload platform (payload fixed-schema rata), mahupun renderer frontend yang membaca model operasi-container itu.',
        parser: 'bun',
      },
    ],
    ledger: [
      {
        rowId: 'CPK-04',
        gateKey: 'surface',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'Permukaan A2UI yang dihantar server kini MELALUI catalog versi + middleware: setiap payload a2ui diuji renderSurfacePayload(payload, getSurfaceCatalog()) sebelum dihantar, payload tidak sah DITOLAK dengan reason code (SURFACE_UNKNOWN_SURFACE_ID / SURFACE_COMPONENT_NOT_ALLOWLISTED / SURFACE_CYCLE_DETECTED / SURFACE_DEPTH_EXCEEDED / SURFACE_NODE_LIMIT_EXCEEDED) dan tidak pernah sampai ke UI; bentuk payload asal dikekalkan supaya renderer sedia ada tidak berubah. Bukti: tests/platform/surface-catalog-mount.test.ts ({count} ujian) + tests/platform/copilot-adk.test.ts ({file:tests/platform/copilot-adk.test.ts} ujian) + tests/frontend/a2ui-components.test.tsx ({file:tests/frontend/a2ui-components.test.tsx} ujian) — kesemuanya hijau dalam larian yang sama ({totalPass} ujian).',
        addEvidenceRef: `${EVIDENCE_DIR}/CPK-04.json`,
      },
      {
        rowId: 'CPK-05',
        gateKey: 'surface',
        status: 'verified_local',
        gap: '',
        remainingRequirement: '',
        evidenceProves:
          'Catalog permukaan versi + had struktur kini BERAPA KALI DI-MOUNT pada laluan yang dilayani (bukan dead code): server/platform/surfaceCatalog.ts memuatkan katalog (9 permukaan, had global depth/nod) dan server/platform/surfaceMiddleware.ts menguatkuasakan depth, bajet nod, senarai komponen dibenarkan, pengesanan kitaran dan padanan versi skema; payload fixed-schema rata dipetakan sebagai permukaan satu nod dengan surfaceId daripada deklarasi catalog. Dokumen katalog itu sendiri dibetulkan (maxDepth 0 bukan integer positif ⇒ katalog tidak pernah dimuatkan sebelum ini). Bukti: tests/platform/surface-catalog-mount.test.ts ({count} ujian, termasuk kes negatif komponen luar catalog, payload tanpa surfaceId/component, pokok berkitar dan versi skema salah).',
        addEvidenceRef: `${EVIDENCE_DIR}/CPK-04.json`,
      },
    ],
  },
  {
    key: 'kilo',
    receipts: [
      {
        key: 'kilo-ref-01',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/REF-01.json`,
        requirementId: 'REF-01',
        status: 'verified_local',
        testName:
          'Isyarat peranti yang hilang => unknown + reason code, tiada value 0/false; Tiada provider OTP => unavailable + OTP_PROVIDER_UNAVAILABLE + tiada cabaran disimpan; Submit => submitted + event pertama, transitions disahkan, transition haram => 409',
        testPath: 'tests/platform/loyalty-redemption-risk.test.ts',
        testPaths: ['tests/platform/loyalty-redemption-risk.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/loyalty-redemption-risk.test.ts',
        ],
        artifactRefs: [
          'server/platform/risk/engine.ts',
          'server/platform/risk/otp.ts',
          'server/platform/risk/appeals.ts',
          'server/platform/risk/service.ts',
          'shared/risk-contracts.ts',
        ],
        limitations:
          'Tiada provider OTP sebenar dalam environment ini, jadi cabaran OTP diuji melalui jalur unavailable (OTP_PROVIDER_UNAVAILABLE) dan bukannya hantaran OTP sebenar. Isyarat risiko asal (device/velocity/age) datang daripada rekod yang disemai dalam ujian, bukan daripada pengesanan peranti sebenar. Bahagian hosted (tandatangan provider) kekal external gate.',
        parser: 'bun',
      },
      {
        key: 'kilo-dr-01',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/DR-01.json`,
        requirementId: 'DR-01',
        status: 'verified_local',
        testName:
          'RTO: sasaran tidak dipenuhi => not_met + RTO_TARGET_NOT_MET; anti-fake: masa sebenar, marker disahkan terhadap fail dipulihkan, integrity_check ok, hash bukan-null',
        testPath: 'tests/platform/backup-restore-rto.test.ts',
        testPaths: ['tests/platform/backup-restore-rto.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/backup-restore-rto.test.ts',
        ],
        artifactRefs: [
          'server/platform/recovery/drill.ts',
          'server/platform/recovery/service.ts',
          'shared/recovery-contracts.ts',
        ],
        limitations:
          'Latihan dijalankan pada store in-memory/disposable dan TIDAK menyentuh DB operasi. Sasaran RTO 30 minit tidak diukur dalam environment ini (harness diuji dengan targetMs=1 untuk mengesahkan laluan kegagalan). Pemotongan (cutover) kekal langkah operator luar talian dan tidak diotomatikkan.',
        parser: 'bun',
      },
      {
        key: 'kilo-cpk-02',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/CPK-02.json`,
        requirementId: 'CPK-02',
        status: 'verified_local',
        testName:
          'BL-15: X-Thread-Id pada respons chat, replay SSE dengan X-Last-Event-Id + X-Receipt-Count, ?after= hanya event selepas kursor, thread tenant lain => 403, hitl_prompt tanpa resit bukan state-changing',
        testPath: 'tests/platform/intelligence-agui-threads-mount.test.ts',
        testPaths: ['tests/platform/intelligence-agui-threads-mount.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/intelligence-agui-threads-mount.test.ts',
        ],
        artifactRefs: ['server/platform/aguiThreads.ts', 'server/platform/app.ts'],
        limitations:
          'Bukti ini meliputi thread store LOKAL yang di-mount pada laluan platform. Separuh hosted (AG-UI Streams: saved UI, resumable runs, realtime sync, cross-device) memerlukan akaun CopilotKit Intelligence dan kekal blocked_external. Sesi ini juga belum mengesahkan laluan produksi /api/copilotkit/agent/:id/run kerana VERCEL_TOKEN dalam environment ini tidak sah.',
        parser: 'bun',
      },
      {
        key: 'kilo-mod-01',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/MOD-01.json`,
        requirementId: 'MOD-01',
        status: 'verified_local',
        testName:
          'MOD-01: draf BELUM dihantar (tiada pesanan, tiada tempahan, integer sen), requiresReprice bila versi katalog bergerak, produk tidak diterbitkan => CART_DRAFT_UNKNOWN_PRODUCT',
        testPath: 'tests/copilot/mod-01-cart-draft.test.ts',
        testPaths: ['tests/copilot/mod-01-cart-draft.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/copilot/mod-01-cart-draft.test.ts',
        ],
        artifactRefs: ['server/platform/cartDraft.ts', 'server/platform/domainTools.ts', 'shared/mod-contracts.ts'],
        limitations:
          'Katalog yang digunakan dalam ujian ialah rekod yang disemai; katalog produksi masih 0 produk yang diterbitkan (data perniagaan belum diluluskan). Draf tidak pernah dihantar ke luar.',
        parser: 'bun',
      },
      {
        key: 'kilo-mod-08',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/MOD-08.json`,
        requirementId: 'MOD-08',
        status: 'verified_local',
        testName:
          'MOD-08: asas kos kanonikal daripada rekod sebenar (integer sen, margin basis points), 24.996% tidak dilaporkan sebagai 25%, tanpa store/tiada kos/tiada jualan/sumber berubah => unavailable dengan detail',
        testPath: 'tests/copilot/mod-08-cost-basis.test.ts',
        testPaths: ['tests/copilot/mod-08-cost-basis.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/copilot/mod-08-cost-basis.test.ts',
        ],
        artifactRefs: ['server/platform/costLedger.ts', 'server/platform/domainTools.ts', 'shared/mod-contracts.ts'],
        limitations:
          'COGS tidak direkod dalam domain, jadi ia sentiasa null + COGS_NOT_RECORDED (tidak pernah dianggak). Asas kos diuji dengan rekod yang disemai (payments/expenses/reconciliations), bukan lejar produksi. The KPI tool get_operational_kpi mengeksekusi bacaan yang sama.',
        parser: 'bun',
      },
      {
        key: 'kilo-mod-09',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/MOD-09.json`,
        requirementId: 'MOD-09',
        status: 'verified_local',
        testName:
          'MOD-09: setiap rekod search_records/build_context_bundle membawa sitiran; tiada luput direkod => null + EXPIRY_NOT_RECORDED; tiada versi => version null',
        testPath: 'tests/copilot/mod-09-citations.test.ts',
        testPaths: ['tests/copilot/mod-09-citations.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/copilot/mod-09-citations.test.ts',
        ],
        artifactRefs: ['server/agents/tools/capabilities/discovery.ts', 'shared/mod-contracts.ts'],
        limitations:
          'Sitiran dibina daripada rekod store sebenar yang disemai dalam ujian. Dua alat lain (search_sop, propose_task) berada dalam capabilities/governance.ts yang dimiliki lane lain dan belum dipanggil dalam ujian ini.',
        parser: 'bun',
      },
      {
        key: 'kilo-off-01',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/OFF-01.json`,
        requirementId: 'OFF-01',
        status: 'verified_local',
        testName:
          'OFF-01: rekod sepadan => tiada konflik; medan berubah => REVALIDATION_CONFLICT dengan conflicts[{field,expected,actual}]; revision lapuk => konflik juga',
        testPath: 'tests/platform/client-retry-revalidation.test.ts',
        testPaths: ['tests/platform/client-retry-revalidation.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/client-retry-revalidation.test.ts',
        ],
        artifactRefs: [
          'server/platform/reconnectRevalidation.ts',
          'server/platform/marketing.ts',
          'shared/off-contracts.ts',
        ],
        limitations:
          'Semakan semula disambungkan pada laluan kemas kini kempen (Marketing.save dengan peta `observed`). Jalur klien sebenar (src/features/platform/client.ts) belum menghantar peta `observed`, jadi gelung henti-sambung penuh di browser belum dibuktikan ujung-ke-hujung.',
        parser: 'bun',
      },
      {
        key: 'kilo-pay-01',
        resultFormat: 'bun',
        includeExpect: true,
        file: `${EVIDENCE_DIR}/PAY-01.json`,
        requirementId: 'PAY-01',
        status: 'blocked_external',
        testName:
          'PAY-01 (separuh tempatan): HMAC X-Signature sah => applied; replay eventId => PAYMENT_EVENT_ALREADY_APPLIED; eventId sama + body lain => PAYMENT_EVENT_ID_CONFLICT; order tiada => PAYMENT_EVENT_UNKNOWN; tandatangan salah => 401 + tiada state change',
        testPath: 'tests/platform/payment-callback-hmac.test.ts',
        testPaths: ['tests/platform/payment-callback-hmac.test.ts'],
        command: [
          'bun',
          'test',
          '--isolate',
          '--timeout',
          '15000',
          './tests/platform/payment-callback-hmac.test.ts',
        ],
        artifactRefs: [
          'server/platform/paymentCallbacks.ts',
          'server/platform/paymentCallbackRoutes.ts',
          'server/platform/paymentReconciliation.ts',
          'shared/payment-contracts.ts',
        ],
        limitations:
          'Hanya separuh TEMPATAN yang ditutup. Yang tinggal (external gate): kredensial merchant gateway (Billplz/FPX), adapter pembekal yang menandatangani dan menghantar callback sebenar, dan PLATFORM_PAYMENT_WEBHOOK_SECRET di environment deployment. Tanpa rahsia itu laluan menjawab 503 PAYMENT_SIGNATURE_SECRET_UNAVAILABLE. Tiada transaksi sebenar diluluskan.',
        parser: 'bun',
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Penulisan                                                                   */
/* -------------------------------------------------------------------------- */

export interface LedgerRow {
  id: string;
  status: string;
  gap: string;
  remainingRequirement: string;
  evidenceProves: string;
  evidenceRefs: string[];
  [key: string]: unknown;
}

export interface Ledger {
  generatedAt: string;
  sourceCommit: string;
  rows: LedgerRow[];
  [key: string]: unknown;
}

function writeFileAtomic(target: string, content: string): void {
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${target.split(/[\\/]/).pop()}.${process.pid}.${Date.now()}.tmp`);
  writeFileSync(tmp, content);
  renameSync(tmp, target);
}

function gitCommit(repoRoot: string): string {
  const res = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf-8' });
  const value = (res.stdout ?? '').trim();
  return res.status === 0 && value.length > 0 ? value : 'unknown';
}

export interface ReceiptContext {
  receipt: Receipt;
  measurement: Measurement;
  commit: string;
  worktree: string;
  timestamp: string;
}

/**
 * Status resit. Larian merah TIDAK boleh menulis status hijau — downgrade
 * berlaku DI DALAM fungsi ini supaya tiada laluan boleh memintasnya.
 */
export function receiptStatus(receipt: Receipt, measurement: Measurement): string | undefined {
  if (receipt.status === undefined) return undefined;
  return measurement.green ? receipt.status : 'implemented_unverified';
}

/** Membina objek resit dengan susunan medan yang sama seperti fail sedia ada. */
export function buildReceipt(ctx: ReceiptContext): Record<string, unknown> {
  const { receipt, measurement } = ctx;
  const status = receiptStatus(receipt, measurement);
  const unknownResult = `unknown — ${measurement.reason || 'tiada ringkasan larian'} (exit ${measurement.exitCode})`;
  const result =
    measurement.pass === null || measurement.fail === null
      ? unknownResult
      : receipt.resultFormat === 'pytest'
        ? `${measurement.pass} passed, ${measurement.fail} failed${measurement.warnings === null ? '' : `, ${measurement.warnings} warnings`}${measurement.durationSeconds === null ? '' : ` in ${measurement.durationSeconds}s`}`
        : `${measurement.pass} pass / ${measurement.fail} fail${receipt.includeExpect && measurement.expectCalls !== null ? ` / ${measurement.expectCalls} expect() calls` : ''}${receipt.resultSuffix ? ` ${receipt.resultSuffix}` : ''}`;

  const shared = {
    environment: 'local_test',
    timestamp: ctx.timestamp,
    sourceCommit: ctx.commit,
    worktree: ctx.worktree,
    command: receipt.command.join(' '),
    exitCode: measurement.exitCode,
    result,
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
  };

  if (receipt.keyOrder === 'cg') {
    return {
      ...shared,
      requirementId: receipt.requirementId,
      title: receipt.title,
      testName: receipt.testName,
      testPath: receipt.testPath,
      artifactRefs: receipt.artifactRefs,
      limitations: receipt.limitations,
    };
  }

  return {
    requirementId: receipt.requirementId,
    status,
    ...shared,
    testName: receipt.testName,
    testPath: receipt.testPath,
    artifactRefs: receipt.artifactRefs,
    limitations: receipt.limitations,
  };
}

/**
 * Menulis resit dengan MENYELAMGUN field lama yang tidak lagi ditulis skrip
 * ini (contoh `corrections`) — sejarah resit tidak boleh dipadam.
 */
export function writeReceipt(
  target: string,
  receipt: Record<string, unknown>,
): void {
  let existing: Record<string, unknown> = {};
  if (existsSync(target)) {
    try {
      existing = JSON.parse(readFileSync(target, 'utf-8')) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const managed = new Set(Object.keys(receipt));
  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existing)) {
    if (!managed.has(key)) preserved[key] = value;
  }
  writeFileAtomic(target, `${JSON.stringify({ ...receipt, ...preserved }, null, 2)}\n`);
}

export interface LaneResult {
  lane: Lane;
  measurements: Map<string, Measurement>;
  receipts: Array<{ receipt: Receipt; measurement: Measurement; file: string }>;
  green: boolean;
}

/** Mengukur satu lorong (setiap arahan unik dijalankan sekali sahaja). */
export function measureLane(lane: Lane, repoRoot: string): Map<string, Measurement> {
  const measurements = new Map<string, Measurement>();
  const done = new Set<string>();
  for (const receipt of lane.receipts) {
    const signature = receipt.command.join(' ');
    if (done.has(signature)) continue;
    done.add(signature);
    const measurement =
      receipt.parser === 'pytest'
        ? measurePytest(receipt.command[receipt.command.length - 1], repoRoot)
        : measureBunTest(receipt.testPaths, repoRoot);
    measurements.set(signature, measurement);
  }
  return measurements;
}

function measurementFor(receipt: Receipt, measurements: Map<string, Measurement>): Measurement {
  const found = measurements.get(receipt.command.join(' '));
  if (!found) throw new Error(`tiada pengukuran untuk ${receipt.key}`);
  return found;
}

/** Kiraan lulus terlingkup untuk resit (per-ID jika `countPrefix` diberi). */
export function scopedCount(receipt: Receipt, measurement: Measurement): number | null {
  if (receipt.countPrefix) {
    const perId = measurement.passByPrefix.get(receipt.countPrefix);
    if (perId !== undefined) return perId;
  }
  const primary = measurement.passByFile.get(receipt.testPath.replace(/\\/g, '/'));
  if (primary !== undefined) return primary;
  return measurement.pass;
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                         */
/* -------------------------------------------------------------------------- */

interface Options {
  outRoot: string;
  ledgerPath: string;
  only: Set<string> | null;
  selfTest: boolean;
  repoRoot: string;
}

function parseArgs(argv: string[]): Options {
  const repoRoot = process.cwd();
  const options: Options = {
    outRoot: repoRoot,
    ledgerPath: join(repoRoot, 'reports/implementation/acceptance-status.json'),
    only: null,
    selfTest: false,
    repoRoot,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out-root') options.outRoot = resolve(argv[++i]);
    else if (arg === '--ledger') options.ledgerPath = resolve(argv[++i]);
    else if (arg === '--only') {
      options.only = new Set(argv[++i].split(',').map((s) => s.trim()).filter(Boolean));
    } else if (arg === '--self-test') options.selfTest = true;
    else throw new Error(`argumen tidak diketahui: ${arg}`);
  }
  return options;
}

function applyLedgerPatch(
  ledger: Ledger,
  patch: LedgerPatch,
  receipt: Receipt,
  measurement: Measurement,
): void {
  const row = ledger.rows.find((candidate) => candidate.id === patch.rowId);
  if (!row) throw new Error(`baris ledger tidak dijumpai: ${patch.rowId}`);

  if (!measurement.green) {
    // Larian merah: baris TIDAK boleh kekal "hijau". Turun taraf dan tulis
    // punca sebenar, bukan naratif yang menjanjikan kejayaan.
    row.status = 'implemented_unverified';
    row.gap = `Larian uji yang dipetik TIDAK hijau: ${receipt.command.join(' ')} — ${measurement.reason}.`;
    return;
  }

  const ctx: TemplateContext = { count: scopedCount(receipt, measurement), measurement, receipt };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.gap !== undefined) row.gap = resolveTemplate(patch.gap, ctx);
  if (patch.remainingRequirement !== undefined) {
    row.remainingRequirement = resolveTemplate(patch.remainingRequirement, ctx);
  }
  if (patch.evidenceProves !== undefined) {
    row.evidenceProves = resolveTemplate(patch.evidenceProves, ctx);
  }
  if (patch.addEvidenceRef && !row.evidenceRefs.includes(patch.addEvidenceRef)) {
    row.evidenceRefs = [...row.evidenceRefs, patch.addEvidenceRef];
  }
}

/**
 * Menjalankan lorong yang dipilih: mengukur dahulu, kemudian menulis resit dan
 * menampal ledger.
 */
export function runLanes(options: Options): { results: LaneResult[]; green: boolean } {
  const commit = gitCommit(options.repoRoot);
  const worktree = options.repoRoot;
  const timestamp = new Date().toISOString();

  const ledgerRaw = readFileSync(options.ledgerPath, 'utf-8');
  const ledger = JSON.parse(ledgerRaw) as Ledger;

  const results: LaneResult[] = [];
  let green = true;

  for (const lane of LANES) {
    if (options.only && !options.only.has(lane.key)) continue;

    const measurements = measureLane(lane, options.repoRoot);
    const receipts: LaneResult['receipts'] = [];

    for (const receipt of lane.receipts) {
      const measurement = measurementFor(receipt, measurements);
      const target = join(options.outRoot, receipt.file);
      const status = measurement.green ? receipt.status : 'implemented_unverified';
      const payload = buildReceipt({ receipt, measurement, commit, worktree, timestamp });
      if (status !== undefined) payload.status = status;
      writeReceipt(target, payload);
      receipts.push({ receipt, measurement, file: receipt.file });
      console.log(
        `  ${lane.key}/${receipt.key}: exit=${measurement.exitCode} ${measurement.summary}` +
          (measurement.green ? '' : ` — TIDAK HIJAU: ${measurement.reason}`),
      );
    }

    for (const patch of lane.ledger ?? []) {
      const receipt = lane.receipts.find((candidate) => candidate.key === patch.gateKey);
      if (!receipt) throw new Error(`gateKey tidak wujud: ${patch.gateKey}`);
      applyLedgerPatch(ledger, patch, receipt, measurementFor(receipt, measurements));
    }

    // Resit yang merah mesti menurunkan baris ledger yang berkaitan walaupun
    // lorong itu tiada tampalan ledger sendiri — resit dan ledger mesti setuju.
    for (const entry of receipts) {
      if (entry.measurement.green) continue;
      const row = ledger.rows.find((candidate) => candidate.id === entry.receipt.requirementId);
      if (!row) continue;
      if (row.status !== 'implemented_unverified') {
        row.status = 'implemented_unverified';
        row.gap = `Larian uji yang dipetik TIDAK hijau: ${entry.receipt.command.join(' ')} — ${entry.measurement.reason}.`;
      }
    }

    const laneGreen = receipts.every((entry) => entry.measurement.green);
    if (!laneGreen) green = false;
    results.push({ lane, measurements, receipts, green: laneGreen });
  }

  const ledgerNext = `${JSON.stringify(ledger, null, 2)}\n`;
  if (ledgerNext !== ledgerRaw) {
    writeFileAtomic(options.ledgerPath, ledgerNext);
    console.log(`ledger ditulis: ${options.ledgerPath}`);
  } else {
    console.log('ledger tidak berubah — tiada apa untuk ditulis.');
  }

  return { results, green };
}

/* -------------------------------------------------------------------------- */
/* Ujian diri (kes negatif)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `--self-test` mengesahkan tingkah laku yang sukar difiolet: larian merah
 * mesti dilaporkan sebagai merah, "tiada kiraan" mesti jadi `unknown` (bukan
 * `0`), dan token naratif yang tidak dapat diselesaikan mesti menjadi ralat.
 */
export function runSelfTest(repoRoot: string): boolean {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  const scratch = join(tmpdir(), `kilo-evidence-selftest-${process.pid}-${Date.now()}`);
  mkdirSync(scratch, { recursive: true });

  // (1) kes negatif: ujian yang gagal mesti memberi exit != 0 dan fail >= 1.
  const failing = join(scratch, 'failing.test.ts');
  writeFileSync(
    failing,
    'import { expect, test } from "bun:test";\ntest("gagal", () => { expect(1).toBe(2); });\n',
  );
  const red = measureBunTest([failing], repoRoot);
  checks.push({
    name: 'larian merah dikesan sebagai merah',
    ok: red.exitCode !== 0 && red.fail === 1 && !red.green,
    detail: `exit=${red.exitCode} fail=${String(red.fail)} green=${String(red.green)}`,
  });

  // (2) "tiada kiraan" bukan sifar: fail yang tiada sepadan tidak boleh
  //     menjadi "0 pass / 0 fail".
  const missing = measureBunTest(['tests/platform/__tidak_wujud__.test.ts'], repoRoot);
  checks.push({
    name: 'fail tiada sepadan => unknown, bukan 0 pass',
    ok: missing.pass === null && missing.fail === null && !missing.green,
    detail: `pass=${String(missing.pass)} fail=${String(missing.fail)} reason=${missing.reason}`,
  });

  // (3) token naratif yang tidak diketahui mesti menjadi ralat, bukan "{token}".
  let tokenThrew = false;
  try {
    resolveTemplate('Bukti: ({count} ujian, {tidak_dikenal})', {
      count: 1,
      measurement: red,
      receipt: LANES[0].receipts[0],
    });
  } catch {
    tokenThrew = true;
  }
  checks.push({
    name: 'token naratif tidak diketahui => ralat',
    ok: tokenThrew,
    detail: tokenThrew ? 'ralat dinaikkan' : 'TIADA ralat — token tertinggal dalam ledger',
  });

  // (4) resit merah tidak boleh bertulis "verified_local".
  const receipt = LANES[0].receipts[0];
  const payload = buildReceipt({
    receipt,
    measurement: red,
    commit: 'selftest',
    worktree: repoRoot,
    timestamp: new Date().toISOString(),
  });
  checks.push({
    name: 'resit larian merah tidak boleh menulis "verified_local"',
    ok: payload.status !== 'verified_local' && payload.exitCode === red.exitCode,
    detail: `status=${String(payload.status)} exitCode=${String(payload.exitCode)}`,
  });

  rmSync(scratch, { recursive: true, force: true });

  let ok = true;
  for (const check of checks) {
    console.log(`  ${check.ok ? 'PASS' : 'FAIL'} — ${check.name} (${check.detail})`);
    if (!check.ok) ok = false;
  }
  console.log(ok ? 'self-test: SEMUA LULUS' : 'self-test: ADA KEGAGALAN');
  return ok;
}

/* -------------------------------------------------------------------------- */

if (import.meta.main) {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`argumen tidak sah: ${(error as Error).message}`);
    process.exit(2);
  }

  if (options.selfTest) {
    process.exit(runSelfTest(options.repoRoot) ? 0 : 1);
  }

  console.log(`out-root : ${options.outRoot}`);
  console.log(`ledger   : ${options.ledgerPath}`);
  const { results, green } = runLanes(options);
  console.log(
    `\nlorong: ${results.length}, hijau: ${results.filter((r) => r.green).length}, merah: ${results.filter((r) => !r.green).length}`,
  );
  for (const result of results) {
    if (result.green) continue;
    for (const entry of result.receipts) {
      if (entry.measurement.green) continue;
      console.log(`  TIDAK HIJAU ${result.lane.key}/${entry.receipt.key}: ${entry.measurement.reason}`);
    }
  }
  if (!green) {
    console.error('\nGAGAL: ada lorong yang tidak hijau — resit tidak boleh mengklaim hijau.');
    process.exit(1);
  }
}
