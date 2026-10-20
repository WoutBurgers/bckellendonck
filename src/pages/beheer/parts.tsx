import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../lib/format'

export function BackLink() {
  return (
    <Link to="/beheer" className="link inline-flex min-h-11 items-center gap-2 text-lg">
      <ArrowLeft aria-hidden="true" className="size-5" />
      Terug naar het overzicht
    </Link>
  )
}

interface FilePickerProps {
  accept: string
  label: string
  hint: ReactNode
  onFile: (file: File) => void
  disabled?: boolean
}

/** Large click-or-drop area around a native file input (keyboard accessible). */
export function FilePicker({ accept, label, hint, onFile, disabled }: FilePickerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && !disabled) onFile(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="peer sr-only"
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sage-600',
          dragging ? 'border-navy-600 bg-navy-50' : 'border-navy-200 bg-cream-50 hover:border-navy-600 hover:bg-navy-50',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <Upload aria-hidden="true" className="size-8 text-navy-700" />
        <span className="text-lg font-semibold text-navy-900">{label}</span>
        <span id={`${id}-hint`} className="text-muted">
          {hint}
        </span>
      </label>
    </div>
  )
}

export function PageTitle({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div className="mt-4 mb-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {intro && <div className="mt-3 max-w-2xl text-lg text-muted">{intro}</div>}
    </div>
  )
}
