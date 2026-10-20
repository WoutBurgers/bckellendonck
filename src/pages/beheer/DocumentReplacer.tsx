import { useRef, useState } from 'react'
import { CircleAlert, CircleCheck, ExternalLink, FileText, Undo2 } from 'lucide-react'
import { Button, Notice } from '../../components/ui'
import { ApiError, apiUrl } from '../../lib/api'
import { formatDate, formatSize } from '../../lib/format'
import { FilePicker } from './parts'
import { useBeheer, type AdminDocument } from './useBeheer'

type Step = { kind: 'idle' } | { kind: 'choose'; file?: File; error?: string } | { kind: 'uploading'; file: File } | { kind: 'done'; fileName: string; undone?: boolean }

interface Props {
  doc: AdminDocument
  /** Where visitors find this document, for the "view on website" link. */
  publicPath: string
}

export function DocumentReplacer({ doc, publicPath }: Props) {
  const { call, refresh, overview } = useBeheer()
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [undoError, setUndoError] = useState('')
  const [undoing, setUndoing] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const maxMb = overview.limits.maxUploadMb

  function choose(file: File) {
    const looksPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!looksPdf) return setStep({ kind: 'choose', error: `"${file.name}" is geen PDF-bestand. Kies een bestand dat eindigt op .pdf.` })
    if (file.size === 0) return setStep({ kind: 'choose', error: 'Het gekozen bestand is leeg.' })
    if (file.size > maxMb * 1024 * 1024) {
      return setStep({ kind: 'choose', error: `Het bestand is te groot (${formatSize(file.size)}). Het maximum is ${maxMb} MB.` })
    }
    setStep({ kind: 'choose', file })
  }

  async function publish(file: File) {
    setStep({ kind: 'uploading', file })
    const form = new FormData()
    form.append('bestand', file)
    try {
      const res = await call<{ fileName: string }>(`/api/admin/documents/${doc.slug}`, { method: 'POST', form })
      setStep({ kind: 'done', fileName: res.fileName })
      await refresh()
    } catch (err) {
      setStep({ kind: 'choose', file, error: err instanceof ApiError ? err.message : 'Uploaden is niet gelukt. Probeer het opnieuw.' })
    }
    headingRef.current?.focus()
  }

  async function undo() {
    if (!window.confirm('Weet u zeker dat u de vorige versie wilt terugzetten?')) return
    setUndoing(true)
    setUndoError('')
    try {
      await call(`/api/admin/documents/${doc.slug}/restore`, { method: 'POST' })
      await refresh()
      setStep((s) => (s.kind === 'done' ? { ...s, undone: true } : { kind: 'idle' }))
    } catch (err) {
      setUndoError(err instanceof ApiError ? err.message : 'Terugzetten is niet gelukt.')
    } finally {
      setUndoing(false)
    }
  }

  const current = doc.current

  return (
    <section aria-labelledby={`${doc.slug}-titel`} className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <h2 id={`${doc.slug}-titel`} ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
        {doc.title}
      </h2>

      <div className="mt-4 flex flex-col gap-4 rounded-lg bg-cream-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        {current ? (
          <div className="flex min-w-0 items-start gap-3">
            <FileText aria-hidden="true" className="mt-1 size-6 shrink-0 text-card-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">Nu op de website</p>
              <p className="text-lg font-semibold break-words text-navy-900">{current.fileName}</p>
              <p className="text-muted">
                {formatSize(current.size)} · {current.seeded ? 'overgenomen van de oude website' : `geplaatst op ${formatDate(current.uploadedAt)}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-lg font-semibold text-navy-900">Er staat nog geen bestand op de website.</p>
        )}
        {current && (
          <a href={apiUrl(current.url)} target="_blank" rel="noopener" className="link inline-flex min-h-11 shrink-0 items-center gap-2">
            <ExternalLink aria-hidden="true" className="size-4" />
            Huidige PDF bekijken
          </a>
        )}
      </div>

      {step.kind === 'done' && (
        <Notice tone="success" role="status" className="mt-5" icon={<CircleCheck aria-hidden="true" className="size-5" />} title={step.undone ? 'De vorige versie staat weer op de website.' : 'Gelukt! Het nieuwe bestand staat nu op de website.'}>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <a href={publicPath} target="_blank" rel="noopener" className="link inline-flex items-center gap-2">
              <ExternalLink aria-hidden="true" className="size-4" />
              Bekijk op de website
            </a>
            {!step.undone && doc.previous && (
              <button type="button" onClick={undo} disabled={undoing} className="link inline-flex items-center gap-2">
                <Undo2 aria-hidden="true" className="size-4" />
                Ongedaan maken
              </button>
            )}
          </div>
        </Notice>
      )}
      {undoError && (
        <Notice tone="error" role="alert" className="mt-5">
          {undoError}
        </Notice>
      )}

      {(step.kind === 'idle' || step.kind === 'done') && (
        <Button size="lg" className="mt-6" onClick={() => setStep({ kind: 'choose' })}>
          {current ? 'PDF vervangen' : 'PDF plaatsen'}
        </Button>
      )}

      {(step.kind === 'choose' || step.kind === 'uploading') && (
        <div className="mt-6 space-y-5 border-t border-cream-200 pt-6">
          {step.kind === 'choose' && !step.file && (
            <FilePicker accept="application/pdf,.pdf" label="Klik hier om een PDF-bestand te kiezen" hint={`Of sleep het bestand hierheen. Maximaal ${maxMb} MB.`} onFile={choose} />
          )}

          {step.file && (
            <div className="rounded-lg border border-navy-200 bg-navy-50 p-4">
              <p className="text-sm font-semibold text-muted">Gekozen bestand</p>
              <p className="text-lg font-semibold break-words text-navy-900">{step.file.name}</p>
              <p className="text-muted">{formatSize(step.file.size)}</p>
            </div>
          )}

          {step.kind === 'choose' && step.error && (
            <Notice tone="error" role="alert" icon={<CircleAlert aria-hidden="true" className="size-5" />}>
              {step.error}
            </Notice>
          )}

          {step.kind === 'choose' && step.file && (
            <p className="text-lg">
              Wilt u dit bestand op de website zetten als <strong>{doc.title}</strong>? Het huidige bestand wordt dan
              vervangen.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {step.file && (
              <Button size="lg" loading={step.kind === 'uploading'} onClick={() => step.file && publish(step.file)}>
                {step.kind === 'uploading' ? 'Bezig met uploaden…' : 'Ja, publiceren'}
              </Button>
            )}
            {step.kind === 'choose' && step.file && (
              <Button variant="secondary" size="lg" onClick={() => setStep({ kind: 'choose' })}>
                Ander bestand kiezen
              </Button>
            )}
            {step.kind === 'choose' && (
              <Button variant="ghost" size="lg" onClick={() => setStep({ kind: 'idle' })}>
                Annuleren
              </Button>
            )}
          </div>
        </div>
      )}

      {step.kind === 'idle' && doc.previous && (
        <p className="mt-4 text-muted">
          Per ongeluk het verkeerde bestand geplaatst?{' '}
          <button type="button" onClick={undo} disabled={undoing} className="link">
            Zet de vorige versie terug
          </button>{' '}
          ({doc.previous.fileName}).
        </p>
      )}
    </section>
  )
}
