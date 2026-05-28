import { Router, type IRouter } from "express";
import multer from "multer";
import { eq, desc, ilike, sql } from "drizzle-orm";
import { db, reconciliationLogsTable } from "@workspace/db";
import {
  ListReconciliationsQueryParams,
  GetReconciliationParams,
  UpdateReconciliationParams,
  UpdateReconciliationBody,
  DeleteReconciliationParams,
} from "@workspace/api-zod";
import { extractMineSlip, extractPortSlip } from "../lib/gemini";
import { runReconciliationLogic } from "../lib/reconciliation-engine";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post(
  "/reconcile",
  upload.fields([
    { name: "mine_slip", maxCount: 1 },
    { name: "port_slip", maxCount: 1 },
  ]),
  async (req, res): Promise<void> => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;

    if (!files?.["mine_slip"]?.[0] || !files?.["port_slip"]?.[0]) {
      res.status(400).json({ error: "Both mine_slip and port_slip files are required." });
      return;
    }

    const mineFile = files["mine_slip"][0];
    const portFile = files["port_slip"][0];

    req.log.info({ mineFile: mineFile.originalname, portFile: portFile.originalname }, "Processing reconciliation");

    let mineData: Record<string, unknown>;
    let portData: Record<string, unknown>;

    try {
      [mineData, portData] = await Promise.all([
        extractMineSlip(mineFile.buffer, mineFile.mimetype),
        extractPortSlip(portFile.buffer, portFile.mimetype),
      ]);
    } catch (err) {
      req.log.error({ err }, "Gemini extraction failed");
      const message = err instanceof Error ? err.message : "Gemini extraction failed";
      res.status(500).json({ error: message });
      return;
    }

    const reconciled = runReconciliationLogic(mineData, portData);

    const [log] = await db
      .insert(reconciliationLogsTable)
      .values({
        consignmentNote: reconciled.consignment_note,
        portReference: reconciled.port_reference,
        truckReg: reconciled.truck_reg,
        mineNetWeight: reconciled.mine_net_weight,
        portNetWeight: reconciled.port_net_weight,
        variance: reconciled.variance,
        transitHours: reconciled.transit_hours,
        status: reconciled.status,
        rawMineJson: JSON.stringify(mineData),
        rawPortJson: JSON.stringify(portData),
      })
      .returning();

    req.log.info({ id: log.id, status: log.status }, "Reconciliation logged");

    res.status(201).json(toApiLog(log));
  }
);

router.get("/reconciliations/stats", async (req, res): Promise<void> => {
  const rows = await db.select().from(reconciliationLogsTable);

  const total = rows.length;
  const reconciled = rows.filter((r) => r.status === "RECONCILED").length;
  const warnings = rows.filter((r) => r.status.startsWith("WARNING")).length;
  const critical = rows.filter((r) => r.status.startsWith("CRITICAL")).length;

  const totalVariance = rows.reduce((sum, r) => sum + (r.variance ?? 0), 0);
  const avgVariance = total > 0 ? Math.round((totalVariance / total) * 100) / 100 : 0;

  const transitRows = rows.filter((r) => r.transitHours != null);
  const avgTransitHours =
    transitRows.length > 0
      ? Math.round(
          (transitRows.reduce((sum, r) => sum + (r.transitHours ?? 0), 0) / transitRows.length) * 100
        ) / 100
      : null;

  res.json({ total, reconciled, warnings, critical, avg_variance: avgVariance, avg_transit_hours: avgTransitHours });
});

router.get("/reconciliations", async (req, res): Promise<void> => {
  const parsed = ListReconciliationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, date_from, date_to } = parsed.data;

  let rows = await db
    .select()
    .from(reconciliationLogsTable)
    .orderBy(desc(reconciliationLogsTable.createdAt));

  if (search) {
    const lower = search.toLowerCase();
    rows = rows.filter((r) => r.truckReg.toLowerCase().includes(lower));
  }

  if (status) {
    rows = rows.filter((r) => r.status === status);
  }

  if (date_from) {
    const from = new Date(date_from);
    from.setUTCHours(0, 0, 0, 0);
    rows = rows.filter((r) => r.createdAt >= from);
  }

  if (date_to) {
    const to = new Date(date_to);
    to.setUTCHours(23, 59, 59, 999);
    rows = rows.filter((r) => r.createdAt <= to);
  }

  res.json(rows.map(toApiLog));
});

router.get("/reconciliations/:id", async (req, res): Promise<void> => {
  const params = GetReconciliationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [log] = await db
    .select()
    .from(reconciliationLogsTable)
    .where(eq(reconciliationLogsTable.id, params.data.id));

  if (!log) {
    res.status(404).json({ error: "Reconciliation log not found" });
    return;
  }

  res.json(toApiLog(log));
});

router.put("/reconciliations/:id", async (req, res): Promise<void> => {
  const params = UpdateReconciliationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateReconciliationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(reconciliationLogsTable)
    .where(eq(reconciliationLogsTable.id, params.data.id));

  if (!existing[0]) {
    res.status(404).json({ error: "Reconciliation log not found" });
    return;
  }

  const mineData = {
    consignment_note: body.data.consignment_note ?? null,
    truck_reg: body.data.truck_reg,
    net_weight: body.data.mine_net_weight,
  };
  const portData = {
    port_reference: body.data.port_reference ?? null,
    truck_reg: body.data.truck_reg,
    net_weight: body.data.port_net_weight,
  };

  const reconciled = runReconciliationLogic(mineData, portData);

  const [updated] = await db
    .update(reconciliationLogsTable)
    .set({
      consignmentNote: reconciled.consignment_note,
      portReference: reconciled.port_reference,
      truckReg: reconciled.truck_reg,
      mineNetWeight: reconciled.mine_net_weight,
      portNetWeight: reconciled.port_net_weight,
      variance: reconciled.variance,
      status: reconciled.status,
    })
    .where(eq(reconciliationLogsTable.id, params.data.id))
    .returning();

  res.json(toApiLog(updated));
});

router.delete("/reconciliations/:id", async (req, res): Promise<void> => {
  const params = DeleteReconciliationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(reconciliationLogsTable)
    .where(eq(reconciliationLogsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Reconciliation log not found" });
    return;
  }

  res.sendStatus(204);
});

function toApiLog(log: typeof reconciliationLogsTable.$inferSelect) {
  return {
    id: log.id,
    consignment_note: log.consignmentNote,
    port_reference: log.portReference,
    truck_reg: log.truckReg,
    mine_net_weight: log.mineNetWeight,
    port_net_weight: log.portNetWeight,
    variance: log.variance,
    transit_hours: log.transitHours,
    status: log.status,
    raw_mine_json: log.rawMineJson,
    raw_port_json: log.rawPortJson,
    created_at: log.createdAt.toISOString(),
  };
}

export default router;
