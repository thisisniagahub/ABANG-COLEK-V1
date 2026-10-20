/**
 * Ujian semantik JEV untuk `AbangColekDiscoveryView`.
 *
 * View ini dahulu menduplikasi semantik JEV dengan kosakata sendiri dan
 * TIDAK ciclismo nilai `null` / `NaN` / di luar julat — ia boleh mencetak
 * "NaN%" atau "120%", dan `isAffirmative: null` boleh dipaparkan sebagai
 * "Tidak" (tuduhan palsu).
 *
 * Ujian ini mengikat view kepada modul kanonik
 * `src/features/copilot/cards/jevValueSemantics.ts` dan membuktikan
 *KESEMUA Tiny:
 *
 *   1. nilai `null` / `NaN` / di luar 0..1 tidak pernah menjadi 0%, 0,
 *      "Ya"/"Tidak" rekaan, atau peratus rekaan;
 *   2. `isAffirmative: null` ialah keadaan "tidak diketahui" yang jelas —
 *      bukan "Tidak".
 *
 * NOTE: salinan ujian ini perlu diletakkan di `tests/frontend/` oleh lane
 * ujian supaya ia dijalankan dalam CI (`bun run test:platform`).
 */

import { describe, expect, test } from 'bun:test';
import { jevConfidenceLabel, jevNoulLabel } from '../../src/components/AbangColekDiscoveryView';

describe('AbangColekDiscoveryView — semantik keyakinan JEV', () => {
  test('keyakinan yang dikira dipaparkan sebagai peratus sebenar', () => {
    expect(jevConfidenceLabel(0.72)).toBe('72% Keyakinan');
    expect(jevConfidenceLabel(0)).toBe('0% Keyakinan');
    expect(jevConfidenceLabel(1)).toBe('100% Keyakinan');
  });

  test('keyakinan null / NaN / di luar julat tidak pernah menjadi 0% atau peratus rekaan', () => {
    for (const bad of [null, undefined, Number.NaN, 1.2, -0.1, Number.POSITIVE_INFINITY]) {
      const label = jevConfidenceLabel(bad as number | null | undefined);
      expect(label).toBe('Tiada keyakinan berkalibrasi');
      expect(label).not.toContain('NaN');
      expect(label).not.toContain('%');
      expect(label).not.toContain('0%');
      expect(label).not.toContain('120%');
    }
  });
});

describe('AbangColekDiscoveryView — semantik noul JEV', () => {
  test('noul yang dikira dipaparkan dengan label aplikasi dan peratus sebenar', () => {
    expect(jevNoulLabel(true, 0.8, 'YA', 'TIDAK')).toBe('YA (80%)');
    expect(jevNoulLabel(false, 0.2, 'YA', 'TIDAK')).toBe('TIDAK (20%)');
    expect(jevNoulLabel(true, 0.5, 'LAYAK', 'TIDAK')).toBe('LAYAK (50%)');
    expect(jevNoulLabel(false, 0.5, 'POTENSI TINGGI', 'STANDARD')).toBe('STANDARD (50%)');
  });

  test('isAffirmative null ialah keadaan "tidak diketahui" — bukan "Tidak"', () => {
    for (const negative of ['TIDAK', 'STANDARD']) {
      const label = jevNoulLabel(null, null, 'YA', negative);
      expect(label).toContain('tidak diketahui');
      expect(label).not.toContain(negative);
      expect(label).not.toContain('%');
      expect(label).not.toContain('NaN');
    }
  });

  test('kebarangkalian null / NaN / di luar julat tidak pernah menjadi 0% atau peratus rekaan', () => {
    for (const bad of [null, undefined, Number.NaN, 1.4, -0.2]) {
      const label = jevNoulLabel(true, bad as number | null | undefined, 'YA', 'TIDAK');
      expect(label).toBe('YA (kebarangkalian tidak dikira)');
      expect(label).not.toContain('0%');
      expect(label).not.toContain('NaN');
      expect(label).not.toContain('140%');
    }
  });

  test('noul negatif yang benar-benar dinyatakan oleh pelayan kekal "Tidak"', () => {
    const label = jevNoulLabel(false, 0.05, 'YA', 'TIDAK');
    expect(label).toBe('TIDAK (5%)');
  });
});
