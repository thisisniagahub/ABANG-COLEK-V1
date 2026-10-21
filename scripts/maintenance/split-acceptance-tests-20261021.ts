/**
 * Skrip sekali guna (v2): pecahkan fail ujian acceptance mengikut blok
 * `describe` (garis ke garis — bukan kira kurungan, kerana badan blok
 * mengandungi `${...}` dalam literal).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const source = readFileSync('tests/platform/cart-revalidate-consent.test.ts', 'utf8');
const lines = source.split('\n');

function blockFor(marker: string): string {
  const start = lines.findIndex((line) => line.startsWith(`describe('${marker}`));
  if (start < 0) throw new Error(`describe not found: ${marker}`);
  let end = -1;
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index] === '});') {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error(`unterminated describe: ${marker}`);
  return lines.slice(start, end + 1).join('\n');
}

const PREAMBLE = `import { describe, expect, test } from 'bun:test';
import { PlatformStore, id, now } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
`;

const MEMBERSHIP = `
function addMembership(store: PlatformStore, userId: string, role: string, outlets: string[] = []): void {
  store.db
    .query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run(userId, \`\${userId}@example.test\`, userId, 'hash', now());
  store.db
    .query('INSERT OR IGNORE INTO memberships(id,user_id,role,outlets,dealer_org_id,status,version) VALUES(?,?,?,?,?,?,?)')
    .run(id(), userId, role, JSON.stringify(outlets), null, 'active', 1);
}
`;

const MOD01 = `${PREAMBLE}import { Commerce } from '../../server/platform/commerce';
import { prepareCartDraft } from '../../server/platform/cartDraft';
import type { CatalogueProduct } from '../../shared/platform-contracts';

const CUSTOMER_ID = 'cust-opt-001';
${MEMBERSHIP}
function product(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    id: 'prod-1',
    name: 'Sambal Cili Padi 200g',
    description: 'Sambal isi rumah',
    priceSen: 1200,
    currency: 'MYR',
    packSize: 1,
    publishedVersion: 1,
    availableQuantity: 50,
    revision: 1,
    status: 'published',
    ...overrides,
  };
}

${blockFor('MOD-01')}
`;

const OFF01 = `${PREAMBLE}import { ReconnectRevalidation } from '../../server/platform/reconnectRevalidation';
import type { OrderRecord } from '../../shared/platform-contracts';

const CUSTOMER_ID = 'cust-opt-001';
${MEMBERSHIP}
function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const stamp = now();
  return {
    id: 'ord-opt-001',
    customerId: CUSTOMER_ID,
    lines: [],
    amountSen: 4200,
    fulfilment: 'delivery',
    contactRef: 'Ahmad Colek, 0123456789',
    outletId: 'hq',
    fulfilmentStatus: 'dispatched',
    revision: 5,
    paymentState: 'verified',
    paidAmountSen: 4200,
    refundAmountSen: 0,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

${blockFor('OFF-01')}
`;

const PD01 = `${PREAMBLE}import { evaluateDispatchConsent, readAssetConsent } from '../../server/platform/dispatchConsent';

const CUSTOMER_ID = 'cust-opt-001';
const FOUNDER_ID = 'user-opt-founder';
const STAFF_ID = 'user-opt-staff';
${MEMBERSHIP}
${blockFor('PD-01')}
`;

mkdirSync('tests/copilot', { recursive: true });
writeFileSync('tests/copilot/mod-01-cart-draft.test.ts', MOD01);
writeFileSync('tests/platform/client-retry-revalidation.test.ts', OFF01);
writeFileSync('tests/platform/operational-amendments-consent.test.ts', PD01);
console.log('wrote 3 acceptance-area test files');
