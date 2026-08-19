"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import {
  BackendProfile,
  toProfile,
} from "@/lib/adapters/profile.adapter";
import {
  toPreferencesUpdate,
  toProfileUpdate,
} from "@/lib/api/payloads";
import type {
  AppearanceSettings,
  NotificationPreferences,
  UserProfile,
} from "@/types/profileTypes";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  lowStock: true,
  newSales: true,
  reports: true,
  teamActivity: true,
  aiInsights: true,
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "light",
  language: "en",
  currency: "NGN",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  compactMode: false,
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<BackendProfile>("/profile")
      .then((backend) => {
        if (!active) return;
        const adapted = toProfile(backend);
        setProfile(adapted.profile);
        setNotificationPreferences(adapted.notificationPreferences);
        setAppearanceSettings(adapted.appearanceSettings);
      })
      .catch(() => {
        if (active) setIsError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profile) return;
    await api.patch<BackendProfile>("/profile", toProfileUpdate(profile));
  }, [profile]);

  const saveNotificationPreferences = useCallback(async () => {
    await api.patch<{ message: string }>(
      "/profile/preferences",
      toPreferencesUpdate({ notificationPreferences }),
    );
  }, [notificationPreferences]);

  const saveAppearanceSettings = useCallback(async () => {
    await api.patch<{ message: string }>(
      "/profile/preferences",
      toPreferencesUpdate({ appearanceSettings }),
    );
  }, [appearanceSettings]);

  const uploadAvatar = useCallback(async (dataUrl: string) => {
    await api.post<{ avatar: string }>("/profile/avatar", { dataUrl });
    setProfile((prev) => (prev ? { ...prev, avatar: dataUrl } : prev));
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.post<{ message: string }>("/profile/change-password", {
        currentPassword,
        newPassword,
      });
    },
    [],
  );

  return {
    profile,
    notificationPreferences,
    appearanceSettings,
    isLoading,
    isError,
    setProfile,
    setNotificationPreferences,
    setAppearanceSettings,
    saveProfile,
    saveNotificationPreferences,
    saveAppearanceSettings,
    uploadAvatar,
    changePassword,
  };
}