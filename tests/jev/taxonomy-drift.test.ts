/**
 * BL-25 (3) — Laluan drift taksonomi JEV.
 *
 *injekat satu nilai di luar taksonomi dimensi `support` dan buktikan:
 *   1. nilai itu TIDAK pernah diproyek sebagai nilai dimensi — dimensi menjadi
 *      `UNKNOWN` (bukan nilai rekaan, bukan `0`);
 *   2. `taxonomyDrift` menyenaraikan dimensi yang menyimpang, supaya drift
 *      tidak hilang senyap;
 *   3. (kawalan) nilai dalam taksonomi kekal sebagai nilai sebenar dan TIDAK
 *      menghasilkan drift — tanpa kawalan ini, ujian di atas akan lulus
 *      walaupun enjin tidak pernah membaca mock langsung.
 *
 * `APPLICATION` ialah nilai kanonikal pack `dealer` dan `CONTAMINATION` nilai
 * kanonikal pack `qc` — kedua-duanya SAH sebagai nilai JEV, tetapi DI LUAR
 * taksonomi dimensi `support`. Itulah punca drift yang sebenar.
 *
 * Mock-module menggunakan LALUAN ABSOLUT: `mock.module` mencantumkan modul
 * mengikut laluan yang dinormalkan, jadi specifier relatif yang digunakan
 * `src/services/jevEngine.ts` akan memuat versi yang dimock.
 */

import { afterAll, describe, expect, mock, test } from 'bun:test';
import * as path from 'node:path';
import type { JevAssessment, JevRuleAnswer } from '../../shared/jev-contracts';

const ASSESSMENT_MODULE = path
  .resolve(import.meta.dir, '../../server/platform/jev/assessment.ts')
  .replace(/\\/g, '/');

/** Jawapan yang disuntik — boleh ditukar antara kes ujian. */
let injectedIntent = 'APPLICATION';
let injectedIssue = 'CONTAMINATION';

const realAssessment = await import(ASSESSMENT_MODULE);
// Snapshot SEBELUM `mock.module`: mock boleh memutasi objek eksport modul
// sebenar di tempat, jadi snapshot selepas mock akan menyimpan mock itu juga.
const realExports = { ...realAssessment };

function ruleAnswer(type: JevRuleAnswer['type'], value: JevRuleAnswer['value']): JevRuleAnswer {
  return { type, value, confidence: null, probabilities: null, reason: 'suntikan ujian' };
}

mock.module(ASSESSMENT_MODULE, () => ({
  ...realAssessment,
  assessState: (packId: string, state: { text: string }): JevAssessment => ({
    id: 'jev-drift-001',
    packId: packId as JevAssessment['packId'],
    questionSetVersion: '1.0',
    providerMode: 'LOCAL_RULES',
    status: 'RULE_HINT',
    answers: {
      intent: ruleAnswer('choice', injectedIntent),
      issue: ruleAnswer('choice', injectedIssue),
    },
    policy: {
      outcome: 'REVIEW_REQUIRED',
      version: '1.0',
      reasonCodes: ['LOCAL_RULES_UNCALIBRATED', 'AUTHORITATIVE_POLICY_AND_APPROVAL_REQUIRED'],
    },
    evidence: [],
    createdAt: '2026-10-21T00:00:00.000Z',
    latencyMs: 1,
  }),
}));

const { evaluateWithJev, setJevHistoryScope } = await import('../../src/services/jevEngine');

/**
 * Pemulihan mock modul — workaround tanpa API rasmi.
 *
 * Fakta yang disahkan (dokumentasi Bun + pemereriksaan empirik):
 *  - `mock.module` adalah GLOBAL untuk satu proses: semua fail ujian yang
 *    dimuat dalam proses yang sama menerima mock ini, bukan modul sebenar.
 *  - `mock.restore()` TIDAK menetapkan semula override modul.
 *  - Tiada API "unmock" yang didokumentasikan.
 *
 * Maka `afterAll` di bawah ialah workaround yang tidak didokumentasikan tetapi
 * telah disahkan empirik: ia memasang semula SEMUA eksport asal yang diambil
 * SEBELUM `mock.module` (lihat `realExports`). Ia adalah defence-in-depth —
 * bukan jaminan.
 *
 * Fix utama yang DIDOKUMENTASIKAN ialah `--isolate`: skrip `bun test` kini
 * menghantar `--isolate`, jadi setiap fail ujian mendapat global baharu dan
 * mock ini tidak boleh bocor ke fail lain. Workaround `afterAll` kekal sebagai
 * lapisan kedua untuk larian yang tidak menggunakan `--isolate`.
 *
 * NOTE: urutan snapshot-SEBELUM-mock mesti dikekalkan. `mock.module` boleh
 * memutasi objek eksport modul sebenar di tempat, jadi snapshot yang diambil
 * SELEPAS mock akan menyimpan mock itu juga dan pemulihan tidak akan
 * memulihkan apa-apa.
 */
afterAll(() => {
  mock.module(ASSESSMENT_MODULE, () => realExports);
});

describe('JEV — drift taksonomi (nilai luar taksonomi tidak pernah diproyek)', () => {
  test('nilai di luar taksonomi menjadi UNKNOWN dan direkodkan sebagai taxonomyDrift', async () => {
    setJevHistoryScope(null);
    injectedIntent = 'APPLICATION';
    injectedIssue = 'CONTAMINATION';

    const result = await evaluateWithJev('Permohonan ejen dan masalah pencemaran batch');

    // Nilai luar taksonomi TIDAK boleh menjadi nilai dimensi.
    expect(result.dimensions.customerIntent.value).toBe('UNKNOWN');
    expect(result.dimensions.issueClass.value).toBe('UNKNOWN');
    // Dan ia tidak boleh menyamar sebagai nilai kanonikal yang lain.
    expect(result.dimensions.customerIntent.value).not.toBe('APPLICATION');
    expect(result.dimensions.issueClass.value).not.toBe('CONTAMINATION');

    // Drift mesti direkodkan, bukan hilang senyap.
    expect(result.taxonomyDrift).toBeDefined();
    expect(result.taxonomyDrift).toContain('customerIntent');
    expect(result.taxonomyDrift).toContain('issueClass');

    // Dimensi yang tidak menyimpang tidak boleh dil kenyarkan drift.
    expect(result.taxonomyDrift).not.toContain('brand');
    expect(result.taxonomyDrift).not.toContain('processStage');

    // Nilai yang tidak dikira kekal `null` — drift tidak mengubahnya kepada 0.
    expect(result.dimensions.customerIntent.confidence).toBeNull();
    expect(result.dimensions.customerIntent.probabilities).toBeNull();
  });

  test('kawalan: nilai dalam taksonomi kekal sebagai nilai sebenar dan tiada drift', async () => {
    setJevHistoryScope(null);
    injectedIntent = 'REFUND';
    injectedIssue = 'LEAKAGE';

    const result = await evaluateWithJev('Pelanggan minta refund kerana botol bocor');

    // Kawalan ini membuktikan mock benar-benar memandu enjin: jika enjin
    // sentiasa mengembalikan UNKNOWN, ujian drift di atas tidak bermakna.
    expect(result.dimensions.customerIntent.value).toBe('REFUND');
    expect(result.dimensions.issueClass.value).toBe('LEAKAGE');
    expect(result.taxonomyDrift).toBeUndefined();
  });
});
