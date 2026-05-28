import React, { useMemo, useState } from "react";
import { useListReconciliations, getListReconciliationsQueryKey } from "@workspace/api-client-react";
import { TruckSummarySheet } from "@/components/truck-summary-sheet";
import { formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Truck, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface RiskyTruck {
  truckReg: string;
  criticalCount: number;
  totalRuns: number;
  lastCriticalAt: string;
  lastStatus: string;
}

export function HighRiskVehicles() {
  const [expanded, setExpanded] = useState(true);
  const [truckSummaryReg, setTruckSummaryReg] = useState<string | null>(null);

  const { data: logs } = useListReconciliations(
    {},
    { query: { queryKey: getListReconciliationsQueryKey({}) } }
  );

  const riskyTrucks = useMemo<RiskyTruck[]>(() => {
    if (!logs || logs.length === 0) return [];

    const byTruck = new Map<string, typeof logs>();
    for (const log of logs) {
      const existing = byTruck.get(log.truck_reg) ?? [];
      existing.push(log);
      byTruck.set(log.truck_reg, existing);
    }

    const results: RiskyTruck[] = [];
    for (const [truckReg, runs] of byTruck) {
      const criticalRuns = runs.filter((r) => r.status.startsWith("CRITICAL"));
      if (criticalRuns.length >= 2) {
        const sorted = [...criticalRuns].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        results.push({
          truckReg,
          criticalCount: criticalRuns.length,
          totalRuns: runs.length,
          lastCriticalAt: sorted[0].created_at,
          lastStatus: sorted[0].status,
        });
      }
    }

    return results.sort((a, b) => b.criticalCount - a.criticalCount);
  }, [logs]);

  if (riskyTrucks.length === 0) return null;

  return (
    <>
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 overflow-hidden">
        {/* Header */}
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-destructive/10 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-left">
              <span className="text-sm font-semibold text-destructive">
                High-Risk Vehicles
              </span>
              <span className="text-xs text-destructive/70 ml-2 font-mono">
                {riskyTrucks.length} truck{riskyTrucks.length !== 1 ? "s" : ""} flagged
              </span>
            </div>
            <Badge className="bg-destructive text-destructive-foreground text-xs font-mono h-5 px-1.5">
              {riskyTrucks.reduce((s, t) => s + t.criticalCount, 0)} critical incidents
            </Badge>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-destructive/60 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-destructive/60 shrink-0" />
          )}
        </button>

        {/* Body */}
        {expanded && (
          <div className="border-t border-destructive/20 px-5 py-4">
            <p className="text-xs text-destructive/70 mb-4">
              Vehicles with 2 or more CRITICAL incidents require operator review before next dispatch.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {riskyTrucks.map((truck) => (
                <div
                  key={truck.truckReg}
                  className="flex flex-col gap-2 p-3 rounded-md border border-destructive/30 bg-background/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="h-4 w-4 text-destructive shrink-0" />
                      <span className="font-mono font-bold text-sm text-foreground truncate">
                        {truck.truckReg}
                      </span>
                    </div>
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-mono shrink-0">
                      {truck.criticalCount}x CRITICAL
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex justify-between">
                      <span>Total runs</span>
                      <span className="font-mono text-foreground">{truck.totalRuns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical rate</span>
                      <span className="font-mono text-destructive font-semibold">
                        {Math.round((truck.criticalCount / truck.totalRuns) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last incident</span>
                      <span className="font-mono text-foreground">{formatDate(truck.lastCriticalAt)}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs mt-1 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setTruckSummaryReg(truck.truckReg)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    View History
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TruckSummarySheet
        truckReg={truckSummaryReg}
        open={!!truckSummaryReg}
        onOpenChange={(open) => !open && setTruckSummaryReg(null)}
      />
    </>
  );
}
