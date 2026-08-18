import {
  Bell,
  Shield,
  Palette,
  Database,
  HelpCircle,
  Users,
  Layout,
} from "lucide-react";

export const settingSections = [
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alert preferences",
    icon: Bell,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Customize your dashboard",
    icon: Layout,
  },
  {
    id: "security",
    title: "Security",
    description: "Password and authentication",
    icon: Shield,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Customize the app look",
    icon: Palette,
  },
  {
    id: "data",
    title: "Data & Backup",
    description: "Export and backup options",
    icon: Database,
  },
  {
    id: "help",
    title: "Help & Support",
    description: "Get help and documentation",
    icon: HelpCircle,
  },
  {
    id: "staff",
    title: "Staff & Invitations",
    description: "Invite and manage your staff",
    icon: Users,
  },
];

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "admin";
  status: "active" | "invited";
};
