import {
  DEALER_STORE_RESERVED_SLUGS,
  DEALER_STORE_SLUG_PATTERN,
  type DealerStoreRecord,
  type PublicDealerStore,
} from '../../shared/dealer-store-contracts';
import { fail, id, now, text } from './store';
import type { Principal } from './auth';

/**
 * Provisioning store awam Agent/Stokis (CG-01).
 *
 * Authority: `docs/design/commerce-growth.md` §1 (keputusan tetap 1 dan 4) dan §2.
 * Aturan yang diimplementasikan:
 *  - SATU store bagi setiap profil dealer yang aktif; store ID stabil.
 *  - Slug unik merentas semua store; slug terpelihara ditolak dengan reason code.
 *  - Provisioning berlaku DI DALAM blok atomik kelulusan yang sama supaya retry
 *    atau kelulusan serentak tidak menghasilkan dua store.
 *  - Slug yang ditukar TIDAK memadam identity/order lama (store ID kekal).
 *  - Projek awam tidak mendedahkan data peribadi owner.
 */
export class DealerStores {
  constructor(private readonly store: StoreLike) {}

  /** Semua store (server-side; untuk workspace dan pentadbiran). */
  all(): DealerStoreRecord[] {
    return this.store.all<DealerStoreRecord>('dealer_stores');
  }

  /** Store milik satu dealer. */
  byOrg(dealerOrgId: string): DealerStoreRecord | null {
    return this.store.all<DealerStoreRecord>('dealer_stores').find((store) => store.dealerOrgId === dealerOrgId) ?? null;
  }

  /** Store awam ikut slug — baca sahaja, tiada session diperlukan. */
  publicBySlug(slug: string): PublicDealerStore | null {
    const normalized = normaliseSlug(slug);
    if (!normalized) return null;
    const record = this.store.all<DealerStoreRecord>('dealer_stores').find((candidate) => candidate.slug === normalized);
    if (!record || record.status !== 'active') return null;
    return {
      storeId: record.id,
      slug: record.slug,
      displayName: record.displayName,
      status: record.status,
    };
  }

  /** Cari store aktif mengikut slug atau dealerOrgId (case-insensitive). */
  bySlugOrOrg(code: string): DealerStoreRecord | null {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return null;
    return (
      this.store
        .all<DealerStoreRecord>('dealer_stores')
        .find(
          (candidate) =>
            candidate.status === 'active' &&
            (candidate.slug.toLowerCase() === trimmed || candidate.dealerOrgId.toLowerCase() === trimmed),
        ) ?? null
    );
  }

  /**
   * Store milik actor (workspace private). Actor mesti pemilik store atau
   * memegang grant dealer; nama pengguna alone tidak cukup.
   */
  forActor(actor: Principal): PublicDealerStore[] {
    const own = actor.memberships.filter((membership) => membership.dealerOrgId && membership.status === 'active');
    const orgIds = new Set(own.map((membership) => membership.dealerOrgId as string));
    return this.all()
      .filter((store) => orgIds.has(store.dealerOrgId))
      .map((store) => ({
        storeId: store.id,
        slug: store.slug,
        displayName: store.displayName,
        status: store.status,
      }));
  }

  /**
   * Provision store untuk dealer yang telah diluluskan. WAJIB dipanggil
   * dalam blok atomik yang sama dengan kelulusan (lihat `Dealers.decide`).
   * Meny Provisions semula dealer yang sama ialah no-op yang.safe.
   */
  provision(
    dealerOrgId: string,
    ownerUserId: string,
    raw: { slug?: unknown; displayName?: unknown },
  ): DealerStoreRecord {
    const existing = this.byOrg(dealerOrgId);
    const slug = normaliseSlug(raw.slug);
    const displayName = raw.displayName === undefined ? slug : text(raw.displayName, 'Nama store', 80);

    if (!DEALER_STORE_SLUG_PATTERN.test(slug)) {
      fail('DEALER_STORE_INPUT_INVALID', 400, 'Slug store tidak sah.');
    }
    if (DEALER_STORE_RESERVED_SLUGS.includes(slug)) {
      fail('DEALER_STORE_SLUG_RESERVED', 409, 'Slug store terpelihara oleh platform.');
    }

    if (existing) {
      // Store ID kekal stabil; hanya field yang di luar identity yang boleh
      // dikemas kini. Slug collision hanya relevan jika slug BERUBAH.
      if (existing.slug !== slug && this.store.all<DealerStoreRecord>('dealer_stores').some((candidate) => candidate.slug === slug)) {
        fail('DEALER_STORE_SLUG_TAKEN', 409, 'Slug store sudah digunakan.');
      }
      const updated: DealerStoreRecord = {
        ...existing,
        slug,
        displayName,
        revision: existing.revision + 1,
        updatedAt: now(),
      };
      this.store.save('dealer_stores', updated);
      return updated;
    }

    if (this.store.all<DealerStoreRecord>('dealer_stores').some((candidate) => candidate.slug === slug)) {
      fail('DEALER_STORE_SLUG_TAKEN', 409, 'Slug store sudah digunakan.');
    }

    const record: DealerStoreRecord = {
      id: id(),
      dealerOrgId,
      ownerUserId,
      slug,
      displayName,
      status: 'active',
      revision: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.save('dealer_stores', record);
    return record;
  }
}

/** Normalisasi slug: huruf kecil, aksara bukan slug → satu hubung. */
function normaliseSlug(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw !== 'string') fail('DEALER_STORE_INPUT_INVALID', 400, 'Slug store tidak sah.');
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/** Struktur minimum yang DealerStores perlukan daripada store. */
interface StoreLike {
  all<T>(kind: string): T[];
  save<T extends { id: string }>(kind: string, record: T): T;
}
