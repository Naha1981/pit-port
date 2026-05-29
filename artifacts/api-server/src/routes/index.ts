import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reconciliationRouter from "./reconciliation";
import auditLogRouter from "./audit-log";
import adminUsageRouter from "./admin-usage";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(reconciliationRouter);
router.use(auditLogRouter);
router.use(adminUsageRouter);
router.use(notificationsRouter);

export default router;
