export function roundCurrency(value: number | string): number {
  return Math.round(Number(value) * 100) / 100;
}