import { useRef, useState, type FormEvent } from 'react'
import { CircleAlert, CircleCheck, Send } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { Field, describedBy, inputClasses } from '../components/forms'
import { Button, Container, Notice } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { ApiError, api } from '../lib/api'

type FieldName = 'namen' | 'bericht'
type Errors = Partial<Record<FieldName, string>>
type Values = Record<FieldName, string>

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (!values.namen.trim()) errors.namen = 'Vul je naam of jullie namen in.'
  if (!values.bericht.trim()) errors.bericht = 'Schrijf een kort bericht, bijvoorbeeld voor welke avond je je afmeldt.'
  else if (values.bericht.trim().length < 5) errors.bericht = 'Je bericht is erg kort. Vermeld in elk geval de datum.'
  return errors
}

export default function Afmelden() {
  usePageMeta('Afmelden', 'Kun je een woensdagavond niet komen bridgen? Meld je hier eenvoudig af bij BC Kellendonck.')

  const [values, setValues] = useState<Values>({ namen: '', bericht: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState<Values | null>(null)
  const namenRef = useRef<HTMLInputElement>(null)
  const berichtRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  function update(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending) return

    const found = validate(values)
    setErrors(found)
    if (found.namen) return namenRef.current?.focus()
    if (found.bericht) return berichtRef.current?.focus()

    const website = String(new FormData(e.currentTarget).get('website') ?? '')
    setSending(true)
    setSendError('')
    try {
      const payload = { namen: values.namen.trim(), bericht: values.bericht.trim() }
      await api('/api/afmeldingen', { method: 'POST', json: { ...payload, website } })
      setSent(payload)
      setValues({ namen: '', bericht: '' })
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Er ging iets mis bij het verzenden.')
    } finally {
      setSending(false)
      requestAnimationFrame(() => resultRef.current?.focus())
    }
  }

  return (
    <>
      <PageHeader
        title="Afmelden"
        suit="heart"
        narrow
        intro="Kun je een woensdagavond niet komen? Laat het ons hier weten, dan houden we er rekening mee bij de indeling."
      />

      <Container narrow className="py-10 sm:py-14">
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          {sent ? (
            <div role="status" className="rounded-xl border border-sage-200 bg-sage-50 p-6 sm:p-8">
              <p className="flex items-center gap-3 text-2xl font-semibold text-sage-800">
                <CircleCheck aria-hidden="true" className="size-7 shrink-0" />
                Bedankt, je afmelding is ontvangen
              </p>
              <dl className="mt-5 space-y-3 rounded-lg bg-white p-4">
                <div>
                  <dt className="text-sm font-semibold text-muted">Namen</dt>
                  <dd className="text-lg">{sent.namen}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted">Bericht</dt>
                  <dd className="text-lg whitespace-pre-line">{sent.bericht}</dd>
                </div>
              </dl>
              <Button variant="secondary" className="mt-6" onClick={() => setSent(null)}>
                Nog een afmelding doorgeven
              </Button>
            </div>
          ) : (
            sendError && (
              <Notice tone="error" role="alert" className="mb-6" icon={<CircleAlert aria-hidden="true" className="size-5" />} title="Je bericht is niet verzonden">
                {sendError} Je tekst staat nog in het formulier, zodat je het opnieuw kunt proberen.
              </Notice>
            )
          )}
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-2xl font-semibold">Laat een berichtje achter!</h2>
            <p className="mt-1 text-muted">Beide velden zijn verplicht.</p>

            <div className="mt-6 space-y-6">
              <Field id="namen" label="Namen" required error={errors.namen}>
                <input
                  ref={namenRef}
                  id="namen"
                  name="namen"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={150}
                  placeholder="Typ je naam of jullie namen..."
                  value={values.namen}
                  onChange={(e) => update('namen', e.target.value)}
                  aria-invalid={Boolean(errors.namen)}
                  aria-describedby={describedBy('namen', { error: Boolean(errors.namen) })}
                  className={inputClasses(Boolean(errors.namen), 'min-h-14')}
                />
              </Field>

              <Field id="bericht" label="Bericht" required hint="Vermeld voor welke datum of datums je je afmeldt." error={errors.bericht}>
                <textarea
                  ref={berichtRef}
                  id="bericht"
                  name="bericht"
                  required
                  rows={5}
                  maxLength={2000}
                  value={values.bericht}
                  onChange={(e) => update('bericht', e.target.value)}
                  aria-invalid={Boolean(errors.bericht)}
                  aria-describedby={describedBy('bericht', { hint: true, error: Boolean(errors.bericht) })}
                  className={inputClasses(Boolean(errors.bericht), 'resize-y')}
                />
              </Field>

              {/* Honeypot for spam bots; hidden from people and assistive technology. */}
              <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
                <label htmlFor="website">Laat dit veld leeg</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <Button type="submit" size="lg" loading={sending} className="w-full sm:w-auto">
                {sending ? (
                  'Bezig met verzenden…'
                ) : (
                  <>
                    <Send aria-hidden="true" className="size-5" />
                    Verzenden
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-muted">
          Was je ingedeeld voor klaarzetten of opruimen? Probeer dan eerst zelf te ruilen en geef de wijziging door aan de
          Technische Commissie. Zie het{' '}
          <Link to="/speelschema" className="link">
            speelschema
          </Link>
          .
        </p>
      </Container>
    </>
  )
}
