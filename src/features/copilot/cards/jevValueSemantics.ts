/**
 * Semantik "tidak dikira" untuk unjuran JEV.
 *
 * Kontrak wayar JEV membenarkan `null` pada setiap medan yang belum
 * dikira:
 *
 *   JevDimensionResult.confidence   : number | null
 *   JevDimensionResult.probabilities: Record<string, number> | null
 *   JevScoreResult.score            : number | null
 *   JevScoreResult.confidence       : number | null
 *   JevNoulResult.probability       : number | null
 *   JevNoulResult.isAffirmative     : boolean | null
 *
 * `null` bermaksud "tidak dikira" — ia TIDAK bermaksud 0, 0%, `false`,
 * bar kosong, atau keyakinan sifar. Modul ini menukar setiap bentuk
 * tersebut kepada keadaan yang jujur supaya kad tidak pernah memalsukan
 * angka atau menUDAGKAN "tidak" daripada data yang tidak wujud.
 */

/** Teks yang digunakan apabila nilai tidak dikira (`null`). */
export const JEV_NOT_COMPUTED_TEXT = 'Tidak dikira';
/** Teks yang digunakan apabila jawapan tidak diketahui (`null` / tiada nilai). */
export const JEV_UNKNOWN_TEXT = 'Tidak diketahui';

export type JevComputedState = 'computed' | 'not-computed';

export interface JevNumberProjection {
  state: JevComputedState;
  /** Nilai sebenar, atau `null` apabila tidak dikira. */
  value: number | null;
  /** Teks untuk dipaparkan; tidak pernah `0%` untuk keadaan `not-computed`. */
  text: string;
}

export type JevNoulState = 'affirmative' | 'negative' | 'unknown';

export interface JevNoulProjection {
  state: JevNoulState;
  /** `true` / `false` hanya apabila pelayan menyatakannya; selain itu `null`. */
  isAffirmative: boolean | null;
  /** Teks: "Ya", "Tidak", atau "Tidak diketahui" (bukan "Tidak"!). */
  text: string;
  probability: JevNumberProjection;
}

export interface JevProbabilityEntry {
  label: string;
  value: number;
  text: string;
}

export interface JevProbabilitiesProjection {
  state: JevComputedState;
  entries: JevProbabilityEntry[];
  text: string;
}

export type JevAnswerKind = 'choice' | 'score' | 'noul';

export interface JevAnswerProjection {
  state: 'value' | 'unknown';
  text: string;
}

export interface JevDimensionProjection {
  value: string;
  confidence: number | null;
  probabilities: Record<string, number> | null;
}

export interface JevScoreProjection {
  score: number | null;
  confidence: number | null;
  label?: string;
}

