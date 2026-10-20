import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CircleAlert, CircleCheck, KeyRound, Pencil, Plus, Search, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import { Field, describedBy, inputClasses } from '../../components/forms'
import { Button, Container, Notice, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { cn, formatDate, formatSize } from '../../lib/format'
import { BackLink, FilePicker, PageTitle } from './parts'
import { useBeheer } from './useBeheer'

interface Column {
  key: string
  label: string
  type: 'name' | 'phone' | 'email' | 'text'
}
type Row = Record<string, string>
interface MemberData {
  columns: Column[]
  rows: Row[]
  updatedAt: string | null
  fileName: string | null
  history: { count: number }
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'naam', label: 'Naam', type: 'name' },
  { key: 'telefoon', label: 'Telefoon', type: 'phone' },
  { key: 'email', label: 'E-mail', type: 'email' },
]

/** Removes the editor-only _id before sending a row to the server. */
const withoutId = (row: Row) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== '_id'))

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

export default function LedenBeheer() {
  const { call } = useBeheer()
  const [data, setData] = useState<MemberData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const messageRef = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      setData(await call<MemberData>('/api/admin/members'))
      setLoadError('')
    } catch (err) {
      setLoadError(errorText(err, 'De ledenlijst kon niet worden geladen.'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function announce(tone: 'success' | 'error', text: string) {
    setMessage({ tone, text })
    requestAnimationFrame(() => messageRef.current?.scrollIntoView({ block: 'center' }))
  }

  async function undo() {
    if (!window.confirm('Weet u zeker dat u de vorige versie van de ledenlijst wilt terugzetten? De huidige lijst wordt dan vervangen.')) return
    try {
      const res = await call<{ count: number }>('/api/admin/members/undo', { method: 'POST' })
      await load()
      announce('success', `De vorige versie is teruggezet (${res.count} leden).`)
    } catch (err) {
      announce('error', errorText(err, 'Terugzetten is niet gelukt.'))
    }
  }

  return (
    <Container narrow className="py-8 sm:py-12">
      <BackLink />
      <PageTitle title="Ledenlijst beheren" intro="De ledenlijst is alleen zichtbaar voor leden die de toegangscode invullen." />

      <div ref={messageRef}>
        {message && (
          <Notice
            tone={message.tone}
            role={message.tone === 'error' ? 'alert' : 'status'}
            className="mb-6"
            icon={message.tone === 'success' ? <CircleCheck aria-hidden="true" className="size-5" /> : <CircleAlert aria-hidden="true" className="size-5" />}
          >
            {message.text}
          </Notice>
        )}
      </div>

      {loadError && (
        <Notice tone="error" role="alert" className="mb-6">
          {loadError}
        </Notice>
      )}
      {!data && !loadError && <Spinner />}

      {data && (
        <div className="space-y-8">
          <section className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-2xl font-semibold">Huidige ledenlijst</h2>
            <p className="mt-2 text-lg">
              {data.rows.length === 0 ? 'Er staat nog geen ledenlijst op de website.' : `${data.rows.length} leden`}
              {data.updatedAt && <span className="text-muted"> · bijgewerkt op {formatDate(data.updatedAt)}</span>}
            </p>
            {data.history.count > 0 && (
              <Button variant="secondary" className="mt-5" onClick={undo}>
                <Undo2 aria-hidden="true" className="size-5" />
                Vorige versie terugzetten
              </Button>
            )}
          </section>

          <MemberUpload
            onPublished={async (count, skipped) => {
              await load()
              announce(
                'success',
                `De nieuwe ledenlijst staat op de website (${count} leden).` +
                  (skipped.length ? ` Overgeslagen omdat de naam ontbrak: regel ${skipped.join(', ')}.` : ''),
              )
            }}
          />

          <MemberEditor
            key={data.updatedAt ?? 'leeg'}
            data={data}
            onSaved={async (count) => {
              await load()
              announce('success', `De wijzigingen zijn opgeslagen (${count} leden).`)
            }}
          />

          <PinSettings />
        </div>
      )}
    </Container>
  )
}

// ---------------------------------------------------------------------------

interface Preview {
  draftId: string
  fileName: string
  rowCount: number
  columns: { index: number; label: string; type: Column['type']; recommended: boolean; sensitive: boolean; examples: string[] }[]
  rows: string[][]
}

function MemberUpload({ onPublished }: { onPublished: (count: number, skipped: number[]) => Promise<void> }) {
  const { call, overview } = useBeheer()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const maxMb = overview.limits.maxMembersFileMb

  function reset() {
    setPreview(null)
    setError('')
    setOpen(false)
  }

  async function choose(file: File) {
    setError('')
    if (!/\.(xlsx|csv)$/i.test(file.name)) return setError('Kies een Excel-bestand (.xlsx) of een CSV-bestand (.csv).')
    if (file.size > maxMb * 1024 * 1024) return setError(`Het bestand is te groot (${formatSize(file.size)}). Het maximum is ${maxMb} MB.`)
    setBusy(true)
    const form = new FormData()
    form.append('bestand', file)
    try {
      const p = await call<Preview>('/api/admin/members/preview', { method: 'POST', form })
      setPreview(p)
      setSelected(new Set(p.columns.filter((c) => c.recommended).map((c) => c.index)))
    } catch (err) {
      setError(errorText(err, 'Het bestand kon niet worden gelezen.'))
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!preview) return
    setBusy(true)
    setError('')
    try {
      const res = await call<{ count: number; skippedRows: number[] }>('/api/admin/members/publish', {
        method: 'POST',
        json: { draftId: preview.draftId, columns: [...selected] },
      })
      reset()
      await onPublished(res.count, res.skippedRows)
    } catch (err) {
      setError(errorText(err, 'Publiceren is niet gelukt.'))
    } finally {
      setBusy(false)
    }
  }

  const nameIsComposed = preview && !preview.columns.some((c) => c.type === 'name')
  const shown = preview?.columns.filter((c) => selected.has(c.index) || c.type === 'name') ?? []

  return (
    <section className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-2xl font-semibold">Nieuwe ledenlijst uploaden</h2>
      <p className="mt-2 text-lg">
        Heeft u de ledenlijst in Excel? Dan kunt u het bestand hier in één keer plaatsen. De huidige lijst wordt daarbij
        vervangen.
      </p>

      {!open && (
        <Button size="lg" className="mt-5" onClick={() => setOpen(true)}>
          Bestand kiezen
        </Button>
      )}

      {open && !preview && (
        <div className="mt-5 space-y-5">
          <div className="rounded-lg bg-cream-100 p-4">
            <p className="font-semibold text-navy-900">Zo moet het bestand eruitzien</p>
            <p className="mt-1">
              Een Excel-bestand (.xlsx) of CSV-bestand. De <strong>eerste regel</strong> bevat de kolomnamen. Er moet in
              elk geval een kolom <strong>Naam</strong> zijn (of <strong>Voornaam</strong> en <strong>Achternaam</strong>).
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-max border-collapse bg-white text-base">
                <thead>
                  <tr>
                    {['Naam', 'Telefoon', 'E-mail', 'Adres'].map((h) => (
                      <th key={h} className="border border-cream-300 px-3 py-1.5 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {['Jan Jansen', '06 12345678', 'jan@voorbeeld.nl', 'Dorpsstraat 1'].map((v) => (
                      <td key={v} className="border border-cream-300 px-3 py-1.5 text-muted">
                        {v}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {busy ? (
            <Spinner label="Het bestand wordt gelezen…" />
          ) : (
            <FilePicker accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" label="Klik hier om het bestand te kiezen" hint={`Of sleep het bestand hierheen. Maximaal ${maxMb} MB.`} onFile={choose} />
          )}
          {error && (
            <Notice tone="error" role="alert" icon={<CircleAlert aria-hidden="true" className="size-5" />}>
              {error}
            </Notice>
          )}
          <Button variant="ghost" onClick={reset}>
            Annuleren
          </Button>
        </div>
      )}

      {preview && (
        <div className="mt-6 space-y-6 border-t border-cream-200 pt-6">
          <p className="text-lg">
            U heeft gekozen: <strong className="break-words">{preview.fileName}</strong>
            <br />
            Gevonden: <strong>{preview.rowCount} leden</strong>
          </p>

          <fieldset>
            <legend className="text-lg font-semibold text-navy-900">Welke gegevens mogen leden zien?</legend>
            <p className="mt-1 text-muted">Zet alleen een vinkje bij gegevens die echt nodig zijn. Niet-aangevinkte kolommen worden niet opgeslagen.</p>
            <ul className="mt-4 space-y-2">
              {preview.columns.map((c) => {
                const locked = c.type === 'name'
                const isChecked = locked || selected.has(c.index)
                return (
                  <li key={c.index}>
                    <label className={cn('flex cursor-pointer gap-4 rounded-lg border p-4', isChecked ? 'border-navy-300 bg-navy-50' : 'border-cream-300 bg-white')}>
                      <input
                        type="checkbox"
                        className="mt-1 size-6 shrink-0 accent-navy-900"
                        checked={isChecked}
                        disabled={locked}
                        onChange={(e) =>
                          setSelected((s) => {
                            const next = new Set(s)
                            if (e.target.checked) next.add(c.index)
                            else next.delete(c.index)
                            return next
                          })
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-lg font-semibold text-navy-900">
                          {c.label}
                          {locked && <span className="font-normal text-muted"> (altijd zichtbaar)</span>}
                        </span>
                        {c.examples.length > 0 && <span className="block break-words text-muted">Bijvoorbeeld: {c.examples.join(', ')}</span>}
                        {c.sensitive && (
                          <span className="mt-1 flex items-center gap-2 font-semibold text-card-700">
                            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                            Mogelijk gevoelige gegevens. Alleen aanvinken als dit echt nodig is.
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            {nameIsComposed && <p className="mt-3 text-muted">De naam wordt samengesteld uit de voornaam en achternaam.</p>}
          </fieldset>

          <div>
            <p className="text-lg font-semibold text-navy-900">Voorbeeld van de eerste regels</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-cream-300">
              <table className="min-w-full border-collapse text-base">
                <thead className="bg-cream-100">
                  <tr>
                    {shown.map((c) => (
                      <th key={c.index} scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className="border-t border-cream-200">
                      {shown.map((c) => (
                        <td key={c.index} className="px-3 py-2 whitespace-nowrap">
                          {r[c.index]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <Notice tone="error" role="alert" icon={<CircleAlert aria-hidden="true" className="size-5" />}>
              {error}
            </Notice>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" loading={busy} onClick={publish}>
              {busy ? 'Bezig met publiceren…' : 'Ja, deze ledenlijst publiceren'}
            </Button>
            <Button variant="ghost" size="lg" onClick={reset} disabled={busy}>
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function MemberEditor({ data, onSaved }: { data: MemberData; onSaved: (count: number) => Promise<void> }) {
  const { call } = useBeheer()
  const columns = data.rows.length === 0 && data.columns.length === 1 ? DEFAULT_COLUMNS : data.columns
  const [rows, setRows] = useState<(Row & { _id: string })[]>(() => data.rows.map((r, i) => ({ ...r, _id: String(i) })))
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.naam.toLowerCase().includes(q) || r._id === editing) : rows
  }, [rows, query, editing])

  function update(id: string, key: string, value: string) {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, [key]: value } : r)))
    setDirty(true)
  }

  function add() {
    const id = `nieuw-${Date.now()}`
    setRows((rs) => [{ naam: '', _id: id }, ...rs])
    setEditing(id)
    setQuery('')
    setDirty(true)
  }

  function remove(id: string, naam: string) {
    if (!window.confirm(`Weet u zeker dat u ${naam || 'dit lid'} wilt verwijderen?`)) return
    setRows((rs) => rs.filter((r) => r._id !== id))
    setDirty(true)
  }

  async function save() {
    const missing = rows.find((r) => !r.naam?.trim())
    if (missing) {
      setEditing(missing._id)
      return setError('Elk lid moet een naam hebben. Vul de naam in of verwijder het lid.')
    }
    setBusy(true)
    setError('')
    try {
      const res = await call<{ count: number }>('/api/admin/members', {
        method: 'PUT',
        json: { columns, rows: rows.map(withoutId) },
      })
      setDirty(false)
      await onSaved(res.count)
    } catch (err) {
      setError(errorText(err, 'Opslaan is niet gelukt.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-2xl font-semibold">Leden toevoegen of wijzigen</h2>
      <p className="mt-2 text-lg">Pas hier één lid aan zonder een nieuw bestand te uploaden.</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="zoek-beheer" className="block font-semibold text-navy-900">
            Zoek op naam
          </label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input id="zoek-beheer" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClasses(false, 'min-h-12 pl-12')} />
          </div>
        </div>
        <Button variant="secondary" onClick={add}>
          <Plus aria-hidden="true" className="size-5" />
          Lid toevoegen
        </Button>
      </div>

      <ul className="mt-5 divide-y divide-cream-200 rounded-lg border border-cream-300">
        {visible.length === 0 && <li className="p-4 text-muted">{rows.length === 0 ? 'Nog geen leden.' : 'Geen leden gevonden.'}</li>}
        {visible.map((row) => (
          <li key={row._id} className="p-4">
            {editing === row._id ? (
              <div className="space-y-4">
                {columns.map((c) => (
                  <div key={c.key}>
                    <label htmlFor={`${row._id}-${c.key}`} className="block font-semibold text-navy-900">
                      {c.label}
                    </label>
                    <input
                      id={`${row._id}-${c.key}`}
                      type={c.type === 'email' ? 'email' : c.type === 'phone' ? 'tel' : 'text'}
                      maxLength={200}
                      value={row[c.key] ?? ''}
                      onChange={(e) => update(row._id, c.key, e.target.value)}
                      className={inputClasses(c.type === 'name' && !row.naam?.trim() && Boolean(error), 'mt-1 min-h-12')}
                    />
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Klaar met dit lid
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold break-words text-navy-900">{row.naam || <em className="text-muted">Naam ontbreekt</em>}</p>
                  <p className="break-words text-muted">
                    {columns
                      .filter((c) => c.key !== 'naam' && row[c.key])
                      .map((c) => row[c.key])
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-h-11 px-4" onClick={() => setEditing(row._id)}>
                    <Pencil aria-hidden="true" className="size-4" />
                    Wijzigen<span className="sr-only"> {row.naam}</span>
                  </Button>
                  <Button variant="danger" className="min-h-11 px-4" onClick={() => remove(row._id, row.naam)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    Verwijderen<span className="sr-only"> {row.naam}</span>
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {(dirty || error) && (
        <div className="sticky bottom-0 mt-5 -mx-6 border-t border-cream-300 bg-white px-6 py-4 sm:-mx-8 sm:px-8">
          {error && (
            <Notice tone="error" role="alert" className="mb-3">
              {error}
            </Notice>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" loading={busy} onClick={save}>
              {busy ? 'Bezig met opslaan…' : 'Wijzigingen opslaan'}
            </Button>
            <p className="text-muted">De wijzigingen staan pas op de website nadat u op “Wijzigingen opslaan” heeft geklikt.</p>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function PinSettings() {
  const { call, overview, refresh } = useBeheer()
  const [pin, setPin] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const { pinSet, pinUpdatedAt } = overview.members

  async function submit(e: FormEvent) {
    e.preventDefault()
    setDone(false)
    if (!/^\d{6,12}$/.test(pin)) return setError('De toegangscode moet uit 6 tot 12 cijfers bestaan.')
    if (pin !== repeat) return setError('De twee codes zijn niet hetzelfde. Typ de code nogmaals.')
    setBusy(true)
    setError('')
    try {
      await call('/api/admin/members-pin', { method: 'PUT', json: { pin } })
      setPin('')
      setRepeat('')
      setDone(true)
      await refresh()
    } catch (err) {
      setError(errorText(err, 'Opslaan is niet gelukt.'))
    } finally {
      setBusy(false)
    }
  }

  const pinInput = 'min-h-14 max-w-xs text-2xl tracking-[0.3em]'
  return (
    <section className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="flex items-center gap-3 text-2xl font-semibold">
        <KeyRound aria-hidden="true" className="size-6 text-navy-700" />
        Toegangscode voor leden
      </h2>
      <p className="mt-2 text-lg">
        {pinSet
          ? `Er is een toegangscode ingesteld${pinUpdatedAt ? ` (gewijzigd op ${formatDate(pinUpdatedAt)})` : ''}. Om veiligheidsredenen kan de huidige code niet worden getoond.`
          : 'Er is nog geen toegangscode. Leden kunnen de ledenlijst pas bekijken als u hieronder een code instelt.'}
      </p>
      {done && (
        <Notice tone="success" role="status" className="mt-5" icon={<CircleCheck aria-hidden="true" className="size-5" />}>
          De nieuwe toegangscode is opgeslagen. Geef de code door aan de leden. Wie nu is ingelogd, moet de nieuwe code
          invullen.
        </Notice>
      )}
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <Field id="nieuwe-code" label={pinSet ? 'Nieuwe toegangscode' : 'Toegangscode'} hint="Kies 6 tot 12 cijfers. Gebruik niet hetzelfde als uw beheerderswachtwoord." error={error}>
          <input
            id="nieuwe-code"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={12}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy('nieuwe-code', { hint: true, error: Boolean(error) })}
            className={inputClasses(Boolean(error), pinInput)}
          />
        </Field>
        <Field id="herhaal-code" label="Typ de code nogmaals">
          <input
            id="herhaal-code"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={12}
            value={repeat}
            onChange={(e) => setRepeat(e.target.value.replace(/\D/g, ''))}
            className={inputClasses(false, pinInput)}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          {busy ? 'Bezig met opslaan…' : 'Toegangscode opslaan'}
        </Button>
      </form>
    </section>
  )
}
