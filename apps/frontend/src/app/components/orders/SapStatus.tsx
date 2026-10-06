import type { SapLink } from '@repo/shared'
import { AlertTriangle, CheckCircle2, CircleDot, XCircle } from 'lucide-react'

/**
 * Where a request stands in the system.
 *
 * The customer follows the document, not an internal promise: Open means the
 * document is still being worked on, Closed means it is finished, Canceled means
 * it will not happen.
 */
const CONFIG: Record<
  SapLink['status'],
  { label: string; icon: JSX.Element; className: string }
> = {
  open: {
    label: 'Open di sistem',
    icon: <CircleDot size={13} />,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  closed: {
    label: 'Closed di sistem',
    icon: <CheckCircle2 size={13} />,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  canceled: {
    label: 'Dibatalkan di sistem',
    icon: <XCircle size={13} />,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  unknown: {
    label: 'Status sistem belum diketahui',
    icon: <AlertTriangle size={13} />,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
}

export const SapStatusBadge = ({ sap }: { sap?: SapLink | null }) => {
  if (!sap?.docEntry) return null
  const config = CONFIG[sap.status] ?? CONFIG.unknown
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${config.className}`}
    >
      {config.icon}
      {config.label}
      {sap.docNum ? ` · ${sap.docNum}` : ''}
    </span>
  )
}