import { useParams } from 'react-router'
import { Container } from '../../components/ui'
import NotFound from '../NotFound'
import { DocumentReplacer } from './DocumentReplacer'
import { BackLink, PageTitle } from './parts'
import { useBeheer } from './useBeheer'

export function UitslagenBeheer() {
  const { overview } = useBeheer()
  const results = overview.documents.filter((d) => d.group === 'uitslagen')

  return (
    <Container narrow className="py-8 sm:py-12">
      <BackLink />
      <PageTitle
        title="Uitslagen"
        intro="Kies hieronder welke uitslag u wilt vervangen en klik op “PDF vervangen”. De nieuwe uitslag staat direct op de website."
      />
      <div className="space-y-6">
        {results.map((doc) => (
          <DocumentReplacer key={doc.slug} doc={doc} publicPath={`/uitslagen#${doc.slug}`} />
        ))}
      </div>
    </Container>
  )
}

export function DocumentBeheer() {
  const { slug } = useParams()
  const { overview } = useBeheer()
  const doc = overview.documents.find((d) => d.group === 'club' && d.slug === slug)
  if (!doc) return <NotFound />

  return (
    <Container narrow className="py-8 sm:py-12">
      <BackLink />
      <PageTitle title={doc.title} intro="Het nieuwe bestand staat direct op de pagina Informatie van de website." />
      <DocumentReplacer doc={doc} publicPath={`/informatie#${doc.slug}`} />
    </Container>
  )
}
