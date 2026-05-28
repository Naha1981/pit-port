import {
  pgTable,
  serial,
  text,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reconciliationLogsTable = pgTable("reconciliation_logs", {
  id: serial("id").primaryKey(),
  consignmentNote: text("consignment_note"),
  portReference: text("port_reference"),
  truckReg: text("truck_reg").notNull(),
  mineNetWeight: real("mine_net_weight").notNull(),
  portNetWeight: real("port_net_weight").notNull(),
  variance: real("variance").notNull(),
  transitHours: real("transit_hours"),
  status: text("status").notNull(),
  rawMineJson: text("raw_mine_json"),
  rawPortJson: text("raw_port_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertReconciliationLogSchema = createInsertSchema(
  reconciliationLogsTable
).omit({ id: true, createdAt: true });

export type InsertReconciliationLog = z.infer<
  typeof insertReconciliationLogSchema
>;
export type ReconciliationLog = typeof reconciliationLogsTable.$inferSelect;
