/**
 * MOD-02 — unjuran awam (public token) diasingkan daripada order peribadi,
 * termasuk DALAM laluan copilot.
 *
 * Aturan:apa yang dipaparkan di luar (kad tracking, token awam) mesti boleh
 * dibalik kepada order TIDAK; apa yang hanya untuk pemilik (provenance
 * server-side) boleh kekal peribadi.
 */
import { describe, expect, test } from 'bun:test';
import { PlatformStore, now } from '../../server/platform/store';
import { hash } from '../../server/platform/auth';
import {
  assertPublicProjectionIsolated,
  buildPublicOrderProjection,
  publicRefFromTokenHash,
  resolvePublicTrackingProjection,
} from '../../server/platform/publicOrderProjection';
import type { OrderRecord } from '../../shared/platform-contracts';

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const stamp = now();
  return {
    id: 'ord-pub-001',
    customerId: 'cust-pub-001',
    lines: [],
    amountSen: 4200,
    fulfilment: 'pickup',
    contactRef: 'Ahmad Colek, 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'dispatched',
    revision: 2,
    paymentState: 'verified',
    paidAmountSen: 4200,
    refundAmountSen: 0,
    trackingTokenHash: 'hash_public_9f82ab7e',
    trackingTokenExpiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

describe('MOD-02 — unjuran awam berasingan daripada order peribadi', () => {
  test('unjuran awam TIDAK mengandungi order id peribadi', () => {
    const projection = buildPublicOrderProjection(order());
    expect(projection.publicRef).toBe(publicRefFromTokenHash('hash_public_9f82ab7e'));
    expect(projection.publicRef.startsWith('pub_')).toBe(true);
    const serialised = JSON.stringify(projection);
    expect(serialised).not.toContain('ord-pub-001');
    expect((projection as unknown as Record<string, unknown>).id).toBeUndefined();
    expect((projection as unknown as Record<string, unknown>).orderId).toBeUndefined();
  });

  test('NEGATIF unjuran yang membocorkan id ⇒ PUBLIC_PROJECTION_LEAK_BLOCKED', () => {
    let thrown = '';
    try {
      assertPublicProjectionIsolated({ ...buildPublicOrderProjection(order()), id: 'ord-pub-001' });
    } catch (error) {
      thrown = (error as { code?: string }).code ?? (error as Error).message;
    }
    expect(thrown).toBe('PUBLIC_PROJECTION_LEAK_BLOCKED');
      const store = new PlatformStore(':memory:');
      try {
        const token = 'token-lupus';
        store.save('orders', order({ trackingTokenHash: hash(token), trackingTokenExpiresAt: new Date(Date.now() - 1000).toISOString() }));
        const outcome = resolvePublicTrackingProjection(token, store);
        expect(outcome.ok).toBe(false);
        if (outcome.ok) return;
        expect(outcome.code).toBe('TRACKING_TOKEN_EXPIRED');
      } finally {
        store.close();
      }
    });

  test('token tidak wujud ⇒ ORDER_NOT_FOUND (bukan unjuran reka)', () => {
    const store = new PlatformStore(':memory:');
    try {
      const outcome = resolvePublicTrackingProjection('token-tiada', store);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('ORDER_NOT_FOUND');
    } finally {
      store.close();
    }
  });

  test('NEGATIF token lapus ⇒ TRACKING_TOKEN_EXPIRED (tiada unjuran diberi)', () => {
    const store = new PlatformStore(':memory:');
    try {
      const token = 'token-lupus';
      store.save('orders', order({
        trackingTokenHash: hash(token),
        trackingTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
      }));
      const outcome = resolvePublicTrackingProjection(token, store);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('TRACKING_TOKEN_EXPIRED');
    } finally {
      store.close();
    }
  });
});