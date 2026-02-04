"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { TeamMember } from "@/types/teamTypes";
import { statusConfig, roleConfig } from "./teamConfig";

interface TeamMembersGridProps {
  members: TeamMember[];
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
}

export default function TeamMembersGrid({
  members,
  onEdit,
  onDelete,
}: TeamMembersGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnimatePresence>
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-2xl border card-elevated card-hover p-4"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {member.name}
                  </h3>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      roleConfig[member.role].color,
                    )}
                  >
                    {t(roleConfig[member.role].label)}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={statusConfig[member.status].className}
              >
                {t(statusConfig[member.status].label)}
              </Badge>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.department && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>{member.department}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("Joined")}:{" "}
                  {new Date(member.joinedDate).toLocaleDateString()}
                </span>
              </div>
              {member.lastActive && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {t("Last active")}:{" "}
                    {new Date(member.lastActive).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(member)}
              >
                <Edit className="w-3 h-3 mr-1" />
                {t("Edit")}
              </Button>
              {member.role !== "owner" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(member)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
