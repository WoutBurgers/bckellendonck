import { ArrowRight, ExternalLink, HandHeart, Lock, Megaphone, Phone } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ButtonLink, Container, buttonClasses } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { speelschema } from '../data/documents'
import { tcContactpersonen } from '../data/contacts'
import { telHref } from '../lib/format'

export default function Speelschema() {
  usePageMeta(
    'Speelschema',
    'Het speelschema van BC Kellendonck met de speelavonden, de indeling voor klaarzetten en opruimen en mededelingen voor leden.',
  )

  return (
    <>
      <PageHeader title="Speelschema" suit="diamond" intro="Het speelschema van de club en belangrijke mededelingen voor de leden." />

      <Container className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
        <section aria-labelledby="schema-title">
          <h2 id="schema-title" className="text-2xl font-semibold sm:text-3xl">
            {speelschema.title}
          </h2>
          <figure className="mt-5 rounded-xl border border-cream-300 bg-white p-3 shadow-soft sm:p-4">
            <a
              href={speelschema.image}
              target="_blank"
              rel="noopener"
              className="block overflow-hidden rounded-lg"
              aria-label="Speelschema op volledige grootte openen (opent in nieuw tabblad)"
            >
              <img src={speelschema.image} alt={speelschema.alt} width={speelschema.width} height={speelschema.height} className="h-auto w-full" />
            </a>
            <figcaption className="flex flex-col gap-2 px-1 pt-4 text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>Bijzondere avonden staan in rood.</span>
              <a href={speelschema.image} target="_blank" rel="noopener" className="link inline-flex min-h-11 items-center gap-2">
                <ExternalLink aria-hidden="true" className="size-4" />
                Groter bekijken
              </a>
            </figcaption>
          </figure>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="mededeling-title" className="rounded-xl border border-card-100 bg-card-50 p-6 sm:p-7">
            <p className="flex items-center gap-2 font-semibold text-card-700">
              <Megaphone aria-hidden="true" className="size-5" />
              Mededeling
            </p>
            <h2 id="mededeling-title" className="mt-2 text-2xl font-semibold">
              Klaarzetten en opruimen
            </h2>
            <p className="mt-3">
              Kun je op jouw ingeplande avond voor het klaarzetten of opruimen niet aanwezig zijn? Probeer dan eerst zelf
              te ruilen met een ander paar. Geef een wijziging daarna altijd even door aan de Technische Commissie.
            </p>
            <h3 className="mt-5 font-sans text-base font-semibold text-navy-900">Contactpersonen Technische Commissie</h3>
            <ul className="mt-2 grid gap-2">
              {tcContactpersonen.map((p) => (
                <li key={p.name}>
                  <a
                    href={telHref(p.phone)}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-card-100 bg-white px-4 py-2 transition-colors hover:border-navy-200"
                  >
                    <span className="font-semibold text-navy-900">{p.name}</span>
                    <span className="inline-flex items-center gap-2 text-navy-800 tabular-nums">
                      <Phone aria-hidden="true" className="size-4 text-sage-600" />
                      <span className="sr-only">Bel {p.name}: </span>
                      {p.phone}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="ledenlijst-title" className="rounded-xl bg-navy-900 p-6 text-cream-50 sm:p-7">
            <h2 id="ledenlijst-title" className="flex items-center gap-3 text-2xl font-semibold text-white">
              <Lock aria-hidden="true" className="size-5 text-sage-200" />
              Ledenlijst
            </h2>
            <p className="mt-2 text-navy-100">De ledenlijst is alleen voor leden. Je hebt de toegangscode nodig.</p>
            <ButtonLink to="/ledenlijst" variant="light" className="mt-5">
              Bekijk de ledenlijst
              <ArrowRight aria-hidden="true" className="size-5" />
            </ButtonLink>
          </section>
        </div>
      </Container>

      <section aria-labelledby="versterking-title" className="pb-16 sm:pb-20">
        <Container>
          <div className="grid gap-6 rounded-xl border border-sage-200 bg-sage-50 p-6 sm:p-10 md:grid-cols-[auto_1fr]">
            <span className="flex size-14 items-center justify-center rounded-lg bg-sage-700 text-white">
              <HandHeart aria-hidden="true" className="size-7" />
            </span>
            <div>
              <p className="font-semibold text-sage-700">Vrijwilliger gezocht</p>
              <h2 id="versterking-title" className="mt-1 text-2xl font-semibold sm:text-3xl">
                Versterking gezocht voor de Technische Commissie
              </h2>
              <div className="mt-4 max-w-3xl space-y-4 text-lg">
                <p>
                  Marijke Staal is gestopt met haar werkzaamheden binnen de Technische Commissie. Daarom zijn wij op zoek
                  naar iemand die haar taak wil overnemen en de indeling van de speelavonden wil verzorgen.
                </p>
                <p>
                  Lijkt dit je leuk, maar heb je dit nog nooit gedaan? Geen probleem! Paul legt je in ongeveer een half
                  uurtje uit hoe het werkt. De eerste zes keer word je door Paul begeleid en daarna kun je altijd bij hem
                  terecht met vragen of voor ondersteuning.
                </p>
                <p className="font-semibold text-sage-800">
                  Een mooie manier om betrokken te zijn bij onze club en mee te helpen aan gezellige bridgeavonden!
                </p>
              </div>
              <a href={telHref(tcContactpersonen[0].phone)} className={buttonClasses('primary', 'mt-6')}>
                <Phone aria-hidden="true" className="size-5" />
                Bel Paul: {tcContactpersonen[0].phone}
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
