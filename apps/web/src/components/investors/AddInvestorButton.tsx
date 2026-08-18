"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export function AddInvestorButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    investmentAmount: "",
    percentageOwnership: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const investmentAmount = parseFloat(formData.investmentAmount);
      const percentageOwnership = parseFloat(formData.percentageOwnership);

      if (isNaN(investmentAmount) || isNaN(percentageOwnership)) {
        toast({
          title: "Error",
          description:
            "Investment amount and ownership % must be valid numbers",
          variant: "destructive",
        });
        return;
      }

      if (percentageOwnership > 100 || percentageOwnership <= 0) {
        toast({
          title: "Error",
          description: "Ownership percentage must be between 0 and 100",
          variant: "destructive",
        });
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: `Investor ${formData.firstName} ${formData.lastName} added successfully!`,
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        investmentAmount: "",
        percentageOwnership: "",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add investor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" />
          Add Investor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Investor</DialogTitle>
          <DialogDescription>
            Register a new investor and allocate ownership percentage
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="e.g., Chioma"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="e.g., Okonkwo"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="e.g., chioma@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          {/* Investment Amount */}
          <div className="space-y-2">
            <Label htmlFor="investmentAmount">Investment Amount (₦) *</Label>
            <Input
              id="investmentAmount"
              name="investmentAmount"
              type="number"
              placeholder="e.g., 500000"
              value={formData.investmentAmount}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          {/* Ownership Percentage */}
          <div className="space-y-2">
            <Label htmlFor="percentageOwnership">
              Ownership Percentage (%) *
            </Label>
            <Input
              id="percentageOwnership"
              name="percentageOwnership"
              type="number"
              placeholder="e.g., 20"
              step="0.1"
              min="0"
              max="100"
              value={formData.percentageOwnership}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Investor will own {formData.percentageOwnership || 0}% of the
              business
            </p>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50 border-0 p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Note:</strong> The investor will receive an account to
              track their investment and profits. They will earn{" "}
              {formData.percentageOwnership || 0}% of all business profits.
            </p>
          </Card>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Adding..." : "Add Investor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


