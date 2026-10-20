import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CircleAlert, KeyRound, Lock, LogOut, Mail, Phone, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { Field, describedBy, inputClasses } from '../components/forms'
import { Button, Container, Notice, Spinner } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { ApiError, api } from '../lib/api'
import { formatDate, isEmail, isPhone, telHref } from '../lib/format'

interface Column {
  key: string
  label: string
  type: 'name' | 'phone' | 'email' | 'text'
}

interface MemberData {
  columns: Column[]
  rows: Record<string, string>[]
  updatedAt: string | null
  /** Milliseconds until the server-side session ends. */
  expiresIn: number
}

type View = { kind: 'checking' } | { kind: 'locked'; notice?: string } | { kind: 'open'; data: MemberData }

export default function Ledenlijst() {
  usePageMeta('Ledenlijst', 'De ledenlijst van BC Kellendonck is alleen toegankelijk voor leden, met een toegangscode.')
  const [view, setView] = useState<View>({ kind: 'checking' })

  const load = useCallback(async (onLocked?: string) => {
    try {
      const data = await api<MemberData>('/api/members')
      setView({ kind: 'open', data })
    } catch (err) {
      setView({ kind: 'locked', notice: err instanceof ApiError && err.status === 401 ? onLocked : 'De ledenlijst kon niet worden geladen. Probeer het later opnieuw.' })
    }
  }, [])

  // A still-valid session (e.g. after a page reload) opens the list directly.
  useEffect(() => {
    void load()
  }, [load])

  // Hide the list as soon as the server-side session expires.
  useEffect(() => {
    if (view.kind !== 'open') return
    const ms = view.data.expiresIn
    const timer = window.setTimeout(() => setView({ kind: 'locked', notice: 'Je sessie is verlopen. Vul de toegangscode opnieuw in.' }), Math.max(0, ms))
    return () => window.clearTimeout(timer)
  }, [view])

  async function close() {
    setView({ kind: 'locked', notice: 'De ledenlijst is gesloten.' })
    await api('/api/members/logout', { method: 'POST' }).catch(() => undefined)
  }

  return (
    <>
      <PageHeader
        title="Ledenlijst BC Kellendonck"
        suit="club"
        narrow={view.kind !== 'open'}
        intro={view.kind === 'open' ? 'Deze gegevens zijn alleen bedoeld voor leden van de club. Deel ze niet met anderen.' : undefined}
      />
      <Container narrow={view.kind !== 'open'} className="py-10 sm:py-14">
        {view.kind === 'checking' && <Spinner />}
        {view.kind === 'locked' && <PinForm notice={view.notice} onSuccess={() => load('Er ging iets mis. Probeer het opnieuw.')} />}
        {view.kind === 'open' && <MemberList data={view.data} onClose={close} />}
      </Container>
    </>
  )
}

function PinForm({ notice, onSuccess }: { notice?: string; onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const value = pin.trim()
    if (!/^\d+$/.test(value)) {
      setError(value ? 'De toegangscode bestaat alleen uit cijfers.' : 'Vul de toegangscode in.')
      return inputRef.current?.focus()
    }
    setBusy(true)
    setError('')
    try {
      await api('/api/members/auth', { method: 'POST', json: { pin: value } })
      setPin('')
      onSuccess()
    } catch (err) {
      setPin('')
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis. Probeer het opnieuw.')
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
        <Lock aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 text-2xl font-semibold">Alleen voor leden</h2>
      <p className="mt-2 text-lg">
        Deze pagina is alleen toegankelijk voor leden van BC Kellendonck. Vul de toegangscode in om de ledenlijst te
        bekijken.
      </p>
      {notice && (
        <Notice tone="info" role="status" className="mt-5">
          {notice}
        </Notice>
      )}
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <Field id="toegangscode" label="Toegangscode" error={error}>
          <input
            ref={inputRef}
            id="toegangscode"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={12}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''))
              if (error) setError('')
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy('toegangscode', { error: Boolean(error) })}
            className={inputClasses(Boolean(error), 'min-h-14 max-w-xs text-2xl tracking-[0.3em]')}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          {!busy && <KeyRound aria-hidden="true" className="size-5" />}
          {busy ? 'Bezig met controleren…' : 'Ledenlijst openen'}
        </Button>
      </form>
      <p className="mt-6 text-muted">
        Ben je lid en weet je de code niet? Vraag het aan het{' '}
        <Link to="/informatie#bestuur" className="link">
          bestuur
        </Link>
        .
      </p>
    </div>
  )
}

function Value({ column, value }: { column: Column; value: string }) {
  if (column.type === 'phone' && isPhone(value)) {
    return (
      <a href={telHref(value)} className="link inline-flex items-center gap-2 font-normal">
        <Phone aria-hidden="true" className="size-4 shrink-0" />
        {value}
      </a>
    )
  }
  if (column.type === 'email' && isEmail(value)) {
    return (
      <a href={`mailto:${value}`} className="link inline-flex items-center gap-2 font-normal break-all">
        <Mail aria-hidden="true" className="size-4 shrink-0" />
        {value}
      </a>
    )
  }
  return <span>{value}</span>
}

function MemberList({ data, onClose }: { data: MemberData; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const extra = data.columns.filter((c) => c.key !== 'naam')
  const rows = useMemo(() => {
    const sorted = [...data.rows].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
    const q = query.trim().toLowerCase()
    return q ? sorted.filter((r) => r.naam.toLowerCase().includes(q)) : sorted
  }, [data.rows, query])

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-xl border border-cream-300 bg-white p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="flex-1">
          <label htmlFor="zoek-lid" className="block font-semibold text-navy-900">
            Zoek op naam
          </label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input id="zoek-lid" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClasses(false, 'min-h-12 pl-12')} />
          </div>
        </div>
        <Button variant="secondary" onClick={onClose}>
          <LogOut aria-hidden="true" className="size-5" />
          Lijst sluiten
        </Button>
      </div>

      <p role="status" className="mt-5 mb-3 flex flex-wrap justify-between gap-2 text-muted">
        <span>{query ? `${rows.length} van ${data.rows.length} leden` : `${data.rows.length} leden`}</span>
        {data.updatedAt && <span>Bijgewerkt op {formatDate(data.updatedAt)}</span>}
      </p>

      {data.rows.length === 0 ? (
        <Notice tone="warning" icon={<CircleAlert aria-hidden="true" className="size-5" />} title="De ledenlijst is nog leeg">
          Het bestuur heeft nog geen ledenlijst geplaatst.
        </Notice>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cream-300 p-6 text-center text-muted">Geen leden gevonden met “{query}”.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((row, i) => (
            <li key={`${row.naam}-${i}`} className="rounded-xl border border-cream-300 bg-white p-5">
              <p className="font-serif text-xl font-semibold text-navy-900">{row.naam}</p>
              {extra.some((c) => row[c.key]) && (
                <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
                  {extra.map((c) =>
                    row[c.key] ? (
                      <div key={c.key} className="contents">
                        <dt className="text-sm font-semibold text-muted sm:pt-0.5">{c.label}</dt>
                        <dd className="min-w-0 break-words">
                          <Value column={c} value={row[c.key]} />
                        </dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 flex items-center gap-2 text-sm text-muted">
        <ShieldCheck aria-hidden="true" className="size-4" />
        De lijst wordt automatisch gesloten als je een tijdje niets doet.
      </p>
    </div>
  )
}
