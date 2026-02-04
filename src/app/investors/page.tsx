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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Investor Management
          </h1>
          <p className="text-muted-foreground">
            Manage your investors, track investments, and approve withdrawals
          </p>
        </div>
        <div className="flex gap-2">
          <AddInvestorButton />
          <Link href="/investors/overview">
            <button className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium text-sm">
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
