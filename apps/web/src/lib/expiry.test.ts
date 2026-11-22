import { describe, expect, it } from "vitest";
import { daysUntil, expiryState } from "./expiry";

const today = new Date(2026, 10, 20); // 20 Nov 2026, local time

describe("expiry", () => {
  it("counts whole days to the date", () => {
    expect(daysUntil("2026-11-20", today)).toBe(0);
    expect(daysUntil("2026-12-20", today)).toBe(30);
    expect(daysUntil("2026-11-19", today)).toBe(-1);
  });

  it("marks expired and soon-to-expire products", () => {
    expect(expiryState(undefined, today)).toBeNull();
    expect(expiryState("2026-11-19", today)).toBe("expired");
    expect(expiryState("2026-12-20", today)).toBe("soon");
    expect(expiryState("2026-12-21", today)).toBeNull();
  });
});
