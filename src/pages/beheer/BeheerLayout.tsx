import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Outlet, ScrollRestoration } from 'react-router'
import { ExternalLink, Eye, EyeOff, LogIn, LogOut } from 'lucide-react'
import { Field, describedBy, inputClasses } from '../../components/forms'
import { Button, Container, Notice, Spinner } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { BeheerContext, type BeheerContextValue, type Overview } from './useBeheer'

type State = { kind: 'checking' } | { kind: 'login'; notice?: string } | { kind: 'in'; overview: Overview } | { kind: 'error'; message: string }

export default function BeheerLayout() {
  const [state, setState] = useState<State>({ kind: 'checking' })

  // Keep the admin area out of search engines.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.title = 'Beheer | BC Kellendonck'
    return () => meta.remove()
  }, [])

  const loadOverview = useCallback(async (notice?: string) => {
    try {
      setState({ kind: 'in', overview: await api<Overview>('/api/admin/overview') })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState({ kind: 'login', notice })
      else setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Er ging iets mis.' })
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const call = useCallback<BeheerContextValue['call']>(async (path, opts) => {
    try {
      return await api(path, opts)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ kind: 'login', notice: 'U bent automatisch uitgelogd omdat u een tijdje niets heeft gedaan. Log opnieuw in en probeer het nog eens.' })
      }
      throw err
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const overview = await call<Overview>('/api/admin/overview')
      setState({ kind: 'in', overview })
    } catch {
      // The login screen is shown by `call` when needed; other errors keep the current view.
    }
  }, [call])

  const context = useMemo(() => (state.kind === 'in' ? { overview: state.overview, refresh, call } : null), [state, refresh, call])

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => undefined)
    setState({ kind: 'login', notice: 'U bent uitgelogd.' })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream-50">
      <header className="border-b border-cream-300 bg-white">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
          <Link to="/beheer" className="flex items-center gap-3 rounded-lg">
            <img src="/assets/images/logo-bc-kellendonck.jpg" alt="" width={40} height={40} className="size-10 rounded-full border border-cream-300" />
            <span className="font-serif text-xl font-semibold text-navy-900">
              Beheer <span className="font-normal text-muted">BC Kellendonck</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-navy-800 hover:bg-navy-50">
              <ExternalLink aria-hidden="true" className="size-4" />
              Website<span className="sr-only"> (opent in nieuw tabblad)</span>
            </a>
            {state.kind === 'in' && (
              <Button variant="secondary" onClick={logout} className="min-h-11">
                <LogOut aria-hidden="true" className="size-5" />
                Uitloggen
              </Button>
            )}
          </div>
        </Container>
      </header>

      <main id="inhoud" className="flex-1">
        {state.kind === 'checking' && (
          <Container className="py-16">
            <Spinner />
          </Container>
        )}
        {state.kind === 'error' && (
          <Container narrow className="py-16">
            <Notice tone="error" role="alert" title="Het beheer kon niet worden geladen">
              <p>{state.message}</p>
              <Button variant="secondary" className="mt-4" onClick={() => void loadOverview()}>
                Opnieuw proberen
              </Button>
            </Notice>
          </Container>
        )}
        {state.kind === 'login' && <LoginForm notice={state.notice} onSuccess={() => loadOverview()} />}
        {context && (
          <BeheerContext.Provider value={context}>
            <Outlet />
          </BeheerContext.Provider>
        )}
      </main>
      <ScrollRestoration />
    </div>
  )
}

function LoginForm({ notice, onSuccess }: { notice?: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password) return setError('Vul uw wachtwoord in.')
    setBusy(true)
    setError('')
    try {
      await api('/api/admin/login', { method: 'POST', json: { wachtwoord: password } })
      setPassword('')
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inloggen is niet gelukt.')
      setBusy(false)
    }
  }

  return (
    <Container narrow className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-10">
        <h1 className="text-3xl font-semibold">Inloggen</h1>
        <p className="mt-2 text-lg text-muted">Log in om de documenten en de ledenlijst van de website aan te passen.</p>
        {notice && (
          <Notice tone="info" role="status" className="mt-5">
            {notice}
          </Notice>
        )}
        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          <Field id="wachtwoord" label="Wachtwoord" error={error}>
            <div className="relative">
              <input
                id="wachtwoord"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy('wachtwoord', { error: Boolean(error) })}
                className={inputClasses(Boolean(error), 'min-h-14 pr-36')}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-1/2 right-2 inline-flex min-h-10 -translate-y-1/2 items-center gap-2 rounded-md px-3 font-semibold text-navy-800 hover:bg-navy-50"
                aria-pressed={show}
              >
                {show ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                {show ? 'Verbergen' : 'Tonen'}
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" loading={busy} className="w-full">
            {!busy && <LogIn aria-hidden="true" className="size-5" />}
            {busy ? 'Bezig met inloggen…' : 'Inloggen'}
          </Button>
        </form>
      </div>
    </Container>
  )
}
