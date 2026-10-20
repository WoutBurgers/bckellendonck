import type { ReactNode } from 'react'
import { ArrowRight, CircleCheck, FileText, Inbox, TriangleAlert, Users } from 'lucide-react'
import { ButtonLink, Container } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { useBeheer, type AdminDocument } from './useBeheer'

function DocStatus({ doc }: { doc: AdminDocument }) {
  if (!doc.current) {
    return (
      <span className="flex items-center gap-2 text-card-700">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        Nog geen bestand
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-sage-600" />
      {doc.current.seeded ? 'Van de oude website' : `Bijgewerkt op ${formatDate(doc.current.uploadedAt)}`}
    </span>
  )
}

function ManageCard({ icon, title, children, to, action }: { icon: ReactNode; title: string; children: ReactNode; to: string; action: string }) {
  return (
    <li className="flex flex-col rounded-xl border border-cream-300 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-lg bg-navy-50 text-navy-700">{icon}</span>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <div className="mt-4 flex-1 text-lg">{children}</div>
      <ButtonLink to={to} size="lg" className="mt-6 w-full">
        {action}
        <ArrowRight aria-hidden="true" className="size-5" />
      </ButtonLink>
    </li>
  )
}

export default function Dashboard() {
  const { overview } = useBeheer()
  const results = overview.documents.filter((d) => d.group === 'uitslagen')
  const doc = (slug: string) => overview.documents.find((d) => d.slug === slug)!
  const { members } = overview

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold sm:text-4xl">Welkom bij het beheer van BC Kellendonck</h1>
      <p className="mt-3 max-w-2xl text-xl text-muted">
        Hier kunt u de documenten van de website eenvoudig aanpassen. U hoeft hiervoor geen code te kennen.
      </p>

      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        <ManageCard icon={<FileText aria-hidden="true" className="size-6" />} title="Uitslagen" to="/beheer/uitslagen" action="Uitslagen beheren">
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.slug} className="border-b border-cream-200 pb-2 last:border-0 last:pb-0">
                <span className="block font-semibold text-navy-900">{r.title}</span>
                <span className="text-base text-muted">
                  <DocStatus doc={r} />
                </span>
              </li>
            ))}
          </ul>
        </ManageCard>

        <ManageCard icon={<Users aria-hidden="true" className="size-6" />} title="Ledenlijst" to="/beheer/ledenlijst" action="Ledenlijst beheren">
          <p className="font-semibold text-navy-900">{members.count === 0 ? 'Nog geen ledenlijst geplaatst' : `${members.count} leden`}</p>
          {members.updatedAt && <p className="text-muted">Bijgewerkt op {formatDate(members.updatedAt)}</p>}
          <p className={members.pinSet ? 'mt-3 flex items-center gap-2 text-base text-muted' : 'mt-3 flex items-center gap-2 text-base text-card-700'}>
            {members.pinSet ? (
              <CircleCheck aria-hidden="true" className="size-4 text-sage-600" />
            ) : (
              <TriangleAlert aria-hidden="true" className="size-4" />
            )}
            {members.pinSet ? 'Toegangscode voor leden is ingesteld' : 'Er is nog geen toegangscode voor leden'}
          </p>
        </ManageCard>

        {(['wedstrijdreglement', 'statuten'] as const).map((slug) => {
          const d = doc(slug)
          return (
            <ManageCard key={slug} icon={<FileText aria-hidden="true" className="size-6" />} title={d.title} to={`/beheer/document/${slug}`} action="PDF vervangen">
              <p className="font-semibold break-words text-navy-900">{d.current ? d.current.fileName : 'Nog geen bestand geplaatst'}</p>
              <p className="text-base text-muted">
                <DocStatus doc={d} />
              </p>
            </ManageCard>
          )
        })}

        <ManageCard icon={<Inbox aria-hidden="true" className="size-6" />} title="Afmeldingen" to="/beheer/afmeldingen" action="Afmeldingen bekijken">
          <p className="font-semibold text-navy-900">
            {overview.afmeldingen.count === 0 ? 'Geen berichten' : `${overview.afmeldingen.count} ${overview.afmeldingen.count === 1 ? 'bericht' : 'berichten'}`}
          </p>
          {overview.afmeldingen.latest && <p className="text-muted">Laatste op {formatDate(overview.afmeldingen.latest)}</p>}
          <p className="mt-2 text-base text-muted">Berichten die leden via de pagina Afmelden hebben gestuurd.</p>
        </ManageCard>
      </ul>
    </Container>
  )
}
