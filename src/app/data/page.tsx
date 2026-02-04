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
import {
  backups,
  backupSchedule,
  exportRequests,
  importRecords,
  databaseStats,
  dataCleanup,
  integrityChecks,
} from "@/data/dataManagement";

export default function DataManagementPage() {
  const [selectedTab, setSelectedTab] = useState("backups");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Data Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Backup, restore, import, and export your business data
          </p>
        </div>
      </div>

      {/* Database Statistics Overview */}
      <DataStats
        databaseStats={databaseStats}
        backupSchedule={backupSchedule}
        integrityChecks={integrityChecks}
      />

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
        </TabsList>

        <BackupsTab backups={backups} backupSchedule={backupSchedule} />
        <ExportTab exportRequests={exportRequests} />
        <ImportTab importRecords={importRecords} />
        <DatabaseTab databaseStats={databaseStats} dataCleanup={dataCleanup} />
        <IntegrityTab integrityChecks={integrityChecks} />
      </Tabs>
    </motion.div>
  );
}
