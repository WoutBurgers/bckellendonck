import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import writeXlsxFile from 'write-excel-file/node'
import { createApp } from '../src/app.ts'
import type { Config } from '../src/config.ts'
import { assertKey, createStorage, type Storage } from '../src/lib/storage.ts'
import { hashSecret } from '../src/lib/secrets.ts'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'

const ADMIN_PASSWORD = 'test-beheer-wachtwoord'

/**
 * By default the suite uses local storage. Set TEST_S3_ENDPOINT (plus TEST_S3_ACCESS_KEY / TEST_S3_SECRET_KEY)
 * to run the same tests against an S3-compatible server such as MinIO.
 */
async function storageConfig(dataDir: string): Promise<Config['storage']> {
  const endpoint = process.env.TEST_S3_ENDPOINT
  if (!endpoint) return { driver: 'local', dataDir }
  const credentials = { accessKeyId: process.env.TEST_S3_ACCESS_KEY ?? '', secretAccessKey: process.env.TEST_S3_SECRET_KEY ?? '' }
  const bucket = `bck-test-${Date.now()}`
  await new S3Client({ region: 'us-east-1', endpoint, forcePathStyle: true, credentials }).send(new CreateBucketCommand({ Bucket: bucket }))
  return { driver: 's3', bucket, region: 'us-east-1', endpoint, forcePathStyle: true, ...credentials }
}

function pdf(text: string) {
  return Buffer.from(`%PDF-1.4\n1 0 obj << /Title (${text}) >> endobj\ntrailer << >>\n%%EOF\n`)
}

/** Minimal cookie-aware client. `ip` simulates different visitors via X-Forwarded-For. */
class Client {
  cookies = new Map<string, string>()
  base: string
  ip: string
  constructor(base: string, ip = '10.0.0.1') {
    this.base = base
    this.ip = ip
  }
  async req(method: string, path: string, opts: { json?: unknown; form?: FormData; csrf?: boolean } = {}) {
    const headers: Record<string, string> = { 'X-Forwarded-For': this.ip }
    if (opts.csrf !== false) headers['X-BCK-Request'] = '1'
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    let body: string | FormData | undefined
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(opts.json)
    } else if (opts.form) body = opts.form
    const res = await fetch(this.base + path, { method, headers, body })
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';')
      const [name, value] = pair.split('=')
      if (value) this.cookies.set(name, value)
      else this.cookies.delete(name)
    }
    return res
  }
  async upload(path: string, buf: Buffer, name: string) {
    const form = new FormData()
    form.append('bestand', new Blob([new Uint8Array(buf)]), name)
    return this.req('POST', path, { form })
  }
}

