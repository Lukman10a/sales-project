"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HelpSupport() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-xl text-foreground mb-1">
          {t("Help & Support")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("Get help and documentation")}
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <Button variant="outline" className="w-full justify-start">
          <HelpCircle className="w-4 h-4 mr-2" />
          {t("Documentation")}
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <HelpCircle className="w-4 h-4 mr-2" />
          {t("Contact Support")}
        </Button>
      </div>
    </div>
  );
}



