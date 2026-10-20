/**
 * AbangColek Sovereign GrowthOS — Canonical Order Reference & Refund Intent Contract
 *
 * SATU-SATUNYA sumber kebenaran untuk dua keputusan yang boleh salah ->
 * WANG:
 *
 * 1. `resolveCanonicalOrderId` --
 *    ID pesanan kanonikal hanya boleh dikenal pasti sebagai TOKEN PENUH.
 *    Tiada padanan substring, tiada padanan prefix, tiada "pesanan yang
 *    paling mirip". `ord-001` TIDAK pernah memadankan `ord-0010`, dan
 *    `ord-001` TIDAK pernah dipadankan dengan `legacy-ord-001` secara
 *    separa.
 *
 *    Bila ID tidak dapat dipercayai, hasilnya `orderId: null` berserta reason
 *    code yang boleh mesin baca. Tiada jumlah, tiada fallback kepada 0, tiada
 *    pesanan separuh, tiada ID rekaan.
 *
 * 2. `detectRefundIntent` --
 *    Hanya niat refund AFIRMATIF yang boleh mencetuskan tindakan refund.
 *    Penafian ("do not refund", "not refunded", "no refund", "jangan refund")
 *    dan keadaan yang sudah selesai ("sudah refund", "already refunded")
 *    TIDAK pernah mencetuskan.
 *
 * Wang sentiasa integer sen. Modul ini tiada aritmetik float untuk amaun
 * atau nisbah; ia hanya memilih rekod dan reason code.
 *
 * Modul ini TIDAK mengimport daripada `server/` atau `src/` -- ia murni dan
 * boleh dikongsi oleh runtime platform, runtime Copilot dan lapisan JEV.
 */

/**
 * Reason code untuk resolusi ID pesanan.
 *
 * - `ORDER_ID_RESOLVED` -- satu ID kanonikal disahkan (tie-break selesai).
 * - `ORDER_ID_NOT_FOUND` -- tiada ID kanonikal hadir sebagai token penuh.
 * - `ORDER_ID_AMBIGUOUS` -- beberapa ID hadir dan tie-break tidak dapat
 *   menghasilkan satu jawapan (panjang sama). Fail tutup: tiada pesanan,
 *   tiada jumlah.
 */
export type OrderIdResolutionReasonCode =
  | 'ORDER_ID_RESOLVED'
  | 'ORDER_ID_NOT_FOUND'
  | 'ORDER_ID_AMBIGUOUS';

export interface OrderIdResolution {
  /**
   * ID pesanan kanonikal yang disahkan. `null` apabila tiada satu pun yang
   * boleh dipercayai -- pemanggil MESTI anggap ini sebagai "tiada pesanan",
   * bukan "pesanan pertama yang dijumpai".
   */
  orderId: string | null;
  reason: OrderIdResolutionReasonCode;
  /**
   * Semua ID kanonikal yang hadir sebagai token penuh dalam teks (sebelum
   * tie-break). Untuk diagnosis sahaja -- bukan input untuk caller.
   */
  matchedOrderIds: string[];
}

/**
 * Aksara yang boleh menjadi sebahagian daripada ID pesanan. ID hanya
 * diakhiri oleh aksara di luar kelas ini; jadi `ord-001` di dalam
 * `ord-0010` atau `x-ord-001` BUKAN token penuh.
 */
const ORDER_ID_TOKEN_CHARACTER = /[A-Za-z0-9_-]/;

/**
 * Adakah `needle` hadir dalam `haystack` sebagai TOKEN PENUH?
 *
 * Token penuh bermaksud: aksara sebelum dan selepas (bila ada) bukan
 * aksara ID pesanan. Perbandingan adalah case-insensitive.
 */
function containsCompleteToken(haystack: string, needle: string): boolean {
  if (!needle) return false;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    const before = index > 0 ? haystack.charAt(index - 1) : '';
    const after =
      index + needle.length < haystack.length ? haystack.charAt(index + needle.length) : '';
    const boundedBefore = before === '' || !ORDER_ID_TOKEN_CHARACTER.test(before);
    const boundedAfter = after === '' || !ORDER_ID_TOKEN_CHARACTER.test(after);
    if (boundedBefore && boundedAfter) return true;
    index = haystack.indexOf(needle, index + 1);
  }
  return false;
}

