"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { InventoryDataProvider } from "@/contexts/InventoryDataContext";
import { InvestorDataProvider } from "@/contexts/InvestorDataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { UIProvider } from "@/contexts/UIContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <UIProvider>
            <NotificationProvider>
              <InventoryDataProvider>
                <SalesDataProvider>
                  <InvestorDataProvider>{children}</InvestorDataProvider>
                </SalesDataProvider>
              </InventoryDataProvider>
            </NotificationProvider>
          </UIProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
