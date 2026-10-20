export interface Contact {
  name: string
  /** Only set when the role is stated on the original website. */
  role?: string
  phone: string
  email?: string
  image?: { src: string; alt: string }
}

// Contact details as published on the previous (Wix) website.
export const bestuur: Contact[] = [
  {
    name: 'Bart Staal',
    role: 'Voorzitter',
    phone: '06 – 50 63 00 59',
    email: 'fam.b.staal@gmail.com',
    image: { src: '/assets/images/rol-voorzitter.png', alt: 'Illustratie van een voorzitter achter een spreekgestoelte' },
  },
  {
    name: 'Rob Willemsen',
    phone: '06 – 50 65 16 48',
    email: 'coraenrobwillemsen@gmail.com',
    image: { src: '/assets/images/rol-financien.png', alt: 'Illustratie met geld en grafieken' },
  },
  {
    name: 'Marijke Staal',
    role: 'Secretaresse',
    phone: '06 – 50 63 00 59',
    email: 'fam.b.staal@gmail.com',
    image: { src: '/assets/images/rol-secretaresse.png', alt: 'Illustratie van een secretaresse achter een computer' },
  },
]

export const technischeCommissie: Contact[] = [
  { name: 'Paul Willemsen', phone: '06 – 14 30 72 12' },
  { name: 'Henny Nijenhuis', phone: '06 – 20 66 27 72' },
  { name: 'Margo Hendriks', phone: '06 – 20 26 98 01' },
]

export const liefEnLeed: Contact = { name: 'Janny Schoots', phone: '06 – 14 22 20 92' }

// Short list used in the announcement on the Speelschema page.
export const tcContactpersonen = [
  { name: 'Paul', phone: '06 - 14 30 72 12' },
  { name: 'Margo', phone: '06 - 20 26 98 01' },
  { name: 'Henny', phone: '06 - 20 66 27 72' },
]
