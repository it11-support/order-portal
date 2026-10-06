import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '../ui/utils'

/**
 * The reply box of a conversation, shaped like the one people already know.
 *
 * One field, one send button sitting inside it, and Enter to send: a composer
 * that needs a second tap to submit is a composer people abandon. The field
 * grows to two lines and then scrolls, so a long message never pushes the
 * thread off the screen, and Shift+Enter still breaks a line when a message
 * genuinely needs one.
 */
export type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  /** Extra controls shown above the field, such as internal/customer toggle. */
  header?: ReactNode
  autoFocus?: boolean
  className?: string
}

const MAX_HEIGHT = 72 // two lines plus the field's own padding

export const ChatComposer = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ketik pesan...',
  disabled = false,
  maxLength = 2000,
  header,
  autoFocus = false,
  className,
}: ChatComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSubmit = !disabled && value.trim().length > 0

  // Height follows the content, up to the cap, so a cleared field shrinks back
  // to a single line instead of leaving a gap where the message used to be.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    // Enter sends, unless the composer is already empty or still working.
    if (!canSubmit) return
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className={cn('rounded-2xl border border-border bg-white px-3 py-2', className)}>
      {header}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          maxLength={maxLength}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          aria-label="Kirim pesan"
          className="mb-0.5 shrink-0 rounded-xl bg-accent p-1.5 text-white transition-colors hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground"
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}