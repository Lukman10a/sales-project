"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Investor,
  FinancialRecord,
  WithdrawalRecord,
} from "@/types/investorTypes";
import {
  formatCurrency,
  calculateInvestorTotalProfit,
  getPendingWithdrawals,
} from "@/lib/investorUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Edit2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface InvestorsListProps {
  investors: Investor[];
  financialRecords: FinancialRecord[];
  withdrawalRecords: WithdrawalRecord[];
}

export function InvestorsList({
  investors,
  financialRecords,
  withdrawalRecords,
}: InvestorsListProps) {
  const router = useRouter();

  const handleEditInvestor = (investorId: string) => {
    router.push(`/investors/${investorId}/edit`);
  };

  const handleViewDetails = (investorId: string) => {
    router.push(`/investors/${investorId}`);
  };

  const handleViewWithdrawals = (investorId: string) => {
    router.push(`/investors/${investorId}/withdrawals`);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Investors</CardTitle>
          <CardDescription>
            Complete list of all investors and their investment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Investor
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Investment
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Ownership
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Profit Accrued
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Pending Withdrawals
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {investors.map((investor, idx) => {
                  const totalProfit = calculateInvestorTotalProfit(
                    investor,
                    financialRecords,
                  );
                  const pendingWithdrawals = getPendingWithdrawals(
                    investor.id,
                    withdrawalRecords,
                  );
                  const investorInitials = `${investor.firstName[0]}${investor.lastName[0]}`;

                  return (
                    <motion.tr
                      key={investor.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border shadow-sm">
                            <AvatarImage src={investor.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {investorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {investor.firstName} {investor.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {investor.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(investor.investmentAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(investor.dateInvested).toLocaleDateString(
                              "en-NG",
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary">
                          {(investor.percentageOwnership * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-primary">
                          {formatCurrency(totalProfit)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        {pendingWithdrawals.length > 0 ? (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            {pendingWithdrawals.length} pending
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={
                            investor.status === "active"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          }
                        >
                          {investor.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditInvestor(investor.id)}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Investor
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(investor.id)}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewWithdrawals(investor.id)}
                            >
                              View Withdrawals
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {investors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No investors yet. Add your first investor to get started!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}


