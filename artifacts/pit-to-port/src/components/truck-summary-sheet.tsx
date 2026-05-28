import React, { useMemo } from "react";
import { useListReconciliations, getListReconciliationsQueryKey } from "@workspace/api-client-react";
import { formatNumber, formatPercentage, formatDate } from "@/lib/formatters";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Truck, Scale, TrendingUp, TrendingDown, Clock, Activity, AlertTriangle, CheckCircle2, TriangleAlert } from "lucide-react";

interface TruckSummarySheetProps {
  truckReg: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatCell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-background/60 border border-border/40 rounded-lg p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-lg font-bold font-mono text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status.includes("RECONCILED")) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  if (status.includes("WARNING")) return <TriangleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status.includes("RECONCILED"))
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">{status}</Badge>;
  if (status.includes("WARNING"))
    return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">{status}</Badge>;
  return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{status}</Badge>;
}

export function TruckSummarySheet({ truckReg, open, onOpenChange }: TruckSummarySheetProps) {
  const queryParams = { search: truckReg ?? undefined };
  const { data: runs, isLoading } = useListReconciliations(queryParams, {
    query: {
      queryKey: getListReconciliationsQueryKey(queryParams),
      enabled: open && !!truckReg,
    },
  });

  const stats = useMemo(() => {
    if (!runs || runs.length === 0) return null;

    const totalRuns = runs.length;
    const totalMineWeight = runs.reduce((s, r) => s + r.mine_net_weight, 0);
    const totalPortWeight = runs.reduce((s, r) => s + r.port_net_weight, 0);
    const variances = runs.map((r) => r.variance);
    const avgVariance = variances.reduce((s, v) => s + v, 0) / totalRuns;
    const minVariance = Math.min(...variances);
    const maxVariance = Math.max(...variances);
    const reconciled = runs.filter((r) => r.status === "RECONCILED").length;
    const warnings = runs.filter((r) => r.status.startsWith("WARNING")).length;
    const critical = runs.filter((r) => r.status.startsWith("CRITICAL")).length;
    const lastSeen = runs[0]?.created_at ?? null;
    const transitRuns = runs.filter((r) => r.transit_hours != null);
    const avgTransit =
      transitRuns.length > 0
        ? transitRuns.reduce((s, r) => s + (r.transit_hours ?? 0), 0) / transitRuns.length
        : null;

    return {
      totalRuns,
      totalMineWeight,
      totalPortWeight,
      avgVariance,
      minVariance,
      maxVariance,
      reconciled,
      warnings,
      critical,
      lastSeen,
      avgTransit,
    };
  }, [runs]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto bg-background border-border/60 p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold font-mono tracking-tight">
                {truckReg ?? "—"}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Truck history &amp; cumulative performance</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !stats ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
              <p className="text-muted-foreground text-sm">No records found for this truck.</p>
            </div>
          ) : (
            <>
              {/* Status breakdown bar */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/40">
                <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-500 font-mono font-bold">{stats.reconciled}</span>
                    <span className="text-muted-foreground">reconciled</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-500 font-mono font-bold">{stats.warnings}</span>
                    <span className="text-muted-foreground">warning</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-destructive font-mono font-bold">{stats.critical}</span>
                    <span className="text-muted-foreground">critical</span>
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    {stats.totalRuns} total run{stats.totalRuns !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCell
                  label="Total Mine Weight"
                  value={<><span>{formatNumber(stats.totalMineWeight)}</span><span className="text-sm font-normal text-muted-foreground ml-1">t</span></>}
                  sub="cumulative departures"
                />
                <StatCell
                  label="Total Port Weight"
                  value={<><span>{formatNumber(stats.totalPortWeight)}</span><span className="text-sm font-normal text-muted-foreground ml-1">t</span></>}
                  sub="cumulative arrivals"
                />
                <StatCell
                  label="Avg Transit"
                  value={stats.avgTransit != null ? `${stats.avgTransit.toFixed(1)}h` : "—"}
                  sub="mine → port"
                />
                <StatCell
                  label="Avg Variance"
                  value={
                    <span className={Math.abs(stats.avgVariance) > 0.5 ? "text-destructive" : "text-primary"}>
                      {stats.avgVariance > 0 ? "+" : ""}{formatPercentage(stats.avgVariance)}
                    </span>
                  }
                  sub="across all runs"
                />
                <StatCell
                  label="Best Run"
                  value={
                    <span className="flex items-center gap-1 text-emerald-500">
                      <TrendingDown className="h-4 w-4" />
                      {stats.minVariance > 0 ? "+" : ""}{formatPercentage(stats.minVariance)}
                    </span>
                  }
                  sub="lowest variance"
                />
                <StatCell
                  label="Worst Run"
                  value={
                    <span className="flex items-center gap-1 text-destructive">
                      <TrendingUp className="h-4 w-4" />
                      {stats.maxVariance > 0 ? "+" : ""}{formatPercentage(stats.maxVariance)}
                    </span>
                  }
                  sub="highest variance"
                />
              </div>

              <Separator className="bg-border/40" />

              {/* Run history */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5" />
                  Run History
                </h3>
                <div className="space-y-2">
                  {runs!.map((run, idx) => (
                    <div
                      key={run.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border border-border/30 bg-card/30 hover:bg-card/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 shrink-0 w-6 text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mine</p>
                          <p className="font-mono">{formatNumber(run.mine_net_weight)} t</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Port</p>
                          <p className="font-mono">{formatNumber(run.port_net_weight)} t</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Variance</p>
                          <p className={`font-mono font-semibold ${Math.abs(run.variance) > 0.5 ? "text-destructive" : "text-primary"}`}>
                            {run.variance > 0 ? "+" : ""}{formatPercentage(run.variance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transit</p>
                          <p className="font-mono flex items-center gap-1">
                            {run.transit_hours != null ? (
                              <><Clock className="h-3 w-3 text-muted-foreground" />{run.transit_hours.toFixed(1)}h</>
                            ) : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                        <StatusBadge status={run.status} />
                        <span className="text-[10px] text-muted-foreground font-mono">{formatDate(run.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
