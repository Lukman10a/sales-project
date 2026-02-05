import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface CategorySectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
  categoryInput: string;
  setCategoryInput: (value: string) => void;
  categorySuggestions: string[];
  addCategory: (value: string) => void;
  removeCategory: (value: string) => void;
  hasCategory: (value: string) => boolean;
}

export default function CategorySection({
  item,
  categoryInput,
  setCategoryInput,
  categorySuggestions,
  addCategory,
  removeCategory,
  hasCategory,
}: CategorySectionProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-2">
      <Label htmlFor="category">{t("Category")}</Label>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-muted/30">
        {item.category.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {t("No categories selected")}
          </span>
        ) : (
          item.category.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t(category)}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => removeCategory(category)}
                aria-label={t("Remove category")}
              >
                x
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input
          id="category"
          placeholder={t("Add a category")}
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCategory(categoryInput);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => addCategory(categoryInput)}
        >
          {t("Add")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categorySuggestions.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={hasCategory(category) ? "secondary" : "outline"}
            onClick={() => addCategory(category)}
            disabled={hasCategory(category)}
          >
            {t(category)}
          </Button>
        ))}
      </div>
    </div>
  );
}
