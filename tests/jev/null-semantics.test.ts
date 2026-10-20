/**
 * BL-25 (2) — Semantik `null` dalam sejarah JEV yang disimpan di peranti.
 *
 * Kontrak yang diuji:
 *   1. Rekod yang menyimpan `confidence: null` / `probabilities: null` (iaitu
 *      "tiada apa-apa dikira") BOLEH dihydrate semula, dan keadaan `null` itu
 *      kekal `null` selepas round-trip — ia tidak dipaksa kepada `0`, `false`
 *      atau `{}`.
 *   2. Rekod yang menyimpan nilai dimensi DI LUAR taksonomi TIDAK boleh
 *      dihydrate: rekod ditolak sepenuhnya (fail closed), bukan "dipercayai
 *      sebahagiannya".
 *   3. Rekod separuh null (satu medan `null`, satu lagi berisi nilai) juga
 *      ditolak — keadaan "tiada dikira" mesti konsisten pada kedua-dua medan.
 *
 * ujian ini tidak bergantung pada model awam: enjin JEV tempatan sahaja.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  evaluateWithJev,
  getJevHistoryStatus,
  getSavedJevEvaluations,
  setJevHistoryScope,
} from '../../src/services/jevEngine';

class TestStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const ACTOR = 'actor';
const WORKSPACE = 'workspace';
const STORAGE_KEY = `abangcolek_jev_v2:${WORKSPACE}:${ACTOR}`;

describe('JEV — sejarah peranti dengan semantik null', () => {
  let storage: TestStorage;
  let previousStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    storage = new TestStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    setJevHistoryScope(null);
    setJevHistoryScope(ACTOR, WORKSPACE, true);
  });

  afterEach(() => {
    setJevHistoryScope(null);
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  test('rekod dengan confidence/probabilities null dihydrate semula dan null kekal null', async () => {
    const evaluation = await evaluateWithJev('Botol bocor');
    expect(getJevHistoryStatus().stored).toBe(true);

    // Muat semula dari simpanan peranti (identiti sama, cache di-clear).
    setJevHistoryScope(null);
    setJevHistoryScope(ACTOR, WORKSPACE, true);

    const rehydrated = getSavedJevEvaluations();
    expect(rehydrated).toHaveLength(1);
    expect(rehydrated[0].id).toBe(evaluation.id);

    // Keadaan "tiada dikira" mesti kekal `null` selepas round-trip.
    expect(rehydrated[0].dimensions.issueClass.confidence).toBeNull();
    expect(rehydrated[0].dimensions.issueClass.probabilities).toBeNull();
    expect(rehydrated[0].dimensions.customerIntent.confidence).toBeNull();
    expect(rehydrated[0].dimensions.customerIntent.probabilities).toBeNull();
    expect(rehydrated[0].primitives.urgencyScore.score).toBeNull();
    expect(rehydrated[0].primitives.customerSatisfactionScore.confidence).toBeNull();
    expect(rehydrated[0].primitives.isRefundEligible.probability).toBeNull();
    expect(rehydrated[0].primitives.isRefundEligible.isAffirmative).toBeNull();

    // Dan TIDAK sekali-kali dipaksa kepada bentuk lama (0 / false / {}).
    expect(rehydrated[0].dimensions.issueClass.confidence).not.toBe(0);
    expect(rehydrated[0].dimensions.issueClass.probabilities).not.toEqual({});
    expect(rehydrated[0].primitives.urgencyScore.score).not.toBe(0);
    expect(rehydrated[0].primitives.isRefundEligible.probability).not.toBe(0);
    expect(rehydrated[0].primitives.isRefundEligible.isAffirmative).not.toBe(false);
  });

  test('nilai dimensi di luar taksonomi TIDAK dihydrate — rekod ditolak sepenuhnya', async () => {
    const evaluation = await evaluateWithJev('Botol bocor');
    const tampered = {
      ...evaluation,
      dimensions: {
        ...evaluation.dimensions,
        issueClass: { ...evaluation.dimensions.issueClass, value: 'MADE_UP_CLASS' },
      },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify([tampered]));

    setJevHistoryScope(null);
    setJevHistoryScope(ACTOR, WORKSPACE, true);

    // Tiada rekod separaPercaya: senarai kosong, dan ralat dilaporkan.
    expect(getSavedJevEvaluations()).toEqual([]);
    expect(getJevHistoryStatus().stored).toBe(false);
    expect(getJevHistoryStatus().error).not.toBeNull();
  });

  test('rekod separuh null (confidence null tetapi probabilities diisi) ditolak', async () => {
    const evaluation = await evaluateWithJev('Botol bocor');
    const halfComputed = {
      ...evaluation,
      dimensions: {
        ...evaluation.dimensions,
        issueClass: { ...evaluation.dimensions.issueClass, probabilities: { LEAKAGE: 1 } },
      },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify([halfComputed]));

    setJevHistoryScope(null);
    setJevHistoryScope(ACTOR, WORKSPACE, true);

    expect(getSavedJevEvaluations()).toEqual([]);
    expect(getJevHistoryStatus().error).not.toBeNull();
  });
});
