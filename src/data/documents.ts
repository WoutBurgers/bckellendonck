/** Slugs of the documents managed in /beheer. The files themselves live on the server. */
export type DocumentSlug =
  | 'uitslag-laatste-zitting'
  | 'uitslag-parencompetitie'
  | 'uitslag-slemcompetitie'
  | 'paren-a-en-b-lijn'
  | 'wedstrijdreglement'
  | 'statuten'

export interface DocumentInfo {
  slug: DocumentSlug
  title: string
  description: string
  emptyText: string
}

export const uitslagen: DocumentInfo[] = [
  {
    slug: 'uitslag-laatste-zitting',
    title: 'Uitslag laatste zitting',
    description: 'Klik op het PDF-bestandje om de zittinguitslag te openen.',
    emptyText: 'De uitslag is nog niet beschikbaar.',
  },
  {
    slug: 'uitslag-parencompetitie',
    title: 'Uitslag parencompetitie',
    description: 'Klik op het PDF-bestandje om de parencompetitie uitslag te openen.',
    emptyText: 'De uitslag is nog niet beschikbaar.',
  },
  {
    slug: 'uitslag-slemcompetitie',
    title: 'Uitslag slemcompetitie',
    description: 'Klik op het PDF-bestandje om de slemcompetitie uitslag te openen.',
    emptyText: 'De uitslag is nog niet beschikbaar.',
  },
  {
    slug: 'paren-a-en-b-lijn',
    title: 'Paren in de A- en de B-lijn',
    description: 'Klik op het PDF-bestandje om de paren in de A- en B-lijn te openen.',
    emptyText: 'De indeling is nog niet beschikbaar.',
  },
]

export const wedstrijdreglement: DocumentInfo = {
  slug: 'wedstrijdreglement',
  title: 'Wedstrijdreglement',
  description: 'Klik op het bestandje om de reglementen te openen.',
  emptyText: 'Het wedstrijdreglement is nog niet beschikbaar.',
}

export const statuten: DocumentInfo = {
  slug: 'statuten',
  title: 'Statuten',
  description: 'Klik op het bestandje om de statuten te openen.',
  emptyText: 'De statuten zijn nog niet beschikbaar.',
}

export const speelschema = {
  title: 'Speelschema seizoen 2026–2027',
  image: '/assets/images/speelschema-2026-2027.png',
  width: 563,
  height: 628,
  alt: 'Speelschema van 2 september 2026 tot en met 28 april 2027, met per woensdag de datum, speeldag, ronde, de computerbeheerder en de paren die klaarzetten en opruimen. Bijzondere avonden zijn in rood aangegeven, zoals vrij bridgen, de algemene ledenvergadering, de maaltijd met kerstdrive en de paasdrive.',
}
