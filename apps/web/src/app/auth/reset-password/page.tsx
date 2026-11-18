"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/AccountFlows";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
