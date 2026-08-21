import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { downloadFile } from "@/lib/inventoryExportUtils";
import type { Backup, BackupSchedule } from "@/types/dataManagementTypes";

interface BackupsTabProps {
  backups?: Backup[];
  backupSchedule?: BackupSchedule;
}

export default function BackupsTab(_props: BackupsTabProps = {}) {
  const { inventory } = useInventoryData();
  const { recentSales } = useSalesData();

  const handleExportAll = () => {
    const json = JSON.stringify({ inventory, sales: recentSales }, null, 2);
    downloadFile(json, "all-data.json", "application/json");
  };

  const handleExportInventory = () => {
    const json = JSON.stringify({ inventory }, null, 2);
    downloadFile(json, "inventory.json", "application/json");
  };

  const handleExportSales = () => {
    const json = JSON.stringify({ sales: recentSales }, null, 2);
    downloadFile(json, "sales.json", "application/json");
  };

  return (
    <TabsContent value="backups" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Backups</CardTitle>
          <CardDescription>
            No backup infrastructure — use Export all data to download a JSON snapshot of inventory + sales. Store it securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This is client-side export, not server backup.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-2" />
              Export all data (JSON)
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportInventory}>
                Export Inventory
              </Button>
              <Button variant="outline" onClick={handleExportSales}>
                Export Sales
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Backups are generated locally from live data. For server-side backups contact your administrator.
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
