
type RequestKind = 'order' | 'quote'
type RequestStatus = 'draft' | 'pending'

export type CreateRequestInput = {
  kind: RequestKind
  items: {
    productId: string
    qty?: number
  }[]
  notes: string
  priceAccepted: boolean
  inquiryId?: string
  status: RequestStatus
}

type ValidationResult =
  | { ok: true; data: CreateRequestInput }
  | { ok: false; message: string }

export const validateRequestInput = (
  body: unknown,
): ValidationResult => {
  const input =
    body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {}

  const {
    kind,
    items,
    notes = '',
    priceAccepted = false,
    inquiryId,
    status,
  } = input

  const requestedStatus: RequestStatus =
    status === 'draft' ? 'draft' : 'pending'

  if (requestedStatus === 'draft' && kind !== 'order') {
    return {
      ok: false,
      message: 'Draft hanya tersedia untuk order.',
    }
  }

  if (
    (kind !== 'order' && kind !== 'quote') ||
    !Array.isArray(items) ||
    !items.length ||
    items.length > 200 ||
    typeof notes !== 'string' ||
    notes.length > 5000 ||
    typeof priceAccepted !== 'boolean' ||
    (status !== undefined &&
      status !== 'draft' &&
      status !== 'pending') ||
    (inquiryId !== undefined &&
      inquiryId !== null &&
      typeof inquiryId !== 'string')
  ) {
    return {
      ok: false,
      message: 'Permintaan tidak valid.',
    }
  }

  const ids = new Set<string>()
  const normalizedItems: CreateRequestInput['items'] = []

  for (const item of items) {
    if (
      !item ||
      typeof item !== 'object' ||
      !/^\d+$/.test(String(item.productId))
    ) {
      return {
        ok: false,
        message: 'Produk atau jumlah tidak valid.',
      }
    }

    if (
      kind === 'order' &&
      (!Number.isSafeInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 100000)
    ) {
      return {
        ok: false,
        message: 'Produk atau jumlah tidak valid.',
      }
    }

    const productId = BigInt(String(item.productId)).toString()

    if (ids.has(productId)) {
      return {
        ok: false,
        message: 'Produk duplikat.',
      }
    }

    ids.add(productId)
    normalizedItems.push({
      productId,
      qty: typeof item.qty === 'number' ? item.qty : undefined,
    })
  }

  return {
    ok: true,
    data: {
      kind,
      items: normalizedItems,
      notes,
      priceAccepted,
      inquiryId: typeof inquiryId === 'string'
        ? inquiryId
        : undefined,
      status: requestedStatus,
    },
  }
}
