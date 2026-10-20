import { createContext, useContext } from 'react'
import type { DocumentSlug } from '../../data/documents'

export interface AdminDocument {
  slug: DocumentSlug
  title: string
  group: 'uitslagen' | 'club'
  current: { fileName: string; size: number; uploadedAt: string; seeded: boolean; url: string } | null
  previous: { fileName: string; uploadedAt: string } | null
}

export interface Overview {
  documents: AdminDocument[]
  members: {
    count: number
    updatedAt: string | null
    fileName: string | null
    previousVersions: number
    pinSet: boolean
    pinUpdatedAt: string | null
  }
  afmeldingen: { count: number; latest: string | null }
  limits: { maxUploadMb: number; maxMembersFileMb: number }
}

export interface BeheerContextValue {
  overview: Overview
  /** Reloads the overview after a change. */
  refresh: () => Promise<void>
  /** API call that sends the user back to the login screen when the session has expired. */
  call: <T>(path: string, opts?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; json?: unknown; form?: FormData }) => Promise<T>
}

export const BeheerContext = createContext<BeheerContextValue | null>(null)

export function useBeheer() {
  const value = useContext(BeheerContext)
  if (!value) throw new Error('useBeheer must be used inside BeheerLayout')
  return value
}
