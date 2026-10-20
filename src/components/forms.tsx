import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../lib/format'

export function inputClasses(invalid?: boolean, className?: string) {
  return cn(
    'block w-full rounded-lg border bg-white px-4 py-3 text-lg text-ink transition-colors placeholder:text-muted/80',
    invalid ? 'border-card-600 ring-1 ring-card-600' : 'border-navy-200 hover:border-navy-300',
    className,
  )
}

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  children: ReactNode
}

/** Label, optional hint and error message around a form control. */
export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-lg font-semibold text-navy-900">
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true" className="text-card-700">*</span>
            <span className="sr-only">(verplicht)</span>
          </>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && <FieldError id={`${id}-fout`}>{error}</FieldError>}
    </div>
  )
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 flex items-start gap-2 font-semibold text-card-700">
      <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** aria-describedby for a Field's control. */
export function describedBy(id: string, opts: { hint?: boolean; error?: boolean }) {
  return [opts.hint && `${id}-hint`, opts.error && `${id}-fout`].filter(Boolean).join(' ') || undefined
}
