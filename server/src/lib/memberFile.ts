import { readSheet } from 'read-excel-file/node'

export type ColumnType = 'name' | 'phone' | 'email' | 'text'

export interface MemberColumn {
  key: string
  label: string
  type: ColumnType
}

export type MemberRow = Record<string, string>

export interface ParsedColumn {
  index: number
  label: string
  type: ColumnType
  /** Recognised as a common, needed field and therefore pre-selected. */
  recognised: boolean
  /** Header suggests sensitive data that a members list normally does not need. */
  sensitive: boolean
}

export interface ParsedFile {
  columns: ParsedColumn[]
  /** `line` is the line number in the original file, for clear messages. */
  rows: { line: number; cells: string[] }[]
}

export class MemberFileError extends Error {}

export const MAX_ROWS = 1000
export const MAX_COLUMNS = 30
export const MAX_CELL = 200

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')

const KNOWN: Record<string, { type: ColumnType; names: string[] }> = {
  naam: { type: 'name', names: ['naam', 'namen', 'name', 'lid', 'volledigenaam', 'naamlid'] },
  voornaam: { type: 'text', names: ['voornaam', 'roepnaam', 'firstname'] },
  tussenvoegsel: { type: 'text', names: ['tussenvoegsel', 'tussenv', 'tv'] },
  achternaam: { type: 'text', names: ['achternaam', 'familienaam', 'lastname'] },
  telefoon: { type: 'phone', names: ['telefoon', 'telefoonnummer', 'tel', 'telnr', 'phone', 'vast', 'vastnummer'] },
  mobiel: { type: 'phone', names: ['mobiel', 'mobielnummer', 'gsm', '06', 'mobiel06', 'mobile'] },
  email: { type: 'email', names: ['email', 'emailadres', 'mail', 'mailadres'] },
  adres: { type: 'text', names: ['adres', 'straat', 'straatenhuisnummer', 'address'] },
  postcode: { type: 'text', names: ['postcode', 'zip'] },
  woonplaats: { type: 'text', names: ['woonplaats', 'plaats', 'stad', 'city'] },
  partner: { type: 'text', names: ['partner', 'bridgepartner', 'vastepartner'] },
}

const SENSITIVE = ['iban', 'rekening', 'bank', 'geboort', 'bsn', 'leeftijd', 'medisch', 'wachtwoord', 'pin', 'opmerking']

function classify(label: string) {
  const n = norm(label)
  for (const [field, def] of Object.entries(KNOWN)) if (def.names.includes(n)) return { field, type: def.type }
  return null
}

/** Removes control characters and collapses whitespace. Values are always plain text. */
export function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
  return s
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CELL)
}

function decodeText(buf: Buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\ufeff/, '')
  } catch {
    // Dutch Excel saves CSV as Windows-1252 by default.
    return new TextDecoder('windows-1252').decode(buf)
  }
}

export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = [';', ',', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ';')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === delimiter) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
    if (rows.length > MAX_ROWS + 50) throw new MemberFileError(`Het bestand heeft meer dan ${MAX_ROWS} regels.`)
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function looksLikeXlsx(buf: Buffer) {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
}

export async function parseMemberFile(buf: Buffer, fileName: string): Promise<ParsedFile> {
  if (buf.length === 0) throw new MemberFileError('Het gekozen bestand is leeg.')
  const lower = fileName.toLowerCase()

  let raw: unknown[][]
  if (looksLikeXlsx(buf)) {
    try {
      // parseNumber keeps numbers as text so phone numbers keep their leading zero where possible.
      raw = (await readSheet(buf, { parseNumber: (s: string) => s })) as unknown[][]
    } catch {
      throw new MemberFileError('Dit Excel-bestand kon niet worden gelezen. Sla het opnieuw op als .xlsx en probeer het nog eens.')
    }
  } else if (lower.endsWith('.xls')) {
    throw new MemberFileError('Oude Excel-bestanden (.xls) worden niet ondersteund. Sla het bestand op als .xlsx of .csv.')
  } else if (lower.endsWith('.csv') || lower.endsWith('.txt') || !buf.subarray(0, 512).includes(0)) {
    raw = parseCsv(decodeText(buf))
  } else {
    throw new MemberFileError('Dit bestandstype wordt niet ondersteund. Gebruik een Excel-bestand (.xlsx) of een CSV-bestand.')
  }

  const table = raw.map((r) => r.map(cleanCell))
  const headerIndex = table.findIndex((r) => r.some(Boolean))
  if (headerIndex === -1) throw new MemberFileError('Het bestand bevat geen gegevens.')

  const header = table[headerIndex]
  const width = header.length
  if (width > MAX_COLUMNS) throw new MemberFileError(`Het bestand heeft te veel kolommen (maximaal ${MAX_COLUMNS}).`)

  const columns: ParsedColumn[] = []
  const seen = new Set<string>()
  header.forEach((label, index) => {
    if (!label) return
    let unique = label
    for (let n = 2; seen.has(unique.toLowerCase()); n++) unique = `${label} (${n})`
    seen.add(unique.toLowerCase())
    const known = classify(label)
    columns.push({
      index,
      label: unique,
      type: known?.type ?? 'text',
      recognised: Boolean(known),
      sensitive: !known && SENSITIVE.some((s) => norm(label).includes(s)),
    })
  })

  const hasName = columns.some((c) => c.type === 'name')
  const hasParts = ['voornaam', 'achternaam'].every((f) => columns.some((c) => classify(c.label)?.field === f))
  if (!hasName && !hasParts) {
    throw new MemberFileError(
      'De kolom "Naam" ontbreekt. Zorg dat de eerste regel van het bestand de kolomnamen bevat, met in elk geval een kolom "Naam" (of "Voornaam" en "Achternaam").',
    )
  }

  const rows: ParsedFile['rows'] = []
  table.forEach((r, i) => {
    if (i <= headerIndex || !r.some(Boolean)) return
    rows.push({ line: i + 1, cells: Array.from({ length: width }, (_, c) => r[c] ?? '') })
  })
  if (rows.length === 0) throw new MemberFileError('Het bestand bevat wel kolomnamen, maar geen leden.')
  if (rows.length > MAX_ROWS) throw new MemberFileError(`Het bestand bevat meer dan ${MAX_ROWS} leden.`)
  return { columns, rows }
}

