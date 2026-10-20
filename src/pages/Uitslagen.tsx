import { DocumentCard } from '../components/DocumentCard'
import { PageHeader } from '../components/PageHeader'
import { Container } from '../components/ui'
import { usePageMeta } from '../hooks/usePageMeta'
import { useDocuments } from '../hooks/useDocuments'
import { uitslagen } from '../data/documents'

export default function Uitslagen() {
  usePageMeta(
    'Uitslagen',
    'Bekijk de uitslag van de laatste zitting, de stand van de parencompetitie en de slemcompetitie en de indeling in de A- en B-lijn van BC Kellendonck.',
  )
  const docs = useDocuments()

  return (
    <>
      <PageHeader
        title="Uitslagen"
        suit="spade"
        intro="Hier vind je de zittinguitslag, de stand van de parencompetitie en de stand van de slemcompetitie."
      >
        <nav aria-label="Uitslagen op deze pagina" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {uitslagen.map((u) => (
              <li key={u.slug}>
                <a
                  href={`#${u.slug}`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-cream-300 bg-cream-50 px-4 font-semibold text-navy-800 transition-colors hover:border-navy-200 hover:bg-white"
                >
                  {u.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      <Container className="py-10 sm:py-14">
        <h2 className="sr-only">Uitslagen als PDF</h2>
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {uitslagen.map((info) => (
            <li key={info.slug} id={info.slug} className="scroll-mt-28">
              <DocumentCard
                info={info}
                published={docs.status === 'ready' ? docs.documents.get(info.slug) : undefined}
                failed={docs.status === 'error'}
                onRetry={docs.retry}
              />
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-muted">
          De uitslagen openen als PDF in een nieuw tabblad. Lukt dat niet? Kies dan “Download” en open het bestand op je
          eigen apparaat.
        </p>
      </Container>
    </>
  )
}
