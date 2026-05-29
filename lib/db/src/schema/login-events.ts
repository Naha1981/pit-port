import { pgTable, serial, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const loginEventsTable = pgTable("login_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoginEvent = typeof loginEventsTable.$inferSelect;
