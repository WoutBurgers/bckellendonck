import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// scrypt with N=2^15, r=8, p=1 (OWASP minimum recommendation), 32-byte key.
const PARAMS = { logN: 15, r: 8, p: 1 }
const KEY_LENGTH = 32

function derive(secret: string, salt: Buffer, logN: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N: 2 ** logN, r, p, maxmem: 256 * 2 ** logN * r * p }
  return new Promise((resolvePromise, reject) =>
    scrypt(secret.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolvePromise(key))),
  )
}

/** Returns a self-describing hash: scrypt$logN$r$p$salt$hash (base64url). */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(secret, salt, PARAMS.logN, PARAMS.r, PARAMS.p)
  return ['scrypt', PARAMS.logN, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, logN, r, p, saltB64, keyB64] = parts
  const expected = Buffer.from(keyB64, 'base64url')
  const n = Number(logN)
  if (!Number.isInteger(n) || n < 14 || n > 20 || expected.length !== KEY_LENGTH) return false
  const actual = await derive(secret, Buffer.from(saltB64, 'base64url'), n, Number(r), Number(p))
  return timingSafeEqual(actual, expected)
}

export function isValidHash(stored: string) {
  return /^scrypt\$\d+\$\d+\$\d+\$[\w-]+\$[\w-]+$/.test(stored)
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}
