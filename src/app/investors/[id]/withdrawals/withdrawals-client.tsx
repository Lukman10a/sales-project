"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/investorUtils";
import { Investor } from "@/types/investorTypes";
import { useInvestorData } from "@/contexts/InvestorDataContext";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface WithdrawalsClientProps {
  investor: Investor;
}

export default function WithdrawalsClient({
  investor,
}: WithdrawalsClientProps) {
  const { withdrawals, updateWithdrawal } = useInvestorData();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { t } = useLanguage();

  const investorWithdrawals = withdrawals.filter(
    (w) => w.investorId === investor.id,
  );
  const completedWithdrawals = investorWithdrawals.filter(
    (w) => w.status === "completed",
  );
  const pendingWithdrawals = investorWithdrawals.filter(
    (w) => w.status === "pending",
  );
  const approvedWithdrawals = investorWithdrawals.filter(
    (w) => w.status === "approved",
  );
  const totalWithdrawn = completedWithdrawals.reduce(
    (sum, w) => sum + w.amount,
    0,
  );
  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const investorInitials = `${investor.firstName[0]}${investor.lastName[0]}`;

  const handleApprove = async (withdrawalId: string) => {
    setActioningId(withdrawalId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      updateWithdrawal(withdrawalId, {
        status: "approved",
        approvalDate: new Date().toISOString(),
      });
      toast(t("Withdrawal approved successfully"));
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkComplete = async (withdrawalId: string) => {
    setActioningId(withdrawalId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      updateWithdrawal(withdrawalId, {
        status: "completed",
        approvalDate: new Date().toISOString(),
      });
      toast(t("Withdrawal marked as completed"));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <Link href={`/investors/${investor.id}`}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {investor.firstName} Profile
        </Button>
      </Link>

      {/* Investor Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={investor.avatar} />
              <AvatarFallback className="bg-accent text-accent-foreground font-bold">
                {investorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Withdrawal Management
              </h1>
              <p className="text-sm text-muted-foreground">
                {investor.firstName} {investor.lastName} withdrawals
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Withdrawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {formatCurrency(totalWithdrawn)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {completedWithdrawals.length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-yellow-600">
              {formatCurrency(totalPending)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingWithdrawals.length} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {investorWithdrawals.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Withdrawal Records</CardTitle>
        </CardHeader>
        <CardContent>
          {investorWithdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Month
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Request Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Approval Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {investorWithdrawals
                    .sort(
                      (a, b) =>
                        new Date(b.requestDate).getTime() -
                        new Date(a.requestDate).getTime(),
                    )
                    .map((withdrawal) => (
                      <tr
                        key={withdrawal.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-semibold text-foreground">
                          {formatCurrency(withdrawal.amount)}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {withdrawal.month}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {new Date(withdrawal.requestDate).toLocaleDateString(
                            "en-NG",
                          )}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {withdrawal.approvalDate
                            ? new Date(
                                withdrawal.approvalDate,
                              ).toLocaleDateString("en-NG")
                            : "—"}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            className={
                              withdrawal.status === "completed"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : withdrawal.status === "approved"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            }
                          >
                            {withdrawal.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {withdrawal.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(withdrawal.id)}
                              disabled={actioningId === withdrawal.id}
                            >
                              Approve
                            </Button>
                          )}
                          {withdrawal.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkComplete(withdrawal.id)}
                              disabled={actioningId === withdrawal.id}
                            >
                              Mark Complete
                            </Button>
                          )}
                          {withdrawal.status === "completed" && (
                            <span className="text-xs text-muted-foreground">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No withdrawal records found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


