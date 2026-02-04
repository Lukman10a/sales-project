import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { use } from "react";

export default function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const investor = mockInvestors.find((inv) => inv.id === resolvedParams.id);

  if (!investor) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/investors">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Investors
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Investor not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
  const investorInitials = `${investor.firstName[0]}${investor.lastName[0]}`;
  const profitPercentage = (
    (totalProfit / investor.investmentAmount) *
    100
  ).toFixed(1);
  const remainingCapital = investor.investmentAmount - totalProfit;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Link href="/investors">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Investors
        </Button>
      </Link>

      {/* Investor Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={investor.avatar} />
                <AvatarFallback className="bg-accent text-accent-foreground font-bold text-lg">
                  {investorInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {investor.firstName} {investor.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {investor.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge
                className={
                  investor.status === "active"
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }
              >
                {investor.status}
              </Badge>
              <Link href={`/investors/${investor.id}/edit`}>
                <Button size="sm">Edit</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Investment Date
            </p>
            <p className="font-semibold text-foreground">
              {new Date(investor.dateInvested).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Ownership Percentage
            </p>
            <p className="font-semibold text-foreground">
              {(investor.percentageOwnership * 100).toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Initial Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {formatCurrency(investor.investmentAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit Accrued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-accent">
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-xs text-accent mt-1">
              {profitPercentage}% of investment
            </p>
          </CardContent>
        </Card>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">
              {formatCurrency(remainingCapital)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Withdrawal History</CardTitle>
            <Link href={`/investors/${investor.id}/withdrawals`}>
              <Button variant="outline" size="sm">
                View All Withdrawals
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {mockWithdrawalRecords.filter((w) => w.investorId === investor.id)
            .length > 0 ? (
            <div className="space-y-3">
              {mockWithdrawalRecords
                .filter((w) => w.investorId === investor.id)
                .sort(
                  (a, b) =>
                    new Date(b.requestDate).getTime() -
                    new Date(a.requestDate).getTime(),
                )
                .slice(0, 5)
                .map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(withdrawal.requestDate).toLocaleDateString(
                          "en-NG",
                        )}{" "}
                        • {withdrawal.month}
                      </p>
                    </div>
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
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No withdrawals yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
