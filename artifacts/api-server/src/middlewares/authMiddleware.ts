import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

// Deduplicate concurrent token refreshes for the same session to avoid
// burning through single-use refresh tokens under concurrent requests.
const refreshInProgress = new Map<string, Promise<SessionData | null>>();

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;
  if (!session.refresh_token) return null;

  const existing = refreshInProgress.get(sid);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const config = await getOidcConfig();
      const tokens = await oidc.refreshTokenGrant(config, session.refresh_token!);
      session.access_token = tokens.access_token;
      session.refresh_token = tokens.refresh_token ?? session.refresh_token;
      session.expires_at = tokens.expiresIn()
        ? now + tokens.expiresIn()!
        : session.expires_at;
      await updateSession(sid, session);
      return session;
    } catch {
      return null;
    } finally {
      refreshInProgress.delete(sid);
    }
  })();

  refreshInProgress.set(sid, promise);
  return promise;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  req.user = refreshed.user;
  next();
}
