import { useEffect, useState, type FormEvent } from 'react'
import { CircleCheck, Mail, Trash2 } from 'lucide-react'
import { Field, describedBy, inputClasses } from '../../components/forms'
import { Button, Container, Notice, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { BackLink, PageTitle } from './parts'
import { useBeheer } from './useBeheer'

interface Afmelding {
  id: string
  namen: string
  bericht: string
  receivedAt: string
}

export default function AfmeldingenBeheer() {
  const { call, refresh } = useBeheer()
  const [items, setItems] = useState<Afmelding[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    call<{ items: Afmelding[] }>('/api/admin/afmeldingen')
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'De berichten konden niet worden geladen.'))
  }, [call])

  async function remove(item: Afmelding) {
    if (!window.confirm(`Weet u zeker dat u het bericht van ${item.namen} wilt verwijderen?`)) return
    try {
      await call(`/api/admin/afmeldingen/${item.id}`, { method: 'DELETE' })
      setItems((list) => list?.filter((i) => i.id !== item.id) ?? null)
      void refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verwijderen is niet gelukt.')
    }
  }

  return (
    <Container narrow className="py-8 sm:py-12">
      <BackLink />
      <PageTitle title="Afmeldingen" intro="Berichten die leden via de pagina Afmelden hebben gestuurd. De nieuwste staan bovenaan." />
      <EmailSettings />
      {error && (
        <Notice tone="error" role="alert" className="mb-6">
          {error}
        </Notice>
      )}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && <p className="rounded-xl border border-dashed border-cream-300 p-8 text-center text-lg text-muted">Er zijn geen berichten.</p>}
      {items && items.length > 0 && (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-cream-300 bg-white p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-semibold break-words text-navy-900">{item.namen}</p>
                  <p className="text-muted">{formatDateTime(item.receivedAt)}</p>
                </div>
                <Button variant="danger" className="min-h-11 px-4" onClick={() => remove(item)}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Verwijderen
                </Button>
              </div>
              <p className="mt-3 text-lg break-words whitespace-pre-line">{item.bericht}</p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}

// ---------------------------------------------------------------------------

function EmailSettings() {
  const { call, overview, refresh } = useBeheer()
  const [text, setText] = useState(overview.afmeldingen.emails.join('\n'))
  const [error, setError] = useState('')
  const [done, setDone] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setDone(null)
    setBusy(true)
    setError('')
    try {
      const { emails } = await call<{ emails: string[] }>('/api/admin/afmelden-emails', {
        method: 'PUT',
        json: { emails: text.split(/[\s,;]+/).filter(Boolean) },
      })
      setText(emails.join('\n'))
      setDone(emails.length)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan is niet gelukt.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="flex items-center gap-3 text-2xl font-semibold">
        <Mail aria-hidden="true" className="size-6 text-navy-700" />
        Melding per e-mail
      </h2>
      <p className="mt-2 text-lg">Elke nieuwe afmelding wordt ook gemaild naar de adressen hieronder. Laat het veld leeg als u geen e-mail wilt ontvangen.</p>
      {!overview.afmeldingen.emailConfigured && (
        <Notice tone="warning" className="mt-5">
          Het versturen van e-mail is nog niet ingesteld op de server. U kunt de adressen alvast opslaan, maar er worden pas e-mails verstuurd als dit is geregeld.
        </Notice>
      )}
      {done !== null && (
        <Notice tone="success" role="status" className="mt-5" icon={<CircleCheck aria-hidden="true" className="size-5" />}>
          {done === 0
            ? 'Opgeslagen. Er worden geen e-mails meer verstuurd.'
            : `Opgeslagen. Nieuwe afmeldingen worden gemaild naar ${done === 1 ? '1 adres' : `${done} adressen`}.`}
        </Notice>
      )}
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <Field id="afmelden-emails" label="E-mailadressen" hint="Zet elk adres op een eigen regel." error={error}>
          <textarea
            id="afmelden-emails"
            rows={3}
            autoComplete="off"
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy('afmelden-emails', { hint: true, error: Boolean(error) })}
            className={inputClasses(Boolean(error), 'resize-y')}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          {busy ? 'Bezig met opslaan…' : 'Adressen opslaan'}
        </Button>
      </form>
    </section>
  )
}
