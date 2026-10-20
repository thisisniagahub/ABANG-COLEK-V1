/**
 * ABANGCOLEK — ADV-05 Checkout Conflict Detection
 *
 * Pure, side-effect free evaluation of the five required conflict classes:
 *
 *   1. stale price          — the priced line no longer matches the catalogue
 *   2. ineligible loyalty   — the claimed loyalty redemption cannot be honoured
 *   3. invalid quantity     — fractional / negative / zero quantity
 *   4. duplicate line       — the same product appears on more than one line
 *   5. invalid fulfilment   — unknown fulfilment mode/status, or a cancelled
 *                              order that still holds an un-refunded payment
 *
 * The evaluator never guesses: every conflict carries the canonical value it
 * was compared against (`expected`) and the offending value (`actual`).
 */

import type {
  CheckoutConflict,
  CheckoutConflictClass,
  CheckoutConflictCode,
  CheckoutConflictSummary,
} from '../../../../shared/adv-contracts';

export interface CheckoutConflictLine {
  productId: string;
  quantity: number;
  priceSen?: number | null;
  publishedVersion?: number | null;
}

export interface CheckoutConflictCatalogueEntry {
  id: string;
  priceSen: number;
  publishedVersion: number;
}

export interface CheckoutLoyaltyClaim {
  /** Points the checkout/order claims to redeem. */
  claimedPoints: number;
  /** Discount in integer Sen the checkout/order claims. */
  claimedDiscountSen: number;
  /** Balance in the canonical loyalty ledger. `null` = no loyalty ledger at all. */
  balancePoints: number | null;
}

export interface CheckoutConflictInput {
  mode: 'cart' | 'order';
  lines: CheckoutConflictLine[];
  /** Current canonical catalogue version. */
  catalogueVersion: number;
  catalogue: CheckoutConflictCatalogueEntry[];
  /** Catalogue version the draft was priced against (cart mode). */
  draftCatalogueVersion?: number | null;
  /** Total order value in integer Sen (order mode). */
  orderAmountSen?: number | null;
  fulfilment?: string | null;
  fulfilmentStatus?: string | null;
  paymentState?: string | null;
  paidAmountSen?: number | null;
  refundAmountSen?: number | null;
  loyalty?: CheckoutLoyaltyClaim | null;
}

/** Canonical fulfilment modes of the platform. */
export const CANONICAL_FULFILMENT_MODES = ['pickup', 'delivery'] as const;

/** Canonical fulfilment statuses of the platform. */
export const CANONICAL_FULFILMENT_STATUSES = [
  'requested',
  'review',
  'accepted',
  'packing',
  'packed',
  'dispatched',
  'received',
  'cancelled',
] as const;

const conflict = (
  conflictClass: CheckoutConflictClass,
  code: CheckoutConflictCode,
  blocking: boolean,
  detail: string,
  extra: {
    lineIndex?: number | null;
    productId?: string | null;
    expected?: string | null;
    actual?: string | null;
  } = {},
): CheckoutConflict => ({
  class: conflictClass,
  code,
  blocking,
  lineIndex: extra.lineIndex ?? null,
  productId: extra.productId ?? null,
  expected: extra.expected ?? null,
  actual: extra.actual ?? null,
  detail,
});

/**
 * Detects every applicable conflict class from canonical state.
 * The returned array is deterministic (line order, then class order).
 */
