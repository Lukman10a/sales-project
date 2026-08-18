"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, toggleLanguage, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-sans selection:bg-accent selection:text-foreground">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,theme(colors.background))] pointer-events-none" />
      <div className="absolute top-0 w-full h-full bg-grid-white opacity-[0.03] dark:opacity-[0.05] bg-[length:50px_50px] pointer-events-none" />

      {/* Top Navigation */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
        <div className="font-display font-bold text-xl tracking-tighter flex items-center gap-2 text-foreground">
          <span className="bg-foreground text-background w-8 h-8 rounded-md flex items-center justify-center">L</span>
          LUXA
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={toggleLanguage}
          className="border-border/50 bg-background/50 backdrop-blur-md hover:bg-muted"
        >
          {language === "en" ? "AR" : "EN"}
        </Button>
      </div>

      {/* Left Side - Interactive Visuals */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-muted/10 border-r border-border/20 p-12">
        <div className="absolute inset-0 bg-accent/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-display font-bold tracking-tight text-foreground">
              Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60">Scale.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Experience the pinnacle of operational control. Manage inventory, process sales, and access institutional-grade analytics from a single, unified interface.
            </p>
          </div>
          
          {/* Faux Metric UI to look premium */}
          <div className="p-6 rounded-2xl bg-background/50 border border-border/40 backdrop-blur-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Platform Uptime</span>
              <span className="text-sm font-bold text-accent">99.999%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

