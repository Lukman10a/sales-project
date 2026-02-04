import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { mockInvestors } from "@/data/investor";
import { use } from "react";
import EditInvestorClient from "./edit-client";

export default function EditInvestorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const investor = mockInvestors.find((inv) => inv.id === resolvedParams.id);

  if (!investor) {
    return (
      <div className="max-w-2xl mx-auto">
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

  return <EditInvestorClient investor={investor} />;
}
