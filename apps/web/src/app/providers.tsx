"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { InventoryDataProvider } from "@/contexts/InventoryDataContext";
import { InvestorDataProvider } from "@/contexts/InvestorDataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { TeamDataProvider } from "@/contexts/TeamDataContext";
import { UIProvider } from "@/contexts/UIContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <UIProvider>
            <NotificationProvider>
              <InventoryDataProvider>
                <SalesDataProvider>
                  <TeamDataProvider>
                    <InvestorDataProvider>{children}</InvestorDataProvider>
                  </TeamDataProvider>
                </SalesDataProvider>
              </InventoryDataProvider>
            </NotificationProvider>
          </UIProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}


