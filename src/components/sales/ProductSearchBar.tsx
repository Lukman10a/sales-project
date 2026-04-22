"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ProductSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function ProductSearchBar({
  searchQuery,
  onSearchChange,
}: ProductSearchBarProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="relative">
      <Search
        className={
          isRTL
            ? "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        }
      />
      <Input
        placeholder={t("Search products...")}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className={isRTL ? "pr-10" : "pl-10"}
      />
    </div>
  );
}



