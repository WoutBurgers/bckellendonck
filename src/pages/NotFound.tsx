import { Home } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink, Container, SuitRow } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { navItems } from '../data/site'

export default function NotFound() {
  usePageMeta('Pagina niet gevonden', 'Deze pagina bestaat niet (meer) op de website van BC Kellendonck.')

  return (
    <Container className="py-20 text-center sm:py-28">
      <SuitRow className="justify-center text-3xl" />
      <p className="mt-6 font-serif text-6xl font-semibold text-navy-200">404</p>
      <h1 className="mt-2 text-4xl font-semibold">Deze pagina bestaat niet</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
        Misschien is de pagina verplaatst of is het adres verkeerd getypt. Ga terug naar de homepage of kies een van de
        pagina's hieronder.
      </p>
      <ButtonLink to="/" className="mt-8">
        <Home aria-hidden="true" className="size-5" />
        Naar de homepage
      </ButtonLink>
      <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {navItems.slice(1).map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="link">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  )
}
