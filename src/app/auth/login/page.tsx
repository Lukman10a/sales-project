"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  return <LoginForm />;
}


