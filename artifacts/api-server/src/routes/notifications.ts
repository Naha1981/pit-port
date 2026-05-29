import { Router, type IRouter, type Request, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notifications", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const rows = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json({ notifications: rows });
});

router.post("/notifications/mark-read", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.read, false));

  res.json({ ok: true });
});

export default router;
