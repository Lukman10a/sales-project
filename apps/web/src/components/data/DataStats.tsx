import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  HardDrive,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useTeamData } from "@/contexts/TeamDataContext";
import type {
  DatabaseStats,
  BackupSchedule,
  IntegrityCheck,
} from "@/types/dataManagementTypes";

interface DataStatsProps {
  databaseStats?: DatabaseStats;
  backupSchedule?: BackupSchedule;
  integrityChecks?: IntegrityCheck[];
}

export default function DataStats(_props: DataStatsProps = {}) {
  const { inventory, lowStockItems, outOfStockItems } = useInventoryData();
  const { recentSales, totalSalesAmount } = useSalesData();
  const { teamMembers } = useTeamData();

  const totalItems = inventory.length;
  const lowStockTotal = lowStockItems + outOfStockItems;
  const isHealthy = lowStockTotal === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
            <HardDrive className="w-10 h-10 text-primary/60" />
          </div>
          <Progress value={Math.min((totalItems / 1000) * 100, 100)} className="mt-3 h-2" />
          <p className="text-xs text-muted-foreground mt-2">Live data</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold">{recentSales.length}</p>
            </div>
            <ShoppingCart className="w-10 h-10 text-success/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ₦{totalSalesAmount.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Team Size</p>
              <p className="text-2xl font-bold">{teamMembers.length}</p>
            </div>
            <Users className="w-10 h-10 text-accent/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">{teamMembers.length} members</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                {isHealthy ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Healthy
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    {lowStockTotal}
                  </>
                )}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-primary/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {lowStockItems} low, {outOfStockItems} out of stock
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