/**
 * Resolusi ID pesanan daripada teks pengguna.
 *
 * TIE-BREAK (dokumen rasmi):
 * 1. Kumpul semua ID kanonikal yang hadir dalam teks sebagai TOKEN PENUH.
 * 2. Tiada apa-apa -> `ORDER_ID_NOT_FOUND` (tiada pesanan, tiada jumlah).
 * 3. Satu sahaja -> ID itu, `ORDER_ID_RESOLVED`.
 * 4. Lebih daripada satu -> **ID KANONIKAL TERPANJANG MENANG**. Panjang
 *    diukur pada ID kanonikal asal (bukan pada token yang dipetik), jadi
 *    `ord-001-extra` mengalahkan `ord-001`.
 * 5. Jika beberapa ID terpanjang mempunyai panjang yang SAMA, tie-break
 *    tidak dapat memutuskan -> `ORDER_ID_AMBIGUOUS` dan fail tutup (tiada
 *    pesanan, tiada jumlah). Kes sama-panjang bermaksud dua pesanan
 *    berbeza disebut, jadi meneka satu akan melekatkan wang pada pesanan
 *    yang salah.
 */
export function resolveCanonicalOrderId(
  text: string,
  canonicalOrderIds: readonly string[],
): OrderIdResolution {
  const haystack = typeof text === 'string' ? text.toLowerCase() : '';

  const unique: Array<{ id: string; lower: string }> = [];
  const seen = new Set<string>();
  for (const raw of canonicalOrderIds ?? []) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    unique.push({ id: trimmed, lower });
  }

  const matched = unique.filter(candidate => containsCompleteToken(haystack, candidate.lower));
  if (matched.length === 0) {
    return { orderId: null, reason: 'ORDER_ID_NOT_FOUND', matchedOrderIds: [] };
  }
  if (matched.length === 1) {
    return { orderId: matched[0].id, reason: 'ORDER_ID_RESOLVED', matchedOrderIds: [matched[0].id] };
  }

  const longestLength = matched.reduce(
    (longest, candidate) => Math.max(longest, candidate.id.length),
    0
  );
  const longest = matched.filter(candidate => candidate.id.length === longestLength);
  if (longest.length === 1) {
    return {
      orderId: longest[0].id,
      reason: 'ORDER_ID_RESOLVED',
      matchedOrderIds: matched.map(candidate => candidate.id),
    };
  }

  return {
    orderId: null,
    reason: 'ORDER_ID_AMBIGUOUS',
    matchedOrderIds: matched.map(candidate => candidate.id),
  };
}

/**
 * Reason code untuk niat refund.
 *
 * - `REFUND_INTENT_AFFIRMATIVE` -- ada permintaan refund yang tegas.
 * - `REFUND_INTENT_NEGATED` -- ADA perkataan refund, tetapi ayat itu
 *   menafikannya ("do not refund", "not refunded", "no refund").
 * - `REFUND_INTENT_ABSENT` -- tiada perkataan refund langsung.
 */
export type RefundIntentReasonCode =
  | 'REFUND_INTENT_AFFIRMATIVE'
  | 'REFUND_INTENT_NEGATED'
  | 'REFUND_INTENT_ABSENT';

export interface RefundIntentDetection {
  /**
   * `true` HANYA apabila niat refund afirmatif dikesan. `false` mesti
   * bermaksud "jangan buat refund" -- bukan "mungkin".
   */
  requested: boolean;
  reason: RefundIntentReasonCode;
}

/** Perkataan yang menunjukkan permintaan refund. */
const REFUND_TERM =
  /\b(?:refund|refunds|refunded|rebate|rebates|ganti\s*rugi|pemulangan\s*wang|pulangkan\s*duit)\b/i;

/**
 * Penafian. Menolak klausa yang mengandungi mana-mana perkataan ini.
 * "do not refund", "not refunded", "no refund", "jangan refund" dan
 * "tak mahu refund" semuanya tertakluk.
 */
