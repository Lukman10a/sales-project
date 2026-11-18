"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User } from "@/lib/auth";

/** Shown to an owner who has not used their confirmation link yet. */
export function VerifyEmailBanner({ user }: { user: User | null }) {
  const { t } = useLanguage();
  const [sent, setSent] = useState("");

  if (!user || user.emailVerified !== false) return null;

  const deadline = user.verifyBy
    ? new Date(user.verifyBy).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
      })
    : null;

  const resend = async () => {
    try {
      const res = await authApi.resendVerification(user.email);
      setSent(t(res.message));
    } catch {
      setSent(t("Could not send the link. Please try again."));
    }
  };

  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <MailWarning className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-[12rem]">
        {deadline
          ? t("Confirm your email by {date} to keep access.", {
              values: { date: deadline },
            })
          : t("Confirm your email to keep access.")}{" "}
        {t("We sent a link to")} <strong>{user.email}</strong>.
      </span>
      {sent ? (
        <span className="text-xs">{sent}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          className="font-medium underline underline-offset-2"
        >
          {t("Resend link")}
        </button>
      )}
    </div>
  );
}
