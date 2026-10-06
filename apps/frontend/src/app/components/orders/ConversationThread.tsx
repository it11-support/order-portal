import type { FollowUpNote } from '@repo/shared'

/**
 * One conversation, oldest first, laid out the way a chat reads.
 *
 * A viewer recognises their own words by position rather than by a label: what
 * they wrote sits on the right, what came back to them on the left. That is why
 * the author name is printed only on the messages they received - repeating it
 * on their own would be noise. Portal notices are centred, because nobody sent
 * them and they belong to neither side of the exchange.
 */

const ROLE_LABEL: Record<string, string> = {
  customer: 'customer',
  admin: 'admin',
  sales_admin: 'sales',
  system: 'sistem',
}

const dayKey = (value: Date | string) => {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const timeOnly = (value: Date | string) => {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const isSystemNote = (note: FollowUpNote) => (note.source ?? 'user') === 'system'

const authorName = (note: FollowUpNote) =>
  note.author?.name?.trim() || note.author?.username || 'Portal'

const roleChip = (note: FollowUpNote) => {
  const role = note.author?.role ?? 'system'
  return `· ${ROLE_LABEL[role] ?? role}`
}

/** Two identities are the same person when the server gave them the same id. */
const isOwnNote = (note: FollowUpNote, viewerId: number | bigint | string | null | undefined) => {
  if (viewerId == null || note.author?.id == null) return false
  return String(note.author.id) === String(viewerId)
}

export type ConversationThreadProps = {
  notes: FollowUpNote[]
  /** The signed-in user, so their own messages can be aligned to the right. */
  viewerId?: number | bigint | string | null
  emptyLabel?: string
  className?: string
}

export const ConversationThread = ({
  notes,
  viewerId,
  emptyLabel = 'Belum ada pesan. Mulai percakapan di bawah.',
  className = '',
}: ConversationThreadProps) => {
  const ordered = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  if (ordered.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  let lastDay = ''

  return (
    <div className={`space-y-2 ${className}`}>
      {ordered.map((note) => {
        const day = dayKey(note.createdAt)
        const showDay = day !== lastDay
        lastDay = day

        if (isSystemNote(note)) {
          return (
            <div key={note.id}>
              {showDay ? <DayDivider label={day} /> : null}
              <div className="flex justify-center py-1">
                <div className="max-w-[85%] rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground text-center">
                  <p className="whitespace-pre-wrap">{note.message}</p>
                  <p className="mt-1 opacity-70">{timeOnly(note.createdAt)}</p>
                </div>
              </div>
            </div>
          )
        }

        const own = isOwnNote(note, viewerId)
        const internal = note.visibility === 'internal'

        return (
          <div key={note.id}>
            {showDay ? <DayDivider label={day} /> : null}
            <div className={`flex ${own ? 'justify-end' : 'justify-start'} py-0.5`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  own
                    ? internal
                      ? 'rounded-br-md bg-amber-100 text-amber-900'
                      : 'rounded-br-md bg-accent text-white'
                    : internal
                      ? 'rounded-bl-md bg-amber-50 border border-amber-200'
                      : 'rounded-bl-md bg-secondary'
                }`}
              >
                {!own && (
                  <p
                    className={`text-xs font-bold ${
                      internal ? 'text-amber-900' : 'text-foreground'
                    }`}
                  >
                    {authorName(note)}
                    <span
                      className={`font-semibold ${
                        internal ? 'text-amber-700' : 'text-muted-foreground'
                      }`}
                    >
                      {' '}
                      {roleChip(note)}
                      {internal ? ' · internal' : ''}
                    </span>
                  </p>
                )}
                {own && internal && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Internal saja
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{note.message}</p>
                <p className={`mt-1 text-[10px] ${own ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {timeOnly(note.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const DayDivider = ({ label }: { label: string }) => {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
