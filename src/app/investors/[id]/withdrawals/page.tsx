import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { mockInvestors } from "@/data/investor";
import { formatCurrency } from "@/lib/investorUtils";
import { use } from "react";
import WithdrawalsClient from "./withdrawals-client";

export default function WithdrawalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const investor = mockInvestors.find((inv) => inv.id === resolvedParams.id);

  if (!investor) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/investors">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Investors
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Investor not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <WithdrawalsClient investor={investor} />;
}
