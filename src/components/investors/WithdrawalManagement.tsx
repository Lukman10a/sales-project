"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Investor,
  WithdrawalRecord,
  FinancialRecord,
} from "@/types/investorTypes";
import {
  formatCurrency,
  calculateInvestorTotalProfit,
} from "@/lib/investorUtils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useInvestorData } from "@/contexts/InvestorDataContext";

interface WithdrawalManagementProps {
  withdrawalRecords: WithdrawalRecord[];
  investors: Investor[];
  financialRecords: FinancialRecord[];
}

export function WithdrawalManagement({
  withdrawalRecords,
  investors,
  financialRecords,
}: WithdrawalManagementProps) {
  const { toast } = useToast();
  const { updateWithdrawal } = useInvestorData();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const getInvestor = (investorId: string) =>
    investors.find((inv) => inv.id === investorId);

  const handleApprove = async (withdrawalId: string) => {
    setActioningId(withdrawalId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateWithdrawal(withdrawalId, {
        status: "approved",
        approvalDate: new Date().toISOString(),
      });
      toast({
        title: "Success",
        description: "Withdrawal request approved successfully",
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    setActioningId(withdrawalId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateWithdrawal(withdrawalId, { status: "pending" });
      toast({
        title: "Success",
        description: "Withdrawal request rejected",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  };

  const pendingRequests = withdrawalRecords.filter(
    (wd) => wd.status === "pending",
  );
  const completedRequests = withdrawalRecords.filter(
    (wd) => wd.status === "completed",
  );
  const approvedRequests = withdrawalRecords.filter(
    (wd) => wd.status === "approved",
  );

  const renderWithdrawalRow = (record: WithdrawalRecord, idx: number) => {
    const investor = getInvestor(record.investorId);
    if (!investor) return null;

    const investorInitials = `${investor.firstName[0]}${investor.lastName[0]}`;

    return (
      <motion.div
        key={record.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="w-10 h-10">
            <AvatarImage src={investor.avatar} />
            <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
              {investorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {investor.firstName} {investor.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(record.requestDate).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="text-right mr-4">
          <p className="font-semibold text-foreground">
            {formatCurrency(record.amount)}
          </p>
          <p className="text-xs text-muted-foreground">Month: {record.month}</p>
        </div>

        {record.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleReject(record.id)}
              disabled={actioningId === record.id}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleApprove(record.id)}
              disabled={actioningId === record.id}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </div>
        )}

        {record.status === "approved" && (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
            <Clock className="w-3 h-3" />
            Approved
          </Badge>
        )}

        {record.status === "completed" && (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>
            Manage investor profit withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingRequests.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                  >
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="relative">
                Approved
                {approvedRequests.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100"
                  >
                    {approvedRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="relative">
                Completed
                {completedRequests.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-green-100 text-green-800 hover:bg-green-100"
                  >
                    {completedRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No pending withdrawal requests
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingRequests.map((record, idx) =>
                    renderWithdrawalRow(record, idx),
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              {approvedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No approved withdrawal requests
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {approvedRequests.map((record, idx) =>
                    renderWithdrawalRow(record, idx),
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {completedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No completed withdrawals yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {completedRequests.map((record, idx) =>
                    renderWithdrawalRow(record, idx),
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}


