import { CalendarDays, Clock, Coins, LayoutGrid, MapPin, Phone, Repeat, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ButtonLink, Container, SectionHeading, SuitMark, buttonClasses } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { club } from '../data/site'
import { telHref } from '../lib/format'

const milestones = [
  { when: '16 september 1998', text: 'Oprichting door leden van tennisvereniging Kellendonck in Kerk-Avezaath.' },
  { when: 'Daarna', text: 'Door de groei van het ledental verhuist de club naar Dorpshuis De Avezathen.' },
  { when: 'Vandaag', text: 'Al meer dan 25 jaar gezelligheid, sportieve uitdaging en samen bridgen.' },
]

const facts: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Users, label: 'Leden', value: 'Ongeveer 65 enthousiaste leden' },
  { icon: MapPin, label: 'Locatie', value: 'Dorpshuis De Avezathen, Daver 46, Kerk-Avezaath' },
  { icon: CalendarDays, label: 'Speelavond', value: 'Iedere woensdagavond' },
  { icon: Clock, label: 'Tijden', value: 'Van 19:30 uur tot ongeveer 23:00 uur' },
  { icon: LayoutGrid, label: 'Spelvorm', value: 'Zes ronden van vier spellen' },
  { icon: Repeat, label: 'Na elke ronde', value: 'Je wisselt samen met je partner van tafel' },
  { icon: Coins, label: 'Contributie', value: 'Laag, want bewust geen lid van de Nederlandse BridgeBond' },
]

export default function OverOns() {
  usePageMeta(
    'Over ons',
    'Lees het verhaal van Bridgeclub Kellendonck: opgericht in 1998 in Kerk-Avezaath, met ongeveer 65 leden die elke woensdagavond samen bridgen.',
  )

  return (
    <>
      <PageHeader
        title="Over ons"
        suit="heart"
        intro="Al meer dan 25 jaar staat Bridgeclub Kellendonck voor gezelligheid, sportieve uitdaging en het plezier van samen bridgen in een ontspannen sfeer."
      />

      <section aria-labelledby="verhaal-title" className="py-14 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div>
            <SectionHeading id="verhaal-title" suit="spade" title="Ons verhaal" />
            <div className="max-w-[65ch] space-y-5 text-lg">
              <p>
                Bridgeclub Kellendonck werd op 16 september 1998 opgericht door een aantal leden van de gelijknamige
                tennisvereniging uit Kerk-Avezaath.
              </p>
              <p>
                Wat begon als een initiatief van enkele enthousiaste tennissers groeide al snel uit tot een gezellige en
                actieve bridgeclub. Wekelijks kwamen steeds meer liefhebbers bijeen om in het clubhuis een avond te
                bridgen. Door de groei van het aantal leden bleek het combineren van tennis en bridge op dezelfde locatie
                al snel niet meer mogelijk.
              </p>
              <p>
                Daarom verhuisde de bridgeclub naar Dorpshuis De Avezathen, waar de vereniging nog altijd met veel plezier
                haar speelavonden organiseert. Hoewel de naam Kellendonck behouden is gebleven als eerbetoon aan de
                oorsprong van de club, zijn er tegenwoordig geen organisatorische banden meer met de tennisvereniging.
              </p>
            </div>
          </div>

          <aside aria-label="Tijdlijn" className="lg:pt-20">
            <ol className="relative space-y-8 border-l-2 border-cream-300 pl-8">
              {milestones.map((m, i) => (
                <li key={m.when} className="relative">
                  <span className="absolute top-0.5 -left-[2.65rem] flex size-6 items-center justify-center rounded-full border-2 border-cream-300 bg-cream-50 text-sm">
                    <SuitMark suit={(['spade', 'heart', 'club'] as const)[i]} />
                  </span>
                  <p className="font-serif text-lg font-semibold text-navy-900">{m.when}</p>
                  <p className="mt-1 text-muted">{m.text}</p>
                </li>
              ))}
            </ol>
          </aside>
        </Container>
      </section>

      <section aria-labelledby="club-title" className="border-y border-cream-300 bg-cream-100 py-14 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading id="club-title" suit="diamond" title="De club" />
            <div className="max-w-[65ch] space-y-5 text-lg">
              <p>
                Bij Bridgeclub Kellendonck staat gezelligheid voorop. Naast het plezier van het spel vinden wij vooral de
                sociale contacten en de ontspannen sfeer binnen onze vereniging erg belangrijk.
              </p>
              <p>
                Met ongeveer 65 enthousiaste leden hebben wij een prettig onderkomen gevonden in Dorpshuis De Avezathen
                aan de Daver 46 in Kerk-Avezaath. Hier komen wij iedere woensdagavond samen voor een gezellige
                bridgeavond.
              </p>
              <p>
                We spelen zes ronden van vier spellen. Na iedere ronde wisselen de spelers samen met hun partner van
                tafel, zodat er steeds nieuwe ontmoetingen en uitdagende spellen ontstaan.
              </p>
              <p>
                Bridgeclub Kellendonck is bewust geen lid van de Nederlandse BridgeBond. Door deze keuze kunnen wij de
                contributie laag houden en blijft bridge voor iedereen toegankelijk.
              </p>
            </div>
          </div>

          <div className="self-start rounded-xl border border-cream-300 bg-white p-6 sm:p-8">
            <h3 className="text-2xl font-semibold">De club in het kort</h3>
            <dl className="mt-5 divide-y divide-cream-200">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-700">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <dt className="text-sm font-semibold text-muted">{label}</dt>
                    <dd className="font-semibold text-navy-900">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <section aria-labelledby="kennismaken" className="py-14 sm:py-20">
        <Container>
          <div className="grid overflow-hidden rounded-xl bg-navy-900 text-cream-50 lg:grid-cols-[1.3fr_1fr]">
            <div className="p-7 sm:p-12">
              <h2 id="kennismaken" className="text-3xl font-semibold text-white sm:text-4xl">
                Kom eens kennismaken
              </h2>
              <p className="mt-4 text-lg text-navy-100">
                Wij nodigen iedereen graag uit om eens kennis te maken met onze club en de gezellige sfeer zelf te
                ervaren! Houd je van bridge of wil je het spel graag leren? Je bent van harte welkom.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={telHref(club.phone)} className={buttonClasses('light', undefined, 'lg')}>
                  <Phone aria-hidden="true" className="size-5" />
                  Bel {club.phone}
                </a>
                <ButtonLink to="/informatie#bestuur" variant="onDark" size="lg">
                  Contact met het bestuur
                </ButtonLink>
              </div>
            </div>
            <div className="border-t border-white/10 bg-navy-800 p-7 sm:p-12 lg:border-t-0 lg:border-l">
              <h3 className="font-sans text-lg font-semibold text-white">Waar en wanneer</h3>
              <address className="mt-3 text-lg not-italic">
                <span className="font-serif text-xl font-semibold text-white">{club.venue.name}</span>
                <br />
                {club.venue.street}
                <br />
                {club.venue.postalCode} {club.venue.city}
              </address>
              <p className="mt-4 text-lg">
                Woensdagavond
                <br />
                Inloop vanaf {club.evening.walkIn} uur, start {club.evening.start} uur
              </p>
              <a
                href={club.venue.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                <MapPin aria-hidden="true" className="size-5" />
                Bekijk op de kaart<span className="sr-only"> (opent Google Maps in nieuw tabblad)</span>
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
