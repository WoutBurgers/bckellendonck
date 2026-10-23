import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import type { Config } from './config.ts'
import type { Storage } from './lib/storage.ts'
import { createContext } from './context.ts'
import { adminRoutes } from './routes/admin.ts'
import { memberRoutes } from './routes/members.ts'
import { publicRoutes } from './routes/public.ts'

/** Header every state-changing request must carry. Cross-site forms cannot set it (CSRF protection). */
export const CSRF_HEADER = 'x-bck-request'

export function createApp(config: Config, storage: Storage) {
  const ctx = createContext(config, storage)
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: config.corsOrigins.length ? 'cross-origin' : 'same-origin' },
      // The website loads its fonts from Google Fonts; allowed by Helmet's default style-src/font-src.
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.production ? [] : null } },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )

  if (config.corsOrigins.length) {
    app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
        allowedHeaders: ['Content-Type', CSRF_HEADER],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        maxAge: 600,
      }),
    )
  }

  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get(CSRF_HEADER) !== '1') {
      return res.status(403).json({ error: 'Ongeldige aanvraag.' })
    }
    next()
  })

  // Confidential responses must never be stored by browsers or shared caches.
  app.use(['/api/admin', '/api/members'], (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' })
    next()
  })

  app.use('/api', publicRoutes(ctx))
  app.use('/api/members', memberRoutes(ctx))
  app.use('/api/admin', adminRoutes(ctx))

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Niet gevonden.' })
  })

  // The built website (dist/), served by the same service so the site and API share one domain.
  if (config.staticDir && existsSync(join(config.staticDir, 'index.html'))) {
    const indexFile = join(config.staticDir, 'index.html')
    app.use(
      express.static(config.staticDir, {
        index: false,
        setHeaders(res, path) {
          if (/[\\/]assets[\\/]/.test(path)) res.set('Cache-Control', 'public, max-age=604800')
        },
      }),
    )
    // Every other GET goes to index.html for client-side routing.
    app.get('/{*splat}', (_req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(indexFile)
    })
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number }).status
    if (status === 400 && (err as { type?: string }).type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Ongeldige aanvraag.' })
    }
    if (status === 413) return res.status(413).json({ error: 'De aanvraag is te groot.' })
    // Log the error type and message only: request bodies may contain personal data.
    console.error('Serverfout:', err instanceof Error ? `${err.name}: ${err.message}` : 'onbekend')
    res.status(500).json({ error: 'Er ging iets mis op de server. Probeer het later opnieuw.' })
  })

  return { app, ctx }
}
