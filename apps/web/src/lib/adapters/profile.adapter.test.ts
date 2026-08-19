import { describe, it, expect } from "vitest";
import { toProfile } from "./profile.adapter";
import type { BackendProfile } from "./profile.adapter";

const backend: BackendProfile = {
  user: {
    id: "u1",
    email: "owner@luxa.com",
    firstName: "Ada",
    lastName: "Lovelace",
    businessName: "LUXA",
    role: "owner",
    avatar: "https://img/ada.png",
    createdAt: new Date("2026-01-15T09:30:00.000Z"),
  },
  profile: {
    phone: "+234",
    company: "LUXA Sales",
    address: "123 District",
    city: "Lagos",
    country: "NG",
    bio: "Founder",
  },
  preferences: {
    notificationPreferences: {
      email: true,
      push: false,
      lowStock: true,
      newSales: true,
      reports: false,
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

describe("toProfile", () => {
  it("derives name from firstName + lastName", () => {
    const { profile } = toProfile(backend);

    expect(profile.name).toBe("Ada Lovelace");
  });

  it("converts createdAt to an ISO joinedDate", () => {
    const { profile } = toProfile(backend);

    expect(profile.joinedDate).toBe("2026-01-15T09:30:00.000Z");
  });

  it("passes through id, email, role, avatar and profile fields", () => {
    const { profile } = toProfile(backend);

    expect(profile.id).toBe("u1");
    expect(profile.email).toBe("owner@luxa.com");
    expect(profile.role).toBe("owner");
    expect(profile.avatar).toBe("https://img/ada.png");
    expect(profile.phone).toBe("+234");
    expect(profile.company).toBe("LUXA Sales");
    expect(profile.address).toBe("123 District");
    expect(profile.city).toBe("Lagos");
    expect(profile.country).toBe("NG");
    expect(profile.bio).toBe("Founder");
  });

  it("defaults sms to false in notification preferences", () => {
    const { notificationPreferences } = toProfile(backend);

    expect(notificationPreferences.sms).toBe(false);
  });

  it("passes backend notification preferences through", () => {
    const { notificationPreferences } = toProfile(backend);

    expect(notificationPreferences.email).toBe(true);
    expect(notificationPreferences.push).toBe(false);
    expect(notificationPreferences.lowStock).toBe(true);
    expect(notificationPreferences.newSales).toBe(true);
    expect(notificationPreferences.reports).toBe(false);
    expect(notificationPreferences.teamActivity).toBe(true);
    expect(notificationPreferences.aiInsights).toBe(true);
  });

  it("passes appearance settings through unchanged", () => {
    const { appearanceSettings } = toProfile(backend);

    expect(appearanceSettings).toEqual({
      theme: "dark",
      language: "en",
      currency: "NGN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      compactMode: false,
    });
  });

  it("fills missing notification preferences with true defaults", () => {
    const result = toProfile({
      ...backend,
      preferences: { ...backend.preferences, notificationPreferences: {} },
    });

    expect(result.notificationPreferences).toEqual({
      email: true,
      push: true,
      sms: false,
      lowStock: true,
      newSales: true,
      reports: true,
      teamActivity: true,
      aiInsights: true,
    });
  });
});