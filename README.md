# BC Kellendonck – website en beheer

Website van Bridgeclub Kellendonck (Kerk-Avezaath), met een eenvoudig beheergedeelte (`/beheer`) voor
uitslagen, reglementen, statuten, de ledenlijst en afmeldingen.

Voor de beheerder (zonder technische kennis): zie **[HANDLEIDING-BEHEER.md](HANDLEIDING-BEHEER.md)**.

## Opbouw

```
/            React + TypeScript + Vite + Tailwind CSS 4 (de publieke website)
/server      Node.js + Express + TypeScript (API, inloggen, opslag)
```

Beide draaien in productie als **één service op Railway**.

| Onderdeel | Hoe het werkt |
| --- | --- |
| Pdf's (uitslagen, reglement, statuten) | Geüpload via `/beheer`, opgeslagen in de opslag van de API, publiek via `/api/documents/<naam>` |
| Ledenlijst | Alleen via `GET /api/members` met een geldige sessie na het invullen van de toegangscode |
| Afmeldingen | Opgeslagen door de API en zichtbaar in `/beheer/afmeldingen` (optioneel ook per e-mail) |
| Speelschema | Afbeelding in `public/assets/images/` (nog niet via het beheer aan te passen) |

De website en de API draaien in productie onder **hetzelfde domein**: Railway bouwt de website
(`npm run build` → `dist/`) en de API levert die bestanden zelf uit, naast `/api/*`. Daardoor werken de
inlogcookies in alle browsers (ook Safari) en is er geen CORS of proxy nodig.

### Opslag

