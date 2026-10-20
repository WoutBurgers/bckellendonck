import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { DOCUMENTS, UploadError, findDocument, validatePdf } from '../lib/documents.ts'
import {
  MemberFileError,
  buildMemberList,
  parseMemberFile,
  validateMemberList,
  type ParsedFile,
} from '../lib/memberFile.ts'
import { hashSecret, verifySecret } from '../lib/secrets.ts'
import { COOKIE, cookieOptions, delay, requireSession, type Context } from '../context.ts'
import { currentPinHash } from './members.ts'
import { displayName } from '../lib/documents.ts'

interface Draft {
  parsed: ParsedFile
  fileName: string
  createdAt: number
}

const DRAFT_TTL = 30 * 60_000

export function adminRoutes(ctx: Context) {
  const router = Router()
  const drafts = new Map<string, Draft>()

  /** Accepts a single file field "bestand" kept in memory, with a hard size cap. */
  function singleFile(maxBytes: number) {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1, fields: 5 } }).single('bestand')
    return (req: Request, res: Response, next: NextFunction) =>
      upload(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `Het bestand is te groot. Het maximum is ${Math.round(maxBytes / 1024 / 1024)} MB.` })
        }
        if (err) return res.status(400).json({ error: 'Het bestand kon niet worden ontvangen. Probeer het opnieuw.' })
        if (!req.file) return res.status(400).json({ error: 'Kies eerst een bestand.' })
        next()
      })
  }

  // ---- Login ----

  router.post('/login', async (req, res) => {
    const ip = req.ip ?? 'unknown'
    const wait = ctx.limiters.admin.retryAfter(ip)
    if (wait) {
      res.set('Retry-After', String(wait))
      return res.status(429).json({ error: `Te veel onjuiste pogingen. Probeer het over ${Math.ceil(wait / 60)} minuut/minuten opnieuw.`, retryAfter: wait })
    }
    if (!ctx.config.adminPasswordHash) {
      return res.status(503).json({ error: 'Er is nog geen beheerderswachtwoord ingesteld op de server.' })
    }
    const password = typeof req.body?.wachtwoord === 'string' ? req.body.wachtwoord : ''
    const ok = password.length > 0 && password.length <= 200 && (await verifySecret(password, ctx.config.adminPasswordHash))
    if (!ok) {
      ctx.limiters.admin.fail(ip)
      await delay(400)
      return res.status(401).json({ error: 'Het wachtwoord is onjuist.' })
    }
    ctx.limiters.admin.succeed(ip)
    ctx.sessions.destroy(req.cookies?.[COOKIE.admin])
    const { token, expiresAt } = ctx.sessions.create('admin')
    res.cookie(COOKIE.admin, token, cookieOptions(ctx, 'admin'))
    res.json({ ok: true, expiresAt })
  })

  router.post('/logout', (req, res) => {
    ctx.sessions.destroy(req.cookies?.[COOKIE.admin])
    res.clearCookie(COOKIE.admin, cookieOptions(ctx, 'admin'))
    res.json({ ok: true })
  })

  // Everything below requires an admin session.
  router.use(requireSession(ctx, 'admin'))

  router.get('/session', (_req, res) => {
    res.json({ authenticated: true, expiresAt: res.locals.sessionExpiresAt })
  })

  router.get('/overview', async (_req, res) => {
    const [index, members, history, settings, afmeldingen] = await Promise.all([
      ctx.docs.index(),
      ctx.club.members(),
      ctx.club.memberHistory(),
      ctx.club.settings(),
      ctx.club.afmeldingen(100),
    ])
    res.json({
      documents: DOCUMENTS.map((doc) => {
        const record = index[doc.slug]
        const current = record?.current
        return {
          slug: doc.slug,
          title: doc.title,
          group: doc.group,
          current: current
            ? {
                fileName: current.originalName,
                size: current.size,
                uploadedAt: current.uploadedAt,
                seeded: Boolean(current.seeded),
                url: `/api/documents/${doc.slug}?v=${current.id}`,
              }
            : null,
          previous: record?.history[0] ? { fileName: record.history[0].originalName, uploadedAt: record.history[0].uploadedAt } : null,
        }
      }),
      members: {
        count: members?.rows.length ?? 0,
        updatedAt: members?.updatedAt ?? null,
        fileName: members?.fileName ?? null,
        previousVersions: history.count,
        pinSet: Boolean(settings.membersPinHash || ctx.config.membersPinHash),
        pinUpdatedAt: settings.membersPinUpdatedAt ?? null,
      },
      afmeldingen: { count: afmeldingen.length, latest: afmeldingen[0]?.receivedAt ?? null },
      limits: { maxUploadMb: Math.round(ctx.config.maxUploadBytes / 1024 / 1024), maxMembersFileMb: Math.round(ctx.config.maxMembersFileBytes / 1024 / 1024) },
      expiresAt: res.locals.sessionExpiresAt,
    })
  })

  // ---- Documents ----

  router.post('/documents/:slug', singleFile(ctx.config.maxUploadBytes), async (req, res) => {
    const doc = findDocument(String(req.params.slug))
    if (!doc) return res.status(404).json({ error: 'Onbekend document.' })
    const file = req.file!
    try {
      validatePdf(file.buffer, ctx.config.maxUploadBytes)
      const version = await ctx.docs.publish(doc.slug, file.buffer, file.originalname)
      res.json({ ok: true, fileName: version.originalName, uploadedAt: version.uploadedAt })
    } catch (err) {
      if (err instanceof UploadError) return res.status(err.status).json({ error: err.message })
      throw err
    }
  })

  router.post('/documents/:slug/restore', async (req, res) => {
    const doc = findDocument(String(req.params.slug))
    if (!doc) return res.status(404).json({ error: 'Onbekend document.' })
    try {
      const restored = await ctx.docs.restorePrevious(doc.slug)
      if (!restored) return res.status(409).json({ error: 'Er is geen vorige versie om terug te zetten.' })
      res.json({ ok: true, fileName: restored.originalName })
    } catch (err) {
      if (err instanceof UploadError) return res.status(err.status).json({ error: err.message })
      throw err
    }
  })

  // ---- Members list ----

  router.get('/members', async (_req, res) => {
    const list = await ctx.club.members()
    const history = await ctx.club.memberHistory()
    res.json({
      columns: list?.columns ?? [{ key: 'naam', label: 'Naam', type: 'name' }],
      rows: list?.rows ?? [],
      updatedAt: list?.updatedAt ?? null,
      fileName: list?.fileName ?? null,
      history,
    })
  })

  router.post('/members/preview', singleFile(ctx.config.maxMembersFileBytes), async (req, res) => {
    const file = req.file!
    try {
      const parsed = await parseMemberFile(file.buffer, file.originalname)
      const now = Date.now()
      for (const [id, d] of drafts) if (now - d.createdAt > DRAFT_TTL) drafts.delete(id)
      if (drafts.size > 20) drafts.clear()
      const draftId = randomUUID()
      drafts.set(draftId, { parsed, fileName: displayName(file.originalname), createdAt: now })
      res.json({
        draftId,
        fileName: displayName(file.originalname),
        rowCount: parsed.rows.length,
        columns: parsed.columns.map((c) => ({
          index: c.index,
          label: c.label,
          type: c.type,
          recommended: c.recognised,
          sensitive: c.sensitive,
          examples: parsed.rows
            .map((r) => r.cells[c.index])
            .filter(Boolean)
            .slice(0, 3),
        })),
        rows: parsed.rows.slice(0, 8).map((r) => r.cells),
      })
    } catch (err) {
      if (err instanceof MemberFileError) return res.status(400).json({ error: err.message })
      throw err
    }
  })

  router.post('/members/publish', async (req, res) => {
    const { draftId, columns } = (req.body ?? {}) as { draftId?: unknown; columns?: unknown }
    const draft = typeof draftId === 'string' ? drafts.get(draftId) : undefined
    if (!draft || Date.now() - draft.createdAt > DRAFT_TTL) {
      return res.status(410).json({ error: 'Deze voorvertoning is verlopen. Kies het bestand opnieuw.' })
    }
    if (!Array.isArray(columns) || !columns.every((c) => Number.isInteger(c))) {
      return res.status(400).json({ error: 'Kies welke kolommen u wilt tonen.' })
    }
    const built = buildMemberList(draft.parsed, columns as number[])
    if (built.rows.length === 0) return res.status(400).json({ error: 'Er zijn geen leden met een naam gevonden.' })
    const saved = await ctx.club.saveMembers({ columns: built.columns, rows: built.rows, source: 'upload', fileName: draft.fileName })
    drafts.delete(draftId as string)
    res.json({ ok: true, count: saved.rows.length, skippedRows: built.skippedRows, updatedAt: saved.updatedAt })
  })

  router.put('/members', async (req, res) => {
    try {
      const list = validateMemberList(req.body)
      const current = await ctx.club.members()
      const saved = await ctx.club.saveMembers({ ...list, source: 'edit', fileName: current?.fileName })
      res.json({ ok: true, count: saved.rows.length, updatedAt: saved.updatedAt })
    } catch (err) {
      if (err instanceof MemberFileError) return res.status(400).json({ error: err.message })
      throw err
    }
  })

  router.post('/members/undo', async (_req, res) => {
    const restored = await ctx.club.restorePreviousMembers()
    if (!restored) return res.status(409).json({ error: 'Er is geen vorige versie om terug te zetten.' })
    res.json({ ok: true, count: restored.rows.length })
  })

  router.put('/members-pin', async (req, res) => {
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : ''
    if (!/^\d{6,12}$/.test(pin)) {
      return res.status(400).json({ error: 'De toegangscode moet uit 6 tot 12 cijfers bestaan.' })
    }
    if (/^(\d)\1+$/.test(pin) || '0123456789012'.includes(pin) || '9876543210987'.includes(pin)) {
      return res.status(400).json({ error: 'Deze code is te makkelijk te raden. Kies een andere combinatie van cijfers.' })
    }
    if (ctx.config.adminPasswordHash && (await verifySecret(pin, ctx.config.adminPasswordHash))) {
      return res.status(400).json({ error: 'Gebruik niet hetzelfde als het beheerderswachtwoord.' })
    }
    const existing = await currentPinHash(ctx)
    if (existing && (await verifySecret(pin, existing))) {
      return res.status(400).json({ error: 'Dit is al de huidige toegangscode.' })
    }
    await ctx.club.setMembersPinHash(await hashSecret(pin))
    // Everyone who knew the old code has to enter the new one.
    ctx.sessions.destroyAll('member')
    res.json({ ok: true })
  })

  // ---- Absence messages ----

  router.get('/afmeldingen', async (_req, res) => {
    const items = await ctx.club.afmeldingen(100)
    res.json({ items: items.map(({ id, namen, bericht, receivedAt }) => ({ id, namen, bericht, receivedAt })) })
  })

  router.delete('/afmeldingen/:id', async (req, res) => {
    const ok = await ctx.club.deleteAfmelding(String(req.params.id))
    if (!ok) return res.status(404).json({ error: 'Bericht niet gevonden.' })
    res.json({ ok: true })
  })

  return router
}
