import { Router, type IRouter, type Request, type Response } from "express";
import { db, loginEventsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/audit-log", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required to view the audit log." });
    return;
  }

  const events = await db
    .select({
      id: loginEventsTable.id,
      userId: loginEventsTable.userId,
      ip: loginEventsTable.ip,
      userAgent: loginEventsTable.userAgent,
      createdAt: loginEventsTable.createdAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(loginEventsTable)
    .leftJoin(usersTable, eq(loginEventsTable.userId, usersTable.id))
    .orderBy(desc(loginEventsTable.createdAt))
    .limit(500);

  res.json({ events });
});

export default router;
