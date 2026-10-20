export type SameSite = 'strict' | 'lax' | 'none'

export interface Config {
  production: boolean
  port: number
  /** Number of proxies in front of the app (Railway = 1, Netlify proxy + Railway = 2). */
  trustProxy: number
  adminPasswordHash: string
  /** Optional initial members PIN; a PIN set in the dashboard takes precedence. */
  membersPinHash: string
  storage:
    | { driver: 'local'; dataDir: string }
    | {
        driver: 's3'
        bucket: string
        region: string
        endpoint?: string
        accessKeyId: string
        secretAccessKey: string
        forcePathStyle: boolean
      }
  maxUploadBytes: number
  maxMembersFileBytes: number
  corsOrigins: string[]
  cookieSameSite: SameSite
  secureCookies: boolean
  adminSessionMs: number
  adminSessionMaxMs: number
  memberSessionMs: number
  memberSessionMaxMs: number
  resend?: { apiKey: string; from: string; to: string[] }
}

function num(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} moet een positief getal zijn`)
  return value
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Omgevingsvariabele ${name} ontbreekt`)
  return value
}

export function loadConfig(): Config {
  const production = process.env.NODE_ENV === 'production'
  const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase()
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase() as SameSite
  if (!['strict', 'lax', 'none'].includes(sameSite)) throw new Error('COOKIE_SAMESITE moet strict, lax of none zijn')

  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || ''
  if (production && !adminPasswordHash) throw new Error('ADMIN_PASSWORD_HASH ontbreekt (zie README: npm run hash-secret)')

  const resendKey = process.env.RESEND_API_KEY?.trim()
  const minutes = 60_000

  return {
    production,
    port: num('PORT', 3001),
    trustProxy: Number(process.env.TRUST_PROXY ?? 1),
    adminPasswordHash,
    membersPinHash: process.env.MEMBERS_PIN_HASH?.trim() || '',
    storage:
      driver === 's3'
        ? {
            driver: 's3',
            bucket: required('S3_BUCKET'),
            region: process.env.S3_REGION || 'auto',
            endpoint: process.env.S3_ENDPOINT || undefined,
            accessKeyId: required('S3_ACCESS_KEY_ID'),
            secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
          }
        : { driver: 'local', dataDir: process.env.DATA_DIR || './data' },
    maxUploadBytes: num('MAX_UPLOAD_MB', 15) * 1024 * 1024,
    maxMembersFileBytes: num('MAX_MEMBERS_FILE_MB', 2) * 1024 * 1024,
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    cookieSameSite: sameSite,
    secureCookies: production || sameSite === 'none',
    adminSessionMs: num('ADMIN_SESSION_MINUTES', 60) * minutes,
    adminSessionMaxMs: num('ADMIN_SESSION_MAX_HOURS', 12) * 60 * minutes,
    memberSessionMs: num('MEMBER_SESSION_MINUTES', 30) * minutes,
    memberSessionMaxMs: num('MEMBER_SESSION_MAX_HOURS', 8) * 60 * minutes,
    resend:
      resendKey && process.env.AFMELDEN_EMAIL_TO
        ? {
            apiKey: resendKey,
            from: process.env.AFMELDEN_EMAIL_FROM || 'BC Kellendonck <onboarding@resend.dev>',
            to: process.env.AFMELDEN_EMAIL_TO.split(',').map((s) => s.trim()).filter(Boolean),
          }
        : undefined,
  }
}
