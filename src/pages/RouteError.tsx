import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Container, buttonClasses } from '../components/ui'
import NotFound from './NotFound'

/** Shown when a page fails to render or a route cannot be loaded. */
export default function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />

  return (
    <Container className="py-20 text-center sm:py-28">
      <h1 className="text-4xl font-semibold">Er ging iets mis</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
        Deze pagina kon niet worden geladen. Probeer de pagina opnieuw te laden. Blijft het probleem bestaan? Probeer het
        dan later nog eens.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" className={buttonClasses('primary')} onClick={() => window.location.reload()}>
          Pagina opnieuw laden
        </button>
        <a href="/" className={buttonClasses('secondary')}>
          Naar de homepage
        </a>
      </div>
    </Container>
  )
}
