import { ArrowRight, CalendarDays, FileText, Info, MapPin, Navigation, Phone, UserMinus } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink, Container, SectionHeading, SuitMark, buttonClasses, type Suit } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { club } from '../data/site'
import { telHref } from '../lib/format'

const welcomePoints: { suit: Suit; title: string; text: string }[] = [
  {
    suit: 'heart',
    title: 'Gezelligheid voorop',
    text: 'Naast het spel vinden we de sociale contacten en de ontspannen sfeer het belangrijkst.',
  },
  {
    suit: 'spade',
    title: 'Iedereen is welkom',
    text: 'Of je nu al jaren bridget of het spel graag wilt leren: je bent van harte welkom.',
  },
  {
    suit: 'diamond',
    title: 'Lage contributie',
    text: 'We zijn bewust geen lid van de Nederlandse BridgeBond. Zo blijft bridge voor iedereen betaalbaar.',
  },
]

const timeline = [
  { time: club.evening.walkIn, label: 'Inloop', note: 'Binnenlopen en plaatsnemen' },
  { time: club.evening.start, label: 'Start', note: 'De eerste ronde begint' },
  { time: `± ${club.evening.end}`, label: 'Einde', note: 'Na zes ronden' },
]

const quickLinks = [
  { to: '/speelschema', icon: CalendarDays, title: 'Speelschema', text: 'Speelavonden en mededelingen' },
  { to: '/uitslagen', icon: FileText, title: 'Uitslagen', text: 'Zitting en competities' },
  { to: '/informatie', icon: Info, title: 'Informatie', text: 'Bestuur, reglement en contributie' },
  { to: '/afmelden', icon: UserMinus, title: 'Afmelden', text: 'Kun je niet komen?' },
]

