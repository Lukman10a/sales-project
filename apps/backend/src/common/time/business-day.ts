/** Every business is in Nigeria for now; T38 uses the same zone in SQL. */
export const BUSINESS_TIMEZONE = 'Africa/Lagos';

/** The business-local calendar day (YYYY-MM-DD) at `at`. */
export function businessDay(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}
