"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface TeamFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
  filterRole: string;
  onRoleChange: (role: string) => void;
}

export default function TeamFilters({
  searchQuery,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterRole,
  onRoleChange,
}: TeamFiltersProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <div className="relative flex-1">
        <Search
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
            isRTL ? "right-3" : "left-3",
          )}
        />
        <Input
          placeholder={t("Search team members...")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={isRTL ? "pr-10" : "pl-10"}
        />
      </div>
      <Select value={filterStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t("Status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All Status")}</SelectItem>
          <SelectItem value="active">{t("Active")}</SelectItem>
          <SelectItem value="inactive">{t("Inactive")}</SelectItem>
          <SelectItem value="invited">{t("Invited")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterRole} onValueChange={onRoleChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t("Role")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All Roles")}</SelectItem>
          <SelectItem value="owner">{t("Owner")}</SelectItem>
          <SelectItem value="manager">{t("Manager")}</SelectItem>
          <SelectItem value="sales-assistant">
            {t("Sales Assistant")}
          </SelectItem>
          <SelectItem value="checkout">{t("Check Out")}</SelectItem>
          <SelectItem value="inventory">{t("Inventory")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}


