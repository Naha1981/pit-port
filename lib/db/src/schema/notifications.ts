import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    metadata: text("metadata"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notif_read").on(table.read),
    index("idx_notif_created_at").on(table.createdAt),
  ],
);
