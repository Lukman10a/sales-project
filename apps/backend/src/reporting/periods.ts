import { BUSINESS_TIMEZONE, businessDay } from '../common/time/business-day';

/**
 * Report periods as Lagos business days (YYYY-MM-DD). All date arithmetic is
 * on calendar days, so there is no daylight-saving or offset drift.
 */
export const REPORT_PERIODS = ['today', '7d', 'month'] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export interface DayRange {
  from: string;
  to: string;
}

export interface ResolvedPeriod extends DayRange {
  previous: DayRange;
  /**
   * For `today` only: the Lagos time of day now (HH:MM:SS). The comparison
   * day counts sales up to the same time, so a morning is not measured
   * against a whole day.
   */
  cutoff?: string;
}

const toUtc = (day: string) => new Date(`${day}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  const d = toUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** Days from `from` to `to`, both included. */
export function daysIn(range: DayRange): number {
  return (
    Math.round(
      (toUtc(range.to).getTime() - toUtc(range.from).getTime()) / 86_400_000,
    ) + 1
  );
}

/** Every day in the range, in order. */
export function eachDay(range: DayRange): string[] {
  return Array.from({ length: daysIn(range) }, (_, i) =>
    addDays(range.from, i),
  );
}

/** The range of the same length that ends the day before `range` starts. */
export function previousRange(range: DayRange): DayRange {
  const length = daysIn(range);
  return {
    from: addDays(range.from, -length),
    to: addDays(range.from, -1),
  };
}

/** The Lagos time of day at `at`, HH:MM:SS. */
export function businessTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}

const lastDayOfMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * - `today`: today, against the same weekday last week up to this time.
 * - `7d`: the last 7 days including today, against the 7 before.
 * - `month`: this month to date, against the same days of last month
 *   (clamped to its length: 31 March compares with 1–28/29 February).
 */
export function resolvePeriod(period: ReportPeriod, now: Date): ResolvedPeriod {
  const today = businessDay(now);
  switch (period) {
    case 'today':
      return {
        from: today,
        to: today,
        previous: { from: addDays(today, -7), to: addDays(today, -7) },
        cutoff: businessTime(now),
      };
    case '7d': {
      const range = { from: addDays(today, -6), to: today };
      return { ...range, previous: previousRange(range) };
    }
    case 'month': {
      const [y, m, d] = today.split('-').map(Number);
      const prevYear = m === 1 ? y - 1 : y;
      const prevMonth = m === 1 ? 12 : m - 1;
      const pad = (n: number) => String(n).padStart(2, '0');
      const prevDay = Math.min(d, lastDayOfMonth(prevYear, prevMonth - 1));
      return {
        from: `${y}-${pad(m)}-01`,
        to: today,
        previous: {
          from: `${prevYear}-${pad(prevMonth)}-01`,
          to: `${prevYear}-${pad(prevMonth)}-${pad(prevDay)}`,
        },
      };
    }
  }
}

/** Percentage change from `previous` to `current`; null when there was nothing before. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
