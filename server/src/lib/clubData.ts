import { randomUUID } from 'node:crypto'
import { withLock } from './mutex.ts'
import { readJson, writeJson, type Storage } from './storage.ts'
import type { MemberColumn, MemberRow } from './memberFile.ts'

export interface MemberList {
  columns: MemberColumn[]
  rows: MemberRow[]
  updatedAt: string
  source: 'upload' | 'edit' | 'restore'
  fileName?: string
}

interface Settings {
  membersPinHash?: string
  membersPinUpdatedAt?: string
}

export interface Afmelding {
  id: string
  namen: string
  bericht: string
  receivedAt: string
}

const MEMBERS_KEY = 'private/members/current.json'
const MEMBERS_HISTORY = 'private/members/history/'
const SETTINGS_KEY = 'private/settings.json'
const AFMELDINGEN = 'private/afmeldingen/'
const MEMBERS_HISTORY_LIMIT = 10

/** Members list, settings and absence messages. Everything here is private (never served statically). */
export class ClubData {
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  members() {
    return readJson<MemberList>(this.storage, MEMBERS_KEY)
  }

  async memberHistory() {
    const keys = (await this.storage.list(MEMBERS_HISTORY)).reverse()
    const versions = []
    for (const key of keys.slice(0, 3)) {
      const list = await readJson<MemberList>(this.storage, key)
      if (list) versions.push({ updatedAt: list.updatedAt, count: list.rows.length })
    }
    return { count: keys.length, recent: versions }
  }

  /** Saves a new list; the previous one is archived first so it can be restored. */
  async saveMembers(list: Omit<MemberList, 'updatedAt'>) {
    return withLock(MEMBERS_KEY, async () => {
      const current = await this.members()
      if (current) {
        await writeJson(this.storage, `${MEMBERS_HISTORY}${Date.now()}-${randomUUID().slice(0, 8)}.json`, current)
        const keys = await this.storage.list(MEMBERS_HISTORY)
        for (const old of keys.slice(0, Math.max(0, keys.length - MEMBERS_HISTORY_LIMIT))) await this.storage.delete(old)
      }
      const saved: MemberList = { ...list, updatedAt: new Date().toISOString() }
      await writeJson(this.storage, MEMBERS_KEY, saved)
      return saved
    })
  }

  /** Undo: puts back the most recent archived list. */
  async restorePreviousMembers() {
    return withLock(MEMBERS_KEY, async () => {
      const keys = await this.storage.list(MEMBERS_HISTORY)
      const lastKey = keys.at(-1)
      if (!lastKey) return null
      const previous = await readJson<MemberList>(this.storage, lastKey)
      if (!previous) return null
      const restored: MemberList = { ...previous, source: 'restore', updatedAt: new Date().toISOString() }
      // The list being replaced is not archived, so repeated undo walks back through history.
      await writeJson(this.storage, MEMBERS_KEY, restored)
      await this.storage.delete(lastKey)
      return restored
    })
  }

  async settings() {
    return (await readJson<Settings>(this.storage, SETTINGS_KEY)) ?? {}
  }

  async setMembersPinHash(hash: string) {
    await withLock(SETTINGS_KEY, async () => {
      const settings = await this.settings()
      await writeJson(this.storage, SETTINGS_KEY, { ...settings, membersPinHash: hash, membersPinUpdatedAt: new Date().toISOString() })
    })
  }

  async addAfmelding(namen: string, bericht: string) {
    const item: Afmelding = { id: randomUUID(), namen, bericht, receivedAt: new Date().toISOString() }
    await writeJson(this.storage, `${AFMELDINGEN}${Date.now()}-${item.id}.json`, item)
    return item
  }

  async afmeldingen(limit = 100) {
    const keys = (await this.storage.list(AFMELDINGEN)).reverse().slice(0, limit)
    const items: (Afmelding & { key: string })[] = []
    for (const key of keys) {
      const item = await readJson<Afmelding>(this.storage, key)
      if (item) items.push({ ...item, key })
    }
    return items
  }

  async deleteAfmelding(id: string) {
    if (!/^[0-9a-f-]{36}$/.test(id)) return false
    const key = (await this.storage.list(AFMELDINGEN)).find((k) => k.endsWith(`-${id}.json`))
    if (!key) return false
    await this.storage.delete(key)
    return true
  }
}
