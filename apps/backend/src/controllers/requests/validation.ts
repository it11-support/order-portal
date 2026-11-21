import { isRecord, parseProductId, parseQuantity } from "./item-validations"

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

type ValidationResult = { ok: true; data: CreateRequestInput } | { ok: false; message: string }

const invalid = (message: string) => ({
  ok: false as const,
  message,
})

const validateFields = (input: Record<string, unknown>): string | null => {
  const { kind, items, notes = '', priceAccepted = false, inquiryId, status } = input

  if (status === 'draft' && kind !== 'order') {
    return 'Draft hanya tersedia untuk order.'
  }

  const validKind = kind === 'order' || kind === 'quote'
  const validItems = Array.isArray(items) && items.length >= 1 && items.length <= 200

  const validNotes = typeof notes === 'string' && notes.length <= 5000

  const validStatus = status === undefined || status === 'draft' || status === 'pending'

  const validInquiry = inquiryId == null || typeof inquiryId === 'string'

  if (
    !validKind ||
    !validItems ||
    !validNotes ||
    typeof priceAccepted !== 'boolean' ||
    !validStatus ||
    !validInquiry
  ) {
    return 'Permintaan tidak valid.'
  }

  return null
}


const normalizeItems = (
  items: unknown[],
  kind: 'order' | 'quote',
): { ok: true; data: CreateRequestInput['items'] } | { ok: false; message: string } => {
  const ids = new Set<string>()
  const normalized: CreateRequestInput['items'] = []

  for (const item of items) {
    if (!isRecord(item)) {
      return invalid('Produk atau jumlah tidak valid.')
    }

    const productId = parseProductId(item.productId)

    if (!productId) {
      return invalid('Produk atau jumlah tidak valid.')
    }

    const qty = parseQuantity(item.qty)

    if (kind === 'order' && qty === null) {
      return invalid('Produk atau jumlah tidak valid.')
    }

    if (ids.has(productId)) {
      return invalid('Produk duplikat.')
    }

    ids.add(productId)

    normalized.push({
      productId,
      qty: kind === 'order'
        ? qty!
        : typeof item.qty === 'number'
          ? item.qty
          : undefined,
    })
  }

  return { ok: true, data: normalized }
}


export const validateRequestInput = (body: unknown): ValidationResult => {
  const input = isRecord(body) ? body : {}

  const error = validateFields(input)

  if (error) return invalid(error)

  // validateFields has checked these values at runtime.
  const kind = input.kind as 'order' | 'quote'
  const items = input.items as unknown[]

  const normalized = normalizeItems(items, kind)

  if (!normalized.ok) {
    return invalid(normalized.message)
  }

  return {
    ok: true,
    data: {
      kind,
      items: normalized.data,
      notes: (input.notes as string | undefined) ?? '',
      priceAccepted: (input.priceAccepted as boolean | undefined) ?? false,
      inquiryId: typeof input.inquiryId === 'string' ? input.inquiryId : undefined,
      status: input.status === 'draft' ? 'draft' : 'pending',
    },
  }
}
