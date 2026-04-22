"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleToggle } from "./RoleToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "apprentice" | "investor">(
    AuthService.getLastRole(),
  );
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password, role });
    } catch (err) {
      const fallback = t("Login failed. Please try again.");
      if (err instanceof Error) {
        setError(t(err.message, { fallback }));
      } else {
        setError(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Placeholder for Google sign-in
    alert("Google Sign-In coming soon!");
  };

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="w-12 h-12 bg-background border border-border/50 shadow-sm rounded-xl flex items-center justify-center">
        <span className="font-display font-bold text-xl tracking-tight text-foreground">
          L
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground mb-2">
          {t("Login")}
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {t("Authenticate to access your workspace")}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Google Sign In */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 border-2"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t("Sign in with google")}
      </Button>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            {t("Email")}*
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t("Enter your email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-background border-input"
            required
            disabled={isLoading}
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            {t("Password")}*
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("minimum 8 characters")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-background border-input pr-10"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Role Toggle */}
        <RoleToggle value={role} onChange={setRole} />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <label
              htmlFor="remember"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t("Remember me")}
            </label>
          </div>
          <a
            href="#"
            className="text-sm hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            {t("Forgot password?")}
          </a>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-[#1e293b] hover:bg-[#0f172a] text-white dark:bg-slate-900 dark:hover:bg-slate-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("Signing in...")}
            </>
          ) : (
            t("Login")
          )}
        </Button>

        {/* Register Link */}
        <p className="text-sm text-center text-muted-foreground">
          {t("Not registered yet?")}{" "}
          <a href="/auth/signup" className="font-medium hover:underline">
            {t("Create a new account")}
          </a>
        </p>
      </motion.form>

      {/* Demo Credentials */}
      <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {t("Demo Credentials:")}
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="font-medium">{t("Owner:")}</span> ahmed@luxa.com /
            admin123
          </p>
          <p>
            <span className="font-medium">{t("Admin:")}</span> ibrahim@luxa.com
            / staff123
          </p>
          <p>
            <span className="font-medium">{t("Investor:")}</span>{" "}
            fatima@investor.com / investor123
          </p>
        </div>
      </div>
    </div>
  );
}
