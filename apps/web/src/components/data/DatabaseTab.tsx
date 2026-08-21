import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Play } from "lucide-react";
import { format } from "date-fns";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useTeamData } from "@/contexts/TeamDataContext";
import type { DatabaseStats, DataCleanup } from "@/types/dataManagementTypes";

interface DatabaseTabProps {
  databaseStats?: DatabaseStats;
  dataCleanup?: DataCleanup;
}

export default function DatabaseTab({ databaseStats, dataCleanup }: DatabaseTabProps = {}) {
  const { inventory } = useInventoryData();
  const { recentSales } = useSalesData();
  const { teamMembers } = useTeamData();

  const tables = databaseStats?.tables ?? [
    { name: "products", records: inventory.length, size: 0, lastModified: new Date() },
    { name: "sales", records: recentSales.length, size: 0, lastModified: new Date() },
    { name: "team", records: teamMembers.length, size: 0, lastModified: new Date() },
    { name: "analytics", records: 0, size: 0, lastModified: new Date() },
  ];

  const cleanup = dataCleanup ?? {
    enabled: false,
    rules: [
      {
        id: "cleanup-1",
        name: "Delete Old Notifications",
        dataType: "all" as const,
        condition: "older-than" as const,
        value: "30 days",
        action: "delete" as const,
        lastRun: new Date(),
        nextRun: new Date(),
      },
    ],
  };

  return (
    <TabsContent value="database" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Database Tables</CardTitle>
          <p className="text-sm text-muted-foreground">Live table sizes derived from current data</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.name}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>{table.records.toLocaleString()}</TableCell>
                  <TableCell>{table.size ? `${table.size.toFixed(2)} MB` : "—"}</TableCell>
                  <TableCell>{format(table.lastModified, "MMM dd, yyyy HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Optimize
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Cleanup Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Auto Cleanup Enabled</Label>
              <Switch defaultChecked={cleanup.enabled} />
            </div>
            <div className="space-y-3">
              {cleanup.rules.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rule.condition} {rule.value} → {rule.action}
                    </p>
                    {rule.nextRun && (
                      <p className="text-xs text-muted-foreground mt-1">Next run: {format(rule.nextRun, "MMM dd, yyyy")}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Run Now
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
