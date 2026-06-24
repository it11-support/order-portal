import { CATEGORIES } from './mock-data'

export function getCatEmoji(catId: string) {
  return CATEGORIES.find((c) => c.id === catId)?.emoji ?? '📦'
}

export function fmtDate(value: Date | string) {
  const d = typeof value === 'string' ? new Date(value) : value
  return (
    d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' · ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}
