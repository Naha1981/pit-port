import { format } from "date-fns";

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
