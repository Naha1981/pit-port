import { Router, type IRouter, type Request, type Response } from "express";
import { db, reconciliationLogsTable, usersTable } from "@workspace/db";
import { eq, desc, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/usage", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [perUser, daily, totals] = await Promise.all([
    // Per-user reconciliation stats
    db
      .select({
        userId: reconciliationLogsTable.createdBy,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        profileImageUrl: usersTable.profileImageUrl,
        total: sql<number>`COUNT(*)::int`,
        last7Days: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.createdAt} >= NOW() - INTERVAL '7 days' THEN 1 END)::int`,
        lastHour: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.createdAt} >= NOW() - INTERVAL '1 hour' THEN 1 END)::int`,
        reconciled: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.status} = 'RECONCILED' THEN 1 END)::int`,
        warnings: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.status} LIKE 'WARNING%' THEN 1 END)::int`,
        critical: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.status} LIKE 'CRITICAL%' THEN 1 END)::int`,
      })
      .from(reconciliationLogsTable)
      .leftJoin(usersTable, eq(reconciliationLogsTable.createdBy, usersTable.id))
      .groupBy(
        reconciliationLogsTable.createdBy,
        usersTable.firstName,
        usersTable.lastName,
        usersTable.email,
        usersTable.profileImageUrl,
      )
      .orderBy(desc(sql`COUNT(*)`)),

    // Daily volume breakdown for last 14 days
    db
      .select({
        date: sql<string>`DATE(${reconciliationLogsTable.createdAt})::text`,
        total: sql<number>`COUNT(*)::int`,
        reconciled: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.status} = 'RECONCILED' THEN 1 END)::int`,
        warnings: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.status} LIKE 'WARNING%' THEN 1 END)::int`,
        critical: sql<number>`COUNT(CASE WHEN ${reconciliationLogsTable.status} LIKE 'CRITICAL%' THEN 1 END)::int`,
      })
      .from(reconciliationLogsTable)
      .where(gte(reconciliationLogsTable.createdAt, fourteenDaysAgo))
      .groupBy(sql`DATE(${reconciliationLogsTable.createdAt})`)
      .orderBy(sql`DATE(${reconciliationLogsTable.createdAt})`),

    // Overall totals
    db
      .select({
        total: sql<number>`COUNT(*)::int`,
        totalUsers: sql<number>`COUNT(DISTINCT ${reconciliationLogsTable.createdBy})::int`,
        avgVariance: sql<number | null>`ROUND(AVG(${reconciliationLogsTable.variance})::numeric, 2)`,
        today: sql<number>`COUNT(CASE WHEN DATE(${reconciliationLogsTable.createdAt}) = CURRENT_DATE THEN 1 END)::int`,
      })
      .from(reconciliationLogsTable),
  ]);

  res.json({
    totals: totals[0] ?? { total: 0, totalUsers: 0, avgVariance: null, today: 0 },
    perUser,
    daily,
    rateLimitCap: 10,
  });
});

export default router;