const REFUND_NEGATION =
  /\b(?:tak|tidak|bukan|jangan|belum|tanpa|tiada|no|not|never|without|none|reject(?:ed)?|refuse[ds]?|declin(?:e|ed))\b|(?:do|does|did|is|are|was|were|should|can|could|will|would)\s+not\b|don'?t|doesn'?t|didn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|can'?t|cannot|couldn'?t|shouldn'?t|won'?t|wouldn'?t/i;

/**
 * Perkataan permintaan. Kehadirannya membuktikan ayat itu meminta sesuatu,
 * bukan meraikan keadaan yang sudah berlaku.
 */
const REFUND_REQUEST_VERB =
  /\b(?:minta|mohon|nak|mahu|want|request|need|please|tolong|apply|create|make|do|ask|demand)\b/i;

/**
 * Keadaan yang sudah berlaku ("sudah refund", "already refunded",
 * "refund selesai"). Ia bukan permintaan -- tiada refund baharu dicetuskan.
 */
function isCompletedRefundClause(clause: string): boolean {
  if (/\balready\s+refunded\b/i.test(clause)) return true;
  if (/\bwas\s+refunded\b/i.test(clause)) return true;
  if (/\bwere\s+refunded\b/i.test(clause)) return true;
  if (/\b(?:has|have|had|been)\s+been\s+refunded\b/i.test(clause)) return true;
  if (
    /\brefund\s+(?:sudah\s+)?(?:selesai|selesaihnya|complete|completed|done|settled|dibatalkan|batal)\b/i.test(
      clause
    )
  ) {
    return true;
  }
  // "sudah refund" / "telah refund" -- penanda terletak DI HADAPAN istilah
  // refund dan tiada perkataan permintaan di selepasnya ("sudah saya minta
  // refund" masih ialah permintaan, jadi ia tidak dikira keadaan selesai).
  const marker = /\b(?:sudah|telah|dahulu|baru sahaja)\b/i.exec(clause);
  if (marker) {
    const tail = clause.slice(marker.index + marker[0].length);
    if (!REFUND_REQUEST_VERB.test(tail) && REFUND_TERM.test(tail)) return true;
  }
  return false;
}

/** Pemisah klausa -- ayat, senarai dan konjungsi. */
const CLAUSE_SPLIT =
  /[.!?;,\n]|\b(?:tetapi|tapi|namun|however|but|although|though)\b/i;

/**
 * Deteksi niat refund yang negation-aware.
 *
 * Setiap klausa diuji sendiri:
 * - klausa dengan istilah refund + penafian -> ditolak (negated);
 * - klausa dengan istilah refund + keadaan selesai -> bukan permintaan;
 * - klausa dengan istilah refund tanpa penafian -> niat AFIRMATIF.
 *
 * Sekiranya ada klausa yang dinegasi tetapi tiada klausa afirmatif, hasilnya
 * `requested: false` dengan reason `REFUND_INTENT_NEGATED` -- bukan "mungkin".
 */
export function detectRefundIntent(text: string): RefundIntentDetection {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { requested: false, reason: 'REFUND_INTENT_ABSENT' };

  const clauses = source.split(CLAUSE_SPLIT);
  let sawNegated = false;

  for (const clause of clauses) {
    if (!REFUND_TERM.test(clause)) continue;
    if (REFUND_NEGATION.test(clause)) {
      sawNegated = true;
      continue;
    }
    if (isCompletedRefundClause(clause)) continue;
    return { requested: true, reason: 'REFUND_INTENT_AFFIRMATIVE' };
  }

  return { requested: false, reason: sawNegated ? 'REFUND_INTENT_NEGATED' : 'REFUND_INTENT_ABSENT' };
}

/**
 * Ringkas: adakah niat refund afirmatif?
 *
 * Untuk callers yang hanya perlukan boolean; reason code penuh sentiasa
 * tersedia melalui `detectRefundIntent`.
 */
export function isAffirmativeRefundIntent(text: string): boolean {
  return detectRefundIntent(text).requested;
}
