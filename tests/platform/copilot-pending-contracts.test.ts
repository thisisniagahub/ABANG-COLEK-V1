/**
 * Kontrak PENDING — BL-32 (`unknown_outcome`) & BL-28 (id kanonikal terpanjang).
 *
 * Fail ini mengandungi dua kontrak dengan status YANG BERBEZA, dan setiap satu
 * dinyatakan dengan jujur:
 *
 * 1. BL-32 — `unknown_outcome` untuk kesan sisi yang tidak dapat ditentukan.
 *    BELUM diimplementasikan di lapisan server: `rg unknown_outcome server/`
 *    tiada hasil, dan `server/agents/tools/capabilities/governance.ts:188-192`
 *    masih membalikkan cadangan kepada `approved` apabila eksekutor gagal.
 *    Kerana itu ia direkodkan sebagai `test.todo` — konvensyen repo yang sama
 *    seperti `tests/platform/open-gaps.test.ts` (AI-03) — tetapi badannya ialah
 *    ujian LENGKAP yang boleh terus dijalankan (perlu hanya menukar `todo` ->
 *    `test`) sebaik backend mendarat. Tiada assertion dilonggarkan; badan itu
 *    mengandungi assertion sebenar.
 *
 * 2. BL-28 — id kanonikal TERPANJANG menang. Kontrak ini SUDAH diimplementasikan
 *    dalam `shared/order-reference-contracts.ts`, jadi ia diuji sebagai ujian
 *    SEBENAR pada dua lapisan: unit (helper `resolveCanonicalOrderId`) dan
 *    hujung-ke-hujung melalui HTTP `/api/platform/copilot/chat` dengan rekod
 *    pesanan sebenar dalam store platform.
 *
 * Semua nilai wang adalah integer sen dan datang daripada rekod store yang
 * sebenar — tiada amaun rekaan dalam mana-mana assertion.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { createPlatformApp } from '../../server/platform/app';
import { PlatformStore, id, now } from '../../server/platform/store';
import { ToolRegistry } from '../../server/agents/tools/registry';
import { createToolRuntime } from '../../server/agents/tools/runtime';
import { MemoryApprovalStore } from '../../server/agents/approval/store';
import { ExecutorRegistry } from '../../server/agents/executor/registry';
import type { Executor, ExecutorContext, ExecutorResult } from '../../server/agents/executor/types';
import { resolveCanonicalOrderId } from '../../shared/order-reference-contracts';
import type { OrderRecord } from '../../shared/platform-contracts';

// ---------------------------------------------------------------------------
// Bentuk respons chat (hanya medan yang digunakan assertion).
// ---------------------------------------------------------------------------

interface ChatHitlPayload {
  actionType?: string;
  status?: string;
  amountSen?: number;
  entity?: { type?: string; id?: string };
  payload?: Record<string, unknown>;
}

interface ChatA2ui {
  component?: string;
  props?: Record<string, unknown>;
  provenance?: { source?: string };
}

interface ChatResponse {
  hitlAction?: ChatHitlPayload;
  a2ui?: ChatA2ui;
}

// ---------------------------------------------------------------------------
// Pembersih DB — TIDAK menelan ralat: hanya fail yang wujud dipadam.
// Jalur unik bagi setiap larian supaya sisa SQLite lama tidak menjadi
// `409 OWNER_ALREADY_BOOTSTRAPPED` pada larian seterusnya.
// ---------------------------------------------------------------------------

const RUN_TOKEN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DB_PATH = `var/lib/qa/copilot-pending-contracts-${RUN_TOKEN}.sqlite`;

function cleanupDb(path: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = path + suffix;
    if (existsSync(target)) unlinkSync(target);
  }
}

function order(idValue: string, amountSen: number): OrderRecord {
  const stamp = now();
  return {
    id: idValue,
    customerId: 'cust-pending-001',
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

// ===========================================================================
// BL-28 — id kanonikal TERPANJANG menang (bukan AMBIGUOUS).
// Kontrak ini sudah diimplementasikan -> ujian sebenar, bukan todo.
// ===========================================================================

describe('BL-28 — id kanonikal terpanjang menang (kontrak sudah diimplementasikan)', () => {
  const CANONICAL = ['ord-alpha-001', 'ord-001'] as const;

  test('BL-28 unit: dua id hadir, yang TERPANJANG menang dan tiada AMBIGUOUS', () => {
    const resolution = resolveCanonicalOrderId(
      'pesanan ord-alpha-001 dan pesanan ord-001',
      CANONICAL,
    );

    // Lama: implementasi lama menjawab AMBIGUOUS pada pertikaian. Kontrak
    // baharu: id kanonikal terpanjang menang => TIDAK AMBIGUOUS.
    expect(resolution.reason).toBe('ORDER_ID_RESOLVED');
    expect(resolution.reason).not.toBe('ORDER_ID_AMBIGUOUS');
    expect(resolution.orderId).toBe('ord-alpha-001');
    // Kedua-dua id memang hadir, jadi diagnosis tidak boleh menyembunyikan
    // fakta bahawa dua pesanan disebut.
    expect(resolution.matchedOrderIds).toEqual(['ord-alpha-001', 'ord-001']);
  });

  test('BL-28 unit negatives: token separa TIDAK memuzzykan id, dan pertikaian sama panjang GAGAL TUTUP', () => {
    // (a) 'ord-001' sahaja dalam teks: 'ord-alpha-001' tiada sebagai token
    //     penuh, jadi ia TIDAK boleh memuzzykan jawapan.
    const onlyShort = resolveCanonicalOrderId('pesanan ord-001 sahaja', CANONICAL);
    expect(onlyShort.reason).toBe('ORDER_ID_RESOLVED');
    expect(onlyShort.orderId).toBe('ord-001');
    expect(onlyShort.matchedOrderIds).toEqual(['ord-001']);

    // (b) 'ord-0010' ialah token penuh yang BERBEZA — 'ord-001' tidak boleh
    //     memadankannya (tiada padanan prefix).
    const prefixed = resolveCanonicalOrderId('pesanan ord-0010 sahaja', CANONICAL);
    expect(prefixed.reason).toBe('ORDER_ID_NOT_FOUND');
    expect(prefixed.orderId).toBeNull();

    // (c) Pertikaian sama panjang => AMBIGUOUS, tiada pesanan, tiada jumlah.
    const tie = resolveCanonicalOrderId(
      'pesanan ord-aaaa-001 atau pesanan ord-bbbb-001',
      ['ord-aaaa-001', 'ord-bbbb-001'],
    );
    expect(tie.reason).toBe('ORDER_ID_AMBIGUOUS');
    expect(tie.orderId).toBeNull();
    expect(tie.matchedOrderIds).toEqual(['ord-aaaa-001', 'ord-bbbb-001']);
  });
});

// ===========================================================================
// BL-28 — hujung-ke-hujung melalui HTTP dengan rekod pesanan sebenar.
// ===========================================================================

describe('BL-28 — longest canonical id wins (permukaan HTTP sebenar)', () => {
  let app: ReturnType<typeof createPlatformApp>;
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
        email: 'founder-pending-contracts@test.local',
        password: 'password123456',
        name: 'Founder Pending Contracts',
        token: 'qa-token',
      }),
    }));
    expect(boot.status).toBe(200);
    cookie = boot.headers.get('set-cookie')!;
    csrf = (await boot.clone().json() as any).data.csrfToken;

    // Rekod pesanan SEBENAR dalam store platform. 'ord-alpha-001' (7000 sen)
    // dan 'ord-001' (3000 sen) — id yang lebih pendek ialah sufiks id yang
    // lebih panjang, jadi ia ujian yang tepat untuk longest-wins.
    app.store.save('orders', order('ord-alpha-001', 7000));
    app.store.save('orders', order('ord-001', 3000));
    // Dua id sama panjang untuk ujian pertikaian (fail tutup).
    app.store.save('orders', order('ord-aaaa-001', 4100));
    app.store.save('orders', order('ord-bbbb-001', 4200));
  });

  afterAll(() => {
    app.close();
    cleanupDb(DB_PATH);
  });

  test('BL-28 e2e: dua id disebut => amaun datang daripada id TERPANJANG (7000 sen), bukan 3000', async () => {
    const res = await post({
      message:
        'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-alpha-001 dan pesanan ord-001',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as { data: ChatResponse }).data;

    // Permintaan refund masih wujud dan jumlah mesti datang daripada rekod
    // pesanan yang TERPANJANG (ord-alpha-001 => 7000 sen).
    expect(data.hitlAction).toBeDefined();
    expect(data.hitlAction!.actionType).toBe('refund');
    expect(data.hitlAction!.amountSen).toBe(7000);
    expect(data.hitlAction!.entity!.id).toBe('ord-alpha-001');
    expect(data.hitlAction!.payload!.reasonCode).toBe('ORDER_ID_RESOLVED');
    // BUKAN AMBIGUOUS — itu jawapan lama yang menggugurkan wang sepenuhnya.
    expect(data.hitlAction!.payload!.reasonCode).not.toBe('ORDER_ID_AMBIGUOUS');

    // Kad A2UI mesti membawa pesanan yang sama dan amaun yang sama.
    expect(data.a2ui!.component).toBe('RefundImpactPanel');
    expect(data.a2ui!.props!.orderId).toBe('ord-alpha-001');
    expect(data.a2ui!.props!.estimatedImpactSen).toBe(7000);
    expect(data.a2ui!.props!.estimatedImpactSen).not.toBe(3000);
  });

  test('BL-28 e2e negative: hanya id pendek disebut => amaun ikut rekod itu (3000 sen)', async () => {
    const res = await post({
      message:
        'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-001 sahaja',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as { data: ChatResponse }).data;

    // Ini membuktikan amaun dibaca daripada rekod, bukan nilai tetap: id yang
    // berbeza menghasilkan amaun yang berbeza.
    expect(data.hitlAction).toBeDefined();
    expect(data.hitlAction!.entity!.id).toBe('ord-001');
    expect(data.hitlAction!.amountSen).toBe(3000);
    expect(data.hitlAction!.payload!.reasonCode).toBe('ORDER_ID_RESOLVED');
    expect(data.a2ui!.props!.estimatedImpactSen).toBe(3000);
  });

  test('BL-28 e2e negative: pertikaian sama panjang => TIADA pesanan, TIADA jumlah (fail tutup)', async () => {
    const res = await post({
      message:
        'Pelanggan minta refund ganti rugi kerana botol bocor semasa pos untuk pesanan ord-aaaa-001 dan pesanan ord-bbbb-001',
    });
    expect(res.status).toBe(200);
    const data = (await res.json() as { data: ChatResponse }).data;

    // Tiada amaun — bukan 0, bukan mana-m satu daripada dua pesanan.
    expect(data.hitlAction).toBeDefined();
    expect(data.hitlAction!.payload!.reasonCode).toBe('ORDER_ID_AMBIGUOUS');
    expect(data.hitlAction!.amountSen).toBeUndefined();
    expect(data.hitlAction!.entity!.id).toBe('UNRESOLVED');
    expect(data.a2ui!.props!.estimatedImpactSen).toBeUndefined();
    expect(data.a2ui!.props!.orderId).toBe('UNRESOLVED');
  });
});

// ===========================================================================
// BL-32 — `unknown_outcome` untuk kesan sisi yang tidak dapat ditentukan.
//
// BELUM DIIMPLEMENTASIKAN. `rg unknown_outcome server/` tiada hasil, jadi
// tiada laluan sebenar untuk diuji. Ia direkodkan sebagai `test.todo` dengan
// badan ujian lengkap (lihat nota di dalam badan).
// ===========================================================================

describe('BL-32 — unknown outcome untuk kesan sisi yang tidak dapat ditentukan (PENDING IMPLEMENTATION)', () => {
  test.todo('BL-32 — hasil yang tidak dapat ditentukan dilaporkan sebagai unknown_outcome, tiada resit confirmed, cadangan tidak tinggal approved', async () => {
    // ---------------------------------------------------------------------
    // Kontrak yang mesti HOLD apabila backend mendarat:
    //
    //  1. `ExecutorResult` perlu boleh membawa outcome yang tidak tentukan:
    //     medan `outcome` dengan nilai 'unknown_outcome' (nilai 'succeeded'
    //     dan 'failed' TIDAK dibenarkan untuk kes ini).
    //  2. Tool `execute_approved_action` perlu MEMBAWA outcome itu keluar:
    //       - outcome === 'unknown_outcome'
    //       - outcome !== 'succeeded' && outcome !== 'failed'
    //       - satu reason code yang boleh mesin baca mengiringinya.
    //  3. Tiada resit dengan status 'confirmed' boleh dikeluarkan.
    //  4. Cadangan TIDAK boleh dibiarkan berstatus 'approved' — kelulusan
    //     membuta terhadap cadangan yang sama membolehkan refund kedua.
    //
    // Asas sebab masih belum tutup (2026-10-21):
    //  - server/agents/tools/capabilities/governance.ts:188-192: apabila
    //    eksekutor tidak `ok`, cadangan dibalikkan kepada 'approved' supaya
    //    boleh dicuba semula — itulah keadaan "blind approval".
    //  - Tiada state 'unknown_outcome' di server/ mana-mana.
    // ---------------------------------------------------------------------

    const FOUNDER_ID = 'usr-founder-bl32';
    const STAFF_ID = 'usr-staff-bl32';

    const store = new PlatformStore(':memory:');
    const addMembership = (userId: string, role: string): void => {
      store.db
        .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
        .run(userId, `${userId}@example.test`, userId, 'hash', now());
      store.db
        .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
        .run(id(), userId, role, JSON.stringify(['hq']), null, 'active', 1);
    };
    addMembership(FOUNDER_ID, 'founder');
    addMembership(STAFF_ID, 'staff');

    const target = order('ord-bl32-001', 5000);
    store.save('orders', target);

    /**
     * Eksekutor yang tidak boleh memastikan sama ada kesan sisi berlaku:
     * ia MENCETUSKAN refund (t_effect sebenar pada rekod pesanan), kemudian
     * melapor bahawa hasilnya tidak dapat ditentukan.
     */
    class IndeterminateRefundExecutor implements Executor {
      readonly actionType = 'refund.execute';

      async execute(
        payload: Record<string, unknown>,
        context: ExecutorContext,
      ): Promise<ExecutorResult> {
        const orderId = String(payload.orderId ?? '');
        const amountSen = Number(payload.amountSen ?? 0);
        const current = store.get<OrderRecord>('orders', orderId);
        if (!current) {
          return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemui.' };
        }
        // Kesan sisi BENAR berlaku...
        store.save('orders', {
          ...current,
          refundAmountSen: current.refundAmountSen + amountSen,
          revision: current.revision + 1,
          updatedAt: context.at,
        });
        // ...tetapi hasilnya tidak dapat ditentukan.
        return {
          ok: false,
          code: 'EXECUTION_OUTCOME_UNKNOWN',
          message: 'Refund dihantar tetapi hasilnya tidak dapat ditentukan.',
          // Medan baharu: `outcome` belum wujud dalam ExecutorResult.
          outcome: 'unknown_outcome',
        } as unknown as ExecutorResult;
      }
    }

    const approvalStore = new MemoryApprovalStore();
    const executors = new ExecutorRegistry();
    executors.register(new IndeterminateRefundExecutor());
    const runtime = createToolRuntime({ store, approvalStore, executors });
    const registry = new ToolRegistry(6, { runtime });

    const proposalRes = await registry.dispatchTool(
      'propose_refund',
      { orderId: target.id, amountSen: 500, reason: 'Barang rosak' },
      { actorId: STAFF_ID, role: 'staff', runId: 'run-bl32-propose' },
    );
    expect(proposalRes.ok).toBe(true);
    if (!proposalRes.ok) return;
    const proposalId = proposalRes.result.proposalId as string;

    const stored = approvalStore.getProposal(proposalId)!;
    const approval = approvalStore.saveApproval({
      id: id(),
      proposalId,
      scope: stored.scope,
      proposalVersion: stored.version,
      proposalNonce: stored.nonce,
      approverId: FOUNDER_ID,
      approverRole: 'founder',
      status: 'approved',
      version: 1,
      nonce: id(),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      decidedAt: now(),
    });
    approvalStore.saveProposal({ ...stored, status: 'approved', version: approval.proposalVersion });

    const res = await registry.dispatchTool(
      'execute_approved_action',
      { proposalId, approvalId: approval.id },
      { actorId: FOUNDER_ID, role: 'founder', runId: 'run-bl32-execute' },
    );

    // 2. Outcome yang tidak tentukan mesti kebawa keluar — bukan 'succeeded',
    //    bukan 'failed'.
    const bag = (res.ok ? res.result : res) as Record<string, unknown>;
    const outcome = typeof bag.outcome === 'string' ? bag.outcome : undefined;
    expect(outcome).toBe('unknown_outcome');
    expect(outcome).not.toBe('succeeded');
    expect(outcome).not.toBe('failed');

    // Reason code yang boleh mesin baca mesti mengiringi outcome.
    const reasonCode =
      typeof bag.reasonCode === 'string'
        ? bag.reasonCode
        : typeof bag.reason === 'string'
          ? bag.reason
          : undefined;
    expect(typeof reasonCode).toBe('string');
    expect(reasonCode!).toMatch(/^[A-Z][A-Z0-9_]*$/);

    // 3. Tiada resit 'confirmed' — resit 'confirmed' memaksudkan wang sudah
    //    bergerak dan boleh disahkan, yang tidak benar di sini.
    const receipt = approvalStore.findReceiptByProposal(proposalId);
    expect(receipt?.status).not.toBe('confirmed');

    // 4. Cadangan tidak boleh tinggal 'approved' (kelulusan membuta => refund
    //    kedua), dan tidak boleh ditandai 'executed' (tiada resit confirmed).
    const proposalAfter = approvalStore.getProposal(proposalId)!;
    expect(proposalAfter.status).not.toBe('approved');
    expect(proposalAfter.status).not.toBe('executed');
  });
});
