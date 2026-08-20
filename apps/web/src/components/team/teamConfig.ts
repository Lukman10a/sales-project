import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TeamStatus, TeamRole } from "@/types/teamTypes";

export const statusConfig: Record<
  TeamStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-muted",
  },
  invited: {
    label: "Invited",
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

export const roleConfig: Record<TeamRole, { label: string; color: string }> =
  {
    owner: { label: "Owner", color: "text-purple-600" },
    manager: { label: "Manager", color: "text-blue-600" },
    "sales-assistant": {
      label: "Sales Assistant",
      color: "text-green-600",
    },
    checkout: { label: "Check Out", color: "text-cyan-600" },
    inventory: { label: "Inventory", color: "text-orange-600" },
    investor: { label: "Investor", color: "text-emerald-600" },
  };

export interface TeamStats {
  total: number;
  active: number;
  invited: number;
  inactive: number;
}
