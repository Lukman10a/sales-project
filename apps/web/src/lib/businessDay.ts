/** Every business is in Nigeria for now; the API uses the same zone. */
export const BUSINESS_TIMEZONE = "Africa/Lagos";

/** The Lagos calendar day (YYYY-MM-DD) at `at`. */
export function businessDay(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}
