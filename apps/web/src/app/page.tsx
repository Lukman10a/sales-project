"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { landingPathFor } from "@/lib/auth";
import { motion } from "framer-motion";
import { Moon, Sun, Globe, Sparkles, Package, ChevronRight, BarChart3, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(user ? landingPathFor(user) : "/dashboard");
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem("luxa_theme");
    if (saved) {
      setTheme(saved as "light" | "dark");
      applyTheme(saved as "light" | "dark");
    } else {
      document.documentElement.classList.add("dark");
      setTheme("dark");
      localStorage.setItem("luxa_theme", "dark");
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("luxa_theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col font-sans selection:bg-accent selection:text-foreground">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,theme(colors.background))] pointer-events-none" />
      <div className="absolute top-0 w-full h-full bg-grid-white opacity-[0.03] dark:opacity-[0.05] bg-[length:50px_50px] pointer-events-none" />
      
      {/* Sleek Golden Glow at the top */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50 px-6 py-5 border-b border-border/40 backdrop-blur-xl bg-background/50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-display font-bold text-2xl tracking-tighter flex items-center gap-2">
              <span className="bg-foreground text-background w-8 h-8 rounded-md flex items-center justify-center">L</span>
              LUXA
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-muted-foreground font-medium text-sm">
            <Link href="#platform" className="hover:text-foreground transition-colors">{t("Platform")}</Link>
            <Link href="#solutions" className="hover:text-foreground transition-colors">{t("Solutions")}</Link>
            <Link href="#enterprise" className="hover:text-foreground transition-colors">{t("Enterprise")}</Link>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/auth/login"
              className="bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent px-5 py-2 rounded-full font-medium transition-all text-sm flex items-center gap-2"
            >
              {t("Sign In")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-24 flex-1 flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-muted-foreground text-xs font-medium mb-8 uppercase tracking-widest"
        >
          <Sparkles className="w-3 h-3 text-accent" />
          {t("Premium Operating System")}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-tight tracking-tighter max-w-5xl text-balance"
        >
          {t("Manage your core operations with")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60">
            {t("absolute precision.")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl text-balance leading-relaxed"
        >
          {t("An unparalleled enterprise resource platform built for high-performance teams. Elevate your inventory, POS, and analytics into a single, unified experience.")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/auth/login"
            className="h-12 px-8 rounded-full bg-foreground text-background flex items-center justify-center font-medium hover:scale-105 transition-transform w-full sm:w-auto"
          >
            {t("Access System")}
          </Link>
          <Link
            href="#demo"
            className="h-12 px-8 rounded-full bg-muted/30 border border-border/50 text-foreground flex items-center justify-center font-medium hover:bg-muted/50 transition-colors w-full sm:w-auto"
          >
            {t("View Architecture")}
          </Link>
        </motion.div>
      </section>

      {/* Feature Preview Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pb-32 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { icon: <Package className="w-5 h-5" />, title: "Inventory Engine", desc: "Real-time stock synchronization with predictive ordering." },
            { icon: <BarChart3 className="w-5 h-5" />, title: "Financial Intelligence", desc: "Institutional-grade analytics and custom reporting." },
            { icon: <ShieldCheck className="w-5 h-5" />, title: "Secure Infrastructure", desc: "Role-based architecture built for enterprise security." }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl bg-muted/20 border border-border/40 backdrop-blur-sm group hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}

