export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  bio?: string;
  joinedDate: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  lowStock: boolean;
  newSales: boolean;
  reports: boolean;
  teamActivity: boolean;
  aiInsights: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  activeSessions: number;
  loginHistory: LoginHistory[];
}

export interface LoginHistory {
  id: string;
  timestamp: string;
  device: string;
  location: string;
  ipAddress: string;
  success: boolean;
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  compactMode: boolean;
}
