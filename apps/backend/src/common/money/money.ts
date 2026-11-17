import type { ValueTransformer } from 'typeorm';

/**
 * Money is stored as integer kobo (₦1 = 100 kobo) in `bigint` columns so
 * arithmetic in the database is exact. Entities and the HTTP API still speak
 * naira as a number with at most two decimals; this module is the only place
 * that converts between the two.
 */

export const KOBO_PER_NAIRA = 100;

/** ₦ → kobo, rounding half away from zero to the nearest kobo. */
export function toKobo(naira: number): number {
  if (!Number.isFinite(naira)) {
    throw new RangeError(`Not a finite naira amount: ${naira}`);
  }
  const kobo = Math.sign(naira) * Math.round(Math.abs(naira) * KOBO_PER_NAIRA);
  if (!Number.isSafeInteger(kobo)) {
    throw new RangeError(`Naira amount out of range: ${naira}`);
  }
  return kobo === 0 ? 0 : kobo;
}

/** kobo → ₦. Accepts the string form pg returns for bigint. */
export function fromKobo(kobo: number | string | bigint): number {
  const n = typeof kobo === 'number' ? kobo : Number(kobo);
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Not a safe integer kobo amount: ${String(kobo)}`);
  }
  return n / KOBO_PER_NAIRA;
}

/** Display form, e.g. ₦1,234.50 (kobo shown only when non-zero). */
export function formatNaira(naira: number): string {
  const kobo = toKobo(naira);
  const hasKobo = kobo % KOBO_PER_NAIRA !== 0;
  return (
    '₦' +
    fromKobo(kobo).toLocaleString('en-NG', {
      minimumFractionDigits: hasKobo ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** TypeORM transformer for `bigint` kobo columns exposed as naira. */
export const nairaTransformer: ValueTransformer = {
  to: (value: number | null | undefined) =>
    value === null || value === undefined ? value : toKobo(value),
  from: (value: string | number | null) =>
    value === null || value === undefined ? value : fromKobo(value),
};

/** Column options for a money field. */
export const moneyColumn = (opts: { nullable?: boolean } = {}) => ({
  type: 'bigint' as const,
  transformer: nairaTransformer,
  ...(opts.nullable ? { nullable: true } : {}),
});

/** Wrap a SQL expression over kobo columns so it yields naira. */
export const nairaSql = (expr: string) => `(${expr}) / 100.0`;

type SplitPayment = { method: string; amount: number };

/** jsonb split payments: amounts stored as kobo, exposed as naira. */
export const splitPaymentsTransformer: ValueTransformer = {
  to: (value: SplitPayment[] | null | undefined) =>
    value?.map((p) => ({ ...p, amount: toKobo(p.amount) })) ?? value,
  from: (value: SplitPayment[] | null) =>
    value?.map((p) => ({ ...p, amount: fromKobo(p.amount) })) ?? value,
};
