export const club = {
  name: 'BC Kellendonck',
  fullName: 'Bridgeclub Kellendonck',
  tagline: 'Dé bridgeclub van Tiel en omgeving',
  founded: '16 september 1998',
  members: 'ongeveer 65',
  phone: '0344-681469',
  venue: {
    name: 'Dorpshuis De Avezathen',
    street: 'Daver 46',
    postalCode: '4012 BC',
    city: 'Kerk-Avezaath',
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Dorpshuis+De+Avezathen%2C+Daver+46%2C+4012+BC+Kerk-Avezaath',
  },
  evening: {
    day: 'woensdagavond',
    walkIn: '19:15',
    start: '19:30',
    end: '23:00',
  },
} as const

export interface NavItem {
  to: string
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/over-ons', label: 'Over ons' },
  { to: '/speelschema', label: 'Speelschema' },
  { to: '/ledenlijst', label: 'Ledenlijst' },
  { to: '/uitslagen', label: 'Uitslagen' },
  { to: '/informatie', label: 'Informatie' },
  { to: '/afmelden', label: 'Afmelden' },
]

export const joinCta = { to: '/over-ons#kennismaken', label: 'Kom kennismaken' }
