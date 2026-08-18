"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Investor } from "@/types/investorTypes";
import { useState } from "react";
import { useInvestorData } from "@/contexts/InvestorDataContext";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";

interface EditInvestorClientProps {
  investor: Investor;
}

export default function EditInvestorClient({
  investor,
}: EditInvestorClientProps) {
  const router = useRouter();
  const { updateInvestor } = useInvestorData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: investor.firstName,
    lastName: investor.lastName,
    email: investor.email,
    investmentAmount: investor.investmentAmount.toString(),
    dateInvested: investor.dateInvested,
    ownership: (investor.percentageOwnership * 100).toFixed(2),
    status: investor.status as "active" | "inactive",
  });

  const investorInitials = `${investor.firstName[0]}${investor.lastName[0]}`;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const ownership = Math.min(
        100,
        Math.max(0, parseFloat(form.ownership) / 100),
      );

      updateInvestor(investor.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        investmentAmount: parseFloat(form.investmentAmount.toString()),
        dateInvested: form.dateInvested,
        percentageOwnership: ownership,
        status: form.status as "active" | "inactive",
      });

      toast("Investor updated successfully");
      router.push("/investors");
    } catch (error) {
      console.error("Error updating investor:", error);
      toast("Failed to update investor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Link href="/investors">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Investors
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Investor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="space-y-3">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={investor.avatar} />
                <AvatarFallback className="bg-accent text-accent-foreground font-bold">
                  {investorInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="avatarInput"
                />
                <label htmlFor="avatarInput">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                  >
                    <span>Change Avatar</span>
                  </Button>
                </label>
              </div>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                placeholder="Last name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Email address"
            />
          </div>

          {/* Investment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Investment Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              value={form.investmentAmount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  investmentAmount: e.target.value as any,
                }))
              }
              placeholder="0"
            />
          </div>

          {/* Investment Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Investment Date</Label>
            <Input
              id="date"
              type="date"
              value={form.dateInvested}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, dateInvested: e.target.value }))
              }
            />
          </div>

          {/* Ownership Percentage */}
          <div className="space-y-2">
            <Label htmlFor="ownership">Ownership Percentage</Label>
            <Input
              id="ownership"
              type="number"
              step="0.01"
              value={form.ownership}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, ownership: e.target.value }))
              }
              placeholder="0"
              min="0"
              max="100"
            />
            <p className="text-xs text-muted-foreground">
              Enter percentage (0-100)
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  status: value as "active" | "inactive",
                }))
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Link href="/investors" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



