import {
  FileText,
  FileSpreadsheet,
  TrendingUp,
  Package,
  DollarSign,
  Receipt,
  AlertTriangle,
  PieChart,
  Users,
  UserCheck,
  Settings,
} from "lucide-react";

export const formatIcons = {
  pdf: FileText,
  csv: FileText,
  excel: FileSpreadsheet,
};

export const statusConfig = {
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success border-success/20",
  },
  processing: {
    label: "Processing",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground border-muted",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

export const templateIcons: Record<string, any> = {
  TrendingUp,
  Package,
  DollarSign,
  Receipt,
  AlertTriangle,
  PieChart,
  Users,
  UserCheck,
  Settings,
};
