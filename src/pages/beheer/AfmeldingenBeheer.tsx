import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Container, Notice, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { BackLink, PageTitle } from './parts'
import { useBeheer } from './useBeheer'

interface Afmelding {
  id: string
  namen: string
  bericht: string
  receivedAt: string
}

export default function AfmeldingenBeheer() {
  const { call, refresh } = useBeheer()
  const [items, setItems] = useState<Afmelding[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    call<{ items: Afmelding[] }>('/api/admin/afmeldingen')
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'De berichten konden niet worden geladen.'))
  }, [call])

  async function remove(item: Afmelding) {
    if (!window.confirm(`Weet u zeker dat u het bericht van ${item.namen} wilt verwijderen?`)) return
    try {
      await call(`/api/admin/afmeldingen/${item.id}`, { method: 'DELETE' })
      setItems((list) => list?.filter((i) => i.id !== item.id) ?? null)
      void refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verwijderen is niet gelukt.')
    }
  }

  return (
    <Container narrow className="py-8 sm:py-12">
      <BackLink />
      <PageTitle title="Afmeldingen" intro="Berichten die leden via de pagina Afmelden hebben gestuurd. De nieuwste staan bovenaan." />
      {error && (
        <Notice tone="error" role="alert" className="mb-6">
          {error}
        </Notice>
      )}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && <p className="rounded-xl border border-dashed border-cream-300 p-8 text-center text-lg text-muted">Er zijn geen berichten.</p>}
      {items && items.length > 0 && (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-cream-300 bg-white p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-semibold break-words text-navy-900">{item.namen}</p>
                  <p className="text-muted">{formatDateTime(item.receivedAt)}</p>
                </div>
                <Button variant="danger" className="min-h-11 px-4" onClick={() => remove(item)}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Verwijderen
                </Button>
              </div>
              <p className="mt-3 text-lg break-words whitespace-pre-line">{item.bericht}</p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
