import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { evaluateDispatchConsent, readAssetConsent } from '../../server/platform/dispatchConsent';

const CUSTOMER_ID = 'cust-opt-001';
const FOUNDER_ID = 'user-opt-founder';
const STAFF_ID = 'user-opt-staff';

function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = []): void {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, `${userId}@example.test`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), null, 'active', 1);
}

describe('PD-01 — kebenaran aset berstruktur', () => {
  test('NEGATIF tiada rekod kebenaran ⇒ ASSET_CONSENT_NOT_GRANTED (unknown ≠ kebenaran)', () => {
    const store = new PlatformStore(':memory:');
    try {
      addMembership(store, CUSTOMER_ID, 'customer');
      addMembership(store, STAFF_ID, 'staff', ['hq']);
      const auth = new Auth(store);
      const stamp = now();
      store.save('campaigns', {
        id: 'camp-1',
        title: 'Kempen',
        objective: 'Ujian',
        copy: 'Teks',
        status: 'approved',
        ownerId: FOUNDER_ID,
        revision: 1,
        assets: [{ id: 'asset-1', name: 'Nota', rights: 'Business-owned', consent: 'No people depicted' }],
        productIds: [],
        catalogueVersion: 0,
        createdAt: stamp,
        updatedAt: stamp,
      } as never);

      const outcome = evaluateDispatchConsent(
        store,
        auth,
        { user: { id: STAFF_ID }, memberships: [{ role: 'staff', status: 'active', outletIds: ['hq'] }] } as never,
        { campaignId: 'camp-1', assetId: 'asset-1', recipientId: CUSTOMER_ID, channel: 'in_app' },
      );
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('ASSET_CONSENT_NOT_GRANTED');
    } finally {
      store.close();
    }
  });

  test('rekod kebenaran `granted` dibaca semula sebagai `granted` (bukan teks bebas)', () => {
    const store = new PlatformStore(':memory:');
    try {
      const consent = {
        assetId: 'asset-1',
        state: 'granted' as const,
        scope: 'in_app:orders',
        evidenceId: 'ev-1',
        recordedAt: now(),
        recordedBy: FOUNDER_ID,
      };
      store.save('asset_consents', { ...consent, id: consent.assetId });
      expect(readAssetConsent(store, 'asset-1')?.state).toBe('granted');
      expect(readAssetConsent(store, 'asset-tiada')).toBeNull();
    } finally {
      store.close();
    }
  });
});
