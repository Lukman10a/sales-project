import { QuickAction } from "@/types/types";
import { BarChart3, Package, Plus, ShoppingCart, CheckCircle, AlertTriangle } from "lucide-react";

export const actions: QuickAction[] = [
  {
    id: "add-item",
    title: "Add New Item",
    description: "Add products to inventory",
    icon: Plus,
    variant: "accent",  
    href: "/inventory",
  },
  {
    id: "record-sale",
    title: "Record Sale",
    description: "Log a new transaction",
    icon:   ShoppingCart,
    variant: "primary",
    href: "/sales",
  },
  {
    id: "view-reports",
    title: "View Reports",
    description: "Check analytics & insights",
    icon: BarChart3,
    variant: "secondary",
    href: "/analytics",
  },
  {
    id: "stock-check",
    title: "Stock Check",
    description: "Verify inventory levels",
    icon: Package,
    variant: "secondary",
    href: "/inventory",
  },
];

export const apprenticeActions: QuickAction[] = [
  {
    id: "confirm-stock",
    title: "Confirm Stock",
    description: "Verify incoming inventory",
    icon: CheckCircle,
    variant: "accent",
    href: "/inventory",
  },
  {
    id: "record-sale",
    title: "Record Sale",
    description: "Log a new transaction",
    icon: ShoppingCart,
    variant: "primary",
    href: "/sales",
  },
  {
    id: "view-alerts",
    title: "View Alerts",
    description: "Check stock warnings",
    icon: AlertTriangle,
    variant: "secondary",
    href: "/inventory",
  },
  {
    id: "view-analytics",
    title: "View Analytics",
    description: "Check sales performance",
    icon: BarChart3,
    variant: "secondary",
    href: "/analytics",
  },
];