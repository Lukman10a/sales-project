"use client";

import { Suspense } from "react";
import { VerifyEmailStatus } from "@/components/auth/AccountFlows";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