export interface JevPrimitiveProjections {
  dimensions: Record<string, JevDimensionProjection>;
  scores: Record<string, JevScoreProjection>;
  nouls: Record<string, JevNoulProjection>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function percentText(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function notComputed(): JevNumberProjection {
  return { state: 'not-computed', value: null, text: JEV_NOT_COMPUTED_TEXT };
}

/**
 * Keyakinan berkalibrasi. `null` bermaksud tiada model berkalibrasi — ia
 * tidak pernah dipaparkan sebagai `0%`.
 */
export function projectJevConfidence(value: unknown): JevNumberProjection {
  if (!isUnitInterval(value)) return notComputed();
  return { state: 'computed', value, text: percentText(value) };
}

/** Kebarangkalian. `null` bermaksud tiada kebarangkalian dikira. */
export function projectJevProbability(value: unknown): JevNumberProjection {
  if (!isUnitInterval(value)) return notComputed();
  return { state: 'computed', value, text: percentText(value) };
}

/**
 * Skor JEV. `null` bermaksud skor tidak dikira — ia tidak pernah
 * dipaparkan sebagai `0`.
 */
export function projectJevScore(value: unknown): JevNumberProjection {
  if (typeof value !== 'number' || !Number.isFinite(value)) return notComputed();
  return { state: 'computed', value, text: String(value) };
}

/**
 * Noul (ya/tidak). `isAffirmative: null` bermaksud jawapan tidak diketahui:
 * ia TIDAK boleh dipaparkan sebagai "Tidak" — itu tuduhan palsu.
 */
export function projectJevNoul(
  isAffirmative: unknown,
  probability: unknown,
): JevNoulProjection {
  const probabilityProjection = projectJevProbability(probability);
  if (isAffirmative === true) {
    return { state: 'affirmative', isAffirmative: true, text: 'Ya', probability: probabilityProjection };
  }
  if (isAffirmative === false) {
    return { state: 'negative', isAffirmative: false, text: 'Tidak', probability: probabilityProjection };
  }
  return { state: 'unknown', isAffirmative: null, text: JEV_UNKNOWN_TEXT, probability: probabilityProjection };
}

/**
 * Taburan kebarangkalian bagi satu dimensi. `null` (atau tiada taburan yang
 * sah) bermaksud tiada kebarangkalian dikira.
 */
export function projectJevProbabilities(value: unknown): JevProbabilitiesProjection {
  if (!isRecord(value)) return { state: 'not-computed', entries: [], text: JEV_NOT_COMPUTED_TEXT };
  const entries: JevProbabilityEntry[] = [];
  for (const [label, probability] of Object.entries(value)) {
    if (!isUnitInterval(probability)) continue;
    entries.push({ label, value: probability, text: percentText(probability) });
  }
  if (entries.length === 0) return { state: 'not-computed', entries: [], text: JEV_NOT_COMPUTED_TEXT };
  return { state: 'computed', entries, text: `${entries.length} pilihan` };
}

/**
 * Nilai jawapan JEV mengikut jenis soalan. Nilai `null` sentiasa menjadi
 * "Tidak diketahui" — termasuk untuk noul, yang tidak boleh menjadi "Tidak".
 */
export function projectJevAnswerValue(kind: JevAnswerKind, value: unknown): JevAnswerProjection {
  if (value === null || value === undefined) return { state: 'unknown', text: JEV_UNKNOWN_TEXT };
  if (kind === 'noul') {
    if (value === true) return { state: 'value', text: 'Ya' };
    if (value === false) return { state: 'value', text: 'Tidak' };
    return { state: 'unknown', text: JEV_UNKNOWN_TEXT };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { state: 'value', text: String(value) }
      : { state: 'unknown', text: JEV_UNKNOWN_TEXT };
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
      ? { state: 'value', text: value }
      : { state: 'unknown', text: JEV_UNKNOWN_TEXT };
  }
  return { state: 'unknown', text: JEV_UNKNOWN_TEXT };
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNullableProbabilities(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const entries: Record<string, number> = {};
  for (const [label, probability] of Object.entries(value)) {
    if (isUnitInterval(probability)) entries[label] = probability;
  }
  return Object.keys(entries).length > 0 ? entries : null;
}

/**
 * Menukar jawapan JEV yang diterima daripada API kepada unjuran primitif.
 *
 * Input adalah bentuk longgar (`unknown`) supaya kad tidak pernah crashed
 * apabila kontrak wayar berubah daripada `null` kepada `number | null`
 * atau sebaliknya.
 */
export function projectJevAnswers(
  answers: Record<string, unknown> | undefined,
): JevPrimitiveProjections {
  const projections: JevPrimitiveProjections = { dimensions: {}, scores: {}, nouls: {} };
  if (!isRecord(answers)) return projections;

  for (const [name, raw] of Object.entries(answers)) {
    if (!isRecord(raw)) continue;
    const type = raw.type;
    const value = raw.value;
    const confidence = readNullableNumber(raw.confidence);
    const probabilities = readNullableProbabilities(raw.probabilities);

    if (type === 'score') {
      projections.scores[name] = {
        score: typeof value === 'number' && Number.isFinite(value) ? value : null,
        confidence,
        ...(typeof raw.reason === 'string' && raw.reason.trim().length > 0
          ? { label: raw.reason.trim().slice(0, 200) }
          : {}),
      };
      continue;
    }
    if (type === 'noul') {
      // Kontrak jawapan noul tidak membawa kebarangkalian; ia belum dikira.
      // `isAffirmative: null` ⇒ "Tidak diketahui", bukan "Tidak".
      projections.nouls[name] = projectJevNoul(
        typeof value === 'boolean' ? value : null,
        null,
      );
      continue;
    }
    projections.dimensions[name] = {
      value: typeof value === 'string' && value.trim().length > 0 ? value : 'UNKNOWN',
      confidence,
      probabilities,
    };
  }

  return projections;
}
