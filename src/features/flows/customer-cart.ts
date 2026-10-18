import type { PublicProduct } from '../../../shared/platform-contracts';

export interface CustomerCartLine {
  productId: string;
  quantity: number;
}

export const MAX_CUSTOMER_CART_LINES = 20;
const MAX_CART_QUERY_LENGTH = 4096;

function normalizeCart(value: unknown): CustomerCartLine[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CUSTOMER_CART_LINES) {
    throw new Error(`Troli mesti mengandungi 1 hingga ${MAX_CUSTOMER_CART_LINES} produk.`);
  }
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Format troli tidak sah.');
    const { productId, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== 'string' || !productId.trim() || productId.length > 120 || productId !== productId.trim()) {
      throw new Error('ID produk dalam troli tidak sah.');
    }
    if (seen.has(productId)) throw new Error('Produk berulang dalam troli.');
    seen.add(productId);
    if (!Number.isSafeInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 10_000) {
      throw new Error('Kuantiti troli mesti integer positif, maksimum 10,000.');
    }
    return { productId, quantity: Number(quantity) };
  });
}

/** Encode only product IDs and quantities; prices are always read from the server catalogue. */
export function encodeCustomerCart(lines: CustomerCartLine[]): string {
  const encoded = JSON.stringify(normalizeCart(lines));
  if (encoded.length > MAX_CART_QUERY_LENGTH) throw new Error('Troli terlalu besar untuk checkout.');
  return encoded;
}

/** Invalid or oversized URL state is ignored by the caller and never treated as trusted order data. */
export function decodeCustomerCart(raw: string | null): CustomerCartLine[] | null {
  if (!raw || raw.length > MAX_CART_QUERY_LENGTH) return null;
  try {
    return normalizeCart(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function validateCustomerCart(lines: CustomerCartLine[], products: PublicProduct[]): CustomerCartLine[] {
  const normalized = normalizeCart(lines);
  for (const line of normalized) {
    const product = products.find((item) => item.id === line.productId);
    if (!product) throw new Error('Ada produk troli yang tiada dalam katalog semasa. Kembali ke kedai dan semak semula.');
    if (!Number.isSafeInteger(product.packSize) || product.packSize < 1 || line.quantity % product.packSize !== 0) {
      throw new Error(`Kuantiti ${product.name} mesti gandaan pek ${product.packSize}.`);
    }
    if (!Number.isSafeInteger(product.availableQuantity) || product.availableQuantity < line.quantity) {
      throw new Error(`Stok ${product.name} tidak mencukupi. Kembali ke kedai dan semak semula.`);
    }
  }
  return normalized;
}

export function customerCartOrderAnswers(lines: CustomerCartLine[], products: PublicProduct[]): Record<string, unknown> {
  const validated = validateCustomerCart(lines, products);
  const selected = validated.map((line) => products.find((product) => product.id === line.productId)!);
  const versions = new Set(selected.map((product) => product.publishedVersion));
  if (versions.size !== 1) throw new Error('Versi katalog berubah. Semak semula troli sebelum checkout.');
  return {
    lines: validated,
    catalogueVersion: selected[0].publishedVersion,
  };
}

/** A stale cart must always be reducible after stock or pack changes. Zero removes the line. */
export function decrementCustomerCartQuantity(quantity: number, product: PublicProduct): number {
  if (!Number.isSafeInteger(product.packSize) || product.packSize < 1) return 0;
  const ceiling = Math.min(quantity - 1, Math.max(0, product.availableQuantity), 10_000);
  return Math.max(0, Math.floor(ceiling / product.packSize) * product.packSize);
}
