/**
 * Kontrak store awam Agent/Stokis (CG-01, CG-02).
 *
 * Authority: `docs/design/commerce-growth.md` §1 (keputusan tetap 1, 3, 4) dan
 * §2 (provisioning). Setiap Agent/Stokis aktif mendapat SATU Online Store public
 * yang disediakan ABANGCOLEK (`/kedai/:slug`) dan SATU Dealer Workspace private.
 * Store ID mesti stabil, slug unik, dan grant workspace mesti terikat pada store
 * yang sama.
 */

export type DealerStoreStatus = 'active' | 'suspended' | 'revoked';

export type DealerStoreReasonCode =
  /** Slug sudah diambil store lain. */
  | 'DEALER_STORE_SLUG_TAKEN'
  /** Slug terpelihara oleh platform dan tidak boleh digunakan. */
  | 'DEALER_STORE_SLUG_RESERVED'
  /** Input tidak sah (slug bukan bentuk yang diluluskan). */
  | 'DEALER_STORE_INPUT_INVALID'
  /** Profil dealer sudah mempunyai store; provisioning semula adalah no-op yang.safe. */
  | 'DEALER_STORE_ALREADY_PROVISIONED';

export interface DealerStoreRecord {
  /** Store ID stabil — tidak pernah berubah walaupun slug ditukar. */
  id: string;
  /** Organisi dealer yang memiliki store ini (authority server). */
  dealerOrgId: string;
  /** Pengguna pemilik store (authority server). */
  ownerUserId: string;
  /** Slug public; unik merentas semua store. */
  slug: string;
  /** Nama paparan yang diluluskan (bukan nama pengguna). */
  displayName: string;
  status: DealerStoreStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/** Projek awam store — TIDAK mungkin mengandungi data peribadi owner. */
export interface PublicDealerStore {
  storeId: string;
  slug: string;
  displayName: string;
  status: DealerStoreStatus;
}

/** Bentuk slug yang diluluskan: huruf kecil, angka, satu pemisah hubung. */
export const DEALER_STORE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

/**
 * Slug yang terpelihara oleh platform. Codec, atau "kedai" itu sendiri, akan
 * bertindih dengan laluan awam.
 */
export const DEALER_STORE_RESERVED_SLUGS: readonly string[] = [
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'dealer',
  'help',
  'kedai',
  'platform',
  'settings',
  'www',
];
