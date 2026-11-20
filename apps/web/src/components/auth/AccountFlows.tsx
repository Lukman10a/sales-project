"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { passwordProblem, MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { useLanguage } from "@/contexts/LanguageContext";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold tracking-tight text-foreground mb-2">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StatusAlert({ status }: { status: Status }) {
  if (status.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{status.message}</AlertDescription>
      </Alert>
    );
  }
  if (status.kind === "done") {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>{status.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

const BackToLogin = () => {
  const { t } = useLanguage();
  return (
    <p className="text-sm text-center text-muted-foreground">
      <Link href="/auth/login" className="font-medium hover:underline">
        {t("Back to sign in")}
      </Link>
    </p>
  );
};

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "busy" });
    try {
      const res = await authApi.forgotPassword(email.trim());
      setStatus({ kind: "done", message: t(res.message) });
    } catch (err) {
      setStatus({
        kind: "error",
        message: t(errorText(err, "Something went wrong. Please try again.")),
      });
    }
  };

  return (
    <div className="space-y-8">
      <Header
        title={t("Forgot password")}
        subtitle={t("Enter your email and we will send you a reset link.")}
      />
      <StatusAlert status={status} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
            disabled={status.kind === "busy"}
          />
        </div>
        <Button
          type="submit"
          className="w-full h-11"
          disabled={status.kind === "busy"}
        >
          {status.kind === "busy" && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {t("Send reset link")}
        </Button>
      </form>
      <BackToLogin />
    </div>
  );
}

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>(
    token
      ? { kind: "idle" }
      : { kind: "error", message: t("This link is invalid or has expired") },
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setStatus({ kind: "error", message: t(problem) });
    if (password !== confirm) {
      return setStatus({
        kind: "error",
        message: t("Passwords do not match"),
      });
    }
    setStatus({ kind: "busy" });
    try {
      const res = await authApi.resetPassword(token, password);
      setStatus({ kind: "done", message: t(res.message) });
    } catch (err) {
      setStatus({
        kind: "error",
        message: t(errorText(err, "This link is invalid or has expired")),
      });
    }
  };

  const done = status.kind === "done";
  return (
    <div className="space-y-8">
      <Header
        title={t("Choose a new password")}
        subtitle={t("This signs you out on every device.")}
      />
      <StatusAlert status={status} />
      {!done && token && (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("New password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(`minimum ${MIN_PASSWORD_LENGTH} characters`)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t("Confirm password")}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11"
            disabled={status.kind === "busy"}
          >
            {status.kind === "busy" && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {t("Set password")}
          </Button>
        </form>
      )}
      {!token && (
        <p className="text-sm text-center">
          <Link href="/auth/forgot-password" className="hover:underline">
            {t("Request a new link")}
          </Link>
        </p>
      )}
      <BackToLogin />
    </div>
  );
}

export function VerifyEmailStatus() {
  const { t } = useLanguage();
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>({ kind: "busy" });
  // A token is single-use: never send it twice (React strict mode re-runs effects).
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) {
      setStatus({
        kind: "error",
        message: t("This link is invalid or has expired"),
      });
      return;
    }
    authApi
      .verifyEmail(token)
      .then((res) => setStatus({ kind: "done", message: t(res.message) }))
      .catch((err: unknown) =>
        setStatus({
          kind: "error",
          message: t(errorText(err, "This link is invalid or has expired")),
        }),
      );
  }, [token, t]);

  return (
    <div className="space-y-8">
      <Header
        title={t("Confirm your email")}
        subtitle={t("Confirming keeps your shop account secure.")}
      />
      {status.kind === "busy" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("Checking your link...")}
        </p>
      ) : (
        <StatusAlert status={status} />
      )}
      <BackToLogin />
    </div>
  );
}
