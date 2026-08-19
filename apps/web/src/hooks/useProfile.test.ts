import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProfile } from "./useProfile";
import type { BackendProfile } from "@/lib/adapters/profile.adapter";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const backendProfile: BackendProfile = {
  user: {
    id: "u1",
    email: "owner@luxa.com",
    firstName: "Ada",
    lastName: "Lovelace",
    businessName: "LUXA",
    role: "owner",
    avatar: "",
    createdAt: "2026-01-15T09:30:00.000Z",
  },
  profile: {
    phone: "+234",
    company: "LUXA",
    address: "Lagos",
    city: "Lagos",
    country: "NG",
    bio: "Founder",
  },
  preferences: {
    notificationPreferences: {
      email: true,
      push: true,
      lowStock: true,
      newSales: true,
      reports: true,
      teamActivity: true,
      aiInsights: true,
    },
    appearanceSettings: {
      theme: "dark",
      language: "en",
      currency: "NGN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      compactMode: false,
    },
  },
};

describe("useProfile", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.get.mockResolvedValue(backendProfile);
  });

  it("loads and adapts the backend profile on mount", async () => {
    const { result } = renderHook(() => useProfile());

    expect(apiMock.get).toHaveBeenCalledWith("/profile");
    await waitFor(() =>
      expect(result.current.profile?.name).toBe("Ada Lovelace"),
    );
    expect(result.current.profile?.joinedDate).toBe(
      "2026-01-15T09:30:00.000Z",
    );
    expect(result.current.notificationPreferences.sms).toBe(false);
    expect(result.current.appearanceSettings.theme).toBe("dark");
    expect(result.current.isLoading).toBe(false);
  });

  it("saveProfile patches /profile with name split into first and last", async () => {
    apiMock.patch.mockResolvedValue(backendProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() =>
      expect(result.current.profile?.name).toBe("Ada Lovelace"),
    );

    act(() => {
      result.current.setProfile((p) =>
        p ? { ...p, name: "Grace Hopper" } : p,
      );
    });

    await act(async () => {
      await result.current.saveProfile();
    });

    const body = apiMock.patch.mock.calls[0][1] as Record<string, string>;
    expect(apiMock.patch).toHaveBeenCalledWith("/profile", expect.any(Object));
    expect(body).toMatchObject({ firstName: "Grace", lastName: "Hopper" });
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("avatar");
    expect(body).not.toHaveProperty("role");
    expect(body).not.toHaveProperty("joinedDate");
  });

  it("saveNotificationPreferences patches /profile/preferences without sms", async () => {
    apiMock.patch.mockResolvedValue({ message: "Preferences updated successfully" });
    const { result } = renderHook(() => useProfile());
    await waitFor(() =>
      expect(result.current.profile?.name).toBe("Ada Lovelace"),
    );

    act(() => {
      result.current.setNotificationPreferences((p) => ({ ...p, sms: true }));
    });

    await act(async () => {
      await result.current.saveNotificationPreferences();
    });

    const body = apiMock.patch.mock.calls[0][1] as {
      notificationPreferences: Record<string, boolean>;
    };
    expect(apiMock.patch).toHaveBeenCalledWith("/profile/preferences", expect.any(Object));
    expect(body.notificationPreferences).not.toHaveProperty("sms");
    expect(body.notificationPreferences.email).toBe(true);
  });

  it("saveAppearanceSettings patches /profile/preferences with appearance", async () => {
    apiMock.patch.mockResolvedValue({ message: "Preferences updated successfully" });
    const { result } = renderHook(() => useProfile());
    await waitFor(() =>
      expect(result.current.profile?.name).toBe("Ada Lovelace"),
    );

    act(() => {
      result.current.setAppearanceSettings((a) => ({ ...a, theme: "light" }));
    });

    await act(async () => {
      await result.current.saveAppearanceSettings();
    });

    const body = apiMock.patch.mock.calls[0][1] as {
      appearanceSettings: { theme: string };
    };
    expect(body.appearanceSettings.theme).toBe("light");
  });

  it("uploadAvatar posts { dataUrl } to /profile/avatar and updates profile", async () => {
    apiMock.post.mockResolvedValue({ avatar: "data:image/png;base64,abc" });
    const { result } = renderHook(() => useProfile());
    await waitFor(() =>
      expect(result.current.profile?.name).toBe("Ada Lovelace"),
    );

    await act(async () => {
      await result.current.uploadAvatar("data:image/png;base64,abc");
    });

    expect(apiMock.post).toHaveBeenCalledWith("/profile/avatar", {
      dataUrl: "data:image/png;base64,abc",
    });
    expect(result.current.profile?.avatar).toBe("data:image/png;base64,abc");
  });

  it("changePassword posts currentPassword and newPassword", async () => {
    apiMock.post.mockResolvedValue({ message: "Password changed successfully" });
    const { result } = renderHook(() => useProfile());
    await waitFor(() =>
      expect(result.current.profile?.name).toBe("Ada Lovelace"),
    );

    await act(async () => {
      await result.current.changePassword("Current1", "NewPassword2");
    });

    expect(apiMock.post).toHaveBeenCalledWith("/profile/change-password", {
      currentPassword: "Current1",
      newPassword: "NewPassword2",
    });
  });
});