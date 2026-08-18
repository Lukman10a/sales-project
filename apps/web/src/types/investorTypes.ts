// Investor Management Types

export interface Investor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  investmentAmount: number; // Initial capital invested
  dateInvested: string; // Investment date (ISO string)
  percentageOwnership: number; // e.g., 0.20 for 20%
  status: "active" | "inactive";
}

// Financial record for investor profit tracking
export interface FinancialRecord {
  id: string;
  date: string; // ISO string
  totalRevenue: number; // Total sales
  totalCost: number; // Cost of goods sold
  operatingExpenses: number; // Monthly expenses
  grossProfit: number; // Revenue - COGS
  netProfit: number; // Gross profit - Operating expenses
}

// Investor-specific dashboard data
export interface InvestorDashboardData {
  investmentAmount: number;
  dateInvested: string;
  percentageOwnership: number;
  totalProfitAccrued: number; // Total profit earned so far
  profitPercentage: number; // (totalProfitAccrued / investmentAmount) × 100
  lastUpdated: string;
  breakEvenDate?: string; // When investment will be recovered
}

// Withdrawal record
export interface WithdrawalRecord {
  id: string;
  investorId: string;
  amount: number;
  requestDate: string;
  approvalDate?: string;
  status: "pending" | "approved" | "completed";
  month: string; // "2026-01" format
}
