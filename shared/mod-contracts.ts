/**
 * AbangColek Sovereign GrowthOS — Canonical Module Contracts (MOD family)
 *
 * Fail ini ialah kontrak SAFE-BROWSER (tiada import server/app). Ia collects
 * bentuk yang digunakan oleh:
 *
 * - MOD-08 `canonical cost ledger`  → `CanonicalCostBasis` + reason codes
 * - MOD-09 `citation contract`      → `SourceCitation` + `CitedResult`
 * - MOD-02 `public-token projection`→ `PublicOrderProjection` + allow/deny lists
 * - MOD-01 `cart draft`             → `CartDraftLine` / `CartDraft`
 *
 * PRINSIP:
 * - Wang sentiasa INTEGER SEN. Tiada aruhan floats.
 * - Margin sentiasa INTEGER BASIS POINTS (1/100 of a percent). Peratus floating
 *   point TIDAK pernah dikira atau dilaporkan.
 * - Nilai yang tidak boleh dikira daripada state sebenar TIDAK pernah rekaan:
 *   hasilnya ialah `null` + reason code yang boleh dibaca mesin.
 */

import type { FulfilmentStatus } from './platform-contracts';

/* -------------------------------------------------------------------------- */
/* MOD-09 — Citation contract                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Jenis sumber yang boleh disitir oleh sesuatu hasil.
 *
 * Memuatkan `VersionedSourceKind` (MOD-09, kontrak sitiran umum) serta tiga
 * jenis tambahan yang hanya digunakan oleh lejar kos (MOD-08).
 */
export type SourceCitationKind =
  | VersionedSourceKind
  | 'expense'
  | 'reconciliation'
  | 'product'
  | 'document';

/**
 * Satu sitiran sumber: rekod store yang menjadi asas kepada nilai yang
 * dilaporkan. `id` ialah ID rekod store (bukan ID awam).
 *
 * medan versi (`sourceKind` … `versionReasonCode`) adalah pilihan supaya sitiran
 * yang dibina oleh {@link buildSourceCitation} (MOD-09) boleh digunakan sebagai
 * sitiran `SourceCitation` yang sama.
 */
export interface SourceCitation {
  kind: SourceCitationKind;
  id: string;
  /** INTEGER SEN — hanya diisi apabila sitiran membawa amaun. */
  amountSen?: number;
  /** Status rekod semasa (contoh: `confirmed`, `approved`). */
  status?: string;
  /** Tempoh lejar (contoh: `2026-10`) apabila sitiran berasal daripada lejar. */
  period?: string;
  /** Metadata versi MOD-09 (diisi oleh `buildSourceCitation`). */
  sourceKind?: VersionedSourceKind;
  sourceId?: string;
  version?: string | null;
  revision?: number | null;
  observedAt?: string;
  expiresAt?: string | null;
  expiryReasonCode?: CitationExpiryReasonCode;
  versionReasonCode?: CitationVersionReasonCode;
}

/**
 * Hasil yang disertakan dengan sitiran sumber dan reason codes.
 *
 * `reasonCodes` membenarkan pemanggil membezakan "nilai dikira" daripada
 * "nilai tidak dapat dikira" tanpa meneka.
 */
export interface CitedResult<T> {
  value: T;
  citations: SourceCitation[];
  reasonCodes: string[];
}

/* -------------------------------------------------------------------------- */
/* MOD-08 — Canonical cost ledger                                               */
/* -------------------------------------------------------------------------- */

/** Reason code apabila asas kos tidak dapat dikira. */
export const COST_BASIS_UNAVAILABLE = 'COST_BASIS_UNAVAILABLE';

/**
 * Reason code apabila COGS tiada. Tiada kos perolehan setiap unit disimpan
 * di mana-mana dalam store, jadi COGS memang TIDAK boleh dikira — ia tidak
 * pernah dianggak.
 */
export const COGS_NOT_RECORDED = 'COGS_NOT_RECORDED';

/** Dikodkan apabila amaun dalam store rosak (harus mustahil berlaku). */
export const COST_BASIS_AMOUNT_INVALID = 'COST_BASIS_AMOUNT_INVALID';

