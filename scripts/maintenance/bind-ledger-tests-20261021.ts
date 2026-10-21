/**
 * Skrip sekali guna: tambah `testFile` + `testName` pada baris ledger yang
 * dinaik taraf kepada `verified_local`, supaya register boleh memetakan baris
 * itu kepada suite verifikasi sebenar.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const lines = readFileSync(LEDGER, 'utf8').split('\n');

/** id → { testFile, testName } */
const MAP: Record<string, { testFile: string; testName: string }> = {
  'REF-01': {
    testFile: 'tests/platform/loyalty-redemption-risk.test.ts',
    testName:
      'Isyarat peranti yang hilang => unknown + reason code, tiada value 0/false; Tiada provider OTP => unavailable + OTP_PROVIDER_UNAVAILABLE + tiada cabaran disimpan; Submit => submitted + event pertama, transitions disahkan, transition haram => 409 (tests/platform/loyalty-redemption-risk.test.ts, 7 ujian)',
  },
  'DR-01': {
    testFile: 'tests/platform/backup-restore-rto.test.ts',
    testName:
      'RTO: sasaran tidak dipenuhi => not_met + RTO_TARGET_NOT_MET; anti-fake: masa sebenar, marker disahkan terhadap fail dipulihkan, integrity_check ok, hash bukan-null (tests/platform/backup-restore-rto.test.ts, 3 ujian)',
  },
  'CPK-02': {
    testFile: 'tests/platform/intelligence-agui-threads-mount.test.ts',
    testName:
      'BL-15: X-Thread-Id pada respons chat, replay SSE dengan X-Last-Event-Id + X-Receipt-Count, ?after= hanya event selepas kursor, thread tenant lain => 403, hitl_prompt tanpa resit bukan state-changing (tests/platform/intelligence-agui-threads-mount.test.ts, 6 ujian)',
  },
  'MOD-01': {
    testFile: 'tests/copilot/mod-01-cart-draft.test.ts',
    testName:
      'MOD-01: draf BELUM dihantar (tiada pesanan, tiada tempahan, integer sen), requiresReprice bila versi katalog bergerak, produk tidak diterbitkan => CART_DRAFT_UNKNOWN_PRODUCT (tests/copilot/mod-01-cart-draft.test.ts)',
  },
  'MOD-08': {
    testFile: 'tests/copilot/mod-08-cost-basis.test.ts',
    testName:
      'MOD-08: asas kos kanonikal daripada rekod sebenar (integer sen, margin basis points), 24.996% tidak dilaporkan sebagai 25%, tanpa store/tiada kos/tiada jualan/sumber berubah => unavailable dengan detail (tests/copilot/mod-08-cost-basis.test.ts, 6 ujian)',
  },
  'MOD-09': {
    testFile: 'tests/copilot/mod-09-citations.test.ts',
    testName:
      'MOD-09: setiap rekod search_records/build_context_bundle membawa sitiran; tiada luput direkod => null + EXPIRY_NOT_RECORDED; tiada versi => version null (tests/copilot/mod-09-citations.test.ts, 6 ujian)',
  },
  'OFF-01': {
    testFile: 'tests/platform/client-retry-revalidation.test.ts',
    testName:
      'OFF-01: rekod sepadan => tiada konflik; medan berubah => REVALIDATION_CONFLICT dengan conflicts[{field,expected,actual}]; revision lapuk => konflik juga (tests/platform/client-retry-revalidation.test.ts)',
  },
};

function setField(id: string, field: string, value: string): void {
  const start = lines.findIndex((line) => line.includes(`"id": "${id}"`));
  if (start < 0) throw new Error(`row not found: ${id}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\},?\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  const fieldIndex = lines.findIndex(
    (line, index) => index > start && index < end && line.includes(`"${field}":`),
  );
  if (fieldIndex < 0) throw new Error(`field ${field} not found in ${id}`);
  const indent = lines[fieldIndex].match(/^\s*/)?.[0] ?? '      ';
  lines[fieldIndex] = `${indent}"${field}": ${JSON.stringify(value)},`;
}

for (const [id, entry] of Object.entries(MAP)) {
  setField(id, 'testFile', entry.testFile);
  setField(id, 'testName', entry.testName);
}

writeFileSync(LEDGER, lines.join('\n'));
console.log(`bound ${Object.keys(MAP).length} rows to real test files`);
