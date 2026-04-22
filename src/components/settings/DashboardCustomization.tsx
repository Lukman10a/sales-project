"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  dashboardLayouts,
  widgetCatalog,
  defaultQuickActions,
  savedViews,
} from "@/data/dashboardCustomization";
import { QuickAction } from "@/types/dashboardCustomizationTypes";

interface DashboardCustomizationProps {
  selectedLayout: string;
  onLayoutChange: (layout: string) => void;
  welcomeMessage: boolean;
  onWelcomeMessageChange: (value: boolean) => void;
  showTips: boolean;
  onShowTipsChange: (value: boolean) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  refreshInterval: "off" | "30s" | "1m" | "5m" | "15m" | "30m";
  onRefreshIntervalChange: (
    value: "off" | "30s" | "1m" | "5m" | "15m" | "30m",
  ) => void;
  quickActions: QuickAction[];
  onQuickActionsChange: (actions: QuickAction[]) => void;
  onSave: () => void;
}

export default function DashboardCustomization({
  selectedLayout,
  onLayoutChange,
  welcomeMessage,
  onWelcomeMessageChange,
  showTips,
  onShowTipsChange,
  autoRefresh,
  onAutoRefreshChange,
  refreshInterval,
  onRefreshIntervalChange,
  quickActions,
  onQuickActionsChange,
  onSave,
}: DashboardCustomizationProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-xl text-foreground mb-1">
          {t("Dashboard Customization")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("Choose your layout, widgets, and preferences")}
        </p>
      </div>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-xl bg-card">
          <p className="font-medium mb-3 flex items-center gap-2">
            <Layout className="w-4 h-4" />
            {t("Layout Template")}
          </p>
          <div className="space-y-3">
            {dashboardLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => onLayoutChange(layout.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  selectedLayout === layout.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {layout.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {layout.description}
                    </p>
                  </div>
                  {layout.isDefault && (
                    <Badge variant="outline">{t("Default")}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-card">
          <p className="font-medium mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t("Auto Refresh")}
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {t("Enable auto refresh")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Keep dashboard widgets up to date")}
                </p>
              </div>
              <Switch
                checked={autoRefresh}
                onCheckedChange={onAutoRefreshChange}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Refresh interval")}</Label>
              <Select
                value={refreshInterval}
                onValueChange={onRefreshIntervalChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30s">30s</SelectItem>
                  <SelectItem value="1m">1m</SelectItem>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="30m">30m</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t("Welcome message")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Show greeting on dashboard load")}
                </p>
              </div>
              <Switch
                checked={welcomeMessage}
                onCheckedChange={onWelcomeMessageChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t("Tips & guides")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Contextual tips for new users")}
                </p>
              </div>
              <Switch checked={showTips} onCheckedChange={onShowTipsChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-xl bg-card">
          <p className="font-medium mb-3">{t("Quick Actions")}</p>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.action}
                  </p>
                </div>
                <Switch
                  checked={action.enabled}
                  onCheckedChange={(checked) =>
                    onQuickActionsChange(
                      quickActions.map((qa) =>
                        qa.id === action.id ? { ...qa, enabled: checked } : qa,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-card">
          <p className="font-medium mb-3">{t("Saved Views")}</p>
          <div className="space-y-2">
            {savedViews.map((view) => (
              <div
                key={view.id}
                className="p-3 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{view.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {view.description || t("No description")}
                  </p>
                </div>
                {view.isDefault && (
                  <Badge variant="outline">{t("Default")}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border rounded-xl bg-card">
        <p className="font-medium mb-3">{t("Available Widgets")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {widgetCatalog.slice(0, 6).map((widget) => (
            <div key={widget.type} className="p-3 border rounded-lg">
              <p className="font-semibold text-sm">{widget.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {widget.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{widget.category}</Badge>
                <Badge variant="outline">{widget.defaultSize}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onSave}>
          {t("Save Dashboard Settings")}
        </Button>
      </div>
    </div>
  );
}



