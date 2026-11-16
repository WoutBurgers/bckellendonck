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
  /** 'header': first row holds column names. 'numbered': the club's numbered list without column names. */
  format: 'header' | 'numbered'
  columns: ParsedColumn[]
  /** `line` is the line number in the original file, for clear messages. */
  rows: { line: number; cells: string[] }[]
  /** Rows that contain data but were not imported, with a Dutch reason. */
  skipped: { line: number; reason: string }[]
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
      // Loaded on first use: only needed when the administrator uploads a members list.
      const { readSheet } = await import('read-excel-file/node')
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

  const headerHasName = header.some((label) => {
    const field = classify(label)?.field
    return field === 'naam' || field === 'achternaam' || field === 'voornaam'
  })
  if (!headerHasName) {
    const numbered = parseNumberedList(table)
    if (numbered) return numbered
  }

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
      'De leden konden niet worden herkend. Gebruik de ledenlijst van de club (genummerd, met achternaam, voornaam, adres, postcode, woonplaats, telefoon en e-mail), of zet in de eerste regel kolomnamen met in elk geval "Naam" (of "Voornaam" en "Achternaam").',
    )
  }

  const rows: ParsedFile['rows'] = []
  table.forEach((r, i) => {
    if (i <= headerIndex || !r.some(Boolean)) return
    rows.push({ line: i + 1, cells: Array.from({ length: width }, (_, c) => r[c] ?? '') })
  })
  if (rows.length === 0) throw new MemberFileError('Het bestand bevat wel kolomnamen, maar geen leden.')
  if (rows.length > MAX_ROWS) throw new MemberFileError(`Het bestand bevat meer dan ${MAX_ROWS} leden.`)
  return { format: 'header', columns, rows, skipped: [] }
}

const isNumber = (v: string) => /^\d{1,4}$/.test(v)
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)
const isPostcode = (v: string) => /^\d{4}\s?[a-z]{2}$/i.test(v)
const isPhone = (v: string) => /^[+\d][\d\s\-()]{8,16}$/.test(v) && v.replace(/\D/g, '').length >= 9
const isMobile = (v: string) => /^(06|\+316|00316)/.test(v.replace(/[\s\-()]/g, ''))

/**
 * The club's own members list: no column names, a member number in the first column, then
 * surname, first name (with prefix, e.g. "Jan van"), address, postcode, town, phone, mobile, e-mail.
 * Columns are recognised by their content, so the list keeps working if a column moves.
 * Returns null when the table does not look like such a list.
 */
