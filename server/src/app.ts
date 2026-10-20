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
  app.use(helmet({ crossOriginResourcePolicy: { policy: config.corsOrigins.length ? 'cross-origin' : 'same-origin' } }))

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
