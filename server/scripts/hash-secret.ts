/**
 * Creates a hash for ADMIN_PASSWORD_HASH (or MEMBERS_PIN_HASH).
 * The secret is typed in hidden and never stored or printed.
 *
 *   npm run hash-secret
 */
import { hashSecret } from '../src/lib/secrets.ts'

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin
    process.stdout.write(question)
    if (!stdin.isTTY) {
      let data = ''
      stdin.setEncoding('utf8')
      stdin.on('data', (chunk) => (data += chunk))
      stdin.on('end', () => resolve(data.split(/\r?\n/)[0] ?? ''))
      return
    }
    let input = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(input)
        }
        if (c === '\u0003') process.exit(1)
        if (c === '\u007f' || c === '\b') input = input.slice(0, -1)
        else input += c
      }
    }
    stdin.on('data', onData)
  })
}

const secret = await askHidden('Wachtwoord of code: ')
if (secret.length < 6) {
  console.error('Gebruik minimaal 6 tekens. Voor het beheer wordt minstens 12 tekens aangeraden.')
  process.exit(1)
}
if (process.stdin.isTTY) {
  const again = await askHidden('Nogmaals ter controle: ')
  if (again !== secret) {
    console.error('De invoer kwam niet overeen.')
    process.exit(1)
  }
}
console.log('\nZet deze waarde als omgevingsvariabele (bijv. ADMIN_PASSWORD_HASH):\n')
console.log(await hashSecret(secret))
