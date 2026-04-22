"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { CartItem, SaleItem } from "@/types/salesTypes";
import Image from "next/image";

interface ProductsGridProps {
  products: SaleItem[];
  cart: CartItem[];
  onProductClick: (product: SaleItem) => void;
}

export default function ProductsGrid({
  products,
  cart,
  onProductClick,
}: ProductsGridProps) {
  const { t, formatCurrency } = useLanguage();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map((item, index) => {
        const inCart = cart.find((i) => i.id === item.id);
        const isLowStock = item.availableQty <= 5;
        const isOutOfStock = item.availableQty === 0;
        return (
          <motion.button
            key={item.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onProductClick(item)}
            disabled={isOutOfStock}
            className={cn(
              "bg-card rounded-xl border p-3 text-left transition-all shadow-sm hover:shadow-md relative",
              inCart && "border-primary ring-2 ring-primary/20",
              isOutOfStock && "opacity-50 cursor-not-allowed",
            )}
          >
            {isLowStock && !isOutOfStock && (
              <div className="absolute top-2 left-2 z-10">
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/20 text-xs"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("Low")}
                </Badge>
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  {t("Out of Stock")}
                </Badge>
              </div>
            )}
            <div className="aspect-square rounded-lg bg-muted mb-3 overflow-hidden relative">
              <Image
                width={400}
                height={400}
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {inCart && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  {inCart.quantity}
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm text-foreground truncate mb-1">
              {item.name}
            </h3>
            <p className="text-accent font-semibold text-sm">
              {formatCurrency(item.sellingPrice)}
            </p>
            <p
              className={cn(
                "text-xs",
                isLowStock
                  ? "text-warning font-medium"
                  : "text-muted-foreground",
              )}
            >
              {item.availableQty} {t("available")}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}



