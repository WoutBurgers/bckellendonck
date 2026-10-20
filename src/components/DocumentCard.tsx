import { Download, FileClock, FileText, RefreshCw } from 'lucide-react'
import type { DocumentInfo } from '../data/documents'
import type { PublishedDocument } from '../hooks/useDocuments'
import { apiUrl } from '../lib/api'
import { cn, formatDate, formatSize } from '../lib/format'
import { buttonClasses } from './ui'

interface DocumentCardProps {
  info: DocumentInfo
  /** undefined while loading */
  published?: PublishedDocument
  failed?: boolean
  onRetry?: () => void
  headingLevel?: 'h2' | 'h3'
}

export function DocumentCard({ info, published, failed, onRetry, headingLevel: H = 'h3' }: DocumentCardProps) {
  const loading = !published && !failed
  const available = Boolean(published?.available && published.url)
  const href = published?.url ? apiUrl(published.url) : undefined

  return (
    <article className="flex h-full flex-col rounded-xl border border-cream-300 bg-white p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-lg',
            available ? 'bg-card-50 text-card-600' : 'bg-cream-100 text-muted',
          )}
        >
          {available || loading ? <FileText aria-hidden="true" className="size-6" /> : <FileClock aria-hidden="true" className="size-6" />}
        </span>
        <div className="min-w-0">
          <H className="text-xl font-semibold">{info.title}</H>
          {published?.updatedAt && <p className="mt-0.5 text-sm text-muted">Bijgewerkt op {formatDate(published.updatedAt)}</p>}
        </div>
      </div>

      <div className="mt-4 flex-1">
        {loading && <div className="h-5 w-3/4 animate-pulse rounded bg-cream-200" aria-hidden="true" />}
        {failed && <p className="text-muted">Het document kon nu niet worden geladen.</p>}
        {published && (available ? <p className="text-muted">{info.description}</p> : <p className="text-muted">{info.emptyText}</p>)}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {loading && <span className="sr-only">Bezig met laden…</span>}
        {failed && onRetry && (
          <button type="button" onClick={onRetry} className={buttonClasses('secondary')}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Opnieuw proberen
          </button>
        )}
        {available && href && (
          <>
            <a href={href} target="_blank" rel="noopener" className={buttonClasses('primary', 'flex-1 sm:flex-none')}>
              <FileText aria-hidden="true" className="size-5" />
              Open PDF<span className="sr-only">: {info.title} (opent in nieuw tabblad)</span>
            </a>
            <a href={`${href}&download=1`} className={buttonClasses('secondary', 'flex-1 sm:flex-none')}>
              <Download aria-hidden="true" className="size-5" />
              Download<span className="sr-only">: {info.title}</span>
              {published?.size ? <span className="font-normal text-muted">({formatSize(published.size)})</span> : null}
            </a>
          </>
        )}
      </div>
    </article>
  )
}
