import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * CI GUARD — Provenance Truthfulness
 *
 * Ujian statik (bukan probe runtime) ke atas sumber kod yang surfaced
 * sebagai "canonical provenance". Ujian ini GAGAL jika mana-mana satu
 *_surface_ copilot=
 *
 *  1. Memperkenalkan semula pemalar kewangan yang dipaparkan sebagai hasil
 *     yang dikira (contribution, total, margin, ledger, dll.).
 *  2. Menuntut `provenance.source: 'canonical_evaluator'` tanpa memanggil
 *     penilai margin kanonikal sebenar.
 *  3. Menuntut `provenance.source: 'database'` tanpa bacaan store sebenar.
 *  4. Men.assert status/flag yang biasanya "diasyikan" (PASSED,
 *     VERIFIED_CLEAN, contraLedgerBalanced: true) sebagai literal.
 *
 * Skop sengaja KETAT terhadap nilai yang dipaparkan sebagai hasil kiraan.
 * Jadual polisi yang sah (ambang, senarai peranan, label, templat semak QC)
 * TIDAK tersasuh.
 */

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const SCANNED_FILES = [
  'server/platform/adkAgent.ts',
  'server/platform/domainTools.ts',
  'server/platform/mcp/operationsBrief.ts',
  'server/agents/copilot/runtime.ts',
] as const;

const readSource = (relativePath: string): string =>
  readFileSync(`${REPO_ROOT}${relativePath.replace(/\//g, '\\')}`, 'utf8');

/**
 * Buang komen (baris dan blok) supaya pemeriksaan struktur hanya melihat kod
 * yang benar-benar dipaparkan sebagai payload — bukan prosa dokumentasi.
 */
function stripComments(source: string): string {
  let output = '';
  let index = 0;
  let quote: "'" | '"' | '`' | null = null;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (quote) {
      output += char;
      if (char === '\\') {
        output += next ?? '';
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }
    output += char;
    index += 1;
  }
  return output;
}

const sources = new Map<string, string>(
  SCANNED_FILES.map((file) => [file, readSource(file)] as [string, string])
);
const code = new Map<string, string>(
  SCANNED_FILES.map((file) => [file, stripComments(sources.get(file)!)] as [string, string])
);

/**
 * Nilai rekaan yang pernah dipaparkan sebagai hasil sebenar. Setiap satu
 * dicedar/diimbas daripada satu pepijat yang pernah direka.
 */
const BANNED_FABRICATED_VALUES = [
  { value: '28.5', reason: 'nisbah margin hardcode 28.5%' },
  { value: '1425000', reason: 'jumlah kas lejar hardcode' },
  { value: '1390000', reason: 'jumlah cleared lejar hardcode' },
  { value: '35000', reason: 'baki belum selesai lejar hardcode' },
  { value: '18500', reason: 'komisen ejen hardcode' },
  { value: '94500', reason: 'jualan harian hardcode' },
  { value: '3375', reason: 'purata bakul harian hardcode' },
  { value: '1250', reason: 'bilangan hantaran hardcode' },
  { value: '78.4', reason: 'kadar bacaan hardcode' },
  { value: '14.2', reason: 'masa penghantaran hardcode' },
  { value: '31.8', reason: 'kadar pulangan hardcode' },
  { value: '3100', reason: 'jumlah peruntukan gudang hardcode' },
  { value: 'hash_redacted_9f82ab7e', reason: 'hash jejakANrekaan' },
  { value: 'ord-2026-1019-01', reason: 'ID pesanan rekaan' },
  { value: 'ORD-9988', reason: 'ID pesanan fikasi dalam highlight HITL' },
  { value: 'Pesanan Menuuuu', reason: 'label metrik rekaan' },
];

/**
 * Kunci yang nilainya dipaparkan sebagai HASIL KIRAAN. Literal nombor pada
 * kunci ini bermaksud nilai dipaparkan sebagai "dihasilkan" tanpa pengiraan.
 */
