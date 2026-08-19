"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleToggle } from "./RoleToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export function SignupForm() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"owner" | "apprentice" | "investor">(
    "owner",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("Password must be at least 8 characters"));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match"));
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        role,
        businessName,
      });
    } catch (err) {
      const fallback = t("Signup failed. Please try again.");
      if (err instanceof Error) {
        setError(t(err.message, { fallback }));
      } else {
        setError(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {t("Create account")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Start tracking sales and insights")}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm">
              {t("First name")}
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm">
              {t("Last name")}
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-sm">
            {t("Business name")}
          </Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm">
            {t("Email")}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">
              {t("Password")}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("minimum 8 characters")}
              className="h-11"
              required
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Password must be at least 8 characters with upper, lower and a number",
              )}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm">
              {t("Confirm")}
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
              required
            />
          </div>
        </div>

        {/* Role Toggle */}
        <RoleToggle value={role} onChange={setRole} />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-[#1e293b] hover:bg-[#0f172a] text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("Creating account...")}
            </>
          ) : (
            t("Sign up")
          )}
        </Button>

        {/* Login Link */}
        <p className="text-sm text-center text-muted-foreground">
          {t("Already have an account?")}{" "}
          <a href="/auth/login" className="font-medium hover:underline">
            {t("Log in")}
          </a>
        </p>
      </motion.form>
    </div>
  );
}


