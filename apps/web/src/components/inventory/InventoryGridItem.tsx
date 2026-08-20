import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/types/inventoryTypes";
import { useLanguage } from "@/contexts/LanguageContext";
import { statusConfig } from "./inventoryConfig";
import ImageDisplay from "./ImageDisplay";

interface InventoryGridItemProps {
  item: InventoryItem;
  index: number;
  userRole: string;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onConfirmReceipt: (itemId: string, itemName: string) => void;
  canEdit?: boolean;
}

export default function InventoryGridItem({
  item,
  index,
  userRole,
  onEdit,
  onDelete,
  onConfirmReceipt,
  canEdit = false,
}: InventoryGridItemProps) {
  const { t, formatCurrency } = useLanguage();

  return (
    <motion.div
      key={item.id}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <Link href={`/inventory/${item.id}`} className="block">
        <div className="aspect-square relative bg-muted">
          <ImageDisplay
            src={item.image || ""}
            alt={item.name}
            className="w-full h-full"
          />
          <Badge
            variant="outline"
            className={cn(
              "absolute top-3 right-3",
              statusConfig[item.status].className,
            )}
          >
            {t(statusConfig[item.status].label)}
          </Badge>
          {!item.confirmedByApprentice && userRole === "apprentice" && (
            <div className="absolute inset-0 bg-warning/20 backdrop-blur-sm flex items-center justify-center">
              <Button
                size="sm"
                className="bg-warning text-warning-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  onConfirmReceipt(item.id, item.name);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t("Confirm Receipt")}
              </Button>
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground truncate">
            {item.name}
          </h3>
          <div className="flex flex-wrap gap-1 justify-end">
            {item.category.map((category) => (
              <Badge key={category} variant="secondary">
                {t(category)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1 text-sm">
          {item.createdByName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("Added by")}</span>
              <span className="font-medium text-foreground truncate">
                {item.createdByName}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Qty Available")}</span>
            <span className="font-medium text-foreground">{item.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Sold")}</span>
            <span className="font-medium text-success">{item.sold}</span>
          </div>
          {userRole === "owner" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("Cost Price")}</span>
              <span className="font-medium text-foreground">
                {formatCurrency(item.wholesalePrice)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Selling Price")}</span>
            <span className="font-medium text-accent">
              {formatCurrency(item.sellingPrice)}
            </span>
          </div>
          {userRole === "owner" && item.wholesalePrice > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("Margin")}</span>
              <span className="font-medium text-success">
                {(
                  ((item.sellingPrice - item.wholesalePrice) /
                    item.sellingPrice) *
                  100
                ).toFixed(0)}
                %
              </span>
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(item)}
            >
              <Edit className="w-3 h-3 mr-1" />
              {t("Edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}



