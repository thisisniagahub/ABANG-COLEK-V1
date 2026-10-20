import { afterAll, describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('C05: Multi-Role End-to-End Business Journeys', () => {
  /**
   * Laluan tetap `var/lib/qa/business-journeys.sqlite` dikongsi antara larian
   * DAN antara proses `bun test` yang berjalan serentak. Pada Windows fail
   * SQLite yang masih dibuka TIDAK boleh dipadam, jadi baris
   * `owner_bootstrapped` daripada larian sebelumnya boleh tinggal di dalam
   * fail dan bootstrap seterusnya membalas 409 `OWNER_ALREADY_BOOTSTRAPPED` —
   * kegagalan palsu, bukan pepijat produk.
   *
   * `mkdtempSync` memberi direktori unik bagi setiap larian/proses, jadi dua
   * larian tidak mungkin pernah meminta fail SQLite yang sama.
   */
  const directory = mkdtempSync(join(tmpdir(), 'abangcolek-business-journeys-'));
  const dbPath = join(directory, 'business-journeys.sqlite');
  /** Jaring keselamatan: aplikasi ditutup walaupun ujian gagal di tengah. */
  const opened: Array<ReturnType<typeof createPlatformApp>> = [];

  afterAll(() => {
    for (const app of opened.splice(0)) {
      try { app.close(); } catch { /* sudah ditutup oleh ujian */ }
    }
    try { rmSync(directory, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  test('All four platform roles successfully complete their end-to-end commercial journeys', async () => {
    const app = createPlatformApp({
      databasePath: dbPath,
      bootstrapToken: 'journey-token-77777',
      origin: 'http://localhost:3000',
    });
    opened.push(app);

    // ==========================================
    // 1. SETUP: Bootstrap Founder
    // ==========================================
    const bootRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'founder-journey@test.local',
        password: 'password123456',
        name: 'Haji Colek Founder',
        token: 'journey-token-77777',
      }),
    }));
    expect(bootRes.status).toBe(200);
    const bootData = await bootRes.json() as { data: { user: { id: string }; csrfToken: string } };
    const founderCookie = bootRes.headers.get('set-cookie')!;
    const founderCsrf = bootData.data.csrfToken;

    // Founder publishes a product to catalogue
    const prodRes = await app.fetch(new Request('http://localhost:3000/api/platform/catalogue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
      },
      body: JSON.stringify({
        name: 'Sambal Colek Premium 250g',
        description: 'Resepi warisan turun-temurun',
        priceSen: 1500,
        packSize: 1,
        publish: true,
      }),
    }));
    expect(prodRes.status).toBe(200);
    const prodData = await prodRes.json() as { data: { id: string } };
    const productId = prodData.data.id;

    // Founder receives stock into inventory so orders can be fulfilled
    const receiveRes = await app.fetch(new Request('http://localhost:3000/api/platform/inventory/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
        'Idempotency-Key': 'receive-stock-lot-12345',
      },
      body: JSON.stringify({
        productId,
        ownerId: 'business',
        locationId: 'hq',
        quantity: 100,
        reason: 'Penerimaan stok kumpulan pertama',
        status: 'available',
        batchId: 'BATCH-2026-001',
        expiryAt: '2027-12-31T00:00:00.000Z',
      }),
    }));
    expect(receiveRes.status).toBe(200);

    // ==========================================
    // 2. CUSTOMER JOURNEY
    // ==========================================
    // Customer signs up
    const custSignupRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'customer-journey@test.local',
        password: 'password123456',
        name: 'Ahmad Pelanggan',
      }),
    }));
    expect(custSignupRes.status).toBe(200);
    const custData = await custSignupRes.json() as { data: { user: { id: string }; csrfToken: string } };
    const customerCookie = custSignupRes.headers.get('set-cookie')!;
    const customerCsrf = custData.data.csrfToken;

    // Browse catalogue
    const catRes = await app.fetch(new Request('http://localhost:3000/api/platform/catalogue', {
      method: 'GET',
    }));
    expect(catRes.status).toBe(200);
    const catList = await catRes.json() as { data: Array<{ id: string; availableQuantity: number }> };
    const foundProd = catList.data.find(p => p.id === productId);
    expect(foundProd).toBeDefined();
    expect(foundProd!.availableQuantity).toBeGreaterThanOrEqual(100);

    // Get a quote
    const quoteRes = await app.fetch(new Request('http://localhost:3000/api/platform/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': customerCookie,
        'X-CSRF-Token': customerCsrf,
      },
      body: JSON.stringify({
        lines: [{ productId, quantity: 2 }],
        catalogueVersion: 1,
        fulfilment: 'delivery',
        contactRef: '+60123456789',
        outletId: 'hq',
      }),
    }));
    expect(quoteRes.status).toBe(200);
    const quoteData = await quoteRes.json() as { data: { id: string; totalSen: number } };
    expect(quoteData.data.totalSen).toBe(3000);

    // Submit order
    const orderRes = await app.fetch(new Request('http://localhost:3000/api/platform/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': customerCookie,
        'X-CSRF-Token': customerCsrf,
        'Idempotency-Key': 'order-submit-journey-123',
      },
      body: JSON.stringify({
        lines: [{ productId, quantity: 2 }],
        catalogueVersion: 1,
        fulfilment: 'delivery',
        contactRef: '+60123456789, No 12 Jalan Sambal Padu, Batu Pahat',
        outletId: 'hq',
      }),
    }));
    expect(orderRes.status).toBe(200);
    const orderData = await orderRes.json() as { data: { id: string; revision: number } };
    const orderId = orderData.data.id;

    // Founder creates evidence of payment receipt
    const evRes = await app.fetch(new Request('http://localhost:3000/api/platform/evidence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
      },
      body: JSON.stringify({
        entityId: orderId,
        name: 'Resit Bayaran DuitNow',
        mimeType: 'image/png',
        size: 1024,
      }),
    }));
    expect(evRes.status).toBe(200);
    const evData = await evRes.json() as { data: { id: string } };

    // Founder verifies order payment
    const payRes = await app.fetch(new Request(`http://localhost:3000/api/platform/orders/${orderId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
        'Idempotency-Key': 'payment-verify-journey-123',
      },
      body: JSON.stringify({
        action: 'verify',
        amountSen: 3000,
        reference: 'TRX-DUITNOW-001',
        evidenceIds: [evData.data.id],
        method: 'bank',
        expectedRevision: orderData.data.revision,
      }),
    }));
    expect(payRes.status).toBe(200);

    // Customer creates support case
    const caseRes = await app.fetch(new Request('http://localhost:3000/api/platform/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': customerCookie,
        'X-CSRF-Token': customerCsrf,
        'Idempotency-Key': 'case-submit-journey-123',
      },
      body: JSON.stringify({
        orderId,
        subject: 'Pertanyaan status penghantaran sambal',
        description: 'Bila pesanan saya akan dihantar keluar dari Batu Pahat?',
      }),
    }));
    expect(caseRes.status).toBe(200);

    // ==========================================
    // 3. STAFF JOURNEY
    // ==========================================
    // Signup Staff
    const staffSignupRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'staff-journey@test.local',
        password: 'password123456',
        name: 'Siti Operasi Staff',
      }),
    }));
    expect(staffSignupRes.status).toBe(200);
    const staffSignupData = await staffSignupRes.json() as { data: { user: { id: string }; csrfToken: string } };
    const staffUserId = staffSignupData.data.user.id;

    // Founder grants staff role
    const grantStaffRes = await app.fetch(new Request('http://localhost:3000/api/platform/people/grants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
      },
      body: JSON.stringify({
        userId: staffUserId,
        role: 'staff',
        outletIds: ['hq'],
        expectedVersion: 0,
      }),
    }));
    expect(grantStaffRes.status).toBe(200);

    // Staff logs in to get staff session
    const staffLoginRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'staff-journey@test.local',
        password: 'password123456',
      }),
    }));
    expect(staffLoginRes.status).toBe(200);
    const staffLoginData = await staffLoginRes.json() as { data: { csrfToken: string } };
    const staffCookie = staffLoginRes.headers.get('set-cookie')!;
    const staffCsrf = staffLoginData.data.csrfToken;

    // Staff opens shift
    const shiftRes = await app.fetch(new Request('http://localhost:3000/api/platform/shifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': staffCookie,
        'X-CSRF-Token': staffCsrf,
      },
      body: JSON.stringify({
        outletId: 'hq',
        staffIds: [staffUserId],
        openingCount: 50,
      }),
    }));
    expect(shiftRes.status).toBe(200);
    const shiftData = await shiftRes.json() as { data: { id: string; revision: number } };
    const shiftId = shiftData.data.id;

    // Staff creates day close record
    const dayCloseRes = await app.fetch(new Request('http://localhost:3000/api/platform/dayclose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': staffCookie,
        'X-CSRF-Token': staffCsrf,
      },
      body: JSON.stringify({
        outletId: 'hq',
        date: new Date().toISOString().slice(0, 10),
        countCashSen: 0,
      }),
    }));
    expect(dayCloseRes.status).toBe(200);
    const dayCloseData = await dayCloseRes.json() as { data: { id: string; revision: number } };

    // Staff hands off shift
    const handoffRes = await app.fetch(new Request(`http://localhost:3000/api/platform/shifts/${shiftId}/handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': staffCookie,
        'X-CSRF-Token': staffCsrf,
      },
      body: JSON.stringify({
        closingCount: 50,
        handoffNote: 'Semua operasi berjalan lancar. Stok sambal selamat.',
        expectedRevision: shiftData.data.revision,
      }),
    }));
    expect(handoffRes.status).toBe(200);

    // ==========================================
    // 4. FOUNDER JOURNEY
    // ==========================================
    // Founder inspects overview
    const overviewRes = await app.fetch(new Request('http://localhost:3000/api/platform/overview', {
      method: 'GET',
      headers: { 'Cookie': founderCookie },
    }));
    expect(overviewRes.status).toBe(200);
    const overviewData = await overviewRes.json() as { data: { orders: number; openCases: number } };
    expect(overviewData.data.orders).toBeGreaterThanOrEqual(1);
    expect(overviewData.data.openCases).toBeGreaterThanOrEqual(1);

    // Founder reviews decisions hub
    const decisionsRes = await app.fetch(new Request('http://localhost:3000/api/platform/decisions', {
      method: 'GET',
      headers: { 'Cookie': founderCookie },
    }));
    expect(decisionsRes.status).toBe(200);
    const decisionsData = await decisionsRes.json() as { data: { cases: unknown[]; dayclose: unknown[] } };
    expect(decisionsData.data.cases.length).toBeGreaterThanOrEqual(1);
    expect(decisionsData.data.dayclose.length).toBeGreaterThanOrEqual(1);

    // Founder approves day close
    const approveDayCloseRes = await app.fetch(new Request(`http://localhost:3000/api/platform/dayclose/${dayCloseData.data.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
      },
      body: JSON.stringify({
        reason: 'Selesai disemak dan disahkan tanpa percanggahan tunai.',
        expectedRevision: dayCloseData.data.revision,
      }),
    }));
    expect(approveDayCloseRes.status).toBe(200);

    // Founder exports reports
    const exportRes = await app.fetch(new Request('http://localhost:3000/api/platform/reports/export?kind=orders', {
      method: 'GET',
      headers: { 'Cookie': founderCookie },
    }));
    expect(exportRes.status).toBe(200);
    const exportData = await exportRes.json() as { data: { content: string; recordCount: number } };
    expect(exportData.data.recordCount).toBeGreaterThanOrEqual(1);
    expect(exportData.data.content).toContain('amountSen');

    // ==========================================
    // 5. DEVELOPER JOURNEY
    // ==========================================
    // Signup Developer
    const devSignupRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'developer-journey@test.local',
        password: 'password123456',
        name: 'Danial Developer System',
      }),
    }));
    expect(devSignupRes.status).toBe(200);
    const devSignupData = await devSignupRes.json() as { data: { user: { id: string } } };
    const devUserId = devSignupData.data.user.id;

    // Founder grants developer role
    const grantDevRes = await app.fetch(new Request('http://localhost:3000/api/platform/people/grants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
      },
      body: JSON.stringify({
        userId: devUserId,
        role: 'developer',
        outletIds: [],
        expectedVersion: 0,
      }),
    }));
    expect(grantDevRes.status).toBe(200);

    // Developer logs in
    const devLoginRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'developer-journey@test.local',
        password: 'password123456',
      }),
    }));
    expect(devLoginRes.status).toBe(200);
    const devCookie = devLoginRes.headers.get('set-cookie')!;

    // Developer checks system health
    const healthRes = await app.fetch(new Request('http://localhost:3000/api/platform/health', {
      method: 'GET',
      headers: { 'Cookie': devCookie },
    }));
    expect(healthRes.status).toBe(200);
    const healthData = await healthRes.json() as { data: Array<{ component: string; status: string }> };
    expect(healthData.data.some(h => h.component === 'platform_database' && h.status === 'ready')).toBe(true);

    // Developer runs legacy migration dry run
    const dryRunRes = await app.fetch(new Request('http://localhost:3000/api/platform/migration/dry-run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'X-CSRF-Token': founderCsrf,
      },
      body: JSON.stringify({
        records: [
          {
            id: 'supa-99',
            order_id: 'SP-999',
            customer_name: 'Pak Mat Legacy',
            city: 'Kota Bharu',
            items: 'Sambal Colek Original (2)',
            amount: 50.00,
            status: 'Delivered',
            created_at: '2026-08-01T10:00:00Z',
          },
        ],
      }),
    }));
    expect(dryRunRes.status).toBe(200);
    const dryRunData = await dryRunRes.json() as { data: { validCandidatesCount: number } };
    expect(dryRunData.data.validCandidatesCount).toBe(1);

    // Tutup aplikasi SEBELUM memadam fail: pada Windows fail SQLite yang
    // masih dibuka tidak boleh dipadam, jadi handle yang tertinggal akan
    // menjadikan larian seterusnya membaca fail basi (409).
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