function parseNumberedList(table: string[][]): ParsedFile | null {
  const width = Math.max(...table.map((r) => r.length))
  const valuesOf = (c: number) => table.map((r) => r[c] ?? '').filter(Boolean)
  const share = (c: number, test: (v: string) => boolean) => {
    const vals = valuesOf(c)
    return vals.length ? vals.filter(test).length / vals.length : 0
  }

  const cols = Array.from({ length: width }, (_, c) => c).filter((c) => valuesOf(c).length > 0)
  const nrCol = cols.find((c) => share(c, isNumber) >= 0.8)
  const emailCol = cols.find((c) => share(c, isEmail) >= 0.6)
  const postcodeCol = cols.find((c) => share(c, isPostcode) >= 0.6)
  const phoneCols = cols.filter((c) => c !== nrCol && share(c, isPhone) >= 0.6)
  const textCols = cols.filter((c) => c !== nrCol && c !== emailCol && c !== postcodeCol && !phoneCols.includes(c))

  const [lastCol, firstCol] = textCols
  // A members list has names plus at least some contact details.
  if (firstCol === undefined || (emailCol === undefined && postcodeCol === undefined && phoneCols.length === 0)) return null

  const labels = new Map<number, string>([
    [lastCol, 'Achternaam'],
    [firstCol, 'Voornaam'],
  ])
  if (postcodeCol !== undefined) {
    labels.set(postcodeCol, 'Postcode')
    if (textCols.includes(postcodeCol - 1) && !labels.has(postcodeCol - 1)) labels.set(postcodeCol - 1, 'Adres')
    if (textCols.includes(postcodeCol + 1) && !labels.has(postcodeCol + 1)) labels.set(postcodeCol + 1, 'Woonplaats')
  }
  for (const c of phoneCols) {
    const label = share(c, isMobile) >= 0.6 ? 'Mobiel' : 'Telefoon'
    labels.set(c, [...labels.values()].includes(label) ? `${label} (2)` : label)
  }
  if (emailCol !== undefined) labels.set(emailCol, 'E-mail')

  const columns: ParsedColumn[] = cols
    .filter((c) => c !== nrCol)
    .map((index) => {
      const label = labels.get(index) ?? `Kolom ${String.fromCharCode(65 + (index % 26))}`
      const known = classify(label.replace(/ \(\d+\)$/, ''))
      return { index, label, type: known?.type ?? 'text', recognised: Boolean(known), sensitive: false }
    })

  const rows: ParsedFile['rows'] = []
  const skipped: ParsedFile['skipped'] = []
  table.forEach((r, i) => {
    const hasName = Boolean(r[lastCol] || r[firstCol])
    const hasOther = columns.some((c) => r[c.index])
    if (!hasOther) return // empty row, or a numbered row that is still empty
    if (nrCol !== undefined && !isNumber(r[nrCol] ?? '')) {
      skipped.push({ line: i + 1, reason: 'geen lidnummer (bijvoorbeeld het adres van de speellocatie)' })
      return
    }
    if (!hasName) {
      skipped.push({ line: i + 1, reason: 'geen naam' })
      return
    }
    rows.push({ line: i + 1, cells: Array.from({ length: width }, (_, c) => r[c] ?? '') })
  })
  if (rows.length === 0) return null
  if (rows.length > MAX_ROWS) throw new MemberFileError(`Het bestand bevat meer dan ${MAX_ROWS} leden.`)
  return { format: 'numbered', columns, rows, skipped }
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

/** "4012bc" or "4012BC" -> "4012 BC". */
function fixPostcode(value: string) {
  const m = /^(\d{4})\s?([a-z]{2})$/i.exec(value)
  return m ? `${m[1]} ${m[2].toUpperCase()}` : value
}

/** Phone-book order, so the list sorts by surname: "Berg, Jan van". */
function composeName(last: string, first: string, middle: string) {
  // A prefix typed after the surname ("Bergen van") belongs with the first name: "Bergen, Jan van".
  const trailing = /\s+((?:van|de|der|den|het|'t|ter|ten|in)(?:\s+(?:van|de|der|den|het|'t|ter|ten|in))*)$/i.exec(last)
  if (trailing && !middle) {
    last = last.slice(0, trailing.index)
    middle = trailing[1].toLowerCase()
  }
  const given = [first, middle].filter(Boolean).join(' ')
  return last && given ? `${last}, ${given}` : last || given
}

function nameColumns(parsed: ParsedFile) {
  const part = (f: string) => parsed.columns.find((c) => classify(c.label)?.field === f)
  return { nameCol: parsed.columns.find((c) => c.type === 'name'), first: part('voornaam'), middle: part('tussenvoegsel'), last: part('achternaam') }
}

/** The name as members will see it: the Naam column, or composed from surname and first name. */
export function memberName(parsed: ParsedFile, cells: string[]) {
  const { nameCol, first, middle, last } = nameColumns(parsed)
  const cell = (c: ParsedColumn | undefined) => (c ? cells[c.index] : '')
  return nameCol ? cells[nameCol.index] : composeName(cell(last), cell(first), cell(middle))
}

/** Builds the publishable list from a parsed file and the columns the administrator selected. */
export function buildMemberList(parsed: ParsedFile, selected: number[]) {
  const chosen = parsed.columns.filter((c) => selected.includes(c.index))
  const used = new Set<string>(['naam'])
  const { nameCol, first, middle, last } = nameColumns(parsed)

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
    const naam = memberName(parsed, cells)
    if (!naam) {
      skippedRows.push(line)
      return
    }
    const row: MemberRow = { naam }
    for (const { col, key } of mapping) {
      const raw = cells[col.index]
      const v = col.type === 'phone' ? fixPhone(raw) : classify(col.label)?.field === 'postcode' ? fixPostcode(raw) : raw
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