/**
 * Butiran yang menyebabkan asas kos tidak tersedia. Setiap satu ialah fakta
 * yang boleh disahkan daripada state store — bukan tekaan.
 */
export type CostBasisUnavailableDetail =
  /** Tiada store platform disambungkan ⇒ tiada state boleh dibaca. */
  | 'PLATFORM_STORE_NOT_WIRED'
  /** Tiada rekod kos (`expenses` berstatus `approved`) dalam skop. */
  | 'NO_APPROVED_COST_RECORDS'
  /** Tiada jualan bersih (senarai jualan = 0) ⇒ margin tiada definisi. */
  | 'ZERO_REVENUE_BASIS'
  /** Lejar tempoh yang disahkan tidak lagi sepadan dengan sumbernya. */
  | 'COST_BASIS_SOURCE_CHANGED';

/** Asas kos yang BERJAYA dikira daripada state sebenar. */
export interface CanonicalCostBasis {
  available: true;
  /** Skop tempoh yang dibaca: `all` | `YYYY-MM` | `YYYY-MM-DD`. */
  period: string;
  /** Outlet yang diskop, atau `null` untuk semua outlet. */
  outletId: string | null;
  /** Jumlah bayaran disahkan (INTEGER SEN). */
  grossRevenueSen: number;
  /** Jumlah bayaran dipulangkan (INTEGER SEN). */
  refundedSen: number;
  /** Jualan bersih = grossRevenueSen - refundedSen (INTEGER SEN). */
  netSalesSen: number;
  /** Jumlah kos diluluskan (INTEGER SEN). */
  costSen: number;
  /** Margin = netSalesSen - costSen (INTEGER SEN). */
  marginSen: number;
  /** Margin dalam INTEGER BASIS POINTS (10000 = 100.000%). */
  netOperatingMarginBasisPoints: number;
  /** COGS tidak direkod — sentiasa `null`, tidak pernah dianggak. */
  cogsSen: null;
  cogsReasonCode: typeof COGS_NOT_RECORDED;
  /** ID lejar tempoh kanonikal yang digunakan, atau `null` jika tiada. */
  reconciliationId: string | null;
  /** Sitiran sumber yang menyokong angka ini. */
  citations: SourceCitation[];
}

/** Asas kos yang TIDAK dapat dikira — dengan detail yang boleh dibaca mesin. */
export interface CostBasisUnavailable {
  available: false;
  reasonCode: typeof COST_BASIS_UNAVAILABLE;
  detail: CostBasisUnavailableDetail;
  period: string;
  outletId: string | null;
  cogsSen: null;
  cogsReasonCode: typeof COGS_NOT_RECORDED;
  citations: SourceCitation[];
}

export type CostBasisOutcome = CanonicalCostBasis | CostBasisUnavailable;

/* -------------------------------------------------------------------------- */
/* MOD-02 — Public order projection                                             */
/* -------------------------------------------------------------------------- */

/**
 * Medan yang BOLEH ada dalam unjuran awam pesanan. Allow-list ini adalah
 * satu-satunya sumber kebenaran: apa-apa medan di luar senarai ini mesti
 * ditolak oleh penjaga pengasingan.
 */
export const PUBLIC_ORDER_PROJECTION_ALLOWED_FIELDS = [
  'publicRef',
  'status',
  'fulfilmentStatus',
  'outletId',
  'hub',
  'fulfilment',
  'deliveryType',
  'city',
  'createdAt',
  'updatedAt',
] as const;

export type PublicOrderProjectionField = (typeof PUBLIC_ORDER_PROJECTION_ALLOWED_FIELDS)[number];

/**
 * Medan yang MELELARAK dari pesanan dalaman ke unjuran awam. Senarai ini
 * sengaja mengandungi `id` dan `orderId` — ID pesanan dalaman ialah kunci
 * pengenal peribadi dan tidak boleh bocor ke laluan awam.
 */
