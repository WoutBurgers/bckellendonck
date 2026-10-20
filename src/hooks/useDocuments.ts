import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { DocumentSlug } from '../data/documents'

export interface PublishedDocument {
  slug: DocumentSlug
  title: string
  available: boolean
  updatedAt: string | null
  size: number | null
  url: string | null
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; documents: Map<DocumentSlug, PublishedDocument> }

/** Loads the currently published documents. Always fresh, so a new upload shows up immediately. */
export function useDocuments(): State & { retry: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api<{ documents: PublishedDocument[] }>('/api/documents', { signal: controller.signal })
      .then(({ documents }) => setState({ status: 'ready', documents: new Map(documents.map((d) => [d.slug, d])) }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [attempt])

  return {
    ...state,
    retry: () => {
      setState({ status: 'loading' })
      setAttempt((n) => n + 1)
    },
  }
}
