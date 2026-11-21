import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, AlertTriangle } from "lucide-react";
import { InventoryItem } from "@/types/inventoryTypes";
import { useLanguage } from "@/contexts/LanguageContext";
import { expiryState } from "@/lib/expiry";
import { statusConfig } from "./inventoryConfig";
import ImageDisplay from "./ImageDisplay";

interface InventoryListItemProps {
  item: InventoryItem;
  userRole: string;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  /** Opens the restock / adjust dialog; hidden when not given. */
  onChangeStock?: (item: InventoryItem) => void;
  canEdit?: boolean;
}

export default function InventoryListItem({
  item,
  userRole,
  onEdit,
  onDelete,
  onChangeStock,
  canEdit = false,
}: InventoryListItemProps) {
  const { t, formatCurrency } = useLanguage();
  const expiry = expiryState(item.expiryDate);

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <ImageDisplay
              src={item.image || ""}
              alt={item.name}
              className="w-12 h-12"
            />
          </div>
          <div>
            <Link
              href={`/inventory/${item.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {item.name}
            </Link>
{expiry && item.expiryDate && (
              <span
                className={
                  expiry === "expired"
                    ? "flex items-center gap-1 text-xs text-destructive"
                    : "flex items-center gap-1 text-xs text-warning"
                }
              >
                <AlertTriangle className="w-3 h-3" />
                {expiry === "expired"
                  ? t("Expired {date}", { values: { date: item.expiryDate } })
                  : t("Expires {date}", { values: { date: item.expiryDate } })}
              </span>
            )}
            {item.createdByName && (
              <span className="block text-xs text-muted-foreground">
                {t("Added by")}: {item.createdByName}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="p-4">
        <Badge
          variant="outline"
          className={statusConfig[item.status].className}
        >
          {t(statusConfig[item.status].label)}
        </Badge>
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1">
          {item.category.map((category) => (
            <Badge key={category} variant="secondary">
              {t(category)}
            </Badge>
          ))}
        </div>
      </td>
      <td className="p-4 text-right font-medium">{item.quantity}</td>
      <td className="p-4 text-right font-medium text-success">{item.sold}</td>
      {userRole === "owner" && (
        <td className="p-4 text-right">
          {formatCurrency(item.costPrice)}
        </td>
      )}
      <td className="p-4 text-right font-medium text-primary">
        {formatCurrency(item.sellingPrice)}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
          {onChangeStock && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangeStock(item)}
            >
              {t("Stock")}
            </Button>
          )}
          {canEdit ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => onDelete(item)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}



