import { Router } from 'express'
import { verifySecret } from '../lib/secrets.ts'
import { COOKIE, cookieOptions, delay, requireSession, type Context } from '../context.ts'

export async function currentPinHash(ctx: Context) {
  return (await ctx.club.settings()).membersPinHash || ctx.config.membersPinHash
}

export function memberRoutes(ctx: Context) {
  const router = Router()

  router.post('/auth', async (req, res) => {
    const ip = req.ip ?? 'unknown'
    const wait = ctx.limiters.pin.retryAfter(ip)
    if (wait) {
      res.set('Retry-After', String(wait))
      return res.status(429).json({ error: 'Te veel onjuiste pogingen. Wacht even en probeer het dan opnieuw.', retryAfter: wait })
    }

    const hash = await currentPinHash(ctx)
    if (!hash) return res.status(503).json({ error: 'De toegangscode is nog niet ingesteld. Neem contact op met het bestuur.' })

    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : ''
    const ok = /^\d{4,12}$/.test(pin) && (await verifySecret(pin, hash))
    if (!ok) {
      ctx.limiters.pin.fail(ip)
      await delay(400)
      return res.status(401).json({ error: 'De toegangscode is onjuist.', code: 'wrong_pin' })
    }

    ctx.limiters.pin.succeed(ip)
    ctx.sessions.destroy(req.cookies?.[COOKIE.member])
    const { token, expiresAt } = ctx.sessions.create('member')
    res.cookie(COOKIE.member, token, cookieOptions(ctx, 'member'))
    res.json({ ok: true, expiresAt })
  })

  router.get('/', requireSession(ctx, 'member'), async (_req, res) => {
    const list = await ctx.club.members()
    res.json({
      columns: list?.columns ?? [{ key: 'naam', label: 'Naam', type: 'name' }],
      rows: list?.rows ?? [],
      updatedAt: list?.updatedAt ?? null,
      expiresAt: res.locals.sessionExpiresAt,
      expiresIn: res.locals.sessionExpiresAt - Date.now(),
    })
  })

  router.post('/logout', (req, res) => {
    ctx.sessions.destroy(req.cookies?.[COOKIE.member])
    res.clearCookie(COOKIE.member, cookieOptions(ctx, 'member'))
    res.json({ ok: true })
  })

  return router
}
