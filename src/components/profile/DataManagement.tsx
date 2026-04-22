import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DataManagement() {
  const { t } = useLanguage();

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>{t("Data Management")}</CardTitle>
        <CardDescription>
          {t("Export, backup, or delete your data")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg space-y-3">
          <h4 className="font-medium text-foreground">
            {t("Export Your Data")}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t("Download a copy of your data in various formats")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              {t("Export as CSV")}
            </Button>
            <Button variant="outline" size="sm">
              {t("Export as JSON")}
            </Button>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <h4 className="font-medium text-foreground">
            {t("Backup & Restore")}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t("Create backups of your data and restore from previous backups")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              {t("Create Backup")}
            </Button>
            <Button variant="outline" size="sm">
              {t("Restore")}
            </Button>
          </div>
        </div>

        <div className="p-4 border border-destructive/50 rounded-lg space-y-3 bg-destructive/5">
          <h4 className="font-medium text-destructive">{t("Danger Zone")}</h4>
          <p className="text-sm text-muted-foreground">
            {t("Permanently delete your account and all associated data")}
          </p>
          <Button variant="destructive" size="sm">
            {t("Delete Account")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

