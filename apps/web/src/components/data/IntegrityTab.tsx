import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Play } from "lucide-react";
import { format } from "date-fns";
import { getStatusColor, getSeverityColor } from "@/lib/dataUtils";
import type { IntegrityCheck } from "@/types/dataManagementTypes";

interface IntegrityTabProps {
  integrityChecks: IntegrityCheck[];
}

export default function IntegrityTab({ integrityChecks }: IntegrityTabProps) {
  return (
    <TabsContent value="integrity" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Integrity Checks</CardTitle>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Run Check Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrityChecks.map((check) => (
              <div key={check.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {format(check.runAt, "MMM dd, yyyy HH:mm")}
                      </h3>
                      <Badge
                        variant="outline"
                        className={getStatusColor(check.status)}
                      >
                        {check.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        Duration: {check.duration}s
                      </span>
                      <span className="text-success">
                        {check.summary.passed} passed
                      </span>
                      {check.summary.warnings > 0 && (
                        <span className="text-warning">
                          {check.summary.warnings} warnings
                        </span>
                      )}
                      {check.summary.errors > 0 && (
                        <span className="text-destructive">
                          {check.summary.errors} errors
                        </span>
                      )}
                    </div>
                    {check.issues.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {check.issues.map((issue, i) => (
                          <div
                            key={i}
                            className="p-3 bg-muted rounded-lg text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getSeverityColor(issue.severity)}
                              >
                                {issue.severity}
                              </Badge>
                              <span className="font-medium">{issue.table}</span>
                              <span className="text-muted-foreground">
                                {issue.issueType}
                              </span>
                            </div>
                            <p className="mt-2 text-muted-foreground">
                              {issue.description}
                            </p>
                            {issue.autoFixable && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                              >
                                Auto Fix
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}


