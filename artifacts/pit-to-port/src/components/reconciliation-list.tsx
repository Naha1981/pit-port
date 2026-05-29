import React, { useState } from "react";
import { useListReconciliations, getListReconciliationsQueryKey, ReconciliationLog } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatNumber, formatPercentage, formatDate, exportReconciliationsAsCsv } from "@/lib/formatters";
import { EditReconciliationDialog } from "@/components/edit-reconciliation-dialog";
import { DeleteReconciliationDialog } from "@/components/delete-reconciliation-dialog";
import { TruckSummarySheet } from "@/components/truck-summary-sheet";
import { ComplianceReportDialog } from "@/components/compliance-report-dialog";
import { VarianceChart } from "@/components/variance-chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Filter, Pencil, Trash2, ChevronDown, FileJson, AlertTriangle, Download, CalendarRange, X, FileText } from "lucide-react";

export function ReconciliationList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editLog, setEditLog] = useState<ReconciliationLog | null>(null);
  const [deleteLog, setDeleteLog] = useState<ReconciliationLog | null>(null);
  const [truckSummaryReg, setTruckSummaryReg] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const hasDateFilter = dateFrom !== "" || dateTo !== "";

  const queryParams = {
    search: debouncedSearch || undefined,
    status: status !== "all" ? status : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { data: logs, isLoading } = useListReconciliations(queryParams, {
    query: {
      queryKey: getListReconciliationsQueryKey(queryParams)
    }
  });

  function clearDates() {
    setDateFrom("");
    setDateTo("");
  }

  function buildExportFilename() {
    if (dateFrom && dateTo) return `reconciliation-audit-${dateFrom}-to-${dateTo}.csv`;
    if (dateFrom) return `reconciliation-audit-from-${dateFrom}.csv`;
    if (dateTo) return `reconciliation-audit-to-${dateTo}.csv`;
    return undefined;
  }

  const getStatusBadge = (statusStr: string) => {
    if (statusStr.includes("RECONCILED")) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">{statusStr}</Badge>;
    }
    if (statusStr.includes("WARNING")) {
      return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">{statusStr}</Badge>;
    }
    return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">{statusStr}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 bg-card/30 p-4 rounded-lg border border-border/50">
        {/* Row 1: search + status + export */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search truck reg..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-border/50 focus-visible:ring-primary">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="RECONCILED">Reconciled</SelectItem>
                <SelectItem value="WARNING (Minor Variance)">Warning (Minor)</SelectItem>
                <SelectItem value="CRITICAL (High Weight Variance)">Critical (Weight)</SelectItem>
                <SelectItem value="CRITICAL (Registration Mismatch)">Critical (Reg Mismatch)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-background/50 border-border/50 shrink-0"
              disabled={!logs || logs.length === 0}
              onClick={() => logs && exportReconciliationsAsCsv(logs, buildExportFilename())}
              title="Export current view as CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-background/50 border-border/50 shrink-0"
              disabled={!logs || logs.length === 0}
              onClick={() => setReportOpen(true)}
              title="Generate compliance report"
            >
              <FileText className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        </div>

        {/* Row 2: date range */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Date range</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-md border border-border/50 bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-md border border-border/50 bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
            />
            {hasDateFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                onClick={clearDates}
                title="Clear date filter"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            {hasDateFilter && (
              <span className="text-xs text-primary font-mono">
                {logs ? `${logs.length} record${logs.length !== 1 ? "s" : ""}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {logs && <VarianceChart logs={logs} />}

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 bg-card border-border/50">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
          ))
        ) : logs?.length === 0 ? (
          <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-transparent">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-1">No records found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search || status !== "all" 
                ? "Try adjusting your search or filter parameters." 
                : "Upload a mine slip and port receipt to begin reconciliation."}
            </p>
          </Card>
        ) : (
          logs?.map((log) => (
            <Card key={log.id} className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:bg-card hover:border-border">
              <div className="p-5">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        className="text-xl font-bold font-mono tracking-tight hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                        onClick={() => setTruckSummaryReg(log.truck_reg)}
                        title="View truck history"
                      >
                        {log.truck_reg}
                      </button>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4 font-mono">
                      <span>{formatDate(log.created_at)}</span>
                      {log.transit_hours != null && <span>Transit: {log.transit_hours.toFixed(1)}h</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Button variant="outline" size="sm" className="h-8 bg-background" onClick={() => setEditLog(log)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Correct
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 bg-background text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setDeleteLog(log)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-background/50 p-4 rounded-lg border border-border/40">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Mine Weight</p>
                    <p className="text-lg font-semibold font-mono">{formatNumber(log.mine_net_weight)} t</p>
                    <p className="text-xs text-muted-foreground truncate" title={log.consignment_note || ""}>
                      {log.consignment_note || "No Consignment"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Port Weight</p>
                    <p className="text-lg font-semibold font-mono">{formatNumber(log.port_net_weight)} t</p>
                    <p className="text-xs text-muted-foreground truncate" title={log.port_reference || ""}>
                      {log.port_reference || "No Reference"}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-2 flex items-center md:justify-end">
                    <div className={`text-right p-3 rounded border ${Math.abs(log.variance) > 0.5 ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-primary/5 border-primary/10 text-primary'}`}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1">Variance</p>
                      <p className="text-2xl font-bold font-mono">
                        {log.variance > 0 ? "+" : ""}{formatPercentage(log.variance)}
                      </p>
                    </div>
                  </div>
                </div>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full flex justify-between items-center text-xs h-8 bg-muted/30 hover:bg-muted">
                      <span className="flex items-center gap-2">
                        <FileJson className="h-3.5 w-3.5" />
                        View Extracted JSON
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-background border border-border/50 rounded-md p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Mine JSON</p>
                        <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-auto max-h-[200px] font-mono">
                          {log.raw_mine_json || "No data"}
                        </pre>
                      </div>
                      <div className="bg-background border border-border/50 rounded-md p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Port JSON</p>
                        <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-auto max-h-[200px] font-mono">
                          {log.raw_port_json || "No data"}
                        </pre>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Card>
          ))
        )}
      </div>

      <EditReconciliationDialog log={editLog} open={!!editLog} onOpenChange={(open) => !open && setEditLog(null)} />
      <DeleteReconciliationDialog log={deleteLog} open={!!deleteLog} onOpenChange={(open) => !open && setDeleteLog(null)} />
      <TruckSummarySheet
        truckReg={truckSummaryReg}
        open={!!truckSummaryReg}
        onOpenChange={(open) => !open && setTruckSummaryReg(null)}
      />
      <ComplianceReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        logs={logs ?? []}
        dateFrom={dateFrom || undefined}
        dateTo={dateTo || undefined}
        search={debouncedSearch || undefined}
        status={status !== "all" ? status : undefined}
      />
    </div>
  );
}
