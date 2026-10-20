/**
 * MOD-01 — `prepare_cart_draft` (draf troli yang BELUM dihantar).
 *
 * KONTRAK
 * Draf troli ialah keputusan *pelayan* yang membaca katalog live dan
 * ketersediaan inventori sebenar. Ia TIDAK pernah:
 *   - mencipta pesanan,
 *   - menyimpan tempahan stok,
 *   - merekod bayaran,
 *   - menaungi penebusan mata kesetiaan.
 *
 * Setiap outcome adalah berstruktur: draf yang berjaya ATAU kegagalan bertip
 * dengan reason code yang boleh dibaca mesin. Tiada nilai rekaan: harga
 * diambil daripada rekod katalog sebenar, kesediaan daripada lot + tempahan
 * sebenar, dan jumlah dikira dalam SEN INTEGER (tanpa aritmetik titik
 * perpuluhan).
 *
 * `requiresReprice` dikira terhadap VERSI KATALOG: draf yang memperhati satu
 * versi katalog yang sudah lapuk mesti ditanda supaya UI diharga semula
 * sebelum penghantaran. Draf basi TETAP dibina daripada harga
 * semasa — harga lama tidak pernah dipaparkan sebagai jika ia masih sah.
 */

import type { BusinessSettings, CatalogueProduct } from '../../shared/platform-contracts';
import type { CartDraftIssueCode, PreparedCartDraft, PreparedCartDraftLine } from '../../shared/mod-contracts';
import type { Principal } from './auth';
import type { Commerce } from './commerce';

/** Batas baris troli (sepadan dengan `MAX_CUSTOMER_CART_LINES` pada klien). */
export const MAX_CART_DRAFT_LINES = 20;
/** Batas kuantiti satu baris (sepadan dengan kontrak troli klien). */
export const MAX_CART_DRAFT_QUANTITY = 10_000;
/** Lokasi serahan lalai. */
export const DEFAULT_CART_DRAFT_OUTLET = 'hq';

/** Reason code kegagalan draf troli. */
export type CartDraftFailureCode =
  /** Baris troli pincang (kuantiti, duplikasi, pek, had, versi). */
  | 'CART_DRAFT_INVALID_INPUT'
  /** Produk tidak wujud dalam katalog yang DITERBITKAN. */
  | 'CART_DRAFT_UNKNOWN_PRODUCT'
  /** Lokasi serahan bukan lokasi operasi yang diluluskan. */
  | 'CART_DRAFT_LOCATION_UNAVAILABLE';

/**
 * Reason code konflik medan.
 *
 * Tiga kod pertama adalah subset daripada `CartDraftIssueCode` (shared/mod-contracts.ts)
 * supaya senarai `issues` pada draf menggunakan kamus yang sama. Kod selebihnya
 * hanya muncul dalam senarai konflik pada keputusan GAGAL.
 */
export type CartDraftConflictReasonCode =
  | CartDraftIssueCode
  | 'KUANTITI_TIDAK_SAH'
  | 'KADAR_PEK_TIDAK_SAH'
  | 'BARIS_BERGANTUNG'
  | 'TROLI_KOSONG'
  | 'BANYAK_BARIS_MELALUI_HAD'
  | 'LOKASI_TIDAK_DITAKHULKAN'
  | 'ID_PRODUK_TIDAK_SAH'
  | 'VERS_I_KATALOG_TIDAK_SAH';

/** Satu konflik yang menyebabkan draf gagal dibina. */
export interface CartDraftConflict {
  /** Medan yang menyebabkan konflik (cth. `lines[1].quantity`). */
  field: string;
  /** Reason code konflik. */
  reasonCode: CartDraftConflictReasonCode;
  /** Nilai yang dihantar oleh pemanggil (null jika tiada). */
  submitted: unknown;
}

/**
 * Keputusan `prepareCartDraft`.
 *
 * Kejayaan: draf yang lengkap dengan `persisted: false`, `orderId: null` dan
 * `reservationIds: []` — ketiga-tiga nilai adalah sebutan eksplisit, bukan sekadar
 * ketiadaan data.
 */
export type CartDraftOutcome =
  | {
      ok: true;
      code: null;
      draft: PreparedCartDraft;
      /** Versi katalog yang diperhati oleh pemanggil (`null` jika tiada). */
      observedCatalogueVersion: number | null;
      /** Versi katalog live semasa. */
      liveCatalogueVersion: number;
      /**
       * ID pemilik akaun draf (session-derived). Draf ialah aset akaun dan
       * tidak boleh dipindah kepada akaun lain tanpa semakan semula.
       */
      ownerId: string;
    }
  | {
      ok: false;
      code: CartDraftFailureCode;
      message: string;
      conflicts: CartDraftConflict[];
    };

