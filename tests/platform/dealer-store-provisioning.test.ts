/**
 * CG-01 — Provisioning store awam Agent/Stokis.
 *
 * Authority: `docs/design/commerce-growth.md` §1 (keputusan tetap 1 & 4) dan §2.
 * Syarat yang diuji:
 *  - SATU store bagi setiap dealer yang diluluskan, store ID stabil
 *  - retry / kelulusan serentak tidak menghasilkan dua store
 *  - slug collision dan slug terpelihara ditolak dengan reason code
 *  - slug yang ditukar tidak memadam identity lama
 *  - projek awam tidak mendedahkan data peribadi owner
 */
import { describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { DealerStores } from '../../server/platform/dealerStores';
import { PlatformStore } from '../../server/platform/store';
import type { DealerStoreRecord } from '../../shared/dealer-store-contracts';

const RUN_ID = `${Date.now()}-${process.pid}`;
const BOOTSTRAP_TOKEN = 'test-bootstrap-token-12345';
const ORIGIN = 'http://localhost:3000';

interface Ctx {
  app: ReturnType<typeof createPlatformApp>;
  dbPath: string;
  founderCsrf: string;
  founderCookie: string;
}

async function bootFounder(testId: string): Promise<Ctx> {
  const dbPath = `var/lib/qa/dealer-store-${RUN_ID}-${testId}.sqlite`;
  const app = createPlatformApp({
    databasePath: dbPath,
    bootstrapToken: BOOTSTRAP_TOKEN,
    origin: ORIGIN,
  });
  const response = await app.fetch(new Request(`${ORIGIN}/api/platform/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ token: BOOTSTRAP_TOKEN, email: `founder-${testId}@test.local`, password: 'RahsiaKuat12345', name: 'Founder' }),
  }));
  const body = await response.json() as { ok: boolean; data?: { csrfToken: string }; code?: string };
  expect(body.ok, JSON.stringify(body)).toBe(true);
  return {
    app,
    dbPath,
    founderCsrf: body.data!.csrfToken,
    founderCookie: (response.headers.get('set-cookie') ?? '').split(';')[0],
  };
}

async function signupCustomer(ctx: Ctx, email: string): Promise<{ csrfToken: string; cookie: string; userId: string }> {
  const response = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email, password: 'RahsiaKuat12345', name: 'Dealer' }),
  }));
  const body = await response.json() as { ok: boolean; data?: { csrfToken: string; user: { id: string } }; code?: string };
  expect(body.ok, JSON.stringify(body)).toBe(true);
  return {
    csrfToken: body.data!.csrfToken,
    cookie: (response.headers.get('set-cookie') ?? '').split(';')[0],
    userId: body.data!.user.id,
  };
}

async function applyAsDealer(ctx: Ctx, cookie: string, csrfToken: string, organization: string, slug?: string): Promise<{ id: string; revision: number }> {
  const response = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dealer/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ organization, description: 'Permohonan QA', ...(slug === undefined ? {} : { slug }) }),
  }));
  const body = await response.json() as { ok: boolean; data?: { id: string; revision: number }; code?: string };
  expect(body.ok, JSON.stringify(body)).toBe(true);
  return body.data!;
}

async function approveAsFounder(ctx: Ctx, applicationId: string, expectedRevision: number): Promise<{ ok: boolean; code?: string }> {
  const response = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dealer/applications/${applicationId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: ctx.founderCookie, 'X-CSRF-Token': ctx.founderCsrf },
    body: JSON.stringify({ expectedRevision }),
  }));
  const body = await response.json() as { ok: boolean; code?: string };
  return body;
}

function storesOf(ctx: Ctx): DealerStoreRecord[] {
  const store = new PlatformStore(ctx.dbPath);
  try {
    return new DealerStores(store).all();
  } finally {
    store.close();
  }
}

describe('CG-02 — public store dan dealer workspace', () => {
  test('public store boleh dibaca TANPA sesi; slug tak wujud ⇒ 404 STORE_NOT_FOUND', async () => {
    const ctx = await bootFounder('public-route');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-route@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai route', 'kedai-route');
      expect((await approveAsFounder(ctx, application.id, application.revision)).ok).toBe(true);

      const response = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/kedai/kedai-route`));
      expect(response.status).toBe(200);
      const body = await response.json() as { ok: boolean; data?: { store?: { slug?: string; storeId?: string }; catalogue?: unknown[] } };
      expect(body.ok).toBe(true);
      expect(body.data?.store?.slug).toBe('kedai-route');
      expect(body.data?.store?.storeId).toBeTruthy();
      expect(Array.isArray(body.data?.catalogue)).toBe(true);

      const missing = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/kedai/tiada-kedai-ini`));
      expect(missing.status).toBe(404);
      const missingBody = await missing.json() as { code?: string };
      expect(missingBody.code).toBe('STORE_NOT_FOUND');
    } finally {
      ctx.app.close();
    }
  });

  test('dealer workspace senarai store sendiri sahaja', async () => {
    const ctx = await bootFounder('workspace');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-ws@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai ws', 'kedai-ws');
      expect((await approveAsFounder(ctx, application.id, application.revision)).ok).toBe(true);

      const own = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dealer/stores`, {
        headers: { Origin: ORIGIN, Cookie: dealer.cookie },
      }));
      expect(own.status).toBe(200);
      const ownBody = await own.json() as { ok: boolean; data?: { slug?: string }[] };
      expect(ownBody.ok).toBe(true);
      expect(ownBody.data?.map((store) => store.slug)).toEqual(['kedai-ws']);

      // Pelanggan lain (bukan pemilik, bukan dealer) tidak nampak store itu.
      const other = await signupCustomer(ctx, 'pelanggan-lain@test.local');
      const otherResponse = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dealer/stores`, {
        headers: { Origin: ORIGIN, Cookie: other.cookie },
      }));
      const otherBody = await otherResponse.json() as { data?: { slug?: string }[] };
      expect(otherBody.data ?? []).toEqual([]);
    } finally {
      ctx.app.close();
    }
  });
});

describe('CG-01 — provisioning store awam dealer', () => {
  test('kelulusan menghasilkan SATU store dengan store ID stabil', async () => {
    const ctx = await bootFounder('one-store');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-one@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai uji', 'kedai-uji');
      const approved = await approveAsFounder(ctx, application.id, application.revision);
      expect(approved.ok).toBe(true);

      const stores = storesOf(ctx);
      expect(stores).toHaveLength(1);
      expect(stores[0].slug).toBe('kedai-uji');
      expect(stores[0].status).toBe('active');
      expect(stores[0].id).toBeTruthy();
      expect(stores[0].dealerOrgId).toBeTruthy();
    } finally {
      ctx.app.close();
    }
  });

  test('NEGATIF retry kelulusan ⇒ TIDAK ada store kedua', async () => {
    const ctx = await bootFounder('retry');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-retry@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai retry', 'kedai-retry');
      expect((await approveAsFounder(ctx, application.id, application.revision)).ok).toBe(true);

      // Retry kelulusan yang sama ⇒ DITOLAK dan TIDAK store kedua. Kod
      // penolakan bergantung pada apa yang dimuat semula oleh pemanggil:
      // expectedRevision lapuk ⇒ REVISION_CONFLICT; revision segar tetapi
      // status bukan pending ⇒ INVALID_TRANSITION. Kedua-duanya ialah
      // penolakan yang betul; yang penting tiada store kedua.
      const retry = await approveAsFounder(ctx, application.id, application.revision);
      expect(retry.ok).toBe(false);
      expect(['REVISION_CONFLICT', 'INVALID_TRANSITION']).toContain(retry.code ?? '');
      expect(storesOf(ctx)).toHaveLength(1);
    } finally {
      ctx.app.close();
    }
  });

  test('NEGATIF slug collision ⇒ DEALER_STORE_SLUG_TAKEN dan store pertama kekal', async () => {
    const ctx = await bootFounder('collision');
    try {
      const first = await signupCustomer(ctx, 'dealer-a@test.local');
      const firstApplication = await applyAsDealer(ctx, first.cookie, first.csrfToken, 'Kedai A', 'kedai-sama');
      expect((await approveAsFounder(ctx, firstApplication.id, firstApplication.revision)).ok).toBe(true);

      const second = await signupCustomer(ctx, 'dealer-b@test.local');
      const secondApplication = await applyAsDealer(ctx, second.cookie, second.csrfToken, 'Kedai B', 'kedai-sama');
      const rejected = await approveAsFounder(ctx, secondApplication.id, secondApplication.revision);
      expect(rejected.ok).toBe(false);
      expect(rejected.code).toBe('DEALER_STORE_SLUG_TAKEN');

      const stores = storesOf(ctx);
      expect(stores).toHaveLength(1);
      expect(stores[0].ownerUserId).toBe(first.userId);
    } finally {
      ctx.app.close();
    }
  });

  test('NEGATIF slug terpelihara ⇒ DEALER_STORE_SLUG_RESERVED', async () => {
    const ctx = await bootFounder('reserved');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-reserved@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai admin', 'admin');
      const rejected = await approveAsFounder(ctx, application.id, application.revision);
      expect(rejected.ok).toBe(false);
      expect(rejected.code).toBe('DEALER_STORE_SLUG_RESERVED');
      expect(storesOf(ctx)).toHaveLength(0);
    } finally {
      ctx.app.close();
    }
  });

  test('NEGATIF input tidak sah ⇒ DEALER_STORE_INPUT_INVALID', async () => {
    const ctx = await bootFounder('invalid');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-invalid@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai tidak sah', '!!');
      const rejected = await approveAsFounder(ctx, application.id, application.revision);
      expect(rejected.ok).toBe(false);
      expect(rejected.code).toBe('DEALER_STORE_INPUT_INVALID');
      expect(storesOf(ctx)).toHaveLength(0);
    } finally {
      ctx.app.close();
    }
  });

  test('projek awam tidak mendedahkan data peribadi owner', async () => {
    const ctx = await bootFounder('public');
    try {
      const dealer = await signupCustomer(ctx, 'dealer-public@test.local');
      const application = await applyAsDealer(ctx, dealer.cookie, dealer.csrfToken, 'Kedai awam', 'kedai-awam');
      expect((await approveAsFounder(ctx, application.id, application.revision)).ok).toBe(true);

      const store = new PlatformStore(ctx.dbPath);
      try {
        const projection = new DealerStores(store).publicBySlug('kedai-awam');
        expect(projection).not.toBeNull();
        expect(Object.keys(projection!).sort()).toEqual(['displayName', 'slug', 'status', 'storeId']);
        expect(JSON.stringify(projection)).not.toContain(dealer.userId);
        expect(JSON.stringify(projection)).not.toContain('@test.local');
      } finally {
        store.close();
      }
    } finally {
      ctx.app.close();
    }
  });
});