export const PUBLIC_ORDER_PROJECTION_DENIED_FIELDS = [
  'id',
  'orderId',
  'customerId',
  'dealerOrgId',
  'referralCode',
  'contactRef',
  'lines',
  'amountSen',
  'paidAmountSen',
  'refundAmountSen',
  'paymentState',
  'trackingToken',
  'trackingTokenHash',
  'trackingTokenExpiresAt',
  'revision',
  'ownerId',
  'redeemPoints',
  'loyaltyDiscountSen',
  'subtotalSen',
  'loyaltyPointsEarned',
] as const;

export type PublicOrderProjectionDeniedField = (typeof PUBLIC_ORDER_PROJECTION_DENIED_FIELDS)[number];

/**
 * Bentuk awam pesanan. Tidak mengandungi `id` mahupun `orderId`; rujukan
 * awam yang diberikan ialah `publicRef` — prefix hash token penjejakan, yang
 * TIDAK boleh diterbalikkan kepada ID pesanan.
 */
export interface PublicOrderProjection {
  /** Rujukan awam yang opaque (prefix hash token penjejakan). */
  publicRef: string;
  status: FulfilmentStatus;
  fulfilmentStatus: FulfilmentStatus;
  outletId: string;
  hub: string;
  fulfilment: 'pickup' | 'delivery';
  deliveryType: 'pickup' | 'delivery';
  city: string;
  createdAt: string;
  updatedAt: string;
}

/** Reason code untuk laluan penjejakan awam. */
export type PublicTrackingReasonCode =
  | 'INVALID_TOKEN'
  | 'ORDER_NOT_FOUND'
  | 'TRACKING_TOKEN_EXPIRED'
  /** SEC-01 — token penjejakan dicabut; pautan awam berhenti berfungsi. */
  | 'TRACKING_TOKEN_REVOKED'
  | 'PUBLIC_PROJECTION_LEAK_BLOCKED';

/* -------------------------------------------------------------------------- */
/* MOD-01 — Cart draft                                                          */
/* -------------------------------------------------------------------------- */

/** Reason code isu draf troli. */
export type CartDraftIssueCode =
  /** Produk tidak wujud dalam katalog semasa. */
  | 'PRODUKT_TIDAK_DITEMUI'
  /** Stok bebas tidak mencukupi untuk kuantiti yang diminta. */
  | 'STOK_TIDAK_CUKUPI'
  /** Draf dinaur pada versi katalog yang berbeza daripada semasa. */
  | 'KATALOG_UFUK';

/** Satu baris draf troli. Harga dan ketersediaan adalah `null` jika tidak diketahui. */
export interface CartDraftLine {
  productId: string;
  quantity: number;
  /** INTEGER SEN — `null` jika produk tidak wujud dalam katalog. */
  priceSen: number | null;
  /** Unit bebas yang tersedia — `null` jika tidak dapat ditentukan. */
  availableQuantity: number | null;
  knownProduct: boolean;
  sufficient: boolean;
}

/**
 * Draf troli. Tiada pesanan wujud lagi; harga datang daripada katalog
 * kanonikal dan stok daripada lejar inventori.
 */
export interface CartDraft {
  lines: CartDraftLine[];
  itemCount: number;
  /** INTEGER SEN — jumlah anggaran pada harga katalog semasa. */
  estimatedTotalSen: number;
  catalogueVersion: number;
  /** `true` apabila draf perlu din harga semula. */
  requiresReprice: boolean;
  issues: string[];
}

/* -------------------------------------------------------------------------- */
/* MOD-01 — Draf troli yang disediakan pelayan (tanpa pesanan / tempahan)      */
/* -------------------------------------------------------------------------- */

/**
 * Baris draf troli seperti yang DIHASILKAN oleh pelayan.
 *
 * `priceSen` (daripada `CartDraftLine`) ialah harga unit; `unitPriceSen`
 * menyatakannya secara eksplisit supaya senarai tidak perlu dibaca dua kali.
 */
