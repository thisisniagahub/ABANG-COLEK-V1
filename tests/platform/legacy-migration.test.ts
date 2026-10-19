import { describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { unlinkSync } from 'node:fs';

function cleanup(dbPath: string) {
  for (const ext of ['', '-wal', '-shm']) {
    try { unlinkSync(dbPath + ext); } catch { /* ignore */ }
  }
}

async function createTestContext(testId: string) {
  const testDb = `var/lib/qa/legacy-mig-${testId}.sqlite`;
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

describe('D04: Legacy Data Maps, Dry-Run Tooling & Rollback', () => {
  const sampleBatch = [
    {
      id: 'supa-01',
      order_id: 'SP-101',
      customer_name: 'Pak Mat',
      city: 'Kota Bharu',
      items: 'Sambal Colek Original (2)',
      amount: 50.00,
      status: 'Delivered',
      created_at: '2026-08-01T10:00:00Z',
    },
    {
      id: 'supa-02',
      order_id: 'SP-102',
      customer_name: 'Kak Yah',
      city: 'Kuantan',
      items: 'Sambal Extra Pedas (1)',
      amount: 25.00,
      status: 'Processing',
      created_at: '2026-08-02T12:00:00Z',
    },
    {
      id: 'supa-03',
      order_id: 'SP-103',
      customer_name: 'Rosli',
      city: 'Ipoh',
      items: 'Sambal',
      amount: -15, // Invalid negative amount
      status: 'Processing',
      created_at: '2026-08-03T14:00:00Z',
    },
    {
      id: 'supa-04',
      order_id: 'SP-101', // Duplicate order_id in same batch
      customer_name: 'Pak Mat Duplicate',
      city: 'Kota Bharu',
      items: 'Sambal',
      amount: 50.00,
      status: 'Delivered',
      created_at: '2026-08-01T10:00:00Z',
    },
  ];

  test('dry-run reports valid candidates and rejects malformed & duplicate rows without mutating DB', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('dry-run');

    const dryRes = await app.fetch(new Request('http://localhost:3000/api/platform/migration/dry-run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({ records: sampleBatch }),
    }));

    expect(dryRes.status).toBe(200);
    const body = await dryRes.json() as any;
    expect(body.data.totalExamined).toBe(4);
    expect(body.data.validCandidatesCount).toBe(2);
    expect(body.data.rejectedCount).toBe(2);
    expect(body.data.projectedTotalSen).toBe(7500); // 5000 + 2500 sen
    expect(body.data.projectedVerifiedPaidSen).toBe(0); // Historical delivery does not prove payment

    // Confirm DB still has 0 orders (dry-run does not write)
    const ordersRes = await app.fetch(new Request('http://localhost:3000/api/platform/orders', {
      headers: { 'Cookie': founderCookie },
    }));
    const ordersBody = await ordersRes.json() as any;
    expect(ordersBody.data.length).toBe(0);

    cleanup(testDb);
  });

  test('execute import commits valid rows, creates MigrationReceipt, and updates orders', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('import-commit');

    const importRes = await app.fetch(new Request('http://localhost:3000/api/platform/migration/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({ records: sampleBatch }),
    }));

    expect(importRes.status).toBe(200);
    const body = await importRes.json() as any;
    expect(body.data.importedCount).toBe(2);
    expect(body.data.totalValueSen).toBe(7500);
    expect(body.data.status).toBe('committed');

    const receiptId = body.data.id;

    // Verify orders are now present in platform store
    const ordersRes = await app.fetch(new Request('http://localhost:3000/api/platform/orders', {
      headers: { 'Cookie': founderCookie },
    }));
    const ordersBody = await ordersRes.json() as any;
    expect(ordersBody.data.length).toBe(2);
    expect(ordersBody.data.some((o: any) => o.id === 'LEGACY-SP-101')).toBe(true);
    expect(ordersBody.data.some((o: any) => o.id === 'LEGACY-SP-102')).toBe(true);

    // Rollback test
    const rollbackRes = await app.fetch(new Request(`http://localhost:3000/api/platform/migration/rollback/${receiptId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: '{}',
    }));

    expect(rollbackRes.status).toBe(200);
    const rollbackBody = await rollbackRes.json() as any;
    expect(rollbackBody.data.status).toBe('rolled_back');

    // Confirm imported orders are cleanly removed
    const postRollbackRes = await app.fetch(new Request('http://localhost:3000/api/platform/orders', {
      headers: { 'Cookie': founderCookie },
    }));
    const postOrders = await postRollbackRes.json() as any;
    expect(postOrders.data.length).toBe(0);

    cleanup(testDb);
  });

  test('non-founder actor is denied from migration endpoints', async () => {
    const { app, custCookie, custCsrf, testDb } = await createTestContext('non-founder-denial');

    const dryRes = await app.fetch(new Request('http://localhost:3000/api/platform/migration/dry-run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': custCookie,
        'x-csrf-token': custCsrf,
      },
      body: JSON.stringify({ records: sampleBatch }),
    }));
    expect(dryRes.status).toBe(403);

    const importRes = await app.fetch(new Request('http://localhost:3000/api/platform/migration/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': custCookie,
        'x-csrf-token': custCsrf,
      },
      body: JSON.stringify({ records: sampleBatch }),
    }));
    expect(importRes.status).toBe(403);

    cleanup(testDb);
  });
});
