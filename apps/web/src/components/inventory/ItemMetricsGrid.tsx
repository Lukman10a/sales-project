import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Package, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  colorClass?: string;
}

function ItemMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass = "text-foreground",
}: ItemMetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

interface ItemMetricsGridProps {
  sellingPrice: string;
  wholesalePrice: string;
  quantity: number;
  sold: number;
  profitPercentage: string;
  profitMargin: string;
  totalRevenue: string;
  totalProfit: string;
}

export default function ItemMetricsGrid({
  sellingPrice,
  wholesalePrice,
  quantity,
  sold,
  profitPercentage,
  profitMargin,
  totalRevenue,
  totalProfit,
}: ItemMetricsGridProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Pricing & Stock Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ItemMetricCard
          title={t("Selling Price")}
          value={sellingPrice}
          subtitle={`${t("Cost")}: ${wholesalePrice}`}
          icon={DollarSign}
          colorClass="text-accent"
        />
        <ItemMetricCard
          title={t("In Stock")}
          value={quantity}
          subtitle={`${t("Sold")}: ${sold} ${t("units")}`}
          icon={Package}
        />
        <ItemMetricCard
          title={t("Profit Margin")}
          value={`${profitPercentage}%`}
          subtitle={`${profitMargin} ${t("per unit")}`}
          icon={TrendingUp}
          colorClass="text-success"
        />
      </div>

      {/* Revenue & Profit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Total Revenue")}</CardTitle>
            <CardDescription>
              {t("From {count} units sold", { values: { count: sold } })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{totalRevenue}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Total Profit")}</CardTitle>
            <CardDescription>{t("Net profit earned")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{totalProfit}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}



