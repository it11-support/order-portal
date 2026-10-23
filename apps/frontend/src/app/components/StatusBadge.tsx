import type { OrderStatus, RequestKind } from '@repo/shared'

export const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  confirmed: { label: 'Confirm', bg: 'bg-blue-100', text: 'text-blue-700' },
  processing: { label: 'Processing', bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Ditolak', bg: 'bg-red-100', text: 'text-red-700' },
  ready: { label: 'Siap Dipesan', bg: 'bg-teal-100', text: 'text-teal-700' },
  converted: { label: 'Jadi Pesanan', bg: 'bg-green-100', text: 'text-green-700' },
}

/**
 * What each status means for the customer, per list.
 *
 * An inquiry has fewer steps than an order because a price only has to land: the
 * portal opens the inquiry by itself once every item carries a price of its own,
 * so nobody has to press a button to make it orderable. The customer-facing
 * wording therefore says who is holding the step up, which is the only thing
 * they can act on.
 */
export const QUOTE_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Menunggu sales',
  pending: 'Menunggu sales',
  processing: 'Menunggu harga dari sistem',
  ready: 'Harga siap — silakan pesan',
  converted: 'Sudah jadi pesanan',
  delivered: 'Selesai',
  confirmed: 'Deal / Harga ditawarkan',
  cancelled: 'Ditolak',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending: 'Menunggu konfirmasi',
  processing: 'Diproses',
  confirmed: 'Dikonfirmasi',
  delivered: 'Selesai',
  cancelled: 'Ditolak',
  ready: 'Siap dipesan',
  converted: 'Sudah jadi pesanan',
}

/** The ordered steps of an inquiry, used for the progress strip. */
export const QUOTE_STEPS: OrderStatus[] = ['pending', 'processing', 'ready']

/** The ordered steps of an order, used for the progress strip. */
export const ORDER_STEPS: OrderStatus[] = ['pending', 'confirmed', 'processing', 'delivered']

export const stepsFor = (kind?: RequestKind): OrderStatus[] =>
  kind === 'quote' ? QUOTE_STEPS : ORDER_STEPS

export const StatusBadge = ({ status, kind }: { status: OrderStatus; kind?: string }) => {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${s.bg} ${s.text}`}
    >
      {kind === 'quote' ? QUOTE_STATUS_LABELS[status] : ORDER_STATUS_LABELS[status]}
    </span>
  )
}

/**
 * Where a request currently sits in its own flow.
 *
 * Terminal states are reported as such instead of being drawn as a step, so the
 * strip never claims progress that did not happen.
 */
export const StatusSteps = ({ status, kind }: { status: OrderStatus; kind?: RequestKind }) => {
  const steps = stepsFor(kind)
  if (status === 'cancelled' || status === 'converted') return null

  const currentIndex = steps.indexOf(status)
  if (currentIndex === -1) return null

  return (
    <ol className="relative pl-6 space-y-3">
      {steps.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        const isLast = index === steps.length - 1
        return (
          <li key={step} className="relative flex gap-3">
            <span className="flex flex-col items-center shrink-0" style={{ width: 10 }}>
              <span
                className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${
                  active
                    ? 'bg-accent border-accent'
                    : done
                      ? 'bg-accent/40 border-accent/40'
                      : 'bg-white border-border'
                }`}
              />
              {!isLast && (
                <span
                  className={`w-0.5 flex-1 rounded-full min-h-[1.5rem] ${
                    done ? 'bg-accent/40' : 'bg-border'
                  }`}
                />
              )}
            </span>
            <div className="flex flex-col pt-0.5">
              <span
                className={`text-[11px] leading-tight font-bold ${
                  active ? 'text-foreground' : done ? 'text-foreground/70' : 'text-muted-foreground'
                }`}
              >
                {kind === 'quote' ? QUOTE_STATUS_LABELS[step] : ORDER_STATUS_LABELS[step]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {active ? 'Sekarang' : done ? 'Selesai' : 'Menunggu'}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
