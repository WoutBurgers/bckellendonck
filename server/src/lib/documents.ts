import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { withLock } from './mutex.ts'
import { readJson, writeJson, type Storage } from './storage.ts'

export type DocumentGroup = 'uitslagen' | 'club'

/** Fixed catalogue: the public site always shows these, with stable URLs per slug. */
export const DOCUMENTS = [
  { slug: 'uitslag-laatste-zitting', title: 'Uitslag laatste zitting', group: 'uitslagen' },
  { slug: 'uitslag-parencompetitie', title: 'Uitslag parencompetitie', group: 'uitslagen' },
  { slug: 'uitslag-slemcompetitie', title: 'Uitslag slemcompetitie', group: 'uitslagen' },
  { slug: 'paren-a-en-b-lijn', title: 'Paren in de A- en de B-lijn', group: 'uitslagen' },
  { slug: 'wedstrijdreglement', title: 'Wedstrijdreglement', group: 'club' },
  { slug: 'statuten', title: 'Statuten', group: 'club' },
] as const satisfies readonly { slug: string; title: string; group: DocumentGroup }[]

export type DocumentSlug = (typeof DOCUMENTS)[number]['slug']

export function findDocument(slug: string) {
  return DOCUMENTS.find((d) => d.slug === slug)
}

export interface DocumentVersion {
  id: string
  key: string
  originalName: string
  size: number
  uploadedAt: string
  /** True for the files carried over from the previous website. */
  seeded?: boolean
}

interface DocumentRecord {
  current: DocumentVersion | null
  history: DocumentVersion[]
}

type DocumentIndex = Partial<Record<DocumentSlug, DocumentRecord>>

const INDEX_KEY = 'meta/documents.json'
const HISTORY_LIMIT = 5

export class UploadError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

/** Checks the actual bytes, never the browser-provided type or filename. */
export function validatePdf(buf: Buffer, maxBytes: number) {
  if (buf.length === 0) throw new UploadError('Het gekozen bestand is leeg.')
  if (buf.length > maxBytes) {
    throw new UploadError(`Het bestand is te groot. Het maximum is ${Math.round(maxBytes / 1024 / 1024)} MB.`, 413)
  }
  const head = buf.subarray(0, 1024).toString('latin1')
  const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString('latin1')
  if (!head.includes('%PDF-') || !tail.includes('%%EOF')) {
    throw new UploadError('Dit is geen geldig PDF-bestand. Kies een bestand dat eindigt op .pdf.')
  }
}

/** Keeps a filename only for display purposes; it is never used as a storage path. */
export function displayName(name: string | undefined) {
  const clean = (name ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '')
    .trim()
    .slice(0, 120)
  return clean || 'document.pdf'
}

export class DocumentStore {
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  async index(): Promise<DocumentIndex> {
    return (await readJson<DocumentIndex>(this.storage, INDEX_KEY)) ?? {}
  }

  async current(slug: DocumentSlug) {
    return (await this.index())[slug]?.current ?? null
  }

  async read(version: DocumentVersion) {
    return this.storage.get(version.key)
  }

  /**
   * Stores the new file under a fresh unique key, verifies it, and only then
   * switches the published reference. The previous version is kept as history.
   */
  async publish(slug: DocumentSlug, buf: Buffer, originalName: string, opts: { seeded?: boolean } = {}) {
    const id = randomUUID()
    const key = `documents/${slug}/${id}.pdf`
    await this.storage.put(key, buf, 'application/pdf')

    const storedSize = await this.storage.size(key)
    if (storedSize !== buf.length) {
      await this.storage.delete(key).catch(() => undefined)
      throw new UploadError('Het bestand kon niet goed worden opgeslagen. Probeer het opnieuw.', 500)
    }

    const version: DocumentVersion = {
      id,
      key,
      originalName: displayName(originalName),
      size: buf.length,
      uploadedAt: new Date().toISOString(),
      ...(opts.seeded ? { seeded: true } : {}),
    }

    try {
      await withLock(INDEX_KEY, async () => {
        const index = await this.index()
        const record = index[slug] ?? { current: null, history: [] }
        if (record.current) record.history.unshift(record.current)
        const removed = record.history.splice(HISTORY_LIMIT)
        record.current = version
        index[slug] = record
        await writeJson(this.storage, INDEX_KEY, index)
        // Old versions beyond the limit are cleaned up only after the new index is saved.
        for (const old of removed) await this.storage.delete(old.key).catch(() => undefined)
      })
    } catch (err) {
      await this.storage.delete(key).catch(() => undefined)
      throw err
    }
    return version
  }

  /** Makes the most recent previous version current again (undo). */
  async restorePrevious(slug: DocumentSlug) {
    return withLock(INDEX_KEY, async () => {
      const index = await this.index()
      const record = index[slug]
      const previous = record?.history[0]
      if (!record || !previous) return null
      if ((await this.storage.size(previous.key)) === null) throw new UploadError('De vorige versie is niet meer beschikbaar.', 409)
      record.history.shift()
      if (record.current) record.history.unshift(record.current)
      record.current = previous
      await writeJson(this.storage, INDEX_KEY, index)
      return previous
    })
  }

  /** Imports the documents from the previous website the first time the server starts. */
  async seed(seedDir: URL, log: (msg: string) => void) {
    const index = await this.index()
    for (const doc of DOCUMENTS) {
      if (index[doc.slug]?.current) continue
      try {
        const buf = await readFile(new URL(`${doc.slug}.pdf`, seedDir))
        validatePdf(buf, Number.MAX_SAFE_INTEGER)
        await this.publish(doc.slug, buf, `${doc.slug}.pdf`, { seeded: true })
        log(`Startdocument geïmporteerd: ${doc.slug}`)
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    }
  }
}