const COMPUTED_RESULT_KEYS = [
  'contributionSen',
  'contributionMarginPct',
  'totalSen',
  'grossSalesSen',
  'collectedSen',
  'settledSen',
  'pendingSen',
  'confirmedSen',
  'refundedSen',
  'outstandingSen',
  'totalCommissionSen',
  'contraReversalSen',
  'netPayableSen',
  'pointsBalance',
  'redemptionValueSen',
  'sentCount',
  'readRatePercent',
  'conversionOrders',
  'activeOrdersCount',
  'pendingDispatchCount',
  'allocatedUnits',
  'availableUnits',
  'parcelsCount',
  'pendingHitlApprovals',
  'totalOrdersToday',
  'activeShipmentsInTransit',
  'lowStockSkus',
  'todayOrdersCount',
  'todayGrossSen',
  'averageBasketSen',
  'avgDeliveryHours',
  'returnRatePercent',
  'netOperatingMarginPercent',
  'expiryDaysRemaining',
  'estimatedImpactSen',
  'valueSen',
  'conflictsCount',
  'recordsChecked',
] as const;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('CI GUARD: Provenance truthfulness of the copilot surface', () => {
  test('no fabricated financial constant survives in the copilot surface', () => {
    const offenders: string[] = [];
    for (const [file, source] of sources) {
      for (const { value, reason } of BANNED_FABRICATED_VALUES) {
        const pattern = new RegExp(`(?<![A-Za-z0-9_.])${escapeRegExp(value)}(?![A-Za-z0-9_.])`, 'g');
        if (pattern.test(source)) {
          offenders.push(`${file}: ${reason} (${value})`);
        }
        pattern.lastIndex = 0;
      }
    }
    expect(offenders).toEqual([]);
  });

  test('no computed result is presented as a literal number', () => {
    const offenders: string[] = [];
    const keyPattern = new RegExp(`(?<![A-Za-z0-9_])(${COMPUTED_RESULT_KEYS.join('|')})\\s*:\\s*(-?\\d+(?:\\.\\d+)?)(?![A-Za-z0-9_.])`, 'g');
    for (const [file, source] of code) {
      for (const match of source.matchAll(keyPattern)) {
        offenders.push(`${file}: ${match[1]}: ${match[2]} (nilai harfiah, bukan hasil kiraan)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("provenance.source 'canonical_evaluator' is only used when the canonical evaluator really runs", () => {
    const offenders: string[] = [];
    for (const [file, source] of code) {
      if (!/source\s*:\s*'canonical_evaluator'/.test(source)) continue;
      if (!/evaluateMarginContribution\s*\(/.test(source)) {
        offenders.push(`${file}: provenance.source 'canonical_evaluator' tanpa panggilan evaluateMarginContribution()`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("provenance.source 'database' is only used when a real store read exists", () => {
    const offenders: string[] = [];
    const storeRead = /store\.(all|get|require)\s*(<[^>]*>)?\s*\(|\.catalogue\s*\(/;
    for (const [file, source] of code) {
      if (!/source\s*:\s*'database'/.test(source)) continue;
      if (!storeRead.test(source)) {
        offenders.push(`${file}: provenance.source 'database' tanpa bacaan store sebenar`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('asserted-outcome flags are computed, never hardcoded', () => {
    const offenders: string[] = [];
    const assertedLiterals: Array<{ pattern: RegExp; reason: string }> = [
      { pattern: /(?<![A-Za-z0-9_])status\s*:\s*'PASSED'\s*[,}]/, reason: "status 'PASSED' sebagai hardcode" },
      { pattern: /(?<![A-Za-z0-9_])casStatus\s*:\s*'VERIFIED_CLEAN'\s*[,}]/, reason: "casStatus 'VERIFIED_CLEAN' hardcode" },
      { pattern: /(?<![A-Za-z0-9_])contraLedgerBalanced\s*:\s*true\s*[,}]/, reason: 'contraLedgerBalanced: true hardcode' },
      { pattern: /(?<![A-Za-z0-9_])marginGuardianPassed\s*:\s*true\s*[,}]/, reason: 'marginGuardianPassed: true hardcode' },
    ];
    for (const [file, source] of sources) {
      for (const { pattern, reason } of assertedLiterals) {
        if (pattern.test(source)) offenders.push(`${file}: ${reason}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the guard scans the real source files (guard is not silently reading nothing)', () => {
    for (const file of SCANNED_FILES) {
      const source = sources.get(file)!;
      expect(source.length).toBeGreaterThan(500);
      expect(source.length).toBe(sources.get(file)!.length);
    }
    // Setiap permukaan copilot yang dipantau mesti mempunyai sekurang-kurangnya
    // satu penanda provenance ATAU atribut-atribusi runtime yang jujur.
    expect(sources.get('server/platform/adkAgent.ts')!).toContain('provenance');
    expect(sources.get('server/platform/domainTools.ts')!).toContain('provenance');
    expect(sources.get('server/platform/mcp/operationsBrief.ts')!).toContain('provenance');
    expect(sources.get('server/agents/copilot/runtime.ts')!).toContain('local_rules');
  });
});
