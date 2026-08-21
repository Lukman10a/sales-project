import type {
  AppearanceSettings,
  DashboardSettings,
  NotificationPreferences,
  UserProfile,
} from "@/types/profileTypes";

export interface BackendProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    businessName: string;
    role: string;
    avatar?: string;
    createdAt?: string | Date;
  };
  profile: {
    phone?: string | null;
    company?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    bio?: string | null;
  };
  preferences: {
    notificationPreferences: Partial<NotificationPreferences>;
    appearanceSettings: AppearanceSettings;
    dashboardSettings?: Partial<DashboardSettings>;
  };
}

export interface ProfileViewModel {
  profile: UserProfile;
  notificationPreferences: NotificationPreferences;
  appearanceSettings: AppearanceSettings;
  dashboardSettings: DashboardSettings;
}

const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  layout: "default",
  showWelcomeMessage: true,
  showTips: true,
  autoRefresh: true,
  refreshInterval: "1m",
  quickActions: [],
};

export function toProfile(backend: BackendProfile): ProfileViewModel {
  const name =
    [backend.user.firstName, backend.user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || backend.user.email;

  const prefs = backend.preferences.notificationPreferences;

  const notificationPreferences: NotificationPreferences = {
    email: prefs.email ?? true,
    push: prefs.push ?? true,
    sms: false,
    lowStock: prefs.lowStock ?? true,
    newSales: prefs.newSales ?? true,
    reports: prefs.reports ?? true,
    teamActivity: prefs.teamActivity ?? true,
    aiInsights: prefs.aiInsights ?? true,
  };

  const dashboardSettings: DashboardSettings = {
    ...DEFAULT_DASHBOARD_SETTINGS,
    ...(backend.preferences.dashboardSettings ?? {}),
  };

  return {
    profile: {
      id: backend.user.id,
      name,
      email: backend.user.email,
      phone: backend.profile.phone ?? undefined,
      avatar: backend.user.avatar ?? undefined,
      role: backend.user.role,
      company: backend.profile.company ?? undefined,
      address: backend.profile.address ?? undefined,
      city: backend.profile.city ?? undefined,
      country: backend.profile.country ?? undefined,
      bio: backend.profile.bio ?? undefined,
      joinedDate: backend.user.createdAt
        ? new Date(backend.user.createdAt).toISOString()
        : "",
    },
    notificationPreferences,
    appearanceSettings: backend.preferences.appearanceSettings,
    dashboardSettings,
  };
}