import type { FlowIntent, PublicProduct } from '../../../shared/platform-contracts';
export function lineAnswers(intent: FlowIntent, product: PublicProduct, quantity: number): Record<string,unknown> {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('Kuantiti mesti integer positif, maksimum 10,000.');
  if (intent !== 'stock_receipt' && quantity % product.packSize !== 0) throw new Error(`Pilih gandaan pack ${product.packSize}.`);
  const lines = [{ productId: product.id, quantity }];
  // Receipts describe physical arrivals; current HQ availability is not receiving evidence.
  return intent === 'stock_receipt' ? { lines } : { lines, catalogueVersion: product.publishedVersion };
}

export function initialLineSelection(answer: unknown, current: { productId: string; quantity: number } | undefined, preferred: string | undefined, products: PublicProduct[]): { productId: string; quantity: number } {
  const line = Array.isArray(answer) ? answer[0] as { productId?: string; quantity?: number } | undefined : undefined;
  return { productId: line?.productId ?? current?.productId ?? preferred ?? products.find(product => product.availableQuantity > 0)?.id ?? '', quantity: line?.quantity ?? current?.quantity ?? 1 };
}

export function reviewOperation(reviewVersion: number | undefined, expiresAt: string | undefined, requiresReview: boolean, now = Date.now()): 'review' | 'submit' {
  return reviewVersion === undefined || requiresReview || (expiresAt !== undefined && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now)) ? 'review' : 'submit';
}