export function detectCheckoutConflicts(input: CheckoutConflictInput): CheckoutConflict[] {
  const conflicts: CheckoutConflict[] = [];
  const catalogueById = new Map(input.catalogue.map((entry) => [entry.id, entry]));

  // --- Class: invalid quantity (fractional / negative / zero) -------------
  input.lines.forEach((line, lineIndex) => {
    const quantity = line.quantity;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return;
    if (!Number.isInteger(quantity)) {
      conflicts.push(
        conflict(
          'invalid_quantity',
          'CHECKOUT_FRACTIONAL_QUANTITY',
          true,
          `Kuantiti pecahan tidak sah untuk ${line.productId}: ${quantity}.`,
          { lineIndex, productId: line.productId, expected: 'integer', actual: String(quantity) },
        ),
      );
      return;
    }
    if (quantity < 0) {
      conflicts.push(
        conflict(
          'invalid_quantity',
          'CHECKOUT_NEGATIVE_QUANTITY',
          true,
          `Kuantiti negatif tidak sah untuk ${line.productId}: ${quantity}.`,
          { lineIndex, productId: line.productId, expected: '>= 0', actual: String(quantity) },
        ),
      );
      return;
    }
    if (quantity === 0) {
      conflicts.push(
        conflict(
          'invalid_quantity',
          'CHECKOUT_ZERO_QUANTITY',
          true,
          `Kuantiti sifar tidak sah untuk ${line.productId}.`,
          { lineIndex, productId: line.productId, expected: '>= 1', actual: '0' },
        ),
      );
    }
  });

  // --- Class: duplicate line ---------------------------------------------
  const occurrence = new Map<string, number[]>();
  input.lines.forEach((line, lineIndex) => {
    const seen = occurrence.get(line.productId) ?? [];
    seen.push(lineIndex);
    occurrence.set(line.productId, seen);
  });
  occurrence.forEach((indexes, productId) => {
    if (indexes.length < 2) return;
    conflicts.push(
      conflict(
        'duplicate_line',
        'CHECKOUT_DUPLICATE_LINE',
        true,
        `Produk ${productId} muncul ${indexes.length} kali dalam baris yang sama.`,
        {
          lineIndex: indexes[1],
          productId,
          expected: '1 baris setiap produk',
          actual: `${indexes.length} baris`,
        },
      ),
    );
  });

  // --- Class: stale price -------------------------------------------------
  if (input.mode === 'cart') {
    const draft = input.draftCatalogueVersion;
    if (draft !== undefined && draft !== null && draft !== input.catalogueVersion) {
      conflicts.push(
        conflict(
          'stale_price',
          'CHECKOUT_STALE_PRICE',
          false,
          `Draf diharga pada versi katalog ${draft}; versi semasa ${input.catalogueVersion}.`,
          { expected: String(input.catalogueVersion), actual: String(draft) },
        ),
      );
    }
  } else {
    input.lines.forEach((line, lineIndex) => {
      const catalogueEntry = catalogueById.get(line.productId);
      if (line.publishedVersion !== undefined && line.publishedVersion !== null) {
        if (line.publishedVersion !== input.catalogueVersion) {
          conflicts.push(
            conflict(
              'stale_price',
              'CHECKOUT_STALE_PRICE',
              false,
              `Harga ${line.productId} pada versi ${line.publishedVersion}; katalog semasa ${input.catalogueVersion}.`,
              {
                lineIndex,
                productId: line.productId,
                expected: String(input.catalogueVersion),
                actual: String(line.publishedVersion),
              },
            ),
          );
        }
        return;
      }
      if (catalogueEntry && line.priceSen !== undefined && line.priceSen !== null) {
        if (line.priceSen !== catalogueEntry.priceSen) {
          conflicts.push(
            conflict(
              'stale_price',
              'CHECKOUT_STALE_PRICE',
              false,
              `Harga ${line.productId} berbeza daripada katalog semasa.`,
              {
                lineIndex,
                productId: line.productId,
                expected: `${catalogueEntry.priceSen} sen`,
                actual: `${line.priceSen} sen`,
              },
            ),
          );
        }
      }
    });
  }

  // --- Class: ineligible loyalty -----------------------------------------
  const loyalty = input.loyalty;
  if (loyalty && (loyalty.claimedPoints > 0 || loyalty.claimedDiscountSen > 0)) {
    if (loyalty.balancePoints === null) {
      conflicts.push(
        conflict(
          'ineligible_loyalty',
          'CHECKOUT_INELIGIBLE_LOYALTY',
          true,
          'Tiada lejar kesetiaan direkodkan untuk pelanggan ini; penebusan mata tidak layak.',
          { expected: 'lejar kesetiaan', actual: 'tiada lejar' },
        ),
      );
    } else if (loyalty.claimedPoints > loyalty.balancePoints) {
      conflicts.push(
        conflict(
          'ineligible_loyalty',
          'CHECKOUT_INELIGIBLE_LOYALTY',
          true,
          `Mata dituntut ${loyalty.claimedPoints} melebihi baki ${loyalty.balancePoints}.`,
          {
            expected: String(loyalty.balancePoints),
            actual: String(loyalty.claimedPoints),
          },
        ),
      );
    }
    if (
      input.orderAmountSen !== undefined &&
      input.orderAmountSen !== null &&
      loyalty.claimedDiscountSen > input.orderAmountSen
    ) {
      conflicts.push(
        conflict(
          'ineligible_loyalty',
          'CHECKOUT_INELIGIBLE_LOYALTY',
          true,
          `Diskaun kesetiaan ${loyalty.claimedDiscountSen} sen melebihi nilai pesanan ${input.orderAmountSen} sen.`,
          {
            expected: `${input.orderAmountSen} sen`,
            actual: `${loyalty.claimedDiscountSen} sen`,
          },
        ),
      );
    }
  }

  // --- Class: invalid fulfilment -----------------------------------------
  if (
    input.fulfilment !== undefined &&
    input.fulfilment !== null &&
    !CANONICAL_FULFILMENT_MODES.includes(input.fulfilment as (typeof CANONICAL_FULFILMENT_MODES)[number])
  ) {
    conflicts.push(
      conflict(
        'invalid_fulfilment',
        'CHECKOUT_INVALID_FULFILMENT',
        true,
        `Mod penghantaran tidak sah: ${input.fulfilment}.`,
        { expected: CANONICAL_FULFILMENT_MODES.join('|'), actual: input.fulfilment },
      ),
    );
  }
  if (
    input.fulfilmentStatus !== undefined &&
    input.fulfilmentStatus !== null &&
    !CANONICAL_FULFILMENT_STATUSES.includes(
      input.fulfilmentStatus as (typeof CANONICAL_FULFILMENT_STATUSES)[number],
    )
  ) {
    conflicts.push(
      conflict(
        'invalid_fulfilment',
        'CHECKOUT_INVALID_FULFILMENT',
        true,
        `Status penghantaran tidak sah: ${input.fulfilmentStatus}.`,
        {
          expected: CANONICAL_FULFILMENT_STATUSES.join('|'),
          actual: input.fulfilmentStatus,
        },
      ),
    );
  }
  if (
    input.fulfilmentStatus === 'cancelled' &&
    typeof input.paidAmountSen === 'number' &&
    typeof input.refundAmountSen === 'number' &&
    input.paidAmountSen > input.refundAmountSen
  ) {
    conflicts.push(
      conflict(
        'invalid_fulfilment',
        'CHECKOUT_INVALID_FULFILMENT',
        true,
        `Pesanan dibatalkan tetapi wang ${input.paidAmountSen - input.refundAmountSen} sen masih tertahan tanpa pulangan.`,
        {
          expected: 'refundAmountSen >= paidAmountSen',
          actual: `paid=${input.paidAmountSen} sen, refunded=${input.refundAmountSen} sen`,
        },
      ),
    );
  }

  return conflicts;
}

/** Deterministic summary of a conflict list. */
export function summariseCheckoutConflicts(
  conflicts: CheckoutConflict[],
): CheckoutConflictSummary {
  const classes = [...new Set(conflicts.map((entry) => entry.class))].sort();
  const codes = [...new Set(conflicts.map((entry) => entry.code))].sort();
  return {
    conflictCount: conflicts.length,
    blockingCount: conflicts.filter((entry) => entry.blocking).length,
    classes,
    codes,
  };
}
