import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reconciliationRouter from "./reconciliation";
import auditLogRouter from "./audit-log";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(reconciliationRouter);
router.use(auditLogRouter);

export default router;
