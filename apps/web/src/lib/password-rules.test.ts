import { describe, expect, it } from "vitest";
import { passwordProblem } from "@/lib/password-rules";

describe("passwordProblem", () => {
  it("requires at least 10 characters", () => {
    expect(passwordProblem("short-pw1")).toMatch(/at least 10/);
    expect(passwordProblem("long-enough")).toBeNull();
  });

  it("caps the length at 128", () => {
    expect(passwordProblem("x".repeat(129))).toMatch(/at most 128/);
  });
});
