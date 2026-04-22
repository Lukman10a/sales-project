import { WithdrawalManagement } from "@/components/investors/WithdrawalManagement";
import {
  mockWithdrawalRecords,
  mockInvestors,
  mockFinancialRecords,
} from "@/data/investor";

export default function WithdrawalsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
          Withdrawal Requests
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage and approve investor withdrawal requests
        </p>
      </div>

      {/* Withdrawal Management */}
      <WithdrawalManagement
        withdrawalRecords={mockWithdrawalRecords}
        investors={mockInvestors}
        financialRecords={mockFinancialRecords}
      />
    </div>
  );
}


