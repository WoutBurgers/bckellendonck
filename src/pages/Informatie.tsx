import { useState } from 'react'
import { Check, Copy, Info, Phone } from 'lucide-react'
import { ContactCard } from '../components/ContactCard'
import { DocumentCard } from '../components/DocumentCard'
import { PageHeader } from '../components/PageHeader'
import { Container, Notice, SectionHeading } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { useDocuments } from '../hooks/useDocuments'
import { bestuur, liefEnLeed, technischeCommissie } from '../data/contacts'
import { statuten, wedstrijdreglement } from '../data/documents'
import { telHref } from '../lib/format'

const sections = [
  { id: 'bestuur', label: 'Bestuur' },
  { id: 'technische-commissie', label: 'Technische Commissie' },
  { id: 'lief-en-leed', label: 'Lief en Leed' },
  { id: 'documenten', label: 'Reglement en statuten' },
  { id: 'contributie', label: 'Contributie' },
]

const iban = 'NL42RABO0115267891'
const ibanDisplay = 'NL42 RABO 0115 2678 91'

export default function Informatie() {
  usePageMeta(
    'Informatie',
    'Contactgegevens van het bestuur, de Technische Commissie en Lief en Leed van BC Kellendonck, plus het wedstrijdreglement, de statuten en de contributie.',
  )
  const docs = useDocuments()
  const docProps = (slug: 'wedstrijdreglement' | 'statuten') => ({
    published: docs.status === 'ready' ? docs.documents.get(slug) : undefined,
    failed: docs.status === 'error',
    onRetry: docs.retry,
  })

  return (
    <>
      <PageHeader
        title="Informatie"
        suit="club"
        intro="Het bestuur, de Technische Commissie, Lief en Leed, het wedstrijdreglement, de statuten en de contributie."
      >
        <nav aria-label="Op deze pagina" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-cream-300 bg-cream-50 px-4 font-semibold text-navy-800 transition-colors hover:border-navy-200 hover:bg-white"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      <Container className="space-y-16 py-12 sm:space-y-20 sm:py-16">
        <section aria-labelledby="bestuur">
          <SectionHeading id="bestuur" suit="spade" title="Het bestuur" />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bestuur.map((c) => (
              <li key={c.name}>
                <ContactCard contact={c} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="technische-commissie">
          <SectionHeading
            id="technische-commissie"
            suit="heart"
            title="Technische Commissie"
            intro="De Technische Commissie verzorgt de indeling van de speelavonden. Wijzigingen in het klaarzetten of opruimen geef je aan hen door."
          />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {technischeCommissie.map((c, i) => (
              <li key={c.name}>
                <ContactCard contact={c} suit={(['spade', 'heart', 'diamond'] as const)[i]} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="lief-en-leed">
          <div className="grid items-center overflow-hidden rounded-xl border border-cream-300 bg-white sm:grid-cols-[12rem_1fr]">
            <img
              src="/assets/images/lief-en-leed.jpg"
              alt="Illustratie van een bos bloemen met een pleister en de tekst Lief & Leed"
              width={362}
              height={362}
              loading="lazy"
              className="mx-auto h-auto w-40 sm:w-full"
            />
            <div className="p-6 pt-2 sm:p-8">
              <h2 id="lief-en-leed" className="text-3xl font-semibold">
                Lief en Leed
              </h2>
              <p className="mt-3 font-serif text-xl font-semibold text-navy-900">{liefEnLeed.name}</p>
              <a href={telHref(liefEnLeed.phone)} className="link mt-1 inline-flex min-h-11 items-center gap-2 text-lg">
                <Phone aria-hidden="true" className="size-5" />
                <span className="sr-only">Bel {liefEnLeed.name}: </span>
                {liefEnLeed.phone}
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="documenten">
          <SectionHeading id="documenten" suit="diamond" title="Wedstrijdreglement en statuten" />
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <li id="wedstrijdreglement" className="scroll-mt-28">
              <DocumentCard info={wedstrijdreglement} {...docProps('wedstrijdreglement')} />
            </li>
            <li id="statuten" className="scroll-mt-28">
              <DocumentCard info={statuten} {...docProps('statuten')} />
            </li>
          </ul>
        </section>

        <section aria-labelledby="contributie">
          <SectionHeading id="contributie" suit="club" title="Contributie" />
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-cream-300 bg-white p-6 sm:p-8">
              <p className="text-lg">Beste leden,</p>
              <p className="mt-2 text-lg">Wilt u vóór 1 oktober de contributie à € 60,00 overmaken op onderstaand rekeningnummer?</p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-cream-100 p-5">
                  <dt className="font-semibold text-muted">Contributie per jaar</dt>
                  <dd className="mt-1 font-serif text-3xl font-semibold text-navy-900">€ 60,00</dd>
                </div>
                <div className="rounded-lg bg-cream-100 p-5">
                  <dt className="font-semibold text-muted">Entreegeld nieuw lid</dt>
                  <dd className="mt-1 font-serif text-3xl font-semibold text-navy-900">€ 15,00</dd>
                  <dd className="text-muted">eenmalig</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl bg-navy-900 p-6 text-cream-50 sm:p-8">
              <h3 className="font-sans text-lg font-semibold text-white">Betaalgegevens</h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-navy-200">Rekeningnummer (IBAN)</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xl font-semibold tracking-wide text-white sm:text-2xl">{ibanDisplay}</span>
                    <CopyButton value={iban} />
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-200">Ten name van</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">Bridgeclub Kellendonck</dd>
                </div>
                <div>
                  <dt className="text-navy-200">Betalen vóór</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">1 oktober</dd>
                </div>
              </dl>
            </div>
          </div>
          <Notice tone="info" className="mt-5" icon={<Info aria-hidden="true" className="size-5" />}>
            Deze bedragen en betaalgegevens zijn overgenomen van de vorige website van de club. Twijfelt u of ze nog
            actueel zijn? Neem dan contact op met het bestuur.
          </Notice>
        </section>
      </Container>
    </>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState<boolean | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
    window.setTimeout(() => setCopied(null), 2500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold text-white ring-1 ring-white/30 transition-colors ring-inset hover:bg-white/10"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{copied === true ? 'Gekopieerd' : copied === false ? 'Kopiëren mislukt' : 'Kopieer'}</span>
      <span className="sr-only"> rekeningnummer</span>
    </button>
  )
}
