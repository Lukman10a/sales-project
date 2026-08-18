import { Investor, FinancialRecord, InvestorDashboardData, WithdrawalRecord } from "@/types/investorTypes";

/**
 * Calculate total profit accrued for an investor based on their ownership percentage
 * and financial records
 */
export function calculateInvestorTotalProfit(
  investor: Investor,
  financialRecords: FinancialRecord[]
): number {
  return financialRecords.reduce((total, record) => {
    const investorShare = record.netProfit * investor.percentageOwnership;
    return total + investorShare;
  }, 0);
}

/**
 * Calculate total withdrawn amount for an investor
 */
export function calculateTotalWithdrawn(
  investorId: string,
  withdrawalRecords: WithdrawalRecord[]
): number {
  return withdrawalRecords
    .filter((wd) => wd.investorId === investorId && wd.status === "completed")
    .reduce((total, wd) => total + wd.amount, 0);
}

/**
 * Calculate remaining profit (not yet withdrawn)
 */
export function calculateRemainingProfit(
  totalAccrued: number,
  totalWithdrawn: number
): number {
  return Math.max(0, totalAccrued - totalWithdrawn);
}

/**
 * Calculate profit percentage (ROI%)
 */
export function calculateProfitPercentage(
  totalProfitAccrued: number,
  investmentAmount: number
): number {
  if (investmentAmount === 0) return 0;
  return (totalProfitAccrued / investmentAmount) * 100;
}

/**
 * Calculate break-even date (when profit equals investment)
 */
export function calculateBreakEvenDate(
  investor: Investor,
  financialRecords: FinancialRecord[]
): string | undefined {
  let accumulatedProfit = 0;

  for (const record of financialRecords) {
    const investorShare = record.netProfit * investor.percentageOwnership;
    accumulatedProfit += investorShare;

    if (accumulatedProfit >= investor.investmentAmount) {
      return record.date;
    }
  }

  return undefined;
}

/**
 * Get investor dashboard data
 */
export function getInvestorDashboardData(
  investor: Investor,
  financialRecords: FinancialRecord[],
  withdrawalRecords: WithdrawalRecord[]
): InvestorDashboardData {
  const totalProfitAccrued = calculateInvestorTotalProfit(investor, financialRecords);
  const profitPercentage = calculateProfitPercentage(totalProfitAccrued, investor.investmentAmount);
  const breakEvenDate = calculateBreakEvenDate(investor, financialRecords);

  return {
    investmentAmount: investor.investmentAmount,
    dateInvested: investor.dateInvested,
    percentageOwnership: investor.percentageOwnership * 100, // Convert to percentage display
    totalProfitAccrued,
    profitPercentage,
    breakEvenDate,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get pending withdrawal requests for an investor
 */
export function getPendingWithdrawals(
  investorId: string,
  withdrawalRecords: WithdrawalRecord[]
): WithdrawalRecord[] {
  return withdrawalRecords.filter(
    (wd) => wd.investorId === investorId && wd.status === "pending"
  );
}

/**
 * Format currency (Nigerian Naira)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
