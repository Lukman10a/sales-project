"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Gift,
  DollarSign,
  Plus,
  Search,
  CheckCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  accountBalance: number;
  totalSpent: number;
  tier: "silver" | "gold" | "platinum";
}

interface CustomerAccountModalProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onApply: (
    customer: Customer | null,
    loyaltyPoints: number,
    accountCredit: number,
  ) => void;
}

export default function CustomerAccountModal({
  open,
  total,
  onClose,
  onApply,
}: CustomerAccountModalProps) {
  const { t, formatCurrency } = useLanguage();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [searchCustomer, setSearchCustomer] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [loyaltyPointsUse, setLoyaltyPointsUse] = useState(0);
  const [accountCreditUse, setAccountCreditUse] = useState(0);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // Mock customer database
  const mockCustomers: Customer[] = [
    {
      id: "1",
      name: "Ahmed Hassan",
      phone: "+234 801 234 5678",
      loyaltyPoints: 5000,
      accountBalance: 25000,
      totalSpent: 450000,
      tier: "gold",
    },
    {
      id: "2",
      name: "Zainab Mohammed",
      phone: "+234 802 345 6789",
      loyaltyPoints: 8500,
      accountBalance: 50000,
      totalSpent: 750000,
      tier: "platinum",
    },
    {
      id: "3",
      name: "Ibrahim Ali",
      phone: "+234 803 456 7890",
      loyaltyPoints: 2000,
      accountBalance: 10000,
      totalSpent: 200000,
      tier: "silver",
    },
  ];

  const filteredCustomers = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      c.phone.includes(searchCustomer),
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoyaltyPointsUse(0);
    setAccountCreditUse(0);
  };

  const handleCreateCustomer = () => {
    if (newCustomerName.trim() && newCustomerPhone.trim()) {
      const newCustomer: Customer = {
        id: String(Date.now()),
        name: newCustomerName,
        phone: newCustomerPhone,
        loyaltyPoints: 0,
        accountBalance: 0,
        totalSpent: 0,
        tier: "silver",
      };
      setSelectedCustomer(newCustomer);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowNewCustomer(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "gold":
        return "text-yellow-600 bg-yellow-50";
      case "platinum":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const pointsValue = loyaltyPointsUse / 100; // 100 points = 1 unit of currency

  const handleApply = () => {
    onApply(selectedCustomer, loyaltyPointsUse, accountCreditUse);
    setSelectedCustomer(null);
    setLoyaltyPointsUse(0);
    setAccountCreditUse(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            {t("Customer Account & Loyalty")}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("Sale Total")}:</span>{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(total)}
          </span>
        </div>

        <Tabs defaultValue="select" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">{t("Select Customer")}</TabsTrigger>
            <TabsTrigger value="options">{t("Loyalty Options")}</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4 mt-4">
            {!selectedCustomer ? (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t("Search Customer")}
                  </Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder={t("Search by name or phone")}
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <motion.button
                        key={customer.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full p-3 rounded-lg border-2 border-border hover:border-accent/50 text-left transition-all hover:bg-accent/5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {customer.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-semibold",
                              getTierColor(customer.tier),
                            )}
                          >
                            {t(
                              customer.tier.charAt(0).toUpperCase() +
                                customer.tier.slice(1),
                            )}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            {t("Points")}: {customer.loyaltyPoints}
                          </span>
                          <span>
                            {t("Balance")}:{" "}
                            {formatCurrency(customer.accountBalance)}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </AnimatePresence>

                <div className="border-t pt-3">
                  {!showNewCustomer ? (
                    <Button
                      onClick={() => setShowNewCustomer(true)}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("New Customer")}
                    </Button>
                  ) : (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <div>
                        <Label className="text-xs">{t("Customer Name")}</Label>
                        <Input
                          placeholder={t("Enter name")}
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="h-8 mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("Phone")}</Label>
                        <Input
                          placeholder={t("Enter phone number")}
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          className="h-8 mt-1 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateCustomer}
                          size="sm"
                          className="flex-1"
                        >
                          {t("Create")}
                        </Button>
                        <Button
                          onClick={() => setShowNewCustomer(false)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {t("Cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg border-2 border-accent/50 bg-accent/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedCustomer(null)}
                    variant="ghost"
                    size="sm"
                  >
                    {t("Change")}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">{t("Points")}</p>
                    <p className="font-semibold text-accent">
                      {selectedCustomer.loyaltyPoints}
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">{t("Balance")}</p>
                    <p className="font-semibold text-accent">
                      {formatCurrency(selectedCustomer.accountBalance)}
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">{t("Tier")}</p>
                    <p className="font-semibold text-accent">
                      {selectedCustomer.tier.charAt(0).toUpperCase() +
                        selectedCustomer.tier.slice(1)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>

          {selectedCustomer && (
            <TabsContent value="options" className="space-y-4 mt-4">
              <div className="space-y-4">
                {/* Loyalty Points */}
                <div className="p-3 rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Gift className="w-4 h-4 text-accent" />
                    {t("Use Loyalty Points")}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="0"
                      max={selectedCustomer.loyaltyPoints}
                      step="100"
                      value={loyaltyPointsUse}
                      onChange={(e) =>
                        setLoyaltyPointsUse(
                          Math.min(
                            selectedCustomer.loyaltyPoints,
                            Math.max(0, Number(e.target.value)),
                          ),
                        )
                      }
                      placeholder={t("Points to use")}
                      className="h-8 text-sm"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        {t("Available")}: {selectedCustomer.loyaltyPoints}{" "}
                        {t("points")}
                      </p>
                      <p>
                        {t("Value")}: {formatCurrency(pointsValue)} (100{" "}
                        {t("points")} = 1 unit)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Credit */}
                <div className="p-3 rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <DollarSign className="w-4 h-4 text-accent" />
                    {t("Use Account Credit")}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="0"
                      max={selectedCustomer.accountBalance}
                      step="1000"
                      value={accountCreditUse}
                      onChange={(e) =>
                        setAccountCreditUse(
                          Math.min(
                            selectedCustomer.accountBalance,
                            Math.max(0, Number(e.target.value)),
                          ),
                        )
                      }
                      placeholder={t("Credit amount")}
                      className="h-8 text-sm"
                    />
                    <div className="text-xs text-muted-foreground">
                      {t("Available Balance")}:{" "}
                      {formatCurrency(selectedCustomer.accountBalance)}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("Discount Summary")}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>{t("Points Discount")}</span>
                    <span className="font-medium text-success">
                      -{formatCurrency(pointsValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("Account Credit")}</span>
                    <span className="font-medium text-success">
                      -{formatCurrency(accountCreditUse)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">{t("Total Discount")}</span>
                    <span className="font-bold text-success">
                      -{formatCurrency(pointsValue + accountCreditUse)}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="flex gap-2 mt-4">
          <Button onClick={onClose} variant="outline">
            {t("Cancel")}
          </Button>
          {selectedCustomer && (
            <Button onClick={handleApply} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <CheckCircle className="w-4 h-4" />
              {t("Apply")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



