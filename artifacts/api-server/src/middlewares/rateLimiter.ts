import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { notify } from "../lib/notify";

/**
 * Per-user rate limiter for the reconcile endpoint.
 * Keyed by session ID (cookie) so each authenticated user gets their own bucket.
 * Falls back to IP if no session cookie is present.
 *
 * Limits: 10 reconciliations per hour per user.
 * Gemini 2.5 Flash costs ~$0.002–$0.01 per call; 10/hr caps daily spend to ~$0.48/user.
 */
export const reconcileRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use session cookie as key so limits are per-user, not per-IP
    const sid: string | undefined = req.cookies?.["sid"];
    return sid ?? ipKeyGenerator(req);
  },
  handler: (req, res) => {
    const user = (req as unknown as { user?: { id?: string; email?: string; firstName?: string; lastName?: string } }).user;
    notify({
      type: "RATE_LIMIT_HIT",
      message: `User ${user?.email ?? user?.id ?? "unknown"} hit the reconciliation rate limit (10/hr).`,
      metadata: {
        userId: user?.id ?? null,
        email: user?.email ?? null,
        name: user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : null,
      },
    });
    res.status(429).json({
      error: "Too many reconciliation requests. You may process up to 10 documents per hour. Please try again later.",
    });
  },
});

/**
 * Global rate limiter applied to all API routes.
 * Protects against brute-force and scraping (300 req / 15 min per IP).
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many requests. Please slow down.",
    });
  },
});
