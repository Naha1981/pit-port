import { format } from "date-fns";
import type { ReconciliationLog } from "@workspace/api-client-react";

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPercentage(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100);
}

export function formatDate(isoString: string): string {
  if (!isoString) return "-";
  return format(new Date(isoString), "MMM dd, yyyy HH:mm");
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportReconciliationsAsCsv(
  logs: ReconciliationLog[],
  filename?: string
): void {
  const headers = [
    "ID",
    "Truck Registration",
    "Consignment Note",
    "Port Reference",
    "Mine Net Weight (t)",
    "Port Net Weight (t)",
    "Variance (%)",
    "Transit Hours",
    "Status",
    "Created At",
  ];

  const rows = logs.map((log) => [
    escapeCsvField(log.id),
    escapeCsvField(log.truck_reg),
    escapeCsvField(log.consignment_note),
    escapeCsvField(log.port_reference),
    escapeCsvField(log.mine_net_weight),
    escapeCsvField(log.port_net_weight),
    escapeCsvField(log.variance),
    escapeCsvField(log.transit_hours),
    escapeCsvField(log.status),
    escapeCsvField(log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `reconciliation-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