Alle gegevens (pdf's, documentinformatie, ledenlijst, instellingen, afmeldingen) staan in één
**privé** opslagplek:

- `STORAGE_DRIVER=s3` (aanbevolen): een S3-compatibele bucket, zoals een Railway Bucket,
  Cloudflare R2 of AWS S3. De bucket hoeft **niet** openbaar te zijn; pdf's worden via de API geleverd.
- `STORAGE_DRIVER=local`: een map op schijf. Alleen geschikt voor productie als `DATA_DIR` op een
  **Railway Volume** staat; anders verdwijnen bestanden bij een nieuwe deploy.

Er is geen aparte database nodig. Opbouw van de opslag:

```
documents/<document>/<uuid>.pdf     pdf's (unieke namen, nooit de bestandsnaam van de gebruiker)
meta/documents.json                 welke versie per document gepubliceerd is (+ 5 vorige versies)
private/members/current.json        ledenlijst
private/members/history/*.json     vorige versies (voor "terugzetten", max. 10)
private/settings.json               hash van de toegangscode voor leden
private/afmeldingen/*.json          afmeldberichten
```

Bij de eerste start worden de pdf's van de oude website (`server/seed/documents/`) automatisch geïmporteerd.

## Lokaal ontwikkelen

Vereist: Node.js 22.18 of nieuwer (24 aanbevolen).

```bash
npm install
npm install --prefix server

# Eenmalig: beheerderswachtwoord instellen
npm --prefix server run hash-secret          # typ een wachtwoord; kopieer de hash
cp server/.env.example server/.env           # zet de hash bij ADMIN_PASSWORD_HASH,
                                             # STORAGE_DRIVER=local en NODE_ENV leeg laten

# Twee terminals:
npm run dev:server     # API op http://localhost:3001 (bestanden in server/data/)
npm run dev            # website op http://localhost:5173 (stuurt /api door naar de API)
```

Open daarna http://localhost:5173/beheer en log in met het gekozen wachtwoord.

### Controleren

```bash
npm run build              # typecheck + productiebuild van de website
npm run typecheck:server   # typecheck van de API
npm run test:server        # 24 API-tests (inloggen, uploads, toegangscode, sessies, …)
```

De API-tests kunnen ook tegen een echte S3-opslag draaien, bijvoorbeeld MinIO in Docker:

```bash
docker run -d -p 9010:9000 -e MINIO_ROOT_USER=bcktest -e MINIO_ROOT_PASSWORD=bcktest-secret-123 minio/minio server /data
TEST_S3_ENDPOINT=http://localhost:9010 TEST_S3_ACCESS_KEY=bcktest TEST_S3_SECRET_KEY=bcktest-secret-123 npm run test:server
```

## In productie zetten (Railway)

`railway.json` in de hoofdmap regelt de build en de start:

- **Build:** `npm run build:railway` — bouwt de website naar `dist/` en installeert de API-pakketten.
- **Start:** `npm start` — start de API, die ook de website uit `dist/` serveert.
- **Healthcheck:** `/api/health`.

Er is geen aparte buildstap voor de API: Node voert de TypeScript-code direct uit.

1. Maak een nieuw project in Railway en kies **Deploy from GitHub repo** met deze repository.
   Laat **Settings → Root Directory** leeg (de hoofdmap van de repository).
2. Opslag, kies één van de twee:
   - **Bucket (aanbevolen):** maak in hetzelfde project een Bucket aan (of gebruik Cloudflare R2) en zet
     `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID` en
     `S3_SECRET_ACCESS_KEY` met de gegevens van die bucket.
   - **Volume:** koppel een Volume aan de service (bijv. op `/data`) en zet `STORAGE_DRIVER=local` en
     `DATA_DIR=/data`.
3. Zet de overige variabelen (zie `server/.env.example`), minimaal:
   - `NODE_ENV=production`
   - `ADMIN_PASSWORD_HASH=` de hash uit `npm --prefix server run hash-secret`
   - `TRUST_PROXY=1` (de Railway-proxy; dit is ook de standaard)
4. Maak onder **Networking** een publiek domein aan (of koppel een eigen domein).
5. Controleer: `https://<domein>/api/health` geeft `{"ok":true}`, de homepage laadt en `/beheer` toont
   het inlogscherm.

Elke push naar de gekoppelde branch bouwt en start de website en de API opnieuw. Na een nieuwe pdf of
ledenlijst is **geen** nieuwe deploy nodig.

### Website apart hosten (optioneel)

Als de website toch ergens anders staat en de API rechtstreeks op een ander domein aanroept: zet bij de
website `VITE_API_URL=https://<api-domein>` en bij de API `CORS_ORIGINS=https://<website-domein>` en
`COOKIE_SAMESITE=none`. Let op: sommige browsers blokkeren cookies van andere domeinen, dus één domein is
sterk aan te raden.

## Wachtwoorden en toegangscode

- **Beheerderswachtwoord:** `npm --prefix server run hash-secret`, typ het wachtwoord (wordt niet getoond),
  zet de uitvoer als `ADMIN_PASSWORD_HASH` in Railway en herstart. Wijzigen gaat op dezelfde manier.
  Kies minstens 12 tekens. Het wachtwoord zelf wordt nergens opgeslagen.
- **Toegangscode ledenlijst:** stelt de beheerder in via **Beheer → Ledenlijst → Toegangscode voor leden**
  (6–12 cijfers). Na een wijziging moeten alle leden de nieuwe code invullen. Alternatief: een hash als
  `MEMBERS_PIN_HASH` (wordt alleen gebruikt zolang er in het beheer geen code is ingesteld).

## Beveiliging (samenvatting)

- Wachtwoord en toegangscode alleen als **scrypt-hash** (N=2¹⁵), vergelijking in constante tijd.
- Sessies: willekeurige 256-bit tokens in **HttpOnly**-cookies (`Secure` in productie, `SameSite=Strict`
  voor beheer, `Lax` voor leden), pad `/api`. Beheer verloopt na 60 min zonder activiteit (max. 12 uur),
  ledenlijst na 30 min (max. 8 uur). Sessies staan in het geheugen: na een herstart opnieuw inloggen.
- **Brute-force-bescherming** op inloggen en toegangscode: na 5 fouten een oplopende blokkade per IP
  (30 s, 1 min, 2 min … tot 1 uur), plus een globale stop (100 foute codes per uur → 15 min geen
  pogingen), zodat raden via veel IP-adressen ook niet helpt.
- **CSRF:** elke wijzigende aanvraag moet de header `X-BCK-Request: 1` hebben; formulieren van andere
  sites kunnen die niet meesturen.
- Vertrouwelijke antwoorden (`/api/admin`, `/api/members`) krijgen `Cache-Control: no-store`.
- Uploads: maximaal één bestand, grootte begrensd (`MAX_UPLOAD_MB`), inhoud gecontroleerd op een echte
  pdf (`%PDF-` … `%%EOF`). Opslag onder een nieuwe UUID; de oude versie blijft staan tot de nieuwe is
  opgeslagen en gecontroleerd. Bestandsnamen worden alleen getoond, nooit als pad gebruikt.
- Ledenlijst: alleen de kolommen die de beheerder aanvinkt worden opgeslagen; mogelijk gevoelige kolommen
  (IBAN, geboortedatum, …) staan standaard uit en krijgen een waarschuwing. Alle tekst wordt opgeschoond
  en als platte tekst getoond. Het geüploade bestand zelf wordt niet bewaard.
- Logs bevatten geen ledengegevens of berichtinhoud; fouten geven geen stacktraces aan bezoekers.

## Nog open / bekende punten

- **Speelschema** is nog een vaste afbeelding; vervangen vereist nu een codewijziging. Kan later
  eenvoudig aan het beheer worden toegevoegd.
- **E-mail bij afmeldingen** werkt alleen met een (gratis) Resend-account (`RESEND_API_KEY`,
  `AFMELDEN_EMAIL_TO`, en een geverifieerd afzenderdomein voor `AFMELDEN_EMAIL_FROM`). Zonder die
  instelling staan afmeldingen alleen in het beheer.
- Op de oude site verwees "Uitslag slemcompetitie" naar hetzelfde bestand als "Uitslag laatste zitting";
  dat bestand is zo overgenomen en kan via het beheer worden vervangen.
- Het logo vermeldt "Sinds 1978", terwijl de clubgeschiedenis 16 september 1998 noemt.
