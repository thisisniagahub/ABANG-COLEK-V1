import { describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { unlinkSync } from 'node:fs';

function cleanup(dbPath: string) {
  for (const ext of ['', '-wal', '-shm']) {
    try { unlinkSync(dbPath + ext); } catch { /* ignore */ }
  }
}

async function createTestContext(testId: string) {
  const testDb = `var/lib/qa/product-onboarding-${testId}.sqlite`;
  cleanup(testDb);
  const app = createPlatformApp({
    databasePath: testDb,
    bootstrapToken: 'test-bootstrap-token-12345',
    origin: 'http://localhost:3000',
  });

  // Bootstrap founder
  const bootRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({
      email: `founder-${testId}@test.local`,
      password: 'password123456',
      name: 'Founder Test',
      token: 'test-bootstrap-token-12345',
    }),
  }));
  expect(bootRes.status).toBe(200);
  const bootData = await bootRes.json() as { data: { user: { id: string }; csrfToken: string } };
  const founderCookie = bootRes.headers.get('set-cookie')!;
  const founderCsrf = bootData.data.csrfToken;

  // Create customer user
  const custRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({
      email: `customer-${testId}@test.local`,
      password: 'password123456',
      name: 'Customer Test',
    }),
  }));
  expect(custRes.status).toBe(200);
  const custData = await custRes.json() as { data: { user: { id: string }; csrfToken: string } };
  const custCookie = custRes.headers.get('set-cookie')!;
  const custCsrf = custData.data.csrfToken;

  return { app, founderCookie, founderCsrf, custCookie, custCsrf, testDb };
}

describe('B05 + D07: Product Truth & Safe Onboarding Flow', () => {
  test('rejects artwork and mascots erroneously submitted as sellable product SKUs', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('mascot-rejection');

    const packet = {
      products: [
        {
          sku: 'MASKOT-01',
          name: 'Maskot Gaya 1',
          packSize: 1,
          unitName: 'unit',
          priceSen: 1000,
          description: 'Aset grafik maskot',
          lifecycle: 'draft',
          ownerApproved: false,
          unverifiedFields: [],
          isArtworkOrMascot: true,
        },
      ],
    };

    const res = await app.fetch(new Request('http://localhost:3000/api/platform/onboarding/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify(packet),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.isValid).toBe(false);
    expect(body.data.canCommit).toBe(false);
    expect(body.data.rejectedItems.length).toBe(1);
    expect(body.data.rejectedItems[0].reason).toContain('Artwork dan maskot jenama bukan SKU produk');
    cleanup(testDb);
  });

  test('flags historical RM28 claim when owner approval is absent', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('historical-rm28');

    const packet = {
      products: [
        {
          sku: 'COLEK-ORI',
          name: 'Sambal Colek Original',
          packSize: 1,
          unitName: 'balang',
          priceSen: 2800,
          description: 'Sambal Colek balang',
          lifecycle: 'draft',
          ownerApproved: false,
          unverifiedFields: ['Historical TikTok price'],
        },
      ],
    };

    const res = await app.fetch(new Request('http://localhost:3000/api/platform/onboarding/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify(packet),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.warnings.some((w: string) => w.includes('RM28'))).toBe(true);
    cleanup(testDb);
  });

  test('prevents publishing unapproved product without owner approval', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('unapproved-publish');

    const packet = {
      products: [
        {
          sku: 'COLEK-PEDAS',
          name: 'Sambal Colek Extra Pedas',
          packSize: 1,
          unitName: 'balang',
          priceSen: 2500,
          description: 'Pedas gila',
          lifecycle: 'published',
          ownerApproved: false,
          unverifiedFields: [],
        },
      ],
    };

    const res = await app.fetch(new Request('http://localhost:3000/api/platform/onboarding/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify(packet),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.canCommit).toBe(false);
    expect(body.data.rejectedItems.some((r: any) => r.reason.includes('kelulusan rasmi pemilik'))).toBe(true);
    cleanup(testDb);
  });

  test('commits approved products safely and updates catalogue version', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('commit-approved');

    const packet = {
      products: [
        {
          sku: 'COLEK-ORI-500G',
          name: 'Sambal Colek Asal 500g',
          packSize: 1,
          unitName: 'balang',
          priceSen: 2500,
          description: 'Sambal Colek Asal resipi warisan',
          lifecycle: 'published',
          ownerApproved: true,
          unverifiedFields: [],
        },
      ],
      expectedSettingsVersion: 0,
      locations: [
        {
          id: 'hq',
          name: 'HQ Abang Colek',
          address: 'No 1, Jalan Colek, Kelantan',
          openingStockQuantity: 100,
          approved: true,
          hours: '9-5',
          verifiedAt: '2026-10-18T00:00:00Z',
          batchId: 'BATCH-2026-001',
        },
      ],
    };

    const commitRes = await app.fetch(new Request('http://localhost:3000/api/platform/onboarding/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify(packet),
    }));

    expect(commitRes.status).toBe(200);
    const commitBody = await commitRes.json() as any;
    expect(commitBody.data.committedProductsCount).toBe(1);
    expect(commitBody.data.publishedProductsCount).toBe(1);
    expect(commitBody.data.catalogueVersion).toBeGreaterThan(0);

    // Verify public catalogue now contains this published product with available stock
    const catRes = await app.fetch(new Request('http://localhost:3000/api/platform/catalogue'));
    expect(catRes.status).toBe(200);
    const catBody = await catRes.json() as any;
    expect(catBody.data.length).toBe(1);
    expect(catBody.data[0].name).toBe('Sambal Colek Asal 500g');
    expect(catBody.data[0].priceSen).toBe(2500);
    expect(catBody.data[0].availableQuantity).toBe(100);

    cleanup(testDb);
  });

  test('non-founder actor cannot commit onboarding or access onboarding template', async () => {
    const { app, custCookie, custCsrf, testDb } = await createTestContext('non-founder-denial');

    const templateRes = await app.fetch(new Request('http://localhost:3000/api/platform/onboarding/template', {
      headers: { 'Cookie': custCookie },
    }));
    expect(templateRes.status).toBe(403);

    const commitRes = await app.fetch(new Request('http://localhost:3000/api/platform/onboarding/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': custCookie,
        'x-csrf-token': custCsrf,
      },
      body: JSON.stringify({ products: [] }),
    }));
    expect(commitRes.status).toBe(403);

    cleanup(testDb);
  });
});
