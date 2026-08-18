"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { templateIcons } from "./reportConfig";
import { ReportTemplate } from "@/types/reportTypes";

interface TemplatesGridProps {
  templates: ReportTemplate[];
  onSelectTemplate: (template: ReportTemplate) => void;
}

export default function TemplatesGrid({
  templates,
  onSelectTemplate,
}: TemplatesGridProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          {t("Report Templates")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("Choose a template to generate a custom report")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, index) => {
          const Icon = templateIcons[template.icon] || FileText;
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full"
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">
                      {t(template.name)}
                    </CardTitle>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {t("Metrics Included")}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.metrics.slice(0, 3).map((metric) => (
                        <Badge
                          key={metric}
                          variant="secondary"
                          className="text-xs"
                        >
                          {metric}
                        </Badge>
                      ))}
                      {template.metrics.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.metrics.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


