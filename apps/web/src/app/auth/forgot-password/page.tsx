"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/AccountFlows";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
