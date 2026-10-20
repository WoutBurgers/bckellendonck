import { Link } from 'react-router'
import { Clock, MapPin, Phone } from 'lucide-react'
import { club, navItems } from '../data/site'
import { telHref } from '../lib/format'
import { Container, SuitRow } from './ui'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-navy-950 text-navy-100">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl font-semibold text-cream-50">{club.name}</p>
          <p className="mt-2 text-navy-200">{club.tagline}</p>
          <SuitRow className="mt-4 text-lg [&>*]:text-navy-300!" />
        </div>

        <div>
          <h2 className="font-sans text-sm font-semibold tracking-wider text-navy-300 uppercase">Locatie en contact</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-sage-200" />
              <address className="not-italic">
                {club.venue.name}
                <br />
                {club.venue.street}
                <br />
                {club.venue.postalCode} {club.venue.city}
              </address>
            </li>
            <li className="flex gap-3">
              <Phone aria-hidden="true" className="mt-1 size-5 shrink-0 text-sage-200" />
              <a href={telHref(club.phone)} className="underline-offset-4 hover:text-white hover:underline">
                {club.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock aria-hidden="true" className="mt-1 size-5 shrink-0 text-sage-200" />
              <span>
                Woensdag, {club.evening.start} – ca. {club.evening.end} uur
              </span>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-sans text-sm font-semibold tracking-wider text-navy-300 uppercase">Pagina's</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="underline-offset-4 hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-sm text-navy-300">
          <span>© {year} {club.fullName}</span>
          <Link to="/beheer" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline">
            Beheer
          </Link>
        </Container>
      </div>
    </footer>
  )
}
