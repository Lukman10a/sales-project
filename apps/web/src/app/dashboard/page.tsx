"use client";

import { useEffect, memo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboard } from "@/hooks/useDashboard";
import { AccessDenied } from "@/components/auth/AccessDenied";
import StatCard from "@/components/dashboard/StatCard";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import QuickActions from "@/components/dashboard/QuickActions";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  RefreshCw,
  Target,
  TrendingDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { toast } from "@/components/ui/sonner";

// Dynamically import heavy components
const SalesChart = dynamic(() => import("@/components/dashboard/SalesChart"), {
  loading: () => <div className="h-[300px] bg-card rounded-xl animate-pulse" />,
  ssr: false,
});
const RecentSales = dynamic(
  () => import("@/components/dashboard/RecentSales"),
  {
    loading: () => (
      <div className="h-[300px] bg-card rounded-xl animate-pulse" />
    ),
    ssr: false,
  },
);
const InventoryAlert = dynamic(
  () => import("@/components/dashboard/InventoryAlert"),
  {
    loading: () => (
      <div className="h-[200px] bg-card rounded-xl animate-pulse" />
    ),
    ssr: false,
  },
);
const AIInsightCard = dynamic(
  () => import("@/components/dashboard/AIInsightCard"),
  {
    loading: () => (
      <div className="h-[200px] bg-card rounded-xl animate-pulse" />
    ),
    ssr: false,
  },
);

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { canViewReports } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Restrict dashboard to owners and managers (coarse access gate)
  if (!isLoading && isAuthenticated && !canViewReports()) {
    return (
      <AccessDenied
        message="Dashboard access is restricted to business owners and managers. This page contains confidential business metrics and financial data."
        requiredPermission="owner-or-manager-access"
      />
    );
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <DashboardContent />;
}

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardContent = memo(function DashboardContent() {
  const { user } = useAuth();
  const { isOwner, hasPermission } = usePermissions();
  const { inventory } = useInventoryData();
  const dashboard = useDashboard();
  const { t, formatCurrency } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [greeting] = useState(getTimeBasedGreeting());
  const userRole = user?.role || "owner";

  const metrics = dashboard.data?.metrics;
  const inventoryBreakdown = dashboard.data?.inventory;
  const topSellingProducts = dashboard.data?.topProducts ?? [];

  // Calculate pending confirmations for apprentices
  const pendingConfirmations = inventory.filter(
    (item) => !item.confirmedByApprentice,
  ).length;

  // Revenue goal (mock - would come from settings)
  const monthlyGoal = 500000;
  const currentRevenue = metrics?.totalRevenue ?? 0;
  const goalProgress = (currentRevenue / monthlyGoal) * 100;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast(t("Dashboard refreshed"));
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              {t(greeting)}, {user?.firstName || ""}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("Here's what's happening with your business today.")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("Refresh")}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions
        userRole={userRole}
        pendingConfirmations={pendingConfirmations}
      />

      {/* Stats Grid - Owners & Managers only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={t("Today's Sales")}
          value={formatCurrency(metrics?.todayRevenue ?? 0)}
          icon={DollarSign}
          variant="accent"
          delay={0}
        />
        <StatCard
          title={t("Today's Transactions")}
          value={String(metrics?.todayOrders ?? 0)}
          icon={ShoppingCart}
          delay={0.1}
        />
        <StatCard
          title={t("In Stock")}
          value={String(inventoryBreakdown?.byStatus["in-stock"] ?? 0)}
          icon={Package}
          variant="warning"
          delay={0.2}
        />
        <StatCard
          title={t("Low Stock Alerts")}
          value={String(metrics?.lowStockCount ?? 0)}
          icon={TrendingUp}
          delay={0.3}
        />
      </div>

      {/* Charts and Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div>
          <RecentSales />
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-card rounded-xl border shadow-sm p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground mb-4">
            {t("Today's Summary")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("Total Revenue")}
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(currentRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("Transactions")}
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {metrics?.totalOrders ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Package className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Net Profit")}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(metrics?.netProfit ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </motion.div>

        {/* Revenue Goal Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="bg-card rounded-xl border shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">
                {t("Monthly Goal")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("Track your progress")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              {isOwner() || hasPermission("view-sales-history") ? (
                <>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(currentRevenue)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("of")} {formatCurrency(monthlyGoal)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(goalProgress, 100)}
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {goalProgress >= 100
                      ? t("🎉 Goal achieved! Excellent work!")
                      : `${Math.round(goalProgress)}% ${t("complete")}`}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-bold text-foreground">
                      {Math.round(goalProgress)}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("of monthly goal")}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(goalProgress, 100)}
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {goalProgress >= 100
                      ? t("🎉 Goal achieved! Excellent work!")
                      : t("Keep up the great work!")}
                  </p>
                </>
              )}
            </div>

            <div className="pt-4 border-t space-y-2">
              {isOwner() || hasPermission("view-sales-history") ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("Daily Average")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(currentRevenue / new Date().getDate())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("Remaining")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        Math.max(0, monthlyGoal - currentRevenue),
                      )}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Selling Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-card rounded-xl border shadow-sm p-6"
      >
        <h3 className="font-display font-semibold text-lg text-foreground mb-4">
          {t("Top Selling Products")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topSellingProducts.map((product, index) => (
            <div
              key={product.productId}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate text-sm">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {product.units} {t("sold")}
                  </span>
                  <span>•</span>
                  <span className="text-accent font-medium">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {topSellingProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{t("No sales data yet")}</p>
          </div>
        )}
      </motion.div>

      {/* Alerts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <InventoryAlert />
        <AIInsightCard />
      </div>
    </div>
  );
});