import { describe, it, expect } from "vitest";
import type { AuthResponse } from "@/lib/api/types";

describe("test harness", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });

  it("resolves the @ alias and compiles the api contract types", () => {
    const auth: AuthResponse = {
      user: {
        id: "u1",
        email: "a@b.co",
        firstName: "Ada",
        lastName: "Lovelace",
        businessName: "Biz",
        businessId: "b1",
        role: "owner",
      },
      access_token: "access",
      refresh_token: "refresh",
    };
    expect(auth.access_token).toBe("access");
  });
});