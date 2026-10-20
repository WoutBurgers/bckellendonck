import type { ReactNode } from 'react'
import { Container, SuitMark, type Suit } from './ui'

interface PageHeaderProps {
  title: string
  intro?: ReactNode
  suit?: Suit
  narrow?: boolean
  children?: ReactNode
}

export function PageHeader({ title, intro, suit = 'spade', narrow, children }: PageHeaderProps) {
  return (
    <div className="border-b border-cream-300 bg-cream-100">
      <Container narrow={narrow} className="py-10 sm:py-14">
        <h1 className="flex items-baseline gap-3 text-4xl font-semibold sm:text-5xl">
          <SuitMark suit={suit} className="text-3xl sm:text-4xl" />
          <span>{title}</span>
        </h1>
        {intro && <div className="mt-4 max-w-2xl text-lg text-muted sm:text-xl">{intro}</div>}
        {children}
      </Container>
    </div>
  )
}