export interface PreparedCartDraftLine extends CartDraftLine {
  /** Nama produk daripada katalog kanonik. */
  name: string;
  /** INTEGER SEN — harga unit pada masa draf ini diambil. */
  unitPriceSen: number;
  /** INTEGER SEN — `unitPriceSen * quantity`. */
  lineTotalSen: number;
  /** Versi katalog yang harga baris ini diperoleh. */
  publishedVersion: number;
}

/**
 * Draf troli yang DISEDIAHKAN oleh domain tool.
 *
 * Kontrak ini adalah "unsent draft": tiada pesanan, tiada tempahan stok,
 * tiada bayaran direkodkan. `persisted: false` dan `orderId: null` ialah
 * sebutan secara eksplisit, bukan sekadar ketiadaan data.
 */
export interface PreparedCartDraft extends CartDraft {
  /** Sentiasa `unsent` — draf tidak pernah dihantar. */
  status: 'unsent';
  lines: PreparedCartDraftLine[];
  /** INTEGER SEN — jumlah harga baris (tanpa diskaun). */
  subtotalSen: number;
  /** INTEGER SEN — jumlah akhir draf (tanpa diskaun, tanpa caj tersembunyi). */
  totalSen: number;
  currency: 'MYR';
  /** Sentiasa `false` — draf tidak pernah ditulis ke store. */
  persisted: false;
  /** Sentiasa `null` — tiada pesanan dicipta. */
  orderId: null;
  /** Sentiasa kosong — tiada tempahan stok dicipta. */
  reservationIds: [];
}

/* -------------------------------------------------------------------------- */
/* MOD-09 — Sitiran sumber dengan versi / semakan / tempoh luput               */
/* -------------------------------------------------------------------------- */

/** Jenis sumber kanonik yang boleh disitir oleh keputusan alat. */
export type VersionedSourceKind =
  | 'order'
  | 'case'
  | 'case_message'
  | 'task'
  | 'stock_lot'
  | 'inventory_movement'
  | 'payment'
  | 'commission'
  | 'knowledge_entry'
  | 'campaign'
  | 'restock'
  | 'evidence'
  | 'loyalty_entry'
  | 'catalogue_product';

/**
 * Mengapa sumber itu (atau bukan) telah luput.
 *
 * - `EXPIRY_ACTIVE`       — rekod membawa tempoh luput dan ia masih pada masa depan.
 * - `EXPIRED`             — rekod membawa tempoh luput yang sudah.alibaba/aloi.
 * - `EXPIRY_NOT_RECORDED` — rekod kanonik TIDAK ADA medan tempoh luput (tekaan tidak pernah).
 * - `EXPIRY_UNKNOWN`      — medan tempoh luput wujud tetapi bukan rentetan masa yang sah.
 */
export type CitationExpiryReasonCode =
  | 'EXPIRY_ACTIVE'
  | 'EXPIRED'
  | 'EXPIRY_NOT_RECORDED'
  | 'EXPIRY_UNKNOWN';

/**
 * Mengapa sumber itu (atau bukan) membawa versi.
 *
 * - `VERSION_RECORDED`    — rekod kanonik membawa versi (contoh versi entri pengetahuan).
 * - `VERSION_NOT_RECORDED` — rekod kanonik tiada medan versi; `version` kekal `null`.
 */
export type CitationVersionReasonCode = 'VERSION_RECORDED' | 'VERSION_NOT_RECORDED';

/**
 * Sitiran sumber untuk keputusan MOD-09.
 *
 * `version`, `revision` dan `expiresAt` boleh `null` — dan setiap `null`
 * sentiasa mempunyai reason code yang boleh dibaca mesin supaya pengguna
 * boleh bezakan "sumber ini tiada versi" daripada "alat lupa semak".
 */
