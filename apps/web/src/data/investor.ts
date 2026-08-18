import { Investor, FinancialRecord, WithdrawalRecord } from "@/types/investorTypes";

// Mock investors data
export const mockInvestors: Investor[] = [
  {
    id: "inv-1",
    email: "fatima@investor.com",
    firstName: "Fatima",
    lastName: "Adeyemi",
    avatar: "",
    investmentAmount: 500000, // ₦500,000
    dateInvested: "2025-10-15",
    percentageOwnership: 0.2, // 20%
    status: "active",
  },
  {
    id: "inv-2",
    email: "karim@investor.com",
    firstName: "Karim",
    lastName: "Okafor",
    avatar: "",
    investmentAmount: 300000, // ₦300,000
    dateInvested: "2025-11-01",
    percentageOwnership: 0.12, // 12%
    status: "active",
  },
];

// Mock financial records (monthly summaries)
export const mockFinancialRecords: FinancialRecord[] = [
  {
    id: "fin-1",
    date: "2025-10-31",
    totalRevenue: 1200000,
    totalCost: 720000, // 60% COGS
    operatingExpenses: 200000,
    grossProfit: 480000,
    netProfit: 280000,
  },
  {
    id: "fin-2",
    date: "2025-11-30",
    totalRevenue: 1450000,
    totalCost: 870000,
    operatingExpenses: 220000,
    grossProfit: 580000,
    netProfit: 360000,
  },
  {
    id: "fin-3",
    date: "2025-12-31",
    totalRevenue: 1800000,
    totalCost: 1080000,
    operatingExpenses: 250000,
    grossProfit: 720000,
    netProfit: 470000,
  },
  {
    id: "fin-4",
    date: "2026-01-15",
    totalRevenue: 2100000,
    totalCost: 1260000,
    operatingExpenses: 280000,
    grossProfit: 840000,
    netProfit: 560000,
  },
];

// Mock withdrawal records
export const mockWithdrawalRecords: WithdrawalRecord[] = [
  {
    id: "wd-1",
    investorId: "inv-1",
    amount: 56000,
    requestDate: "2025-11-30",
    approvalDate: "2025-11-30",
    status: "completed",
    month: "2025-10",
  },
  {
    id: "wd-2",
    investorId: "inv-1",
    amount: 72000,
    requestDate: "2025-12-31",
    approvalDate: "2025-12-31",
    status: "completed",
    month: "2025-11",
  },
  {
    id: "wd-3",
    investorId: "inv-2",
    amount: 43200,
    requestDate: "2026-01-05",
    status: "pending",
    month: "2025-12",
  },
];
