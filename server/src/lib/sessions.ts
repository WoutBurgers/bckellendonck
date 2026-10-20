import { randomToken } from './secrets.ts'

export type SessionKind = 'admin' | 'member'

interface Session {
  kind: SessionKind
  expiresAt: number
  absoluteExpiresAt: number
}

/**
 * In-memory sessions. They are deliberately short-lived; after a server restart
 * everybody simply signs in again. Published content never lives here.
 */
export class SessionStore {
  private sessions = new Map<string, Session>()
  private ttl: Record<SessionKind, { idle: number; max: number }>

  constructor(ttl: Record<SessionKind, { idle: number; max: number }>) {
    this.ttl = ttl
    setInterval(() => this.sweep(), 60_000).unref()
  }

  create(kind: SessionKind) {
    const token = randomToken()
    const now = Date.now()
    const { idle, max } = this.ttl[kind]
    const session = { kind, expiresAt: now + idle, absoluteExpiresAt: now + max }
    this.sessions.set(token, session)
    return { token, expiresAt: session.expiresAt }
  }

  /** Validates a token and slides its idle expiry. Returns the new expiry or null. */
  touch(token: string | undefined, kind: SessionKind): number | null {
    if (!token) return null
    const session = this.sessions.get(token)
    const now = Date.now()
    if (!session || session.kind !== kind) return null
    if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
      this.sessions.delete(token)
      return null
    }
    session.expiresAt = Math.min(now + this.ttl[kind].idle, session.absoluteExpiresAt)
    return session.expiresAt
  }

  destroy(token: string | undefined) {
    if (token) this.sessions.delete(token)
  }

  destroyAll(kind: SessionKind) {
    for (const [token, session] of this.sessions) if (session.kind === kind) this.sessions.delete(token)
  }

  private sweep() {
    const now = Date.now()
    for (const [token, s] of this.sessions) if (s.expiresAt <= now || s.absoluteExpiresAt <= now) this.sessions.delete(token)
  }
}
