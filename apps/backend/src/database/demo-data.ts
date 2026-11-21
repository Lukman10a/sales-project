import type { ExpenseCategory } from '../entities/expense.entity';
import { businessDay } from '../common/time/business-day';
/**
 * Deterministic demo business for local work and staging (`pnpm db:seed`).
 * Pure: no database access, so it can be unit-tested; seed.ts persists it.
 * All money is naira with at most two decimals (entities convert to kobo).
 */

export const DEMO_OWNER_EMAIL = 'owner@demo.luxa.app';

export interface DemoProduct {
  name: string;
  category: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderPoint: number;
  sold: number;
}

export interface DemoSale {
  saleDate: Date;
  paymentMethod: 'cash' | 'card' | 'transfer';
  soldBy: 'owner' | 'manager' | 'cashier';
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
    total: number;
    /** Cost of one unit at sale time. */
    unitCost: number;
  }>;
  total: number;
}

const CATALOGUE: Array<[string, string, number, number]> = [
  ['Peak Milk 400g', 'Groceries', 2100, 2600],
  ['Golden Penny Spaghetti', 'Groceries', 850, 1100],
  ['Indomie Chicken (carton)', 'Groceries', 9800, 11500],
  ['Dangote Sugar 1kg', 'Groceries', 1500, 1900],
  ['Mama Gold Rice 5kg', 'Groceries', 8200, 9500],
  ['Kings Vegetable Oil 3L', 'Groceries', 7400, 8600],
  ['Milo 500g', 'Beverages', 3300, 4100],
  ['Coca-Cola 50cl (pack)', 'Beverages', 2700, 3300],
  ['Eva Water 75cl (pack)', 'Beverages', 1900, 2400],
  ['Lipton Yellow Label 100s', 'Beverages', 2300, 2900],
  ['Dettol Soap 110g', 'Toiletries', 650, 850],
  ['Close-Up Toothpaste 140g', 'Toiletries', 900, 1200],
  ['Always Pads (pack)', 'Toiletries', 1100, 1450],
  ['Hypo Bleach 1L', 'Household', 950, 1250],
  ['Ariel Detergent 900g', 'Household', 2600, 3200],
  ['Morning Fresh 400ml', 'Household', 1250, 1600],
  ['Energizer AA (4)', 'Electronics', 1800, 2500],
  ['USB-C Charger 20W', 'Electronics', 4500, 6500],
  ['Exercise Book (dozen)', 'Stationery', 2400, 3000],
  ['Bic Pen (box of 50)', 'Stationery', 3500, 4500],
];

/** Small deterministic PRNG (mulberry32) so every seed run is identical. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoExpense {
  /** Business-local day, YYYY-MM-DD. */
  date: string;
  category: ExpenseCategory;
  /** Naira. */
  amount: number;
  note: string;
}

/**
 * Fixed running costs over the window, so P&L figures are easy to check by
 * hand: rent on the 1st, salaries on the 28th, diesel every Monday.
 */
export function buildDemoExpenses(now: Date, days = 30): DemoExpense[] {
  const out: DemoExpense[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const at = new Date(now);
    at.setUTCDate(at.getUTCDate() - d);
    const date = businessDay(at);
    const dayOfMonth = Number(date.slice(8, 10));
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (dayOfMonth === 1) {
      out.push({ date, category: 'rent', amount: 250000, note: 'Shop rent' });
    }
    if (dayOfMonth === 28) {
      out.push({
        date,
        category: 'salaries',
        amount: 180000,
        note: 'Staff salaries',
      });
    }
    if (weekday === 1) {
      out.push({
        date,
        category: 'fuel',
        amount: 15000,
        note: 'Generator diesel',
      });
    }
  }
  return out;
}

export function buildDemoData(now: Date, days = 30, seed = 2026) {
  const rand = prng(seed);
  const int = (min: number, max: number) =>
    min + Math.floor(rand() * (max - min + 1));

  const products: DemoProduct[] = CATALOGUE.map(
    ([name, category, costPrice, sellingPrice], i) => ({
      name,
      category,
      sku: `DEMO-${String(i + 1).padStart(3, '0')}`,
      costPrice,
      sellingPrice,
      quantity: int(40, 120),
      reorderPoint: 10,
      sold: 0,
    }),
  );
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const sales: DemoSale[] = [];
  const methods = ['cash', 'card', 'transfer'] as const;
  const sellers = ['owner', 'manager', 'cashier'] as const;

  for (let d = days - 1; d >= 0; d--) {
    const perDay = int(3, 8);
    for (let n = 0; n < perDay; n++) {
      const saleDate = new Date(now);
      saleDate.setUTCDate(saleDate.getUTCDate() - d);
      // 08:00–19:59 Lagos (UTC+1)
      saleDate.setUTCHours(int(7, 18), int(0, 59), int(0, 59), 0);
      if (saleDate > now) continue;

      const items: DemoSale['items'] = [];
      const lines = int(1, 3);
      for (let l = 0; l < lines; l++) {
        const product = products[int(0, products.length - 1)];
        if (items.some((i) => i.sku === product.sku)) continue;
        const quantity = Math.min(int(1, 3), product.quantity);
        if (quantity === 0) continue;
        product.quantity -= quantity;
        product.sold += quantity;
        items.push({
          sku: product.sku,
          quantity,
          price: product.sellingPrice,
          total: product.sellingPrice * quantity,
          unitCost: product.costPrice,
        });
      }
      if (items.length === 0) continue;

      sales.push({
        saleDate,
        paymentMethod: methods[int(0, methods.length - 1)],
        soldBy: sellers[int(0, sellers.length - 1)],
        items,
        total: items.reduce((sum, i) => sum + i.total, 0),
      });
    }
  }

  return { products, sales, bySku };
}

export function stockStatus(
  quantity: number,
  reorderPoint: number,
): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (quantity <= 0) return 'out-of-stock';
  return quantity <= reorderPoint ? 'low-stock' : 'in-stock';
}
