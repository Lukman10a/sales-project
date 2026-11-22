import { describe, expect, it } from "vitest";
import { businessDay } from "./businessDay";

describe("businessDay", () => {
  it("is the Lagos day, already tomorrow at 23:30 UTC", () => {
    expect(businessDay(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(businessDay(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
  });
});