interface NormalisedLine {
  productId: string;
  quantity: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalisasi baris troli yang dihantar.
 *
 * Setiap pelanggaran dikembalikan sebagai konflik bertip — fungsi ini TIDAK
 * melontar ralat, supaya lapisan HTTP tidak perlu meneka-neka kod ralat.
 */
function normaliseLines(raw: unknown): { lines: NormalisedLine[]; conflicts: CartDraftConflict[] } {
  const conflicts: CartDraftConflict[] = [];
  if (!Array.isArray(raw)) {
    return { lines: [], conflicts: [{ field: 'lines', reasonCode: 'TROLI_KOSONG', submitted: raw }] };
  }
  if (raw.length === 0) {
    return { lines: [], conflicts: [{ field: 'lines', reasonCode: 'TROLI_KOSONG', submitted: raw }] };
  }
  if (raw.length > MAX_CART_DRAFT_LINES) {
    return { lines: [], conflicts: [{ field: 'lines', reasonCode: 'BANYAK_BARIS_MELALUI_HAD', submitted: raw.length }] };
  }
  const lines: NormalisedLine[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      conflicts.push({ field: `lines[${index}]`, reasonCode: 'KUANTITI_TIDAK_SAH', submitted: entry });
      return;
    }
    const productId = entry.productId;
    if (typeof productId !== 'string' || productId.trim().length === 0 || productId.length > 120) {
      conflicts.push({ field: `lines[${index}].productId`, reasonCode: 'ID_PRODUK_TIDAK_SAH', submitted: productId ?? null });
      return;
    }
    const quantity = entry.quantity;
    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_CART_DRAFT_QUANTITY) {
      conflicts.push({ field: `lines[${index}].quantity`, reasonCode: 'KUANTITI_TIDAK_SAH', submitted: quantity ?? null });
      return;
    }
    if (seen.has(productId)) {
      conflicts.push({ field: `lines[${index}].productId`, reasonCode: 'BARIS_BERGANTUNG', submitted: productId });
      return;
    }
    seen.add(productId);
    lines.push({ productId, quantity });
  });
  return { lines, conflicts };
}

/**
 * Sahkan lokasi serahan terhadap lokasi operasi yang diluluskan.
 *
 * Aturan yang sama seperti `Commerce.submitOrder`: hanya `hq` atau lokasi yang
 * wujud dalam `settings.business.approvedPolicies.locations` boleh digunakan.
 * Lokasi yang tidak diluluskan ditolak supaya draf tidak boleh membawa
 * lokasi yang tidak wujud.
 */
function resolveOutlet(commerce: Commerce, rawOutlet: unknown): { outletId: string | null; conflict: CartDraftConflict | null } {
  if (rawOutlet === undefined || rawOutlet === null) return { outletId: DEFAULT_CART_DRAFT_OUTLET, conflict: null };
  if (typeof rawOutlet !== 'string' || rawOutlet.trim().length === 0 || rawOutlet.length > 120) {
    return { outletId: null, conflict: { field: 'outletId', reasonCode: 'LOKASI_TIDAK_DITAKHULKAN', submitted: rawOutlet } };
  }
  const outletId = rawOutlet.trim();
  if (outletId === DEFAULT_CART_DRAFT_OUTLET) return { outletId, conflict: null };
  const settings = commerce.store.get<BusinessSettings>('settings', 'business');
  const approved = settings?.approvedPolicies.locations?.some(location => location.id === outletId) ?? false;
  if (!approved) return { outletId: null, conflict: { field: 'outletId', reasonCode: 'LOKASI_TIDAK_DITAKHULKAN', submitted: outletId } };
  return { outletId, conflict: null };
}

/**
 * Bina draf troli daripada katalog live dan inventori sebenar.
 *
 * @param commerce Bekalan data kanonik (katalog + versi + ketersediaan).
 * @param actor Princip session-derived. Digunakan untuk jejak konteks sahaja —
 *               draf tidak mengandungi data milik orang lain.
 * @param raw Input tidak dipercayai: `{ lines, catalogueVersion?, outletId? }`.
 */
