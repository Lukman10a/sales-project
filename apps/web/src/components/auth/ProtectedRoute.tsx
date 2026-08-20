"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { motion } from "framer-motion";
import type { AppUser } from "@/lib/api/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Role/permission predicate for the current route. When it rejects an
   * authenticated user, AccessDenied is shown instead of children. Route
   * access is centralised in `src/lib/route-guards.ts`.
   */
  access?: (user: AppUser | null) => boolean;
}

export function ProtectedRoute({ children, access }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isRTL } = useLanguage();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    if (pathname?.startsWith("/auth")) return;
    router.replace("/auth/login");
  }, [isLoading, isAuthenticated, pathname, router]);

  // Keep the loading shell until auth resolves so nothing renders for a
  // user whose access has not been determined yet.
  if (isLoading) {
    return <LoadingSkeleton isRTL={isRTL} />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (access && !access(user)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

function LoadingSkeleton({ isRTL }: { isRTL: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-16 bottom-0 bg-background z-[100] overflow-y-auto"
      style={{
        left: isRTL ? 0 : 280,
        right: isRTL ? 280 : 0,
      }}
    >
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={`stat-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-lg p-6 space-y-3"
            >
              <div className="h-3 bg-muted rounded w-20 animate-pulse" />
              <div className="h-8 bg-muted rounded w-24 animate-pulse" />
              <div className="h-2 bg-muted/60 rounded w-16 animate-pulse" />
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Card Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-card border border-border rounded-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 bg-muted rounded w-32 animate-pulse" />
              <div className="h-8 bg-muted rounded w-24 animate-pulse" />
            </div>
            <div className="space-y-3 pt-4">
              {[0, 1, 2, 3, 4].map((i) => {
                const widths = ["75%", "60%", "85%", "50%", "70%"];
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-12 bg-muted rounded w-12 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-4 bg-muted rounded animate-pulse"
                        style={{ width: widths[i] }}
                      />
                      <div className="h-3 bg-muted/60 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Side Card Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-lg p-6 space-y-4"
          >
            <div className="h-5 bg-muted rounded w-28 animate-pulse" />
            <div className="space-y-3 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-2 bg-muted/60 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="bg-card border border-border rounded-lg p-6 space-y-4"
            >
              <div className="h-5 bg-muted rounded w-36 animate-pulse" />
              <div className="space-y-2">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-16 bg-muted/40 rounded animate-pulse"
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}