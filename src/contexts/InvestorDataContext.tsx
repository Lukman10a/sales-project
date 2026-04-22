"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { mockInvestors, mockWithdrawalRecords } from "@/data/investor";
import type { Investor, WithdrawalRecord } from "@/types/investorTypes";

interface InvestorDataContextType {
  investors: Investor[];
  updateInvestor: (id: string, updates: Partial<Investor>) => void;
  withdrawals: WithdrawalRecord[];
  updateWithdrawal: (id: string, updates: Partial<WithdrawalRecord>) => void;
}

const InvestorDataContext = createContext<InvestorDataContextType | undefined>(
  undefined,
);

export function InvestorDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [investors, setInvestors] = useState<Investor[]>(mockInvestors);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(
    mockWithdrawalRecords,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const investorsSaveRef = useRef<NodeJS.Timeout | null>(null);
  const withdrawalsSaveRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const storedInvestors = localStorage.getItem("luxa_investors");
    const storedWithdrawals = localStorage.getItem("luxa_withdrawals");

    if (storedInvestors) setInvestors(JSON.parse(storedInvestors));
    if (storedWithdrawals) setWithdrawals(JSON.parse(storedWithdrawals));

    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;

    if (investorsSaveRef.current) {
      clearTimeout(investorsSaveRef.current);
    }
    investorsSaveRef.current = setTimeout(() => {
      localStorage.setItem("luxa_investors", JSON.stringify(investors));
    }, 250);

    return () => {
      if (investorsSaveRef.current) {
        clearTimeout(investorsSaveRef.current);
      }
    };
  }, [investors, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;

    if (withdrawalsSaveRef.current) {
      clearTimeout(withdrawalsSaveRef.current);
    }
    withdrawalsSaveRef.current = setTimeout(() => {
      localStorage.setItem("luxa_withdrawals", JSON.stringify(withdrawals));
    }, 250);

    return () => {
      if (withdrawalsSaveRef.current) {
        clearTimeout(withdrawalsSaveRef.current);
      }
    };
  }, [withdrawals, isHydrated]);

  const updateInvestor = useCallback(
    (id: string, updates: Partial<Investor>) => {
      setInvestors((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
      );
    },
    [],
  );

  const updateWithdrawal = useCallback(
    (id: string, updates: Partial<WithdrawalRecord>) => {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      investors,
      updateInvestor,
      withdrawals,
      updateWithdrawal,
    }),
    [investors, updateInvestor, withdrawals, updateWithdrawal],
  );

  return (
    <InvestorDataContext.Provider value={value}>
      {children}
    </InvestorDataContext.Provider>
  );
}

export function useInvestorData() {
  const context = useContext(InvestorDataContext);
  if (context === undefined) {
    throw new Error(
      "useInvestorData must be used within an InvestorDataProvider",
    );
  }
  return context;
}


