import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";

// Radix controls measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  completeTwoFactor: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/api/auth", () => ({
  authApi: { resendVerification: vi.fn() },
}));

import { LoginForm } from "@/components/auth/LoginForm";
import { TwoFactorRequiredError } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";

function signInWithPassword() {
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: "ada@shop.ng" },
  });
  fireEvent.change(screen.getByLabelText(/Password/), {
    target: { value: "Correct-Horse-42" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
}

describe("LoginForm two-step sign-in", () => {
  afterEach(() => {
    cleanup();
    auth.login.mockReset();
    auth.completeTwoFactor.mockReset();
  });

  it("asks for the code after the password, then completes sign-in", async () => {
    auth.login.mockRejectedValue(new TwoFactorRequiredError("ch-1"));
    auth.completeTwoFactor.mockResolvedValue(undefined);
    render(<LoginForm />);

    signInWithPassword();
    const input = await screen.findByLabelText("Verification code");
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() =>
      expect(auth.completeTwoFactor).toHaveBeenCalledWith(
        "ch-1",
        "123456",
        "owner",
      ),
    );
  });

  it("shows the error and stays on the code step for a wrong code", async () => {
    auth.login.mockRejectedValue(new TwoFactorRequiredError("ch-1"));
    auth.completeTwoFactor.mockRejectedValue(
      new ApiError("That code didn't work.", undefined, 401, "INVALID_CODE"),
    );
    render(<LoginForm />);

    signInWithPassword();
    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("That code didn't work.")).toBeTruthy();
    expect(screen.getByLabelText("Verification code")).toBeTruthy();
  });

  it("goes back to the password when the challenge expired", async () => {
    auth.login.mockRejectedValue(new TwoFactorRequiredError("ch-1"));
    auth.completeTwoFactor.mockRejectedValue(
      new ApiError(
        "Your sign-in timed out.",
        undefined,
        401,
        "MFA_CHALLENGE_EXPIRED",
      ),
    );
    render(<LoginForm />);

    signInWithPassword();
    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("Your sign-in timed out.")).toBeTruthy();
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect(screen.getByLabelText(/Password/)).toBeTruthy();
  });
});
