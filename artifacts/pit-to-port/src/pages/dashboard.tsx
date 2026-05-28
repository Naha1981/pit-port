import React, { useState } from "react";
import { UploadForm } from "@/components/upload-form";
import { StatsCards } from "@/components/stats-cards";
import { HighRiskVehicles } from "@/components/high-risk-vehicles";
import { ReconciliationList } from "@/components/reconciliation-list";

export default function Dashboard() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              PP
            </div>
            <h1 className="text-lg font-bold tracking-tight">Pit-to-Port Command</h1>
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {new Date().toISOString().split('T')[0]}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <StatsCards />
        <HighRiskVehicles />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <UploadForm />
          </div>
          <div className="lg:col-span-2">
            <ReconciliationList />
          </div>
        </div>
      </main>
    </div>
  );
}
