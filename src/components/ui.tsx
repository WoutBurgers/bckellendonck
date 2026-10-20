import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { cn } from '../lib/format'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'light' | 'onDark' | 'danger'
type ButtonSize = 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-navy-900 text-cream-50 hover:bg-navy-700 active:bg-navy-950',
  secondary: 'border border-navy-200 bg-white text-navy-900 hover:border-navy-600 hover:bg-navy-50',
  ghost: 'text-navy-800 underline-offset-4 hover:bg-navy-50',
  light: 'bg-cream-50 text-navy-900 hover:bg-white',
  onDark: 'text-white ring-1 ring-white/40 ring-inset hover:bg-white/10',
  danger: 'border border-card-100 bg-white text-card-700 hover:border-card-600 hover:bg-card-50',
}

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
}

export function buttonClasses(variant: ButtonVariant = 'primary', className?: string, size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg py-2 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({ variant, size, loading, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, className, size)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className, size)} {...props} />
}

export function Container({ className, narrow, children }: { className?: string; narrow?: boolean; children: ReactNode }) {
  return <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', narrow ? 'max-w-3xl' : 'max-w-6xl', className)}>{children}</div>
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8', className)}>{children}</div>
}

const suitGlyph = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' } as const
export type Suit = keyof typeof suitGlyph

/** A single decorative card suit. Hearts and diamonds use the restrained red accent. */
export function SuitMark({ suit, className }: { suit: Suit; className?: string }) {
  const red = suit === 'heart' || suit === 'diamond'
  return (
    <span aria-hidden="true" className={cn('font-serif leading-none', red ? 'text-card-600' : 'text-navy-800', className)}>
      {suitGlyph[suit]}
    </span>
  )
}

export function SuitRow({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex gap-1.5 text-base', className)}>
      <SuitMark suit="spade" />
      <SuitMark suit="heart" />
      <SuitMark suit="diamond" />
      <SuitMark suit="club" />
    </span>
  )
}

interface SectionHeadingProps {
  title: string
  intro?: ReactNode
  id?: string
  suit?: Suit
  align?: 'left' | 'center'
  as?: 'h2' | 'h3'
  className?: string
}

export function SectionHeading({ title, intro, id, suit, align = 'left', as: Tag = 'h2', className }: SectionHeadingProps) {
  return (
    <div className={cn('mb-8 max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <Tag id={id} className={cn('flex items-baseline gap-3 text-3xl font-semibold sm:text-[2.25rem]', align === 'center' && 'justify-center')}>
        {suit && <SuitMark suit={suit} className="text-2xl" />}
        <span className="min-w-0">{title}</span>
      </Tag>
      {intro && <div className="mt-3 text-lg text-muted">{intro}</div>}
    </div>
  )
}

type NoticeTone = 'info' | 'warning' | 'success' | 'error'

const noticeTones: Record<NoticeTone, string> = {
  info: 'border-navy-200 bg-navy-50 text-navy-900',
  warning: 'border-cream-300 bg-cream-100 text-ink',
  success: 'border-sage-200 bg-sage-50 text-sage-800',
  error: 'border-card-100 bg-card-50 text-card-700',
}

interface NoticeProps {
  tone?: NoticeTone
  icon?: ReactNode
  title?: string
  children?: ReactNode
  className?: string
  role?: 'status' | 'alert'
}

export function Notice({ tone = 'info', icon, title, children, className, role }: NoticeProps) {
  return (
    <div role={role} className={cn('flex gap-3 rounded-lg border p-4 text-base', noticeTones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-1')}>{children}</div>}
      </div>
    </div>
  )
}

export function Spinner({ label = 'Bezig met laden…', className }: { label?: string; className?: string }) {
  return (
    <p role="status" className={cn('flex items-center gap-3 text-muted', className)}>
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-navy-700" />
      {label}
    </p>
  )
}