export function prepareCartDraft(commerce: Commerce, actor: Principal, raw: unknown): CartDraftOutcome {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      code: 'CART_DRAFT_INVALID_INPUT',
      message: 'Input draf troli tidak sah.',
      conflicts: [{ field: 'lines', reasonCode: 'TROLI_KOSONG', submitted: raw ?? null }],
    };
  }

  const { lines, conflicts } = normaliseLines(raw.lines);
  if (conflicts.length) {
    return { ok: false, code: 'CART_DRAFT_INVALID_INPUT', message: 'Baris troli tidak sah.', conflicts };
  }

  const outlet = resolveOutlet(commerce, raw.outletId);
  if (outlet.conflict) {
    return { ok: false, code: 'CART_DRAFT_LOCATION_UNAVAILABLE', message: 'Lokasi serahan tidak diluluskan.', conflicts: [outlet.conflict] };
  }
  const outletId = outlet.outletId ?? DEFAULT_CART_DRAFT_OUTLET;

  // Versi katalog yang diperhati pemanggil. `undefined` bermaksud tiada versi
  // harga yang diperhati — draf itu tidak boleh dianggap priced terkini.
  const observedRaw = raw.catalogueVersion;
  if (observedRaw !== undefined && observedRaw !== null) {
    if (typeof observedRaw !== 'number' || !Number.isSafeInteger(observedRaw) || observedRaw < 0) {
      return {
        ok: false,
        code: 'CART_DRAFT_INVALID_INPUT',
        message: 'Versi katalog yang diperhati tidak sah.',
        conflicts: [{ field: 'catalogueVersion', reasonCode: 'VERS_I_KATALOG_TIDAK_SAH', submitted: observedRaw }],
      };
    }
  }
  const observedCatalogueVersion = typeof observedRaw === 'number' ? observedRaw : null;

  const liveCatalogueVersion = commerce.version();

  // Katalog LIVE — hanya produk yang DITERBITKAN. Produk draft/retired
  // tersembunyi sepenuhnya (tiada nama, tiada harga, tiada kuantiti).
  const published = commerce.store.all<CatalogueProduct>('catalogue').filter(product => product.status === 'published');

  const preparedLines: PreparedCartDraftLine[] = [];
  const issues: string[] = [];
  const unknown: CartDraftConflict[] = [];

  for (const line of lines) {
    const product = published.find(candidate => candidate.id === line.productId);
    if (!product) {
      // Produk yang tidak diterbitkan DAN produk yang tidak wujud sengaja
      // dikelompokkan: membezakannya akan membocorkan existence produk draft.
      unknown.push({ field: `lines[${line.productId}].productId`, reasonCode: 'PRODUKT_TIDAK_DITEMUI', submitted: line.productId });
      continue;
    }
    if (!Number.isSafeInteger(product.packSize) || product.packSize < 1 || line.quantity % product.packSize !== 0) {
      // Kadar pek ialah domain rule yang sama seperti `Commerce.quote`
      // (INVALID_PACK_QUANTITY). Draf yang melanggar peraturan ini tidak
      // boleh dihantar, jadi ia ditolak awal dengan sebab yang tepat.
      return {
        ok: false,
        code: 'CART_DRAFT_INVALID_INPUT',
        message: `Kuantiti ${product.name} mesti gandaan pek ${product.packSize}.`,
        conflicts: [{ field: `lines[${line.productId}].quantity`, reasonCode: 'KADAR_PEK_TIDAK_SAH', submitted: line.quantity }],
      };
    }
    const availableQuantity = commerce.available(product.id, 'business', outletId);
    const sufficient = availableQuantity >= line.quantity;
    if (!sufficient) issues.push('STOK_TIDAK_CUKUPI');
    preparedLines.push({
      productId: product.id,
      quantity: line.quantity,
      priceSen: product.priceSen,
      unitPriceSen: product.priceSen,
      lineTotalSen: product.priceSen * line.quantity,
      availableQuantity,
      knownProduct: true,
      sufficient,
      name: product.name,
      publishedVersion: product.publishedVersion,
    });
  }

  if (unknown.length) {
    return {
      ok: false,
      code: 'CART_DRAFT_UNKNOWN_PRODUCT',
      message: 'Satu atau lebih produk tidak wujud dalam katalog yang diterbitkan.',
      conflicts: unknown,
    };
  }

  // Jumlah SEN INTEGER. Tiada diskaun dan tiada caj tersembunyi pada peringkat
  // draf — penebusan mata hanya berlaku pada quote/pesanan kanonik.
  const subtotalSen = preparedLines.reduce((sum, line) => sum + line.lineTotalSen, 0);
  if (!Number.isSafeInteger(subtotalSen)) {
    return {
      ok: false,
      code: 'CART_DRAFT_INVALID_INPUT',
      message: 'Jumlah draf melebihi had sen yang sah.',
      conflicts: [{ field: 'lines', reasonCode: 'KUANTITI_TIDAK_SAH', submitted: subtotalSen }],
    };
  }
  const itemCount = preparedLines.reduce((sum, line) => sum + line.quantity, 0);

  // `requiresReprice` dikira terhadap versi katalog. Tanpa versi yang
  // diperhati, draf tidak boleh diklaim priced pada katalog semasa.
  const requiresReprice = observedCatalogueVersion === null || observedCatalogueVersion !== liveCatalogueVersion;
  if (requiresReprice && !issues.includes('KATALOG_UFUK')) issues.push('KATALOG_UFUK');

  const draft: PreparedCartDraft = {
    status: 'unsent',
    lines: preparedLines,
    itemCount,
    estimatedTotalSen: subtotalSen,
    catalogueVersion: liveCatalogueVersion,
    requiresReprice,
    issues,
    subtotalSen,
    totalSen: subtotalSen,
    currency: 'MYR',
    persisted: false,
    orderId: null,
    reservationIds: [],
  };

  return { ok: true, code: null, draft, observedCatalogueVersion, liveCatalogueVersion, ownerId: actor.user.id };
}
