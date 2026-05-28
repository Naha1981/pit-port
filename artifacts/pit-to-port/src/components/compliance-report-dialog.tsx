import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ReconciliationLog } from "@workspace/api-client-react";
import { formatNumber, formatPercentage, formatDate } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText } from "lucide-react";
import { format } from "date-fns";

interface ComplianceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: ReconciliationLog[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  status?: string;
}

interface RiskyTruck {
  truckReg: string;
  criticalCount: number;
  totalRuns: number;
}

interface ReportStats {
  total: number;
  reconciled: number;
  warnings: number;
  critical: number;
  avgVariance: number;
  avgTransit: number | null;
}

function computeStats(logs: ReconciliationLog[]): ReportStats {
  const total = logs.length;
  const reconciled = logs.filter((l) => l.status === "RECONCILED").length;
  const warnings = logs.filter((l) => l.status.startsWith("WARNING")).length;
  const critical = logs.filter((l) => l.status.startsWith("CRITICAL")).length;
  const avgVariance =
    total > 0 ? Math.round((logs.reduce((s, l) => s + l.variance, 0) / total) * 100) / 100 : 0;
  const transitLogs = logs.filter((l) => l.transit_hours != null);
  const avgTransit =
    transitLogs.length > 0
      ? Math.round((transitLogs.reduce((s, l) => s + (l.transit_hours ?? 0), 0) / transitLogs.length) * 10) / 10
      : null;
  return { total, reconciled, warnings, critical, avgVariance, avgTransit };
}

function computeRiskyTrucks(logs: ReconciliationLog[]): RiskyTruck[] {
  const byTruck = new Map<string, ReconciliationLog[]>();
  for (const log of logs) {
    const arr = byTruck.get(log.truck_reg) ?? [];
    arr.push(log);
    byTruck.set(log.truck_reg, arr);
  }
  const result: RiskyTruck[] = [];
  for (const [truckReg, runs] of byTruck) {
    const criticalCount = runs.filter((r) => r.status.startsWith("CRITICAL")).length;
    if (criticalCount >= 2) result.push({ truckReg, criticalCount, totalRuns: runs.length });
  }
  return result.sort((a, b) => b.criticalCount - a.criticalCount);
}

function periodLabel(dateFrom?: string, dateTo?: string, search?: string, status?: string) {
  const parts: string[] = [];
  if (dateFrom && dateTo) parts.push(`${dateFrom} to ${dateTo}`);
  else if (dateFrom) parts.push(`from ${dateFrom}`);
  else if (dateTo) parts.push(`up to ${dateTo}`);
  else parts.push("All records");
  if (search) parts.push(`Truck: ${search}`);
  if (status) parts.push(`Status: ${status}`);
  return parts.join(" · ");
}

interface PrintReportProps {
  logs: ReconciliationLog[];
  stats: ReportStats;
  riskyTrucks: RiskyTruck[];
  generatedAt: string;
  period: string;
}

