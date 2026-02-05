import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { sortOptions } from "./inventoryConfig";

interface InventoryFiltersProps {
  filterStatus: string;
  filterCategory: string;
  sortBy: string;
  categories: string[];
  filteredCount: number;
  onFilterStatusChange: (value: string) => void;
  onFilterCategoryChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function InventoryFilters({
  filterStatus,
  filterCategory,
  sortBy,
  categories,
  filteredCount,
  onFilterStatusChange,
  onFilterCategoryChange,
  onSortByChange,
  onClearFilters,
}: InventoryFiltersProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card rounded-xl border p-4 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t("Status")}</Label>
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("All Statuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Statuses")}</SelectItem>
              <SelectItem value="in-stock">{t("In Stock")}</SelectItem>
              <SelectItem value="low-stock">{t("Low Stock")}</SelectItem>
              <SelectItem value="out-of-stock">{t("Out of Stock")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("Category")}</Label>
          <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("All Categories")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {t(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("Sort By")}</Label>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("Sort by")} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          {t("Showing {count} items", { values: { count: filteredCount } })}
        </p>
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          {t("Clear Filters")}
        </Button>
      </div>
    </motion.div>
  );
}
