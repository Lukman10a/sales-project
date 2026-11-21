/** Days ahead an expiry date counts as "soon" (the API's dashboard uses 30). */
export const EXPIRY_SOON_DAYS = 30;

/** Whole days from today to a YYYY-MM-DD date (negative once past). */
export function daysUntil(date: string, today = new Date()): number {
  const [y, m, d] = date.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - now) / 86_400_000);
}

/** "expired", "soon" (within EXPIRY_SOON_DAYS) or null. */
export function expiryState(
  expiryDate: string | undefined,
  today = new Date(),
): "expired" | "soon" | null {
  if (!expiryDate) return null;
  const days = daysUntil(expiryDate, today);
  if (days < 0) return "expired";
  return days <= EXPIRY_SOON_DAYS ? "soon" : null;
}
