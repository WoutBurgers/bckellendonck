interface Entry {
  failures: number
  lockedUntil: number
  lastFailure: number
}

interface FailureLimiterOptions {
  /** Failures allowed before a lockout starts. */
  freeAttempts: number
  /** First lockout; doubles with every further failure. */
  baseLockMs: number
  maxLockMs: number
  /** Failures are forgotten after this much quiet time. */
  resetAfterMs: number
  /** Failures across all clients within `globalWindowMs` that trigger a global lockout. */
  globalLimit: number
  globalWindowMs: number
  globalLockMs: number
}

/**
 * Brute-force protection with escalating per-client lockouts and a global circuit breaker,
 * so that spreading guesses over many IP addresses does not help either.
 */
export class FailureLimiter {
  private entries = new Map<string, Entry>()
  private globalFailures: number[] = []
  private globalLockedUntil = 0
  private opts: FailureLimiterOptions

  constructor(opts: FailureLimiterOptions) {
    this.opts = opts
    setInterval(() => this.sweep(), 10 * 60_000).unref()
  }

  /** Returns 0 when allowed, otherwise the number of seconds to wait. */
  retryAfter(key: string): number {
    const now = Date.now()
    const wait = Math.max(this.entries.get(key)?.lockedUntil ?? 0, this.globalLockedUntil) - now
    return wait > 0 ? Math.ceil(wait / 1000) : 0
  }

  fail(key: string) {
    const now = Date.now()
    const { freeAttempts, baseLockMs, maxLockMs, resetAfterMs } = this.opts
    let entry = this.entries.get(key)
    if (!entry || now - entry.lastFailure > resetAfterMs) entry = { failures: 0, lockedUntil: 0, lastFailure: now }
    entry.failures += 1
    entry.lastFailure = now
    if (entry.failures >= freeAttempts) {
      const lock = Math.min(baseLockMs * 2 ** (entry.failures - freeAttempts), maxLockMs)
      entry.lockedUntil = now + lock
    }
    this.entries.set(key, entry)

    this.globalFailures = this.globalFailures.filter((t) => now - t < this.opts.globalWindowMs)
    this.globalFailures.push(now)
    if (this.globalFailures.length >= this.opts.globalLimit) {
      this.globalLockedUntil = now + this.opts.globalLockMs
      this.globalFailures = []
    }
  }

  succeed(key: string) {
    this.entries.delete(key)
  }

  private sweep() {
    const now = Date.now()
    for (const [key, e] of this.entries) if (now - e.lastFailure > this.opts.resetAfterMs && e.lockedUntil < now) this.entries.delete(key)
  }
}

/** Simple fixed-window limiter for endpoints such as the absence form. */
export class WindowLimiter {
  private hits = new Map<string, number[]>()
  private limit: number
  private windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
    setInterval(() => this.hits.clear(), windowMs * 4).unref()
  }

  take(key: string): boolean {
    const now = Date.now()
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    if (recent.length >= this.limit) return false
    recent.push(now)
    this.hits.set(key, recent)
    return true
  }
}
