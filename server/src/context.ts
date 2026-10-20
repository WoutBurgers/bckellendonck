import type { Request, Response, NextFunction, CookieOptions } from 'express'
import type { Config } from './config.ts'
import { ClubData } from './lib/clubData.ts'
import { DocumentStore } from './lib/documents.ts'
import { FailureLimiter, WindowLimiter } from './lib/rateLimit.ts'
import { SessionStore, type SessionKind } from './lib/sessions.ts'
import type { Storage } from './lib/storage.ts'

export const COOKIE = { admin: 'bck_admin', member: 'bck_leden' } as const

export function createContext(config: Config, storage: Storage) {
  const hour = 3_600_000
  return {
    config,
    storage,
    docs: new DocumentStore(storage),
    club: new ClubData(storage),
    sessions: new SessionStore({
      admin: { idle: config.adminSessionMs, max: config.adminSessionMaxMs },
      member: { idle: config.memberSessionMs, max: config.memberSessionMaxMs },
    }),
    limiters: {
      // 5 free attempts, then 30s, 60s, 2m ... up to 1 hour. Globally max 100 failures per hour.
      pin: new FailureLimiter({ freeAttempts: 5, baseLockMs: 30_000, maxLockMs: hour, resetAfterMs: 24 * hour, globalLimit: 100, globalWindowMs: hour, globalLockMs: 15 * 60_000 }),
      admin: new FailureLimiter({ freeAttempts: 5, baseLockMs: 30_000, maxLockMs: hour, resetAfterMs: 24 * hour, globalLimit: 50, globalWindowMs: hour, globalLockMs: 15 * 60_000 }),
      afmelden: new WindowLimiter(5, 10 * 60_000),
    },
  }
}

export type Context = ReturnType<typeof createContext>

export function cookieOptions(ctx: Context, kind: SessionKind): CookieOptions {
  const { cookieSameSite, secureCookies } = ctx.config
  return {
    httpOnly: true,
    secure: secureCookies,
    // The admin cookie is strict unless the site and API run on different domains.
    sameSite: cookieSameSite === 'none' ? 'none' : kind === 'admin' ? 'strict' : cookieSameSite,
    path: '/api',
  }
}

/** Middleware: only lets requests through with a valid session of the given kind. */
export function requireSession(ctx: Context, kind: SessionKind, ...alsoAccept: SessionKind[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const k of [kind, ...alsoAccept]) {
      const expiresAt = ctx.sessions.touch(req.cookies?.[COOKIE[k]], k)
      if (expiresAt) {
        res.locals.sessionExpiresAt = expiresAt
        return next()
      }
    }
    res.clearCookie(COOKIE[kind], cookieOptions(ctx, kind))
    res.status(401).json({ error: 'Niet ingelogd of de sessie is verlopen.', code: 'unauthorized' })
  }
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
