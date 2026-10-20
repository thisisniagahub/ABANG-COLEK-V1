/**
 * BL-29 — Ujian negatif untuk kegagalan bertyped + resolusi order-id.
 *
 * Kontrak yang diuji (dilUtfkan oleh lane backend; bentuknya tetap):
 *
 * 1. KEGALIHAN MARGIN BERTYPED
 *    `{ ok: false, reason: 'MARGIN_INPUTS_NOT_PROVIDED' | 'MARGIN_INPUTS_INVALID',
 *       invalidKeys: string[] }`
 *    — lapisan HTTP TIDAK boleh bocorkan `TypeError` / `RangeError` mentah.
 *
 * 2. RESOLUSI ORDER-ID
 *    — id pesanan kanonikal hanya dipadankan sebagai TOKEN LENGKAP;
 *    — id yang tidak boleh diselesaikan ⇒ TIADA jumlah + reason code
 *      yang boleh dibaca mesin (bukan `0`, bukan pesanan separa);
 *    — intent refund adalah negation-aware: "jangan refund" / "do not refund" /
 *      "no refund" TIDAK boleh mencetuskan refund.
 *
 * Semua ujian memandangkan rekod pesanan SEBENAR dalam store platform — tiada
 * nilai wang rekaan.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { createPlatformApp } from '../../server/platform/app';
import { parseMarginSimulationInput } from '../../server/platform/marginInputs';
import type { OrderRecord } from '../../shared/platform-contracts';

const DB_PATH = `var/lib/qa/copilot-typed-failures-${Date.now()}.sqlite`;

/** Pembersih tidak menelan ralat: hanya fail yang wujud dipadam. */
function cleanupDb(path: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = path + suffix;
    if (existsSync(target)) unlinkSync(target);
  }
}

