"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface Section {
  id: string;
  title: string;
  description: string;
  icon: any;
}

interface SettingsSidebarProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export default function SettingsSidebar({
  sections,
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  const { t } = useLanguage();

  return (
    <nav className="space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
            activeSection === section.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <section.icon className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-medium text-sm">{t(section.title)}</p>
          </div>
          <ChevronRight
            className={cn(
              "w-4 h-4",
              activeSection === section.id && "text-primary-foreground",
            )}
          />
        </button>
      ))}
    </nav>
  );
}



