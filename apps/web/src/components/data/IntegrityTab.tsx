import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { useIntegrityCheck } from "@/hooks/useIntegrityCheck";
import { getStatusColor } from "@/lib/dataUtils";
import type { IntegrityCheck } from "@/types/dataManagementTypes";

interface IntegrityTabProps {
  integrityChecks?: IntegrityCheck[];
}

export default function IntegrityTab(_props: IntegrityTabProps = {}) {
  const { checks, runCheck } = useIntegrityCheck();

  const allPassed = checks.length > 0 && checks.every((c) => c.status === "passed");
  const hasFailed = checks.some((c) => c.status === "failed");

  return (
    <TabsContent value="integrity" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Integrity Checks</CardTitle>
            <Button onClick={runCheck}>
              <Play className="w-4 h-4 mr-2" />
              Run Check Now
            </Button>
          </div>
          {checks.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {allPassed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-success">Healthy</span>
                </>
              ) : hasFailed ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Issues found</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium text-warning">Warnings</span>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{check.name}</h3>
                      <Badge variant="outline" className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{check.description}</p>
                  </div>
                  <span className="ml-2">
                    {check.status === "passed" ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
