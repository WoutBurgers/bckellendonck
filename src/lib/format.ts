/** Turns a Dutch number like "06 – 50 63 00 59" or "0344-681469" into a tel: href. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `tel:${digits.startsWith('0') ? `+31${digits.slice(1)}` : digits}`
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function formatDate(iso: string | null | undefined) {
  return iso ? dateFormat.format(new Date(iso)) : ''
}

export function formatDateTime(iso: string | null | undefined) {
  return iso ? dateTimeFormat.format(new Date(iso)).replace(' om ', ', ') : ''
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`
  return `${(bytes / 1024 / 1024).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} MB`
}

export function isPhone(value: string) {
  return /^[+\d][\d\s\-()–]{5,}$/.test(value)
}

export function isEmail(value: string) {
  return /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i.test(value)
}
