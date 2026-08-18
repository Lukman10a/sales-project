"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { DailyEmailConfig, EmailTemplate } from "@/types/inventoryExportTypes";
import {
  loadDailyEmailConfig,
  saveDailyEmailConfig,
  formatEmailConfig,
  generateOutOfStockEmailTemplate,
} from "@/lib/emailService";
import { InventoryItem } from "@/types/inventoryTypes";
import { Mail, Trash2, Plus } from "lucide-react";

interface DailyEmailSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
}

export default function DailyEmailSettingsDialog({
  isOpen,
  onOpenChange,
  inventory,
}: DailyEmailSettingsDialogProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<DailyEmailConfig>({
    enabled: false,
    sendTime: "08:00",
    recipients: [],
    reportType: "out-of-stock",
    dayOfWeek: "weekdays",
  });
  const [newRecipient, setNewRecipient] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadedConfig = loadDailyEmailConfig();
      setConfig(loadedConfig);
      setNewRecipient("");
    }
  }, [isOpen]);

  const handleAddRecipient = () => {
    if (!newRecipient.trim()) {
      toast.error(
        t("Please enter an email address") || "Please enter an email address",
      );
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipient.trim())) {
      toast.error(t("Invalid email address") || "Invalid email address");
      return;
    }

    if (config.recipients.includes(newRecipient.trim())) {
      toast.error(t("Email already added") || "Email already added");
      return;
    }

    setConfig({
      ...config,
      recipients: [...config.recipients, newRecipient.trim()],
    });
    setNewRecipient("");
    toast.success(t("Recipient added") || "Recipient added");
  };

  const handleRemoveRecipient = (email: string) => {
    setConfig({
      ...config,
      recipients: config.recipients.filter((r) => r !== email),
    });
  };

  const handleSave = async () => {
    if (config.enabled && config.recipients.length === 0) {
      toast.error(
        t("Please add at least one recipient") ||
          "Please add at least one recipient",
      );
      return;
    }

    setIsSaving(true);
    try {
      saveDailyEmailConfig(config);

      // For demo purposes, show what would be sent
      if (config.enabled && config.reportType === "out-of-stock") {
        const outOfStockItems = inventory.filter(
          (i) => i.status === "out-of-stock",
        );
        const emailTemplate = generateOutOfStockEmailTemplate(outOfStockItems);

        // Log email template to console (in production, this would be sent to backend)
        console.log("Email that would be sent:", {
          recipients: config.recipients,
          subject: emailTemplate.subject,
          time: `${config.sendTime} ${config.dayOfWeek === "weekdays" ? "Weekdays" : config.dayOfWeek === "weekends" ? "Weekends" : "Daily"}`,
        });
      }

      toast.success(
        t("Settings saved successfully") || "Settings saved successfully",
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(t("Failed to save settings") || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const outOfStockCount = inventory.filter(
    (i) => i.status === "out-of-stock",
  ).length;
  const lowStockCount = inventory.filter(
    (i) => i.status === "low-stock",
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t("Daily Email Reports")}
          </DialogTitle>
          <DialogDescription>
            {t("Configure automatic daily stock reports via email")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/50">
            <div>
              <p className="font-medium text-foreground">
                {t("Enable daily emails")}
              </p>
              <p className="text-xs text-muted-foreground">
                {config.enabled
                  ? `✓ Enabled - ${config.recipients.length} recipient(s)`
                  : "✗ Disabled"}
              </p>
            </div>
            <Checkbox
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enabled: checked === true })
              }
            />
          </div>

          {config.enabled && (
            <>
              {/* Send Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("Send Time")}
                </label>
                <Input
                  type="time"
                  value={config.sendTime}
                  onChange={(e) =>
                    setConfig({ ...config, sendTime: e.target.value })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t("Report will be sent at this time every day")}
                </p>
              </div>

              {/* Day of Week */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("Send Days")}
                </label>
                <Select
                  value={config.dayOfWeek || "all"}
                  onValueChange={(value: any) =>
                    setConfig({ ...config, dayOfWeek: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Every Day</SelectItem>
                    <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                    <SelectItem value="weekends">Weekends (Sat-Sun)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("Report Type")}
                </label>
                <Select
                  value={config.reportType}
                  onValueChange={(value: any) =>
                    setConfig({ ...config, reportType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out-of-stock">
                      ✗ Out-of-Stock ({outOfStockCount} items)
                    </SelectItem>
                    <SelectItem value="low-stock">
                      ⚠️ Low-Stock ({lowStockCount} items)
                    </SelectItem>
                    <SelectItem value="all-stock">
                      📦 All Stock ({inventory.length} items)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipients */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t("Email Recipients")}
                </label>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder={
                      t("Enter email address") || "Enter email address"
                    }
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddRecipient();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddRecipient}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Recipients List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {config.recipients.length > 0 ? (
                    config.recipients.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                      >
                        <span className="text-sm text-foreground">
                          ✓ {email}
                        </span>
                        <Button
                          onClick={() => handleRemoveRecipient(email)}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t("No recipients added yet")}
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t(
                    "Recipients will receive daily reports at the scheduled time",
                  )}
                </p>
              </div>

              {/* Info */}
              <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-3">
                <p className="text-xs text-green-700 dark:text-green-300">
                  <strong>ℹ️ Note:</strong> Daily emails will be sent to all
                  recipients at {config.sendTime}{" "}
                  {config.dayOfWeek === "weekdays"
                    ? "Monday-Friday"
                    : config.dayOfWeek === "weekends"
                      ? "Saturday-Sunday"
                      : "every day"}{" "}
                  with the selected {config.reportType} report.
                </p>
              </div>
            </>
          )}

          {!config.enabled && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>📧 Disabled:</strong> Daily email reports are currently
                disabled. Enable them above to start receiving automatic
                reports.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <span className="inline-block animate-spin mr-2">⌛</span>
                {t("Saving...")}
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {t("Save Settings")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



