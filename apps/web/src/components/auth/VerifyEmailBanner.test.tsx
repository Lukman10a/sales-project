import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k: string, o?: { values?: Record<string, string> }) =>
      k.replace(/\{(\w+)\}/g, (_, n: string) => o?.values?.[n] ?? ""),
  }),
}));

const resend = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/auth", () => ({
  authApi: { resendVerification: resend },
}));

import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import type { User } from "@/lib/auth";

const owner = (extra: Partial<User> = {}): User => ({
  id: "u1",
  email: "ada@shop.ng",
  firstName: "Ada",
  lastName: "Okafor",
  role: "owner",
  businessName: "Ade Mart",
  avatar: "",
  ...extra,
});

describe("VerifyEmailBanner", () => {
  afterEach(() => {
    cleanup();
    resend.mockReset();
  });

  it("stays hidden for verified users and when signed out", () => {
    const { container, rerender } = render(
      <VerifyEmailBanner user={owner({ emailVerified: true })} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<VerifyEmailBanner user={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the deadline and resends the link", async () => {
    resend.mockResolvedValue({ message: "Link sent" });
    render(
      <VerifyEmailBanner
        user={owner({
          emailVerified: false,
          verifyBy: "2026-11-24T10:00:00.000Z",
        })}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/Confirm your email by .+24/);

    fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
    expect(await screen.findByText("Link sent")).toBeTruthy();
    expect(resend).toHaveBeenCalledWith("ada@shop.ng");
  });
});
