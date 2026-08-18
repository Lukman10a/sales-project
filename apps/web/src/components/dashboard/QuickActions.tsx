import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { actions, apprenticeActions } from "@/data/data";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface QuickActionsProps {
  userRole?: "owner" | "apprentice" | "investor";
  pendingConfirmations?: number;
}

const variantStyles = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  accent: "bg-accent text-accent-foreground hover:opacity-90 shadow-sm",
  secondary:
    "bg-card border border-border hover:border-border/80 hover:bg-muted text-foreground",
};

const QuickActions = ({
  userRole = "owner",
  pendingConfirmations = 0,
}: QuickActionsProps) => {
  const { t } = useLanguage();
  const actionsList = userRole === "apprentice" ? apprenticeActions : actions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {actionsList.map((action, index) => {
        const hasBadge =
          action.id === "confirm-stock" && pendingConfirmations > 0;
        return (
          <Link key={action.id} href={action.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer touch-manipulation relative",
                variantStyles[action.variant],
              )}
            >
              {hasBadge && (
                <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground">
                  {pendingConfirmations}
                </Badge>
              )}
              <action.icon className="w-5 h-5 sm:w-6 sm:h-6 mb-2 sm:mb-3" />
              <h4 className="font-semibold text-xs sm:text-sm mb-1">
                {t(action.title)}
              </h4>
              <p
                className={cn(
                  "text-[10px] sm:text-xs line-clamp-2",
                  action.variant === "secondary"
                    ? "text-muted-foreground"
                    : "opacity-80",
                )}
              >
                {t(action.description)}
              </p>
            </motion.div>
          </Link>
        );
      })}
    </motion.div>
  );
};

export default QuickActions;