/** The when-and-where card, styled as a playing card with corner indices. */
function EveningCard({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative rounded-xl border border-cream-300 bg-white p-2 shadow-lift">
        <div className="relative rounded-lg border border-navy-100 px-9 py-6">
          <span aria-hidden="true" className="absolute top-2 left-2.5 flex flex-col items-center font-serif text-sm leading-none font-semibold text-card-600">
            W<span className="mt-0.5">♥</span>
          </span>
          <span aria-hidden="true" className="absolute right-2.5 bottom-2 flex rotate-180 flex-col items-center font-serif text-sm leading-none font-semibold text-card-600">
            W<span className="mt-0.5">♥</span>
          </span>
          <p className="text-sm font-semibold tracking-wide text-sage-700 uppercase">Elke woensdagavond</p>
          <p className="mt-1 font-serif text-3xl font-semibold text-navy-900">Start {club.evening.start} uur</p>
          <p className="text-muted">Inloop vanaf {club.evening.walkIn} uur</p>
          <p className="mt-3 flex items-start gap-2 border-t border-cream-200 pt-3 text-navy-900">
            <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-card-600" />
            <span>
              <span className="font-semibold">{club.venue.name}</span>
              <br />
              {club.venue.city}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  usePageMeta(
    'Welkom bij BC Kellendonck | Bridgeclub in Kerk-Avezaath',
    'BC Kellendonck is dé bridgeclub van Tiel en omgeving. Elke woensdagavond bridgen in Dorpshuis De Avezathen in Kerk-Avezaath. Iedereen is van harte welkom.',
  )

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="border-b border-cream-300 bg-cream-100">
        <Container className="grid grid-cols-1 gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:py-20">
          <div>
            <p className="text-base font-semibold text-sage-700">Bridgeclub in Kerk-Avezaath, sinds 1998</p>
            <h1 id="hero-title" className="mt-3 text-[2.2rem] leading-[1.1] font-semibold min-[400px]:text-[2.6rem] sm:text-6xl">
              Welkom bij BC&nbsp;Kellendonck
            </h1>
            <p className="mt-5 font-serif text-xl text-navy-800 sm:text-2xl">
              Ontdek de passie van bridge bij dé bridgeclub van Tiel en omgeving!
            </p>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Houd je van bridge of wil je het spel graag leren? Iedereen is van harte welkom voor een gezellige en
              ontspannen bridgeavond!
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ButtonLink to="/over-ons" size="lg">
                Ontdek onze club
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
              <ButtonLink to="/speelschema" variant="secondary" size="lg">
                Bekijk het speelschema
              </ButtonLink>
              <a href="#waar-en-wanneer" className="link inline-flex min-h-12 items-center gap-2 px-1 text-lg">
                <MapPin aria-hidden="true" className="size-5" />
                Contact en locatie
              </a>
            </div>
          </div>

          {/* On mobile the card comes first, so time and place are visible right after the intro. */}
          <div className="flex flex-col gap-6 lg:relative lg:block lg:pb-10">
            <img
              src="/assets/images/bridgeavond-hero.jpg"
              alt="Leden spelen bridge aan een tafel met kaarten en biedingsdozen tijdens een gezellige clubavond"
              width={1024}
              height={479}
              fetchPriority="high"
              className="order-last aspect-[16/10] w-full rounded-xl object-cover object-[40%_50%] shadow-soft lg:aspect-[5/4]"
            />
            <EveningCard className="lg:absolute lg:bottom-0 lg:-left-10 lg:w-[19rem]" />
          </div>
        </Container>
      </section>

      {/* Over de club */}
      <section aria-labelledby="club-title" className="py-16 sm:py-24">
        <Container>
          <div>
            <div className="max-w-2xl">
              <SectionHeading id="club-title" title="Een gezellige club" />
              <div className="space-y-4 text-lg">
                <p>
                  Bridgeclub Kellendonck werd in 1998 opgericht door enkele enthousiaste tennissers uit Kerk-Avezaath.
                  Inmiddels komen ongeveer 65 leden iedere woensdag samen in Dorpshuis De Avezathen.
                </p>
                <Link to="/over-ons" className="link inline-flex items-center gap-2">
                  Lees ons verhaal
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              </div>
            </div>
            <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-cream-300 bg-cream-300 md:grid-cols-3">
              {welcomePoints.map((p) => (
                <li key={p.title} className="bg-white p-6 sm:p-8">
                  <SuitMark suit={p.suit} className="text-2xl" />
                  <h3 className="mt-3 text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-muted">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Waar en wanneer */}
      <section aria-labelledby="waar-en-wanneer" className="border-y border-cream-300 bg-cream-100 py-16 sm:py-24">
        <Container>
          <SectionHeading
            id="waar-en-wanneer"
            title="Kom gezellig bridgen op woensdagavond!"
            intro="We spelen zes ronden van vier spellen. Na iedere ronde wissel je samen met je partner van tafel, zodat er steeds nieuwe ontmoetingen en uitdagende spellen ontstaan."
          />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl bg-navy-900 p-6 text-cream-50 sm:p-8">
              <h3 className="font-sans text-lg font-semibold text-white">Zo ziet de avond eruit</h3>
              <ol className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-4">
                {timeline.map((step, i) => (
                  <li key={step.label} className="relative sm:pr-4">
                    {i < timeline.length - 1 && (
                      <span aria-hidden="true" className="absolute top-4 left-[4.5rem] hidden h-px w-[calc(100%-4.5rem)] bg-white/20 sm:block" />
                    )}
                    <p className="font-serif text-3xl font-semibold text-white tabular-nums">{step.time}</p>
                    <p className="mt-1 font-semibold text-navy-100">{step.label}</p>
                    <p className="text-navy-200">{step.note}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-8 border-t border-white/15 pt-6">
                <p className="font-semibold text-navy-100">Zes ronden van vier spellen</p>
                <ol className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2" aria-label="Zes ronden">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <li key={n} className="rounded-md border border-white/15 bg-white/5 py-2 text-center">
                      <span className="block font-serif text-lg font-semibold text-white">{n}</span>
                      <span aria-hidden="true" className="block text-xs tracking-tight text-navy-200">
                        ♠♥♦♣
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-cream-300 bg-white p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-sans text-lg font-semibold text-navy-900">
                <MapPin aria-hidden="true" className="size-5 text-card-600" />
                Locatie
              </h3>
              <address className="mt-4 text-lg not-italic">
                <span className="font-serif text-2xl font-semibold text-navy-900">{club.venue.name}</span>
                <br />
                {club.venue.street}
                <br />
                {club.venue.postalCode} {club.venue.city}
              </address>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-auto lg:flex-col xl:flex-row">
                <a href={club.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary')}>
                  <Navigation aria-hidden="true" className="size-5" />
                  Route plannen<span className="sr-only"> (opent Google Maps in nieuw tabblad)</span>
                </a>
                <a href={telHref(club.phone)} className={buttonClasses('secondary')}>
                  <Phone aria-hidden="true" className="size-5" />
                  {club.phone}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Snel naar */}
      <section aria-labelledby="snel-title" className="py-16 sm:py-20">
        <Container>
          <h2 id="snel-title" className="text-2xl font-semibold">
            Voor leden
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(({ to, icon: Icon, title, text }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex h-full items-center gap-4 rounded-xl border border-cream-300 bg-white p-5 transition-colors hover:border-navy-300 hover:bg-navy-50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 group-hover:bg-white">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-lg font-semibold text-navy-900">{title}</span>
                    <span className="block text-muted">{text}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-700" />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Uitnodiging */}
      <section aria-labelledby="welkom-title" className="pb-16 sm:pb-24">
        <Container>
          <div className="grid gap-8 rounded-xl bg-sage-800 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 id="welkom-title" className="text-3xl font-semibold text-white sm:text-4xl">
                We hopen je op woensdagavond te mogen verwelkomen!
              </h2>
              <p className="mt-4 max-w-xl text-lg text-sage-100">
                Kom gezellig langs, speel een paar mooie spellen en geniet van een leuke avond in goed gezelschap.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink to="/over-ons#kennismaken" variant="light" size="lg">
                Kom kennismaken
              </ButtonLink>
              <a href={telHref(club.phone)} className={buttonClasses('onDark', undefined, 'lg')}>
                <Phone aria-hidden="true" className="size-5" />
                Bel {club.phone}
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
