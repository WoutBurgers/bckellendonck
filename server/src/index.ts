import { loadConfig } from './config.ts'
import { createApp } from './app.ts'
import { createStorage } from './lib/storage.ts'
import { isValidHash } from './lib/secrets.ts'

const config = loadConfig()
const storage = createStorage(config.storage)
const { app, ctx } = createApp(config, storage)

if (config.adminPasswordHash && !isValidHash(config.adminPasswordHash)) {
  throw new Error('ADMIN_PASSWORD_HASH heeft een ongeldig formaat (maak hem aan met: npm run hash-secret)')
}
if (!config.adminPasswordHash) console.warn('Let op: ADMIN_PASSWORD_HASH is niet ingesteld; inloggen in het beheer is uitgeschakeld.')
if (config.production && config.storage.driver === 'local') {
  console.warn('Let op: lokale opslag in productie. Gebruik een persistent volume (DATA_DIR) of STORAGE_DRIVER=s3.')
}

await ctx.docs.seed(new URL('../seed/documents/', import.meta.url), console.log)

app.listen(config.port, () => {
  console.log(`BC Kellendonck API luistert op poort ${config.port} (opslag: ${storage.describe()})`)
})
