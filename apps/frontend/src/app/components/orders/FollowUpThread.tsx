import type { ComponentProps, ReactNode, RefObject } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ConversationThread } from '@components'
import type { FollowUpNote } from '@repo/shared'

type Props = {
  notes: FollowUpNote[]
  viewerId?: ComponentProps<typeof ConversationThread>['viewerId']
  open: boolean
  onToggle: () => void
  threadRef: RefObject<HTMLDivElement>
  emptyLabel: string
  children: ReactNode
}

export default function FollowUpThread({
  notes,
  viewerId,
  open,
  onToggle,
  threadRef,
  emptyLabel,
  children,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-bold">
          Follow up
          {notes.length > 0 && (
            <span className="ml-1.5 font-semibold text-muted-foreground">{notes.length}</span>
          )}
        </span>

        {open ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          <div
            ref={threadRef}
            className="mt-3 min-h-40 max-h-105 overflow-y-auto rounded-xl border border-border p-3"
          >
            <ConversationThread notes={notes} viewerId={viewerId} emptyLabel={emptyLabel} />
          </div>

          {children}
        </>
      )}
    </div>
  )
}
