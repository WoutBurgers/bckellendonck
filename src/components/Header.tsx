import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Menu, X } from 'lucide-react'
import { joinCta, navItems } from '../data/site'
import { cn } from '../lib/format'
import { ButtonLink, Container } from './ui'

function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg" aria-label="BC Kellendonck, naar de homepage">
      <img
        src="/assets/images/logo-bc-kellendonck.jpg"
        alt=""
        width={52}
        height={52}
        className="size-12 rounded-full border border-cream-300 bg-cream-50 object-cover sm:size-[3.25rem]"
      />
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-xl font-semibold whitespace-nowrap text-navy-900 sm:text-2xl">BC Kellendonck</span>
        <span className="text-sm text-muted max-[399px]:hidden">Bridgeclub · Kerk-Avezaath</span>
      </span>
    </Link>
  )
}

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative rounded-md px-2.5 py-2 text-[0.95rem] font-semibold transition-colors',
    isActive
      ? 'text-navy-900 after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-card-600'
      : 'text-muted hover:text-navy-900',
  )

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-12 items-center justify-between rounded-xl px-4 text-lg font-semibold transition-colors',
    isActive ? 'bg-navy-900 text-cream-50' : 'text-navy-900 hover:bg-navy-50',
  )

export function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close the menu after navigating.
  useEffect(() => setOpen(false), [location.pathname, location.hash])

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onResize = () => {
      if (window.matchMedia('(min-width: 64rem)').matches) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300/70 bg-cream-50/95 backdrop-blur supports-[backdrop-filter]:bg-cream-50/85">
      <Container className="flex h-20 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Hoofdmenu" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className={desktopLink}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ButtonLink to={joinCta.to} variant="primary" className="min-h-11 px-5 max-xl:hidden!">
            {joinCta.label}
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-12 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-900 transition-colors hover:bg-navy-50 lg:hidden"
            aria-expanded={open}
            aria-controls="mobiel-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
            <span className="sr-only">{open ? 'Menu sluiten' : 'Menu openen'}</span>
          </button>
        </div>
      </Container>

      <div
        id="mobiel-menu"
        ref={panelRef}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto border-y border-cream-300/70 bg-cream-50 shadow-lift lg:hidden"
      >
        <Container className="py-4">
          <nav aria-label="Mobiel menu">
            <ul className="grid gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.to === '/'} className={mobileLink}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink to={joinCta.to} variant="secondary" className="mt-4 w-full">
            {joinCta.label}
          </ButtonLink>
        </Container>
      </div>
    </header>
  )
}
