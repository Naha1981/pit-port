export interface ReconciliationResult {
  consignment_note: string | null;
  port_reference: string | null;
  truck_reg: string;
  mine_net_weight: number;
  port_net_weight: number;
  variance: number;
  transit_hours: number | null;
  status: string;
}

function normalizeReg(regStr: string): string {
  if (!regStr) return "";
  return regStr.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function runReconciliationLogic(
  mineData: Record<string, unknown>,
  portData: Record<string, unknown>
): ReconciliationResult {
  const mineReg = normalizeReg(String(mineData["truck_reg"] ?? ""));
  const portReg = normalizeReg(String(portData["truck_reg"] ?? ""));

  const truckMatch = mineReg === portReg && mineReg.length > 0;

  const mineNet = parseFloat(String(mineData["net_weight"] ?? 0)) || 0;
  const portNet = parseFloat(String(portData["net_weight"] ?? 0)) || 0;

  let variance: number;
  if (mineNet > 0) {
    variance = (Math.abs(mineNet - portNet) / mineNet) * 100;
  } else {
    variance = portNet > 0 ? 100.0 : 0.0;
  }

  let status: string;
  if (!truckMatch) {
    status = "CRITICAL (Registration Mismatch)";
  } else if (variance > 1.5) {
    status = "CRITICAL (High Weight Variance)";
  } else if (variance > 0.5) {
    status = "WARNING (Minor Variance)";
  } else {
    status = "RECONCILED";
  }

  let transitHours: number | null = null;
  try {
    const depStr = String(mineData["departure_time"] ?? "");
    const arrStr = String(portData["arrival_time"] ?? "");
    if (depStr && arrStr) {
      const depDt = new Date(depStr.replace("Z", "+00:00"));
      const arrDt = new Date(arrStr.replace("Z", "+00:00"));
      const diff = (arrDt.getTime() - depDt.getTime()) / 3600000;
      if (!isNaN(diff)) {
        transitHours = Math.round(diff * 100) / 100;
      }
    }
  } catch {
    // transit time not available
  }

  return {
    consignment_note: (mineData["consignment_note"] as string | null) ?? null,
    port_reference: (portData["port_reference"] as string | null) ?? null,
    truck_reg: (mineData["truck_reg"] as string) ?? "",
    mine_net_weight: mineNet,
    port_net_weight: portNet,
    variance: Math.round(variance * 100) / 100,
    transit_hours: transitHours,
    status,
  };
}
