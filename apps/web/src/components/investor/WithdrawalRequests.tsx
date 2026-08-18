"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithdrawalRecord } from "@/types/investorTypes";
import { formatCurrency } from "@/lib/investorUtils";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface WithdrawalRequestsProps {
  withdrawalRecords: WithdrawalRecord[];
  investorId: string;
  pendingCount: number;
}

export function WithdrawalRequests({
  withdrawalRecords,
  investorId,
  pendingCount,
}: WithdrawalRequestsProps) {
  const { t, language } = useLanguage();

  const dateLocale = language === "ar" ? "ar-EG" : "en-NG";

  const relevantRecords = withdrawalRecords
    .filter((wd) => wd.investorId === investorId)
    .sort(
      (a, b) =>
        new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime(),
    )
    .slice(0, 5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "approved":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            {t("Pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            {t("Approved")}
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {t("Completed")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display font-bold text-foreground tracking-tight">
              {t("Withdrawal Requests")}
            </CardTitle>
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {t("{count} pending", { values: { count: pendingCount } })}
              </Badge>
            )}
          </div>
          <CardDescription>
            {t("Your profit withdrawal history")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {relevantRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("No withdrawal records yet")}
              </p>
            ) : (
              relevantRecords.map((record, idx) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(record.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(record.requestDate).toLocaleDateString(
                          dateLocale,
                          {
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {t(
                          record.status === "pending"
                            ? "Pending"
                            : record.status === "approved"
                              ? "Approved"
                              : "Completed",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(record.amount)}
                    </p>
                    {getStatusBadge(record.status)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


