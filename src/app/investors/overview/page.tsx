import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  Percent,
  DollarSign,
  Clock,
} from "lucide-react";
import Link from "next/link";
import {
  mockInvestors,
  mockFinancialRecords,
  mockWithdrawalRecords,
} from "@/data/investor";
import {
  formatCurrency,
  calculateInvestorTotalProfit,
  getPendingWithdrawals,
} from "@/lib/investorUtils";

export default function InvestorsOverviewPage() {
  // Calculate comprehensive statistics
  const totalInvestmentAmount = mockInvestors.reduce(
    (sum, inv) => sum + inv.investmentAmount,
    0,
  );

  const investorStats = mockInvestors.map((investor) => {
    const totalProfit = calculateInvestorTotalProfit(
      investor,
      mockFinancialRecords,
    );
    const pendingWithdrawals = getPendingWithdrawals(
      investor.id,
      mockWithdrawalRecords,
    );
    const completedWithdrawals = mockWithdrawalRecords.filter(
      (w) => w.investorId === investor.id && w.status === "completed",
    );
    const totalWithdrawn = completedWithdrawals.reduce(
      (sum, w) => sum + w.amount,
      0,
    );
    const percentAllocated = (investor.percentageOwnership * 100).toFixed(1);
    const percentRemaining = (100 - investor.percentageOwnership * 100).toFixed(
      1,
    );
    const profitPercentage = (
      (totalProfit / investor.investmentAmount) *
      100
    ).toFixed(1);

    return {
      investor,
      totalProfit,
      pendingWithdrawals,
      completedWithdrawals,
      totalWithdrawn,
      percentAllocated,
      percentRemaining,
      profitPercentage,
      currentValue: investor.investmentAmount + totalProfit,
    };
  });

  const totalProfitAccrued = investorStats.reduce(
    (sum, stat) => sum + stat.totalProfit,
    0,
  );
  const totalWithdrawn = investorStats.reduce(
    (sum, stat) => sum + stat.totalWithdrawn,
    0,
  );
  const totalCurrentValue = investorStats.reduce(
    (sum, stat) => sum + stat.currentValue,
    0,
  );
  const averageProfitPercentage = (
    (totalProfitAccrued / totalInvestmentAmount) *
    100
  ).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Link href="/investors">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Investors
        </Button>
      </Link>

      <div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Investment Overview
        </h1>
        <p className="text-muted-foreground">
          Comprehensive view of all investor investments and allocations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Investment
              </CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {formatCurrency(totalInvestmentAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {mockInvestors.length} investors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Profit Accrued
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-accent">
              {formatCurrency(totalProfitAccrued)}
            </p>
            <p className="text-xs text-accent mt-1">
              {averageProfitPercentage}% average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Withdrawn
              </CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {formatCurrency(totalWithdrawn)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Total Value
              </CardTitle>
              <Percent className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {formatCurrency(totalCurrentValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Ownership Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {investorStats.map((stat) => (
              <div key={stat.investor.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    {stat.investor.firstName} {stat.investor.lastName}
                  </p>
                  <span className="text-sm font-semibold text-foreground">
                    {(stat.investor.percentageOwnership * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-accent rounded-full flex items-center justify-end pr-2"
                    style={{
                      width: `${stat.investor.percentageOwnership * 100}%`,
                    }}
                  >
                    {stat.investor.percentageOwnership * 100 > 15 && (
                      <span className="text-xs font-semibold text-accent-foreground">
                        {(stat.investor.percentageOwnership * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Investment: {formatCurrency(stat.investor.investmentAmount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Investor Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Investment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Investor
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Investment
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Allocation %
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Profit Accrued
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Profit %
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Current Value
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">
                    Withdrawn
                  </th>
                </tr>
              </thead>
              <tbody>
                {investorStats.map((stat) => (
                  <tr
                    key={stat.investor.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <Link href={`/investors/${stat.investor.id}`}>
                        <p className="font-medium text-accent hover:underline cursor-pointer">
                          {stat.investor.firstName} {stat.investor.lastName}
                        </p>
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-foreground">
                      {formatCurrency(stat.investor.investmentAmount)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Badge variant="secondary">
                        {(stat.investor.percentageOwnership * 100).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-accent">
                      {formatCurrency(stat.totalProfit)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-accent font-medium">
                        {stat.profitPercentage}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-foreground">
                      {formatCurrency(stat.currentValue)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link href={`/investors/${stat.investor.id}/withdrawals`}>
                        <p className="text-accent hover:underline cursor-pointer">
                          {formatCurrency(stat.totalWithdrawn)}
                        </p>
                      </Link>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-semibold bg-muted/30">
                  <td className="py-4 px-4">TOTAL</td>
                  <td className="py-4 px-4 text-right text-foreground">
                    {formatCurrency(totalInvestmentAmount)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Badge>100%</Badge>
                  </td>
                  <td className="py-4 px-4 text-right text-accent">
                    {formatCurrency(totalProfitAccrued)}
                  </td>
                  <td className="py-4 px-4 text-right text-accent">
                    {averageProfitPercentage}%
                  </td>
                  <td className="py-4 px-4 text-right text-foreground">
                    {formatCurrency(totalCurrentValue)}
                  </td>
                  <td className="py-4 px-4 text-right text-foreground">
                    {formatCurrency(totalWithdrawn)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Investors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {investorStats
                .filter((s) => s.investor.status === "active")
                .map((stat) => (
                  <div
                    key={stat.investor.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-foreground">
                      {stat.investor.firstName} {stat.investor.lastName}
                    </span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {investorStats
                .filter((s) => s.pendingWithdrawals.length > 0)
                .map((stat) => (
                  <div
                    key={stat.investor.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-foreground">
                      {stat.investor.firstName} {stat.investor.lastName}
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      {stat.pendingWithdrawals.length} pending
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
