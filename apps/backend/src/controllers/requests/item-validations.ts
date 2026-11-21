
export const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

export const parseProductId = (value: unknown): string | null => {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'bigint'
  ) {
    return null
  }

  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    return null
  }

  const id = String(value)

  if (!/^\d+$/.test(id)) return null

  const normalized = BigInt(id)

  return normalized > 0n ? normalized.toString() : null
}

export const parseQuantity = (value: unknown): number | null =>
  typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 100000
    ? value
    : null

export const hasDuplicateProductIds = (
  items: ReadonlyArray<{ productId: string }>,
): boolean =>
  new Set(items.map((item) => item.productId)).size !== items.length
