import { Outlet, ScrollRestoration } from 'react-router'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#inhoud"
        className="sr-only z-50 rounded-full bg-navy-900 px-5 py-3 font-semibold text-cream-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Direct naar de inhoud
      </a>
      <Header />
      <main id="inhoud" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  )
}
