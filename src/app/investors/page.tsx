import { InvestorsList } from "@/components/investors/InvestorsList";
import { InvestorsStats } from "@/components/investors/InvestorsStats";
import { AddInvestorButton } from "@/components/investors/AddInvestorButton";
import Link from "next/link";
import {
  mockInvestors,
  mockFinancialRecords,
  mockWithdrawalRecords,
} from "@/data/investor";

export default function InvestorsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Investor Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your investors, track investments, and approve withdrawals
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <AddInvestorButton />
          <Link href="/investors/overview" className="w-full sm:w-auto">
            <button className="w-full px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium text-sm">
              View Overview
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <InvestorsStats
        investors={mockInvestors}
        financialRecords={mockFinancialRecords}
      />

      {/* Investors List */}
      <InvestorsList
        investors={mockInvestors}
        financialRecords={mockFinancialRecords}
        withdrawalRecords={mockWithdrawalRecords}
      />
    </div>
  );
}
