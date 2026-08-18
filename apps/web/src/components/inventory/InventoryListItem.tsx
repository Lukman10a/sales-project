import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, AlertTriangle } from "lucide-react";
import { InventoryItem } from "@/types/inventoryTypes";
import { useLanguage } from "@/contexts/LanguageContext";
import { statusConfig } from "./inventoryConfig";
import ImageDisplay from "./ImageDisplay";

interface InventoryListItemProps {
  item: InventoryItem;
  userRole: string;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onConfirmReceipt: (itemId: string, itemName: string) => void;
  canEdit?: boolean;
}

export default function InventoryListItem({
  item,
  userRole,
  onEdit,
  onDelete,
  onConfirmReceipt,
  canEdit = false,
}: InventoryListItemProps) {
  const { t, formatCurrency } = useLanguage();

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
            {!item.confirmedByApprentice && (
              <span className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="w-3 h-3" />
                {t("Pending confirmation")}
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
          {formatCurrency(item.wholesalePrice)}
        </td>
      )}
      <td className="p-4 text-right font-medium text-primary">
        {formatCurrency(item.sellingPrice)}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
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
          ) : userRole === "apprentice" && !item.confirmedByApprentice ? (
            <Button
              size="sm"
              className="bg-warning text-warning-foreground"
              onClick={() => onConfirmReceipt(item.id, item.name)}
            >
              {t("Confirm")}
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              {t("Sell")}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}



