import { describe, expect, test } from 'bun:test';
import type { PublicProduct } from '../../shared/platform-contracts';
import { customerCartOrderAnswers, decodeCustomerCart, encodeCustomerCart, validateCustomerCart, type CustomerCartLine } from '../../src/features/flows/customer-cart';

const product = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
  id: 'sambal-1',
  name: 'Sambal Colek',
  description: 'Produk yang diterbitkan',
  priceSen: 1250,
  currency: 'MYR',
  packSize: 2,
  publishedVersion: 7,
  availableQuantity: 10,
  ...overrides,
});

describe('customer cart', () => {
  test('encodes and decodes only distinct product IDs and integer quantities', () => {
    const lines: CustomerCartLine[] = [{ productId: 'sambal-1', quantity: 4 }];
    expect(decodeCustomerCart(encodeCustomerCart(lines))).toEqual(lines);
    expect(decodeCustomerCart('{bad json')).toBeNull();
    expect(decodeCustomerCart('x'.repeat(4097))).toBeNull();
  });

  test('rejects duplicate items, invalid quantities and carts above the item limit', () => {
    expect(() => encodeCustomerCart([{ productId: 'sambal-1', quantity: 1 }, { productId: 'sambal-1', quantity: 2 }])).toThrow('berulang');
    expect(() => encodeCustomerCart([{ productId: 'sambal-1', quantity: 0 }])).toThrow('integer positif');
    expect(() => encodeCustomerCart(Array.from({ length: 21 }, (_, index) => ({ productId: `sku-${index}`, quantity: 1 })))).toThrow('1 hingga 20');
  });

  test('validates published catalogue products, pack multiples and current stock', () => {
    const lines = [{ productId: 'sambal-1', quantity: 4 }];
    expect(validateCustomerCart(lines, [product()])).toEqual(lines);
    expect(() => validateCustomerCart([{ productId: 'missing', quantity: 2 }], [product()])).toThrow('tiada dalam katalog');
    expect(() => validateCustomerCart([{ productId: 'sambal-1', quantity: 3 }], [product()])).toThrow('gandaan pek');
    expect(() => validateCustomerCart([{ productId: 'sambal-1', quantity: 12 }], [product()])).toThrow('Stok');
  });

  test('creates multi-line order answers using the current catalogue version', () => {
    const second = product({ id: 'colek-2', name: 'Colek Buah', packSize: 1, publishedVersion: 7 });
    expect(customerCartOrderAnswers([{ productId: 'sambal-1', quantity: 2 }, { productId: 'colek-2', quantity: 3 }], [product(), second])).toEqual({
      lines: [{ productId: 'sambal-1', quantity: 2 }, { productId: 'colek-2', quantity: 3 }],
      catalogueVersion: 7,
    });
    expect(() => customerCartOrderAnswers([{ productId: 'sambal-1', quantity: 2 }, { productId: 'colek-2', quantity: 1 }], [product(), product({ id: 'colek-2', packSize: 1, publishedVersion: 8 })])).toThrow('Versi katalog berubah');
  });
});

// Recovery helpers protect the actual cart and flow state transitions used by the UI.
import { decrementCustomerCartQuantity } from '../../src/features/flows/customer-cart';
import { initialLineSelection, reviewOperation } from '../../src/features/flows/flow-answers';

describe('customer commerce recovery', () => {
  test('decrement recovers stale stock and changed packs in a single action', () => {
    expect(decrementCustomerCartQuantity(10, product({ availableQuantity: 4 }))).toBe(4);
    expect(decrementCustomerCartQuantity(3, product())).toBe(2);
    expect(decrementCustomerCartQuantity(2, product({ availableQuantity: 0 }))).toBe(0);
    expect(decrementCustomerCartQuantity(2, product())).toBe(0);
  });
  test('catalogue pagination preserves an in-progress product and quantity', () => {
    expect(initialLineSelection(undefined, { productId: 'chosen', quantity: 4 }, undefined, [product()])).toEqual({ productId: 'chosen', quantity: 4 });
    expect(initialLineSelection([{ productId: 'saved', quantity: 6 }], undefined, undefined, [product()])).toEqual({ productId: 'saved', quantity: 6 });
  });
  test('expired or rejected quotes require review before submission', () => {
    const now = Date.parse('2026-10-18T00:00:00Z');
    expect(reviewOperation(7, '2026-10-17T23:59:59Z', false, now)).toBe('review');
    expect(reviewOperation(7, '2026-10-18T00:10:00Z', true, now)).toBe('review');
    expect(reviewOperation(7, '2026-10-18T00:10:00Z', false, now)).toBe('submit');
    expect(reviewOperation(undefined, undefined, false, now)).toBe('review');
  });
});
