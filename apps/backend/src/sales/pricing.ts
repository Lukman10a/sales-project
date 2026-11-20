import { BadRequestException } from '@nestjs/common';
import { toKobo } from '../common/money/money';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { SaleUnit } from '../entities/sale-item.entity';

/**
 * Sale arithmetic, all in integer kobo. The client only says what it wants
 * (product, quantity, unit); every price comes from the catalogue here.
 */

/** 7.5%, in basis points. */
export const VAT_BASIS_POINTS = 750;

export interface LineRequest {
  productId: string;
  quantity: number;
  unit: SaleUnit;
}

export interface PricedLine {
  productId: string;
  productName: string;
  unit: SaleUnit;
  quantity: number;
  /** Stock units one `unit` takes (carton size, or 1). */
  unitsPerItem: number;
  priceKobo: number;
  totalKobo: number;
}

export interface SaleTotals {
  subtotalKobo: number;
  discountKobo: number;
  vatKobo: number;
  totalKobo: number;
}

type Priceable = Pick<
  InventoryItem,
  'id' | 'name' | 'sellingPrice' | 'bundleQuantity' | 'bundlePrice'
>;

/** Prices one line from the catalogue: the selling price, or the carton price. */
export function priceLine(product: Priceable, line: LineRequest): PricedLine {
  let priceKobo = toKobo(Number(product.sellingPrice));
  let unitsPerItem = 1;
  if (line.unit === 'carton') {
    const size = product.bundleQuantity ?? 0;
    if (
      size < 1 ||
      product.bundlePrice === null ||
      product.bundlePrice === undefined
    ) {
      throw new BadRequestException(
        `${product.name} is not sold by the carton`,
      );
    }
    priceKobo = toKobo(Number(product.bundlePrice));
    unitsPerItem = size;
  }
  return {
    productId: product.id,
    productName: product.name,
    unit: line.unit,
    quantity: line.quantity,
    unitsPerItem,
    priceKobo,
    totalKobo: priceKobo * line.quantity,
  };
}

/** Stock units each product loses, summed over lines of the same product. */
export function stockDemand(lines: PricedLine[]): Map<string, number> {
  const demand = new Map<string, number>();
  for (const l of lines) {
    demand.set(
      l.productId,
      (demand.get(l.productId) ?? 0) + l.quantity * l.unitsPerItem,
    );
  }
  return demand;
}

/** subtotal − discount, then VAT on what is left. */
export function saleTotals(
  lines: PricedLine[],
  discountPercent: number,
  vatEnabled: boolean,
): SaleTotals {
  const subtotalKobo = lines.reduce((sum, l) => sum + l.totalKobo, 0);
  // Percent has at most two decimals, so work in hundredths of a percent.
  const discountKobo = Math.round(
    (subtotalKobo * Math.round(discountPercent * 100)) / 10_000,
  );
  const net = subtotalKobo - discountKobo;
  const vatKobo = vatEnabled
    ? Math.round((net * VAT_BASIS_POINTS) / 10_000)
    : 0;
  return { subtotalKobo, discountKobo, vatKobo, totalKobo: net + vatKobo };
}

export interface PaymentRequest {
  paymentMethod: string;
  splitPayments?: Array<{ method: string; amount: number }>;
}

/** A split sale's parts must add up to the total exactly, to the kobo. */
export function assertPayments(payment: PaymentRequest, totalKobo: number) {
  const parts = payment.splitPayments ?? [];
  if (payment.paymentMethod !== 'split') {
    if (parts.length > 0) {
      throw new BadRequestException(
        'Split payments are only allowed when the payment method is split',
      );
    }
    return;
  }
  if (parts.length < 2) {
    throw new BadRequestException('A split payment needs at least two parts');
  }
  if (parts.some((p) => toKobo(p.amount) <= 0)) {
    throw new BadRequestException('Each split payment must be more than ₦0');
  }
  const paid = parts.reduce((sum, p) => sum + toKobo(p.amount), 0);
  if (paid !== totalKobo) {
    throw new BadRequestException(
      `Split payments add up to ₦${paid / 100} but the total is ₦${totalKobo / 100}`,
    );
  }
}

/**
 * What refunding part of a sale gives back: the lines' share of what was
 * actually paid, so discount and VAT are refunded in proportion.
 */
export function refundShare(
  linesKobo: number,
  sale: { subtotalKobo: number; totalKobo: number },
): number {
  if (sale.subtotalKobo <= 0) return 0;
  return Math.round((linesKobo * sale.totalKobo) / sale.subtotalKobo);
}
