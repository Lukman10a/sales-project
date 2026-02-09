"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SaleDateModalProps {
  open: boolean;
  currentDate: string;
  onClose: () => void;
  onApply: (date: string) => void;
}

export default function SaleDateModal({
  open,
  currentDate,
  onClose,
  onApply,
}: SaleDateModalProps) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(currentDate);

  const handleApply = () => {
    onApply(selectedDate);
    onClose();
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            {t("Sale Date")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("Select Date for This Sale")}
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              {t("You can record sales from previous days")}
            </p>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="h-10"
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>{t("Note")}:</strong>{" "}
              {t(
                "This allows you to record sales that occurred on previous days. The selected date will be used for inventory and reporting purposes.",
              )}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-accent/5">
            <p className="text-xs text-muted-foreground mb-1">
              {t("Selected Date")}:
            </p>
            <p className="font-semibold text-accent">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={onClose} variant="outline">
            {t("Cancel")}
          </Button>
          <Button onClick={handleApply} className="gap-2 bg-gradient-accent">
            <CheckCircle className="w-4 h-4" />
            {t("Apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
