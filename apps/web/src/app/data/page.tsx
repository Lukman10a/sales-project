"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import DataStats from "@/components/data/DataStats";
import BackupsTab from "@/components/data/BackupsTab";
import ExportTab from "@/components/data/ExportTab";
import ImportTab from "@/components/data/ImportTab";
import DatabaseTab from "@/components/data/DatabaseTab";
import IntegrityTab from "@/components/data/IntegrityTab";
import { Database } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataManagementPage() {
  const [selectedTab, setSelectedTab] = useState("backups");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Database className="w-6 sm:w-8 h-6 sm:h-8 text-primary flex-shrink-0" />
            <span>Data Management</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Backup, restore, import, and export your business data
          </p>
        </div>
      </div>

      {/* Database Statistics Overview */}
      <DataStats />

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 sm:gap-0">
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
        </TabsList>

        <BackupsTab />
        <ExportTab />
        <ImportTab />
        <DatabaseTab />
        <IntegrityTab />
      </Tabs>
    </motion.div>
  );
}
