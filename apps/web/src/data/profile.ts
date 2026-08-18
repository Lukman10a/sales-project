import { UserProfile, NotificationPreferences, SecuritySettings, AppearanceSettings } from "@/types/profileTypes";

export const userProfile: UserProfile = {
  id: "1",
  name: "Ahmed Hassan",
  email: "ahmed@luxa.com",
  phone: "+234 803 456 7890",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed",
  role: "owner",
  company: "LUXA Sales",
  address: "123 Business District",
  city: "Lagos",
  country: "Nigeria",
  bio: "Founder and CEO of LUXA Sales. Passionate about leveraging technology to streamline retail operations.",
  joinedDate: "2024-01-15",
};

export const notificationPreferences: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  lowStock: true,
  newSales: true,
  reports: true,
  teamActivity: true,
  aiInsights: true,
};

export const securitySettings: SecuritySettings = {
  twoFactorEnabled: true,
  lastPasswordChange: "2025-11-20",
  activeSessions: 3,
  loginHistory: [
    {
      id: "1",
      timestamp: "2026-01-21T10:30:00",
      device: "Chrome on Windows",
      location: "Lagos, Nigeria",
      ipAddress: "192.168.1.12",
      success: true,
    },
    {
      id: "2",
      timestamp: "2026-01-20T15:45:00",
      device: "Safari on iPhone",
      location: "Lagos, Nigeria",
      ipAddress: "192.168.1.54",
      success: true,
    },
    {
      id: "3",
      timestamp: "2026-01-20T09:20:00",
      device: "Chrome on Windows",
      location: "Lagos, Nigeria",
      ipAddress: "192.168.1.12",
      success: true,
    },
    {
      id: "4",
      timestamp: "2026-01-19T18:30:00",
      device: "Unknown Device",
      location: "Abuja, Nigeria",
      ipAddress: "196.45.23.12",
      success: false,
    },
    {
      id: "5",
      timestamp: "2026-01-19T14:15:00",
      device: "Chrome on Windows",
      location: "Lagos, Nigeria",
      ipAddress: "192.168.1.12",
      success: true,
    },
  ],
};

export const appearanceSettings: AppearanceSettings = {
  theme: "light",
  language: "en",
  currency: "NGN",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  compactMode: false,
};