async function startServer(config: Config, storage: Storage) {
  const { app, ctx } = createApp(config, storage)
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return { server, ctx, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
}

describe('BC Kellendonck API', () => {
  let dataDir: string
  let config: Config
  let storage: Storage
  let server: Server
  let base: string

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'bck-test-'))
    config = {
      production: false,
      port: 0,
      trustProxy: 1,
      adminPasswordHash: await hashSecret(ADMIN_PASSWORD),
      membersPinHash: '',
      storage: await storageConfig(dataDir),
      maxUploadBytes: 50 * 1024,
      maxMembersFileBytes: 200 * 1024,
      corsOrigins: [],
      cookieSameSite: 'lax',
      secureCookies: false,
      adminSessionMs: 60_000,
      adminSessionMaxMs: 120_000,
      memberSessionMs: 1500,
      memberSessionMaxMs: 60_000,
    }
    storage = createStorage(config.storage)
    ;({ server, base } = await startServer(config, storage))
  })

  after(async () => {
    server.close()
    await rm(dataDir, { recursive: true, force: true })
  })

  it('rejects state-changing requests without the CSRF header', async () => {
    const res = await new Client(base).req('POST', '/api/admin/login', { json: { wachtwoord: ADMIN_PASSWORD }, csrf: false })
    assert.equal(res.status, 403)
  })

  it('protects every admin endpoint', async () => {
    const anon = new Client(base)
    for (const [method, path] of [
      ['GET', '/api/admin/overview'],
      ['GET', '/api/admin/members'],
      ['PUT', '/api/admin/members-pin'],
      ['POST', '/api/admin/documents/statuten'],
      ['GET', '/api/admin/afmeldingen'],
    ]) {
      const res = await anon.req(method, path, method === 'GET' ? {} : { json: {} })
      assert.equal(res.status, 401, `${method} ${path}`)
    }
  })

  it('rejects a wrong admin password and accepts the right one', async () => {
    const c = new Client(base, '10.0.0.2')
    assert.equal((await c.req('POST', '/api/admin/login', { json: { wachtwoord: 'fout' } })).status, 401)
    const ok = await c.req('POST', '/api/admin/login', { json: { wachtwoord: ADMIN_PASSWORD } })
    assert.equal(ok.status, 200)
    const setCookie = ok.headers.getSetCookie().join(';')
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Strict/i)
    assert.equal((await c.req('GET', '/api/admin/overview')).status, 200)
    await c.req('POST', '/api/admin/logout')
    assert.equal((await c.req('GET', '/api/admin/overview')).status, 401)
  })

  it('locks out repeated wrong admin passwords', async () => {
    const c = new Client(base, '10.0.0.3')
    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await c.req('POST', '/api/admin/login', { json: { wachtwoord: 'x' } })).status)
    assert.deepEqual(statuses.slice(0, 4), [401, 401, 401, 401])
    assert.equal(statuses.at(-1), 429)
    // Even the correct password is refused during the lockout.
    assert.equal((await c.req('POST', '/api/admin/login', { json: { wachtwoord: ADMIN_PASSWORD } })).status, 429)
  })

  describe('documents', () => {
    const admin = new Client('', '10.0.1.1')
    before(async () => {
      admin.base = base
      await admin.req('POST', '/api/admin/login', { json: { wachtwoord: ADMIN_PASSWORD } })
    })

    it('shows a friendly empty state before anything is published', async () => {
      const res = await fetch(`${base}/api/documents/statuten`)
      assert.equal(res.status, 404)
      const list = (await (await fetch(`${base}/api/documents`)).json()) as { documents: { available: boolean }[] }
      assert.equal(list.documents.length, 6)
      assert.ok(list.documents.every((d) => !d.available))
    })

    it('publishes each document independently', async () => {
      const slugs = ['uitslag-laatste-zitting', 'uitslag-parencompetitie', 'uitslag-slemcompetitie', 'paren-a-en-b-lijn', 'wedstrijdreglement', 'statuten']
      for (const slug of slugs) {
        const res = await admin.upload(`/api/admin/documents/${slug}`, pdf(slug), `${slug} v1.pdf`)
        assert.equal(res.status, 200, slug)
      }
      for (const slug of slugs) {
        const body = Buffer.from(await (await fetch(`${base}/api/documents/${slug}`)).arrayBuffer()).toString()
        assert.ok(body.includes(`(${slug})`), `${slug} serves its own file`)
      }
    })

    it('replacing one result updates its public link and leaves the others alone', async () => {
      const before = (await (await fetch(`${base}/api/documents`)).json()) as { documents: { slug: string; url: string }[] }
      const res = await admin.upload('/api/admin/documents/uitslag-slemcompetitie', pdf('slem v2'), '../../etc/slem.pdf')
      assert.equal(res.status, 200)
      const { fileName } = (await res.json()) as { fileName: string }
      assert.ok(!fileName.includes('/') && !fileName.includes('..'), fileName)
      const after = (await (await fetch(`${base}/api/documents`)).json()) as { documents: { slug: string; url: string }[] }
      for (const doc of after.documents) {
        const old = before.documents.find((d) => d.slug === doc.slug)!
        if (doc.slug === 'uitslag-slemcompetitie') assert.notEqual(doc.url, old.url)
        else assert.equal(doc.url, old.url)
      }
      const pdfRes = await fetch(base + after.documents.find((d) => d.slug === 'uitslag-slemcompetitie')!.url)
      assert.equal(pdfRes.headers.get('content-type'), 'application/pdf')
      assert.ok((await pdfRes.text()).includes('(slem v2)'))
    })

    it('rejects non-PDF, empty and oversized files without touching the published one', async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
      assert.equal((await admin.upload('/api/admin/documents/statuten', png, 'nep.pdf')).status, 400)
      assert.equal((await admin.upload('/api/admin/documents/statuten', Buffer.alloc(0), 'leeg.pdf')).status, 400)
      const big = Buffer.concat([pdf('groot'), Buffer.alloc(60 * 1024, 32)])
      assert.equal((await admin.upload('/api/admin/documents/statuten', big, 'groot.pdf')).status, 413)
      assert.equal((await admin.upload('/api/admin/documents/bestaat-niet', pdf('x'), 'x.pdf')).status, 404)
      const text = await (await fetch(`${base}/api/documents/statuten`)).text()
      assert.ok(text.includes('(statuten)'))
    })

    it('can undo a replacement', async () => {
      assert.equal((await admin.req('POST', '/api/admin/documents/uitslag-slemcompetitie/restore')).status, 200)
      const text = await (await fetch(`${base}/api/documents/uitslag-slemcompetitie`)).text()
      assert.ok(text.includes('(uitslag-slemcompetitie)'))
    })

    it('does not allow path traversal', async () => {
      assert.equal((await fetch(`${base}/api/documents/..%2F..%2Fprivate%2Fsettings.json`)).status, 404)
      assert.equal((await fetch(`${base}/api/documents/%2e%2e`)).status, 404)
      assert.throws(() => assertKey('documents/../private/x'))
      assert.throws(() => assertKey('/etc/passwd'))
    })
  })

  describe('members list', () => {
    const admin = new Client('', '10.0.2.1')
    const PIN = '481529'
    before(async () => {
      admin.base = base
      await admin.req('POST', '/api/admin/login', { json: { wachtwoord: ADMIN_PASSWORD } })
    })

    it('is not reachable without a session', async () => {
      const res = await fetch(`${base}/api/members`)
      assert.equal(res.status, 401)
      assert.equal(res.headers.get('cache-control'), 'no-store')
      const body = await res.text()
      assert.ok(!body.includes('rows'))
    })

    it('reports that no PIN is configured yet', async () => {
      assert.equal((await new Client(base, '10.0.2.2').req('POST', '/api/members/auth', { json: { pin: '123456' } })).status, 503)
    })

    it('refuses weak PINs and the admin password', async () => {
      for (const pin of ['1234', '111111', '123456', 'abcdef']) {
        assert.equal((await admin.req('PUT', '/api/admin/members-pin', { json: { pin } })).status, 400, pin)
      }
      assert.equal((await admin.req('PUT', '/api/admin/members-pin', { json: { pin: PIN } })).status, 200)
      const stored = await storage.get('private/settings.json')
      assert.ok(stored && !stored.toString().includes(PIN), 'PIN is stored hashed only')
    })

    it('previews a CSV, asks before publishing extra columns and publishes only selected columns', async () => {
      const csv = 'Naam;Telefoon;E-mail;IBAN\r\nJan Jansen;0612345678;jan@example.nl;NL00BANK0123456789\r\n;;;\r\nPiet "de Bridger" Pietersen;0344-111111;;\r\n=CMD();;;\r\n'
      const preview = await admin.upload('/api/admin/members/preview', Buffer.from(csv, 'utf8'), 'leden.csv')
      assert.equal(preview.status, 200)
      const p = (await preview.json()) as { draftId: string; rowCount: number; columns: { index: number; label: string; recommended: boolean; sensitive: boolean }[] }
      assert.equal(p.rowCount, 3)
      const iban = p.columns.find((c) => c.label === 'IBAN')!
      assert.equal(iban.recommended, false)
      assert.equal(iban.sensitive, true)

      // Nothing is public before publishing.
      assert.equal(((await (await admin.req('GET', '/api/admin/members')).json()) as { rows: unknown[] }).rows.length, 0)

      const selected = p.columns.filter((c) => c.recommended).map((c) => c.index)
      const pub = await admin.req('POST', '/api/admin/members/publish', { json: { draftId: p.draftId, columns: selected } })
      assert.equal(pub.status, 200)
      const list = (await (await admin.req('GET', '/api/admin/members')).json()) as { columns: { key: string }[]; rows: Record<string, string>[] }
      assert.deepEqual(list.columns.map((c) => c.key), ['naam', 'telefoon', 'email'])
      assert.equal(list.rows.length, 3)
      assert.ok(!JSON.stringify(list).includes('NL00BANK'))
      // Formula-like text is kept as inert text; it is only ever rendered as text.
      assert.equal(list.rows[2].naam, '=CMD()')
    })

    it('rejects a file without a name column, with a Dutch message', async () => {
      const res = await admin.upload('/api/admin/members/preview', Buffer.from('Telefoon\n0612345678\n'), 'fout.csv')
      assert.equal(res.status, 400)
      assert.match(((await res.json()) as { error: string }).error, /Naam/)
    })

    it('reads Excel files and restores the leading zero of mobile numbers', async () => {
      const xlsx = await writeXlsxFile([
        [{ value: 'Voornaam' }, { value: 'Achternaam' }, { value: 'Mobiel' }],
        [{ value: 'Henny' }, { value: 'Voorbeeld' }, { value: 612345678, type: Number }],
      ]).toBuffer()
      const preview = await admin.upload('/api/admin/members/preview', xlsx, 'leden.xlsx')
      assert.equal(preview.status, 200)
      const p = (await preview.json()) as { draftId: string; columns: { index: number; recommended: boolean }[] }
      const pub = await admin.req('POST', '/api/admin/members/publish', {
        json: { draftId: p.draftId, columns: p.columns.filter((c) => c.recommended).map((c) => c.index) },
      })
      assert.equal(pub.status, 200)
      const list = (await (await admin.req('GET', '/api/admin/members')).json()) as { rows: Record<string, string>[] }
      assert.deepEqual(list.rows, [{ naam: 'Henny Voorbeeld', mobiel: '0612345678' }])
    })

    it('can undo an accidental replacement', async () => {
      assert.equal((await admin.req('POST', '/api/admin/members/undo')).status, 200)
      const list = (await (await admin.req('GET', '/api/admin/members')).json()) as { rows: unknown[] }
      assert.equal(list.rows.length, 3)
    })

    it('saves edits from the table editor with server-side validation', async () => {
      const current = (await (await admin.req('GET', '/api/admin/members')).json()) as { columns: unknown[]; rows: Record<string, string>[] }
      const bad = await admin.req('PUT', '/api/admin/members', { json: { columns: current.columns, rows: [...current.rows, { naam: '' }] } })
      assert.equal(bad.status, 400)
      const rows = [...current.rows, { naam: 'Nieuw Lid', telefoon: '06 1111 2222' }]
      assert.equal((await admin.req('PUT', '/api/admin/members', { json: { columns: current.columns, rows } })).status, 200)
    })

    it('rejects wrong PINs and rate-limits repeated attempts', async () => {
      const guesser = new Client(base, '10.0.2.50')
      const statuses = []
      for (let i = 0; i < 7; i++) statuses.push((await guesser.req('POST', '/api/members/auth', { json: { pin: String(100000 + i) } })).status)
      assert.ok(statuses.slice(0, 4).every((s) => s === 401))
      assert.equal(statuses.at(-1), 429)
      assert.equal((await guesser.req('POST', '/api/members/auth', { json: { pin: PIN } })).status, 429)
      assert.equal((await guesser.req('GET', '/api/members')).status, 401)
    })

    it('grants access with the right PIN, and logout or expiry removes it', async () => {
      const member = new Client(base, '10.0.2.60')
      const auth = await member.req('POST', '/api/members/auth', { json: { pin: PIN } })
      assert.equal(auth.status, 200)
      const res = await member.req('GET', '/api/members')
      assert.equal(res.status, 200)
      assert.equal(res.headers.get('cache-control'), 'no-store')
      assert.equal(((await res.json()) as { rows: unknown[] }).rows.length, 4)

      await member.req('POST', '/api/members/logout')
      assert.equal((await member.req('GET', '/api/members')).status, 401)

      await member.req('POST', '/api/members/auth', { json: { pin: PIN } })
      await new Promise((r) => setTimeout(r, 1700)) // member idle timeout is 1.5 s in this test
      assert.equal((await member.req('GET', '/api/members')).status, 401)
    })

    it('a stolen or made-up cookie does not work', async () => {
      const c = new Client(base, '10.0.2.61')
      c.cookies.set('bck_leden', 'verzonnen-token')
      assert.equal((await c.req('GET', '/api/members')).status, 401)
    })

    it('changing the PIN signs out everyone who used the old one', async () => {
      const member = new Client(base, '10.0.2.70')
      await member.req('POST', '/api/members/auth', { json: { pin: PIN } })
      assert.equal((await admin.req('PUT', '/api/admin/members-pin', { json: { pin: '738204' } })).status, 200)
      assert.equal((await member.req('GET', '/api/members')).status, 401)
      assert.equal((await member.req('POST', '/api/members/auth', { json: { pin: PIN } })).status, 401)
      assert.equal((await member.req('POST', '/api/members/auth', { json: { pin: '738204' } })).status, 200)
    })
  })

  describe('afmeldingen', () => {
    it('stores a message the admin can read, rejects honeypot and floods', async () => {
      const visitor = new Client(base, '10.0.3.1')
      assert.equal((await visitor.req('POST', '/api/afmeldingen', { json: { namen: '', bericht: 'x' } })).status, 400)
      assert.equal((await visitor.req('POST', '/api/afmeldingen', { json: { namen: 'Bot', bericht: 'spam', website: 'http://spam' } })).status, 400)
      assert.equal((await visitor.req('POST', '/api/afmeldingen', { json: { namen: 'Jan en Truus', bericht: 'Woensdag 4 november kunnen wij niet.' } })).status, 201)
      const statuses = []
      for (let i = 0; i < 5; i++) statuses.push((await visitor.req('POST', '/api/afmeldingen', { json: { namen: 'Jan', bericht: `bericht ${i}` } })).status)
      assert.equal(statuses.at(-1), 429)

      const admin = new Client(base, '10.0.3.2')
      await admin.req('POST', '/api/admin/login', { json: { wachtwoord: ADMIN_PASSWORD } })
      const { items } = (await (await admin.req('GET', '/api/admin/afmeldingen')).json()) as { items: { id: string; namen: string }[] }
      assert.ok(items.some((i) => i.namen === 'Jan en Truus'))
      assert.equal((await admin.req('DELETE', `/api/admin/afmeldingen/${items[0].id}`)).status, 200)
    })
  })

  it('keeps documents, members and the PIN after a restart', async () => {
    server.close()
    const restarted = await startServer(config, createStorage(config.storage))
    server = restarted.server
    const docs = (await (await fetch(`${restarted.base}/api/documents`)).json()) as { documents: { available: boolean }[] }
    assert.ok(docs.documents.every((d) => d.available))
    const member = new Client(restarted.base, '10.0.4.1')
    assert.equal((await member.req('POST', '/api/members/auth', { json: { pin: '738204' } })).status, 200)
    assert.equal(((await (await member.req('GET', '/api/members')).json()) as { rows: unknown[] }).rows.length, 4)
  })
})
