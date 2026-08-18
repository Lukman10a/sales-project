"use client";

import {
  getInvestorDashboardData,
  formatCurrency,
  formatPercentage,
  getPendingWithdrawals,
} from "@/lib/investorUtils";
import {
  mockInvestors,
  mockFinancialRecords,
  mockWithdrawalRecords,
} from "@/data/investor";
import {
  InvestmentOverview,
  ProfitSummary,
  WithdrawalRequests,
  ProfitChart,
} from "@/components/investor";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InvestorDashboard() {
  const { t } = useLanguage();
  // Get current investor based on investorId from auth
  const investor = mockInvestors.find((inv) => inv.id === "inv-1");

  if (!investor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("Investor Profile Not Found")}
          </h1>
          <p className="text-muted-foreground">{t("Please contact support")}</p>
        </div>
      </div>
    );
  }

  // Get investor dashboard data
  const dashboardData = getInvestorDashboardData(
    investor,
    mockFinancialRecords,
    mockWithdrawalRecords,
  );
  const pendingWithdrawals = getPendingWithdrawals(
    investor.id,
    mockWithdrawalRecords,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {t("Investment Dashboard")}
        </h1>
        <p className="text-muted-foreground">
          {t("Track your investment performance and earnings")}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview Cards */}
        <div className="lg:col-span-2 space-y-6">
          <InvestmentOverview
            investor={investor}
            dashboardData={dashboardData}
          />
          <ProfitChart
            financialRecords={mockFinancialRecords}
            investor={investor}
          />
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <ProfitSummary dashboardData={dashboardData} investor={investor} />
          <WithdrawalRequests
            withdrawalRecords={mockWithdrawalRecords}
            investorId={investor.id}
            pendingCount={pendingWithdrawals.length}
          />
        </div>
      </div>
    </div>
  );
}


