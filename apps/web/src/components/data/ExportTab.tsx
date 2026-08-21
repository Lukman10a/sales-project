import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import {
  generateInventoryExportData,
  generateCSVContent,
  downloadFile,
} from "@/lib/inventoryExportUtils";
import type { ExportRequest } from "@/types/dataManagementTypes";

interface ExportTabProps {
  exportRequests?: ExportRequest[];
}

export default function ExportTab(_props: ExportTabProps = {}) {
  const { inventory } = useInventoryData();
  const { recentSales } = useSalesData();

  const handleExportInventory = () => {
    const data = generateInventoryExportData(inventory, { type: "all-stock", format: "pdf", includeMetrics: true, includeImages: false });
    const csv = generateCSVContent(data);
    downloadFile(csv, "inventory.csv", "text/csv");
  };

  const handleExportSales = () => {
    const header = "id,date,total,status\n";
    const rows = recentSales.map((s) => `${s.id},${s.time},${s.total},${s.status}`).join("\n");
    const csv = header + rows;
    downloadFile(csv, "sales.csv", "text/csv");
  };

  const handleExportAll = () => {
    const json = JSON.stringify({ inventory, sales: recentSales }, null, 2);
    downloadFile(json, "all-data.json", "application/json");
  };

  return (
    <TabsContent value="export" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Data</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Exports are generated client-side from live data</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button onClick={handleExportInventory} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Inventory CSV
            </Button>
            <Button onClick={handleExportSales} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Sales CSV
            </Button>
            <Button onClick={handleExportAll} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export All JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