function order(id: string, amountSen: number): OrderRecord {
  const stamp = new Date().toISOString();
  return {
    id,
    customerId: 'cust-typed-001',
    lines: [],
    amountSen,
    fulfilment: 'delivery',
    contactRef: 'Ahmad Colek, 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'dispatched',
    revision: 1,
    paymentState: 'verified',
    paidAmountSen: amountSen,
    refundAmountSen: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

type App = ReturnType<typeof createPlatformApp>;

describe('BL-29 — kegagalan margin bertyped', () => {
  test('Tiada input komersial => MARGIN_INPUTS_NOT_PROVIDED dengan kunci yang hilang', () => {
    const result = parseMarginSimulationInput({});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('MARGIN_INPUTS_NOT_PROVIDED dijangka, tetapi input diterima');
    expect(result.reason).toBe('MARGIN_INPUTS_NOT_PROVIDED');
    // Kunci wajib yang hilang mesti dinamakan, bukan disembunyikan.
    expect(result.invalidKeys).toContain('netSalesExTaxSen');
    expect(result.invalidKeys).toContain('cogsSen');
    expect(result.invalidKeys).toContain('minimumContributionMarginPct');
  });

  test('Input rosak => MARGIN_INPUTS_INVALID + invalidKeys yang menunjuk key sebenarnya', () => {
    // Pecahan sen: `cogsSen` mesti integer sen.
    const fractional = parseMarginSimulationInput({
      netSalesExTaxSen: 10000,
      cogsSen: 12.5,
      minimumContributionMarginPct: 25,
    });
    expect(fractional.ok).toBe(false);
    if (fractional.ok) throw new Error('MARGIN_INPUTS_INVALID dijangka, tetapi input diterima');
    expect(fractional.reason).toBe('MARGIN_INPUTS_INVALID');
    expect(fractional.invalidKeys).toContain('cogsSen');

    // Sen negatif.
    const negative = parseMarginSimulationInput({
      netSalesExTaxSen: 10000,
      cogsSen: -1,
      minimumContributionMarginPct: 25,
    });
    expect(negative.ok).toBe(false);
    if (negative.ok) throw new Error('MARGIN_INPUTS_INVALID dijangka, tetapi input diterima');
    expect(negative.reason).toBe('MARGIN_INPUTS_INVALID');
    expect(negative.invalidKeys).toContain('cogsSen');

    // Peratusan di luar 0..100.
    const badPct = parseMarginSimulationInput({
      netSalesExTaxSen: 10000,
      cogsSen: 6000,
      minimumContributionMarginPct: 500,
    });
    expect(badPct.ok).toBe(false);
    if (badPct.ok) throw new Error('MARGIN_INPUTS_INVALID dijangka, tetapi input diterima');
    expect(badPct.reason).toBe('MARGIN_INPUTS_INVALID');
    expect(badPct.invalidKeys).toContain('minimumContributionMarginPct');

    // Nilai bukan nombor.
    const notNumber = parseMarginSimulationInput({
      netSalesExTaxSen: 'bukan nombor',
      cogsSen: 6000,
      minimumContributionMarginPct: 25,
    });
    expect(notNumber.ok).toBe(false);
    if (notNumber.ok) throw new Error('MARGIN_INPUTS_INVALID dijangka, tetapi input diterima');
    expect(notNumber.reason).toBe('MARGIN_INPUTS_INVALID');
    expect(notNumber.invalidKeys).toContain('netSalesExTaxSen');
  });
});

describe('BL-29 — resolusi order-id & intent refund (permukaan HTTP sebenar)', () => {
  let app: App;
  let cookie: string;
  let csrf: string;

  const post = (body: unknown) =>
    app.fetch(new Request('http://localhost:3000/api/platform/copilot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
        Cookie: cookie,
        'x-csrf-token': csrf,
      },
      body: JSON.stringify(body),
    }));

  beforeAll(async () => {
    cleanupDb(DB_PATH);
    app = createPlatformApp({
      databasePath: DB_PATH,
      bootstrapToken: 'qa-token',
      origin: 'http://localhost:3000',
    });

    const boot = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({
        email: 'founder-typed-failures@test.local',
        password: 'password123456',
        name: 'Founder Typed Failures',
        token: 'qa-token',
      }),
    }));
    expect(boot.status).toBe(200);
    cookie = boot.headers.get('set-cookie')!;
    csrf = (await boot.clone().json() as any).data.csrfToken;

    // Rekod pesanan sebenar dalam store platform.
    app.store.save('orders', order('ord-exact-001', 4200));
    app.store.save('orders', order('ord-tiada-000', 9999));
  });

  afterAll(() => {
    app.close();
    cleanupDb(DB_PATH);
  });

  test('Kawalan: order-id kanonikal yang lengkapi resolve dan jumlah datang daripada rekod', async () => {
    const res = await post({
      message: 'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-exact-001',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as any).data;

    // Permintaan refund memang dikesan → HITL wujud.
    expect(data.hitlAction).toBeDefined();
    expect(data.hitlAction.actionType).toBe('refund');
    expect(data.hitlAction.status).toBe('pending_approval');
    // Jumlah mesti datang daripada rekod pesanan (4200), bukan rekaan.
    expect(data.hitlAction.amountSen).toBe(4200);
    // lama: 'ORDER_RESOLVED' — itu pra-BL-28; kontrak baharu guna reason code
    // 'ORDER_ID_*' daripada shared/order-reference-contracts.ts.
    expect(data.hitlAction.payload.reasonCode).toBe('ORDER_ID_RESOLVED');
    expect(data.hitlAction.entity.id).toBe('ord-exact-001');
    expect(data.a2ui.component).toBe('RefundImpactPanel');
    expect(data.a2ui.props.estimatedImpactSen).toBe(4200);
    expect(data.a2ui.props.orderId).toBe('ord-exact-001');
  });

  test('Token separa TIDAK boleh menyelesaikan pesanan — tiada jumlah, bukan 0', async () => {
    // 'ord-exact-00' ialah token separa, bukan id kanonikal yang lengkap.
    const res = await post({
      message: 'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-exact-00',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as any).data;

    // Permintaan refund masih wujud, tetapi pesanan TIDAK boleh dikenal pasti.
    expect(data.hitlAction).toBeDefined();
    // lama: 'ORDER_NOT_IDENTIFIABLE' — pra-BL-28. 'ord-exact-00' bukan token
    // penuh, jadi id tiada dalam teks => ORDER_ID_NOT_FOUND (bukan AMBIGUOUS:
    // hanya satu id kanonikal yang hadir, jadi tiada pertikaian).
    expect(data.hitlAction.payload.reasonCode).toBe('ORDER_ID_NOT_FOUND');
    // Tiada jumlah — dan Certainly bukan 0 (0 ialah bayaran palsu).
    expect(data.hitlAction.amountSen).toBeUndefined();
    expect(data.hitlAction.payload.amountSen).toBeUndefined();
    expect(data.a2ui.props.estimatedImpactSen).toBeUndefined();
    expect(data.a2ui.props.orderId).toBe('UNRESOLVED');
    // Dan tiada jumlah pesanan lain yang tersekat padanya.
    expect(JSON.stringify(data)).not.toContain('4200');
    expect(JSON.stringify(data)).not.toContain('9999');
  });

  test('Order-id yang tidak wujud => reason code + TIDAK ADA jumlah (bukan 0, bukan pesanan separa)', async () => {
    const res = await post({
      message: 'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-hilang-7777',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as any).data;

    expect(data.hitlAction).toBeDefined();
    // lama: 'ORDER_NOT_IDENTIFIABLE' — pra-BL-28. Id 'ord-hilang-7777' tiada
    // langsung dalam store => ORDER_ID_NOT_FOUND, tiada pesanan, tiada jumlah.
    expect(data.hitlAction.payload.reasonCode).toBe('ORDER_ID_NOT_FOUND');
    expect(data.hitlAction.amountSen).toBeUndefined();
    expect(data.a2ui.props.estimatedImpactSen).toBeUndefined();
    expect(data.a2ui.props.orderId).toBe('UNRESOLVED');
    // Provenans mestinya "hanya permintaan", bukan "bacaan store".
    expect(data.a2ui.provenance.source).toBe('jev_local_rules');
  });

  test('Intent refund adalah negation-aware — "jangan/tidak/do not/no refund" TIDAK refund', async () => {
    const negated = [
      'Pelanggan tidak mahu refund, jangan refund kerana botol bocor semasa pos',
      'Customer do not refund, the bottle bocor during delivery',
      'No refund needed, bottle bocor in the parcel',
      'This order was not refunded, the bottle bocor during pos',
    ];
    for (const message of negated) {
      const res = await post({ message });
      expect(res.status).toBe(200);
      const data = (await res.json() as any).data;
      // Tiada tindakan refund boleh dicetuskan oleh ayat yang ditolak.
      expect(data.hitlAction).toBeUndefined();
      expect(data.a2ui?.component).toBe('JevAssessmentCard');
      expect(data.a2ui?.component).not.toBe('RefundImpactPanel');
    }
  });

  test('Kawalan: permintaan refund POSITIF tetap mencetuskan refund', async () => {
    const res = await post({
      message: 'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as any).data;
    expect(data.hitlAction).toBeDefined();
    expect(data.hitlAction.actionType).toBe('refund');
  });

  test('Permukaan HTTP tidak bocorkan TypeError/RangeError mentah untuk input margin rosak', async () => {
    const res = await post({
      message: 'Bolehkah saya buat kempen diskaun margin sekarang? netSalesExTaxSen=10000 cogsSen=12.5 minimumContributionMarginPct=25',
    });
    expect(res.status).toBe(200);
    const raw = await res.text();
    const data = JSON.parse(raw).data;

    // Kad margin muncul sebagai "tidak disimulasikan" dengan reason codetyped.
    expect(data.a2ui.component).toBe('MarginSummaryCard');
    expect(data.a2ui.props.simulationPerformed).toBe(false);
    expect(data.a2ui.props.reasonCode).toBe('MARGIN_INPUTS_INVALID');
    // Tiada margin lulus dipaparkan.
    expect(data.a2ui.props.contributionMarginPct).toBeUndefined();
    expect(data.a2ui.props.contributionSen).toBeUndefined();
    expect(data.generativeUi).toBeUndefined();

    // Tiada ralat JS mentah yang bocor ke lapisan HTTP.
    expect(raw).not.toContain('TypeError');
    expect(raw).not.toContain('RangeError');
    expect(raw).not.toContain('is not a function');
    expect(raw).not.toContain('Cannot read');
  });

  test('Permukaan HTTP melaporkan MARGIN_INPUTS_NOT_PROVIDED apabila tiada input komersial', async () => {
    const res = await post({ message: 'Bolehkah saya buat kempen diskaun margin sekarang?' });
    expect(res.status).toBe(200);
    const raw = await res.text();
    const data = JSON.parse(raw).data;

    expect(data.a2ui.component).toBe('MarginSummaryCard');
    expect(data.a2ui.props.simulationPerformed).toBe(false);
    expect(data.a2ui.props.reasonCode).toBe('MARGIN_INPUTS_NOT_PROVIDED');
    expect(raw).not.toContain('TypeError');
    expect(raw).not.toContain('RangeError');
  });
});