function PrintReport({ logs, stats, riskyTrucks, generatedAt, period }: PrintReportProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "10pt", color: "#111", lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "16pt", fontWeight: "bold", letterSpacing: "0.05em" }}>
              WEIGHBRIDGE RECONCILIATION
            </div>
            <div style={{ fontSize: "11pt", fontWeight: "bold", color: "#444" }}>
              COMPLIANCE REPORT
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "9pt", color: "#555" }}>
            <div style={{ fontWeight: "bold" }}>Pit-to-Port Command Centre</div>
            <div>Generated: {generatedAt}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: "9pt", color: "#555" }}>
          Period: <strong>{period}</strong>
        </div>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, color: "#444" }}>
          Summary Statistics
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#f5f5f5", fontWeight: "bold", width: "16.6%" }}>Total Processed</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", width: "16.6%", fontFamily: "monospace" }}>{stats.total}</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#f5f5f5", fontWeight: "bold", width: "16.6%" }}>Reconciled</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", width: "16.6%", fontFamily: "monospace" }}>
                {stats.reconciled} ({stats.total > 0 ? Math.round((stats.reconciled / stats.total) * 100) : 0}%)
              </td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#f5f5f5", fontWeight: "bold", width: "16.6%" }}>Warnings</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", width: "16.6%", fontFamily: "monospace" }}>{stats.warnings}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#f5f5f5", fontWeight: "bold" }}>Critical</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", fontFamily: "monospace", fontWeight: "bold", color: stats.critical > 0 ? "#c00" : undefined }}>{stats.critical}</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#f5f5f5", fontWeight: "bold" }}>Avg Variance</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", fontFamily: "monospace" }}>{formatPercentage(stats.avgVariance)}</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#f5f5f5", fontWeight: "bold" }}>Avg Transit</td>
              <td style={{ padding: "4px 8px", border: "1px solid #ccc", fontFamily: "monospace" }}>{stats.avgTransit != null ? `${stats.avgTransit}h` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* High-risk vehicles */}
      {riskyTrucks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, color: "#c00" }}>
            High-Risk Vehicles ({riskyTrucks.length} flagged)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
            <thead>
              <tr style={{ background: "#fee" }}>
                <th style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "left" }}>Truck Registration</th>
                <th style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "right" }}>Critical Incidents</th>
                <th style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "right" }}>Total Runs</th>
                <th style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "right" }}>Critical Rate</th>
              </tr>
            </thead>
            <tbody>
              {riskyTrucks.map((t, i) => (
                <tr key={t.truckReg} style={{ background: i % 2 === 1 ? "#fafafa" : undefined }}>
                  <td style={{ padding: "4px 8px", border: "1px solid #ccc", fontFamily: "monospace", fontWeight: "bold" }}>{t.truckReg}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "right", color: "#c00", fontWeight: "bold" }}>{t.criticalCount}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "right" }}>{t.totalRuns}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "right", color: "#c00" }}>
                    {Math.round((t.criticalCount / t.totalRuns) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reconciliation log */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, color: "#444" }}>
          Reconciliation Log ({logs.length} records)
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "left" }}>#</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "left" }}>Truck Reg</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "left" }}>Consignment</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right" }}>Mine Wt (t)</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right" }}>Port Wt (t)</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right" }}>Variance</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right" }}>Transit</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "left" }}>Status</th>
              <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "left" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => {
              const isCritical = log.status.startsWith("CRITICAL");
              const isWarning = log.status.startsWith("WARNING");
              return (
                <tr key={log.id} style={{ background: isCritical ? "#fff0f0" : isWarning ? "#fffbf0" : i % 2 === 1 ? "#fafafa" : undefined }}>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", color: "#888" }}>{i + 1}</td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", fontFamily: "monospace", fontWeight: "bold" }}>{log.truck_reg}</td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", fontFamily: "monospace", fontSize: "7.5pt" }}>{log.consignment_note ?? "—"}</td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right", fontFamily: "monospace" }}>{formatNumber(log.mine_net_weight)}</td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right", fontFamily: "monospace" }}>{formatNumber(log.port_net_weight)}</td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right", fontFamily: "monospace", fontWeight: Math.abs(log.variance) > 0.5 ? "bold" : undefined, color: Math.abs(log.variance) > 0.5 ? "#c00" : undefined }}>
                    {log.variance > 0 ? "+" : ""}{formatPercentage(log.variance)}
                  </td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right", fontFamily: "monospace" }}>
                    {log.transit_hours != null ? `${log.transit_hours.toFixed(1)}h` : "—"}
                  </td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", fontSize: "7.5pt", color: isCritical ? "#c00" : isWarning ? "#b45309" : "#166534" }}>{log.status}</td>
                  <td style={{ padding: "3px 6px", border: "1px solid #ccc", fontSize: "7.5pt", fontFamily: "monospace" }}>{formatDate(log.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: 8, fontSize: "8pt", color: "#888", display: "flex", justifyContent: "space-between" }}>
        <span>Pit-to-Port Command Centre — Confidential</span>
        <span>Generated {generatedAt}</span>
      </div>
    </div>
  );
}

export function ComplianceReportDialog({ open, onOpenChange, logs, dateFrom, dateTo, search, status }: ComplianceReportDialogProps) {
  const [printing, setPrinting] = useState(false);

  const stats = useMemo(() => computeStats(logs), [logs]);
  const riskyTrucks = useMemo(() => computeRiskyTrucks(logs), [logs]);
  const generatedAt = format(new Date(), "MMM dd, yyyy HH:mm");
  const period = periodLabel(dateFrom, dateTo, search, status);

  function handlePrint() {
    setPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setPrinting(false);
    });
  }

  const reportProps = { logs, stats, riskyTrucks, generatedAt, period };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col bg-card border-border/60 p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">Compliance Report Preview</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{period} · {logs.length} records</p>
                </div>
              </div>
              <Button onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-5">
            {/* Dark-themed preview — mirrors the print output */}
            <div className="bg-white text-black rounded-md p-8 shadow-sm border border-border/20 text-sm">
              <PrintReport {...reportProps} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Print portal — only rendered when printing, hidden on screen, visible in print */}
      {printing &&
        createPortal(
          <div id="pp-report-print">
            <PrintReport {...reportProps} />
          </div>,
          document.body
        )}
    </>
  );
}
