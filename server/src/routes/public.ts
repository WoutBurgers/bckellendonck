import { pipeline } from 'node:stream/promises'
import { Router } from 'express'
import { DOCUMENTS, findDocument } from '../lib/documents.ts'
import { cleanCell } from '../lib/memberFile.ts'
import type { Context } from '../context.ts'

/** Optional e-mail notification; the message is already saved, so a mail failure is only logged. */
async function notifyAfmelding(ctx: Context, namen: string, bericht: string) {
  const mail = ctx.config.resend
  if (!mail) return
  try {
    const to = (await ctx.club.settings()).afmeldenEmails ?? mail.to
    if (to.length === 0) return
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mail.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: mail.from,
        to,
        subject: `Afmelding: ${namen}`,
        text: `Afmelding via de website van BC Kellendonck\n\nNamen: ${namen}\n\nBericht:\n${bericht}`,
      }),
    })
    if (!r.ok) console.error(`Afmelding-e-mail mislukt (status ${r.status})`)
  } catch {
    console.error('Afmelding-e-mail mislukt (netwerkfout)')
  }
}

export function publicRoutes(ctx: Context) {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  router.get('/documents', async (_req, res) => {
    const index = await ctx.docs.index()
    res.set('Cache-Control', 'no-cache')
    res.json({
      documents: DOCUMENTS.map((doc) => {
        const current = index[doc.slug]?.current
        return {
          slug: doc.slug,
          title: doc.title,
          group: doc.group,
          available: Boolean(current),
          updatedAt: current && !current.seeded ? current.uploadedAt : null,
          size: current?.size ?? null,
          url: current ? `/api/documents/${doc.slug}?v=${current.id}` : null,
        }
      }),
    })
  })

  router.get('/documents/:slug', async (req, res) => {
    const doc = findDocument(req.params.slug)
    if (!doc) return res.status(404).json({ error: 'Document niet gevonden.' })
    const current = await ctx.docs.current(doc.slug)
    if (!current) return res.status(404).json({ error: 'Dit document is nog niet beschikbaar.' })

    const disposition = req.query.download === '1' ? 'attachment' : 'inline'
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${doc.slug}.pdf"`,
      // Versioned URLs never change content; the bare URL always revalidates.
      'Cache-Control': req.query.v === current.id ? 'public, max-age=31536000, immutable' : 'no-cache',
      ETag: `"${current.id}"`,
    })
    // The browser already has this version: no need to open the file at all.
    if (req.fresh) return res.status(304).end()

    const file = await ctx.docs.read(current)
    if (!file) {
      res.removeHeader('Cache-Control')
      return res.status(404).json({ error: 'Dit document is nog niet beschikbaar.' })
    }
    res.set('Content-Length', String(file.size))
    if (req.method === 'HEAD') {
      file.body.destroy()
      return res.end()
    }

    // Stream in small chunks instead of loading the whole PDF into memory.
    try {
      await pipeline(file.body, res)
    } catch (err) {
      // A visitor closing the tab mid-download is normal; anything else is worth a log line.
      if ((err as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error('Fout bij versturen document:', (err as Error).message)
      }
      if (!res.headersSent) res.status(500).json({ error: 'Het document kon niet worden geladen.' })
      else res.destroy()
    }
  })

  router.post('/afmeldingen', async (req, res) => {
    const ip = req.ip ?? 'unknown'
    const { namen, bericht, website } = (req.body ?? {}) as Record<string, unknown>
    // Honeypot filled in: pretend nothing happened, but store nothing.
    if (typeof website === 'string' && website.trim()) return res.status(400).json({ error: 'Ongeldige aanvraag.' })

    const cleanNamen = cleanCell(namen).slice(0, 150)
    const cleanBericht = String(bericht ?? '')
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 2000)
    if (!cleanNamen || !cleanBericht) return res.status(400).json({ error: 'Vul je naam en een bericht in.' })
    if (!ctx.limiters.afmelden.take(ip)) {
      return res.status(429).json({ error: 'Je hebt al een paar berichten verstuurd. Probeer het over tien minuten opnieuw.' })
    }

    await ctx.club.addAfmelding(cleanNamen, cleanBericht)
    void notifyAfmelding(ctx, cleanNamen, cleanBericht)
    res.status(201).json({ ok: true })
  })

  return router
}
