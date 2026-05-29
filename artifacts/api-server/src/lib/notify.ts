import nodemailer from "nodemailer";
import { db, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

export type NotificationType = "CRITICAL_RECONCILIATION" | "RATE_LIMIT_HIT";

interface NotifyOptions {
  type: NotificationType;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an in-app notification in the DB and, if SMTP is configured,
 * sends an email to all addresses in ADMIN_EMAILS.
 *
 * Fire-and-forget: never throws, all errors are logged.
 */
export function notify(opts: NotifyOptions): void {
  createNotification(opts).catch((err) => {
    logger.error({ err }, "notify: failed to create notification");
  });
}

async function createNotification(opts: NotifyOptions): Promise<void> {
  const { type, message, metadata } = opts;

  // Persist to DB
  await db.insert(notificationsTable).values({
    type,
    message,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  // Send email if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!smtpHost || adminEmails.length === 0) return;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  const subject =
    type === "CRITICAL_RECONCILIATION"
      ? "⚠️ Pit-to-Port: Critical reconciliation variance detected"
      : "🚦 Pit-to-Port: User hit rate limit";

  const metaHtml = metadata
    ? `<pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px">${JSON.stringify(metadata, null, 2)}</pre>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:560px">
      <h2 style="color:#dc2626">${subject}</h2>
      <p style="font-size:15px;color:#333">${message}</p>
      ${metaHtml}
      <p style="font-size:12px;color:#888;margin-top:24px">
        Pit-to-Port Command — automated alert
      </p>
    </div>
  `.trim();

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "alerts@pit-to-port",
      to: adminEmails.join(", "),
      subject,
      html,
    });
    logger.info({ type, recipients: adminEmails.length }, "notify: email sent");
  } catch (err) {
    logger.error({ err }, "notify: email send failed — check SMTP config");
  }
}
