import { Mail, Phone } from 'lucide-react'
import type { Contact } from '../data/contacts'
import { telHref } from '../lib/format'
import { SuitMark, type Suit } from './ui'

interface ContactCardProps {
  contact: Contact
  /** Shown when the contact has no image. */
  suit?: Suit
}

export function ContactCard({ contact, suit = 'spade' }: ContactCardProps) {
  return (
    <article className="flex h-full gap-4 rounded-xl border border-cream-300 bg-white p-5">
      {contact.image ? (
        <img
          src={contact.image.src}
          alt={contact.image.alt}
          width={72}
          height={72}
          loading="lazy"
          className="size-16 shrink-0 rounded-full object-contain sm:size-[4.5rem]"
        />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-cream-100 text-3xl sm:size-[4.5rem]">
          <SuitMark suit={suit} />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-xl font-semibold">{contact.name}</h3>
        {contact.role && <p className="text-sm font-semibold tracking-wide text-sage-700 uppercase">{contact.role}</p>}
        <ul className="mt-2 space-y-1.5">
          <li>
            <a href={telHref(contact.phone)} className="group inline-flex items-center gap-2 text-navy-800 hover:text-navy-950">
              <Phone aria-hidden="true" className="size-4 shrink-0 text-sage-600" />
              <span className="underline decoration-navy-200 underline-offset-4 group-hover:decoration-navy-600">
                <span className="sr-only">Bel {contact.name}: </span>
                {contact.phone}
              </span>
            </a>
          </li>
          {contact.email && (
            <li>
              <a href={`mailto:${contact.email}`} className="group inline-flex max-w-full items-center gap-2 text-navy-800 hover:text-navy-950">
                <Mail aria-hidden="true" className="size-4 shrink-0 text-sage-600" />
                <span className="[overflow-wrap:anywhere] underline decoration-navy-200 underline-offset-4 group-hover:decoration-navy-600">
                  <span className="sr-only">Mail {contact.name}: </span>
                  {contact.email}
                </span>
              </a>
            </li>
          )}
        </ul>
      </div>
    </article>
  )
}
