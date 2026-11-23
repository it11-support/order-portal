import { Decimal } from '@/generated/prisma/internal/prismaNamespace'

type DecimalLike = {
  toNumber: () => number
}

const isDecimalLike = (value: unknown): value is DecimalLike =>
  value !== null &&
  typeof value === 'object' &&
  'toNumber' in value &&
  typeof value.toNumber === 'function'

export const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  if (isDecimalLike(value)) {
    const result = value.toNumber()
    return Number.isFinite(result) ? result : null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const result = Number(value)
    return Number.isFinite(result) ? result : null
  }

  throw new TypeError(`Invalid price value: ${Object.prototype.toString.call(value)}`)
}

export const round6 = (value: number) => new Decimal(value).toDecimalPlaces(6).toNumber()

export const formatPrice = (value: number, currency: string | null) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 2,
  }).format(value)
