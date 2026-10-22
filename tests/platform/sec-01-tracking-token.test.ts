/**
 * SEC-01 — token penjejakan: hashed at rest, tempoh hidup mengikut handover,
 * laluan revocation, tiada bocor.
 */
import { describe, expect, test } from 'bun:test';
import { PlatformStore, now } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { hash } from '../../server/platform/auth';
import { Commerce } from '../../server/platform/commerce';
import { resolvePublicTrackingProjection } from '../../server/platform/publicOrderProjection';
import type { OrderRecord } from '../../shared/platform-contracts';

const CUSTOMER_ID = 'cust-sec-001';
const TOKEN = 'token-sec-001';

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const stamp = now();
  return {
    id: 'ord-sec-001',
    customerId: CUSTOMER_ID,
    lines: [],
    amountSen: 4200,
    fulfilment: 'pickup',
    contactRef: 'Ahmad Colek, 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'requested',
    revision: 1,
    paymentState: 'verified',
    paidAmountSen: 4200,
    refundAmountSen: 0,
    trackingTokenHash: hash(TOKEN),
    trackingTokenExpiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function harness(role: 'customer' | 'staff' = 'customer'): { store: PlatformStore; commerce: Commerce; actor: ReturnType<Auth['resolve']> } {
  const store = new PlatformStore(':memory:');
  // Aktor boleh jadi pelanggan (pembatalan diri sendiri) atau staf (handover).
  const actorId = role === 'staff' ? 'usr-sec-staff' : CUSTOMER_ID;
  store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(actorId, `${actorId}@example.test`, 'Aktor', 'hash', now());
  store.db.query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(`mem-sec-${role}`, actorId, role, JSON.stringify(role === 'staff' ? ['hq'] : []), null, 'active', 1);
  const auth = new Auth(store);
  const commerce = new Commerce(store, auth);
  // Sesi sebenar supaya `auth.resolve` mendapat principals (bukan header reka).
  store.db
    .query('INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at,revoked,csrf_token) VALUES(?,?,?,?,0,?)')
    .run(hash('session-token'), actorId, hash('csrf'), new Date(Date.now() + 3_600_000).toISOString(), 'csrf');
  const actor = auth.resolve({
    headers: { get: (name: string) => (name.toLowerCase() === 'cookie' ? 'platform_session=session-token' : null) },
  } as never);
  return { store, commerce, actor };
}

describe('SEC-01 — token penjejakan: hashing, handover, revocation', () => {
  test('token disimpan sebagai HASH sahaja (tiada token mentah di store)', () => {
    const { store } = harness();
    try {
      store.save('orders', order());
      const stored = store.get<OrderRecord>('orders', 'ord-sec-001');
      expect(stored?.trackingTokenHash).toBe(hash(TOKEN));
      expect(stored?.trackingTokenHash).not.toBe(TOKEN);
      expect(JSON.stringify(stored)).not.toContain(TOKEN);
    } finally {
      store.close();
    }
  });

  test('NEGATIF token dicabut ⇒ unjuran awam tidak lagi dibina', () => {
    const { store } = harness();
    try {
      store.save('orders', order({ trackingTokenRevokedAt: now() }));
      const outcome = resolvePublicTrackingProjection(TOKEN, store);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('TRACKING_TOKEN_REVOKED');
    } finally {
      store.close();
    }
  });

  test('NEGATIF revocation kedua ⇒ TRACKING_TOKEN_ALREADY_REVOKED (idempoten, bukan reka)', () => {
    const { store, commerce, actor } = harness();
    try {
      store.save('orders', order());
      const first = commerce.revokeTrackingToken(actor!, 'ord-sec-001');
      expect(first.trackingTokenRevokedAt).toBeTruthy();
      let code = '';
      try {
        commerce.revokeTrackingToken(actor!, 'ord-sec-001');
      } catch (error) {
        code = (error as { code?: string }).code ?? '';
      }
      expect(code).toBe('TRACKING_TOKEN_ALREADY_REVOKED');
    } finally {
      store.close();
    }
  });

  test('handover memperbaharui tempoh token (bukan penciptaan sahaja)', () => {
    // Handover ialah operasi staf, bukan pelanggan.
    const { store, commerce, actor } = harness('staff');
    try {
      const created = new Date(Date.now() + 2 * 86_400_000).toISOString();
      store.save('orders', order({ fulfilmentStatus: 'review', trackingTokenExpiresAt: created }));
      const transitioned = commerce.transition(actor!, 'ord-sec-001', { next: 'accepted', expectedRevision: 1 });
      expect(transitioned.trackingTokenExpiresAt).toBeTruthy();
      expect(new Date(transitioned.trackingTokenExpiresAt!).getTime()).toBeGreaterThan(new Date(created).getTime());
    } finally {
      store.close();
    }
  });

  test('NEGATIF pembatalan TIDAK mencabut token — pesanan yang dibatalkan masih boleh dijejak', () => {
    const { store, commerce, actor } = harness();
    try {
      store.save('orders', order({ fulfilmentStatus: 'review' }));
      const cancelled = commerce.transition(actor!, 'ord-sec-001', { next: 'cancelled', expectedRevision: 1 });
      expect(cancelled.trackingTokenRevokedAt).toBeUndefined();
      // Pautan awam masih berfungsi dan menunjukkan status sebenar.
      const outcome = resolvePublicTrackingProjection(TOKEN, store);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.projection.status).toBe('cancelled');
    } finally {
      store.close();
    }
  });
});