export interface VersionedSourceCitation {
  /** keluarga rekod kanonik yang menjadi asas data ini. */
  sourceKind: VersionedSourceKind;
  /** pengecam rekod kanonik dalam keluarga itu. */
  sourceId: string;
  /** Versi sumber apabila rekod membawanya, jika tidak `null`. */
  version: string | null;
  /** Revisi sumber apabila rekod membawanya, jika tidak `null`. */
  revision: number | null;
  /** Masa ISO bila sumber itu dibaca (jam pelayan). */
  observedAt: string;
  /** Tempoh luput sumber apabila rekod membawanya, jika tidak `null`. */
  expiresAt: string | null;
  /** Penjelasan mesin-baca bagi dimensi tempoh luput. */
  expiryReasonCode: CitationExpiryReasonCode;
  /** Penjelasan mesin-baca bagi dimensi versi. */
  versionReasonCode: CitationVersionReasonCode;
}

/**
 * Hasil yangsentiasa disertakan dengan sitiran sumbernya.
 *
 * Gunanya: satu keputusan tidak pernah boleh muncul tanpa metadata sumbernya.
 */
export interface CitedVersionResult<T = unknown> {
  result: T;
  citation: VersionedSourceCitation;
}

/** Input yang diterima oleh {@link buildVersionedSourceCitation}. */
export interface VersionedCitationInput {
  sourceKind: VersionedSourceKind;
  sourceId: string;
  /** Versi apabila rekod kanonik membawanya. */
  version?: string | number | null;
  /** Revisi apabila rekod kanonik membawanya. */
  revision?: number | null;
  /** Masa pemerhatian (ISO). */
  observedAt: string;
  /** Tempoh luput apabila rekod kanonik membawanya. */
  expiresAt?: string | null;
}

/**
 * Bina satu sitiran daripada nilai yang BENAR-BENAR dibaca daripada store.
 *
 * Tiada apa-apa yang direka: versi yang tiada kekal `null` dan tempoh luput
 * yang tiada kekal `null`, setiap satu dengan reason code sendiri.
 */
export function buildVersionedSourceCitation(input: VersionedCitationInput): VersionedSourceCitation {
  const hasVersion = input.version !== undefined && input.version !== null && input.version !== '';
  const version = hasVersion ? String(input.version) : null;

  const rawExpiry = input.expiresAt;
  const hasExpiry = rawExpiry !== undefined && rawExpiry !== null && rawExpiry !== '';
  let expiresAt: string | null = null;
  let expiryReasonCode: CitationExpiryReasonCode;
  if (!hasExpiry) {
    expiryReasonCode = 'EXPIRY_NOT_RECORDED';
  } else {
    const parsed = Date.parse(String(rawExpiry));
    if (!Number.isFinite(parsed)) {
      expiryReasonCode = 'EXPIRY_UNKNOWN';
    } else {
      expiresAt = new Date(parsed).toISOString();
      const observed = Date.parse(input.observedAt);
      expiryReasonCode = Number.isFinite(observed) && parsed <= observed ? 'EXPIRED' : 'EXPIRY_ACTIVE';
    }
  }

  const revision =
    input.revision === undefined || input.revision === null || !Number.isFinite(input.revision)
      ? null
      : input.revision;

  return {
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    version,
    revision,
    observedAt: input.observedAt,
    expiresAt,
    expiryReasonCode,
    versionReasonCode: hasVersion ? 'VERSION_RECORDED' : 'VERSION_NOT_RECORDED',
  };
}

/**
 * Bina sitiran dalam bentuk `SourceCitation` (bentuk yang lebih luas).
 *
 * `buildVersionedSourceCitation` kekal sebagai pembina teras; fungsi ini
 * menambah satu lapisan yang menormalkan `kind`/`id` supaya sitiran
 * yang sama boleh digunakan oleh lejar kos (MOD-08) tanpa meneka.
 */
export function buildSourceCitation(input: VersionedCitationInput): SourceCitation {
  const versioned = buildVersionedSourceCitation(input);
  return {
    kind: versioned.sourceKind,
    id: versioned.sourceId,
    sourceKind: versioned.sourceKind,
    sourceId: versioned.sourceId,
    version: versioned.version,
    revision: versioned.revision,
    observedAt: versioned.observedAt,
    expiresAt: versioned.expiresAt,
    expiryReasonCode: versioned.expiryReasonCode,
    versionReasonCode: versioned.versionReasonCode,
  };
}
