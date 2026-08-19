"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Shield, User, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface RoleToggleProps {
  value: "owner" | "apprentice" | "investor";
  onChange: (role: "owner" | "apprentice" | "investor") => void;
}

export function RoleToggle({ value, onChange }: RoleToggleProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {t("Login as")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {/* Admin option */}
        <button
          type="button"
          onClick={() => onChange("apprentice")}
          className={cn(
            "flex items-center justify-center gap-2 py-3 px-2 rounded-lg transition-all border shadow-sm font-medium text-sm",
            value === "apprentice"
              ? "border-primary bg-primary/10 text-primary"
              : "border-muted bg-muted/50 text-muted-foreground hover:border-primary/50",
          )}
        >
          <User className="w-4 h-4" />
          <span className="truncate">{t("Admin")}</span>
        </button>

        {/* Owner option */}
        <button
          type="button"
          onClick={() => onChange("owner")}
          className={cn(
            "flex items-center justify-center gap-2 py-3 px-2 rounded-lg transition-all border shadow-sm font-medium text-sm",
            value === "owner"
              ? "border-primary bg-primary/10 text-primary"
              : "border-muted bg-muted/50 text-muted-foreground hover:border-primary/50",
          )}
        >
          <Shield className="w-4 h-4" />
          <span className="truncate">{t("Owner")}</span>
        </button>

        {/* Investor option */}
        <button
          type="button"
          onClick={() => onChange("investor")}
          disabled
          title={t("Investor portal is coming soon")}
          className={cn(
            "flex items-center justify-center gap-2 py-3 px-2 rounded-lg transition-all border shadow-sm font-medium text-sm opacity-50 cursor-not-allowed",
            value === "investor"
              ? "border-primary bg-primary/10 text-primary"
              : "border-muted bg-muted/50 text-muted-foreground",
          )}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="truncate">{t("Investor")}</span>
        </button>
      </div>
    </div>
  );
}