function keyFor(label: string, used: Set<string>) {
  const base = norm(label).slice(0, 30) || 'kolom'
  let key = base
  for (let n = 2; used.has(key); n++) key = `${base}${n}`
  used.add(key)
  return key
}

function fixPhone(value: string) {
  // Excel drops the leading zero of mobile numbers stored as numbers: 612345678 -> 0612345678.
  return /^[1-9]\d{8}$/.test(value) ? `0${value}` : value
}

/** Builds the publishable list from a parsed file and the columns the administrator selected. */
export function buildMemberList(parsed: ParsedFile, selected: number[]) {
  const chosen = parsed.columns.filter((c) => selected.includes(c.index))
  const used = new Set<string>(['naam'])
  const nameCol = chosen.find((c) => c.type === 'name')
  const part = (f: string) => parsed.columns.find((c) => classify(c.label)?.field === f)
  const first = part('voornaam')
  const middle = part('tussenvoegsel')
  const last = part('achternaam')

  const columns: MemberColumn[] = [{ key: 'naam', label: 'Naam', type: 'name' }]
  const mapping: { col: ParsedColumn; key: string }[] = []
  for (const col of chosen) {
    if (col === nameCol) continue
    // When the name is composed from parts, the parts are not shown separately.
    if (!nameCol && (col === first || col === middle || col === last)) continue
    const key = keyFor(col.label, used)
    columns.push({ key, label: col.label, type: col.type === 'name' ? 'text' : col.type })
    mapping.push({ col, key })
  }

  const rows: MemberRow[] = []
  const skippedRows: number[] = []
  parsed.rows.forEach(({ line, cells }) => {
    const naam = nameCol
      ? cells[nameCol.index]
      : [first, middle, last].map((c) => (c ? cells[c.index] : '')).filter(Boolean).join(' ')
    if (!naam) {
      skippedRows.push(line)
      return
    }
    const row: MemberRow = { naam }
    for (const { col, key } of mapping) {
      const v = col.type === 'phone' ? fixPhone(cells[col.index]) : cells[col.index]
      if (v) row[key] = v
    }
    rows.push(row)
  })
  return { columns, rows, skippedRows }
}

/** Validates a list sent by the dashboard editor. Throws MemberFileError with a Dutch message. */
export function validateMemberList(input: unknown): { columns: MemberColumn[]; rows: MemberRow[] } {
  const data = input as { columns?: unknown; rows?: unknown }
  if (!data || !Array.isArray(data.columns) || !Array.isArray(data.rows)) throw new MemberFileError('Ongeldige gegevens.')
  if (data.columns.length === 0 || data.columns.length > MAX_COLUMNS) throw new MemberFileError('Ongeldig aantal kolommen.')
  if (data.rows.length > MAX_ROWS) throw new MemberFileError(`Maximaal ${MAX_ROWS} leden.`)

  const keys = new Set<string>()
  const columns: MemberColumn[] = data.columns.map((c: unknown) => {
    const col = c as Partial<MemberColumn>
    const key = String(col.key ?? '')
    const label = cleanCell(col.label)
    if (!/^[a-z0-9]{1,32}$/.test(key) || keys.has(key) || !label) throw new MemberFileError('Ongeldige kolom.')
    if (!['name', 'phone', 'email', 'text'].includes(col.type as string)) throw new MemberFileError('Ongeldig kolomtype.')
    keys.add(key)
    return { key, label, type: col.type as ColumnType }
  })
  if (columns[0]?.key !== 'naam' || columns[0].type !== 'name') throw new MemberFileError('De eerste kolom moet "Naam" zijn.')

  const rows = data.rows.map((r: unknown, i: number) => {
    if (!r || typeof r !== 'object') throw new MemberFileError(`Regel ${i + 1} is ongeldig.`)
    const row: MemberRow = {}
    for (const { key } of columns) {
      const v = cleanCell((r as Record<string, unknown>)[key])
      if (v) row[key] = v
    }
    if (!row.naam) throw new MemberFileError(`Regel ${i + 1} heeft geen naam. Vul een naam in of verwijder de regel.`)
    return row
  })
  return { columns, rows }
}
