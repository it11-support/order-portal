import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import { actorOf, deniedMessage, customerSelect } from '@/services/requests/access'
import type { Actor } from '@/services/requests/access'
import { FLOW, actorRoleName } from '@/services/requests/status-flow'
import { prepareDraftItems, prepareDraftSubmission } from '@/services/requests/draft'
import { publishRequestStatusChange } from '@/services/requests/notifications'
import type {
  PortalRequestGetPayload,
  PortalRequestUpdateManyMutationInput,
} from '@/generated/prisma/models'
import { hasDuplicateProductIds, isRecord, parseProductId, parseQuantity } from './item-validations'

type DraftItemInput = {
  productId: string
  qty: number
}

type UpdateRequestBody = {
  status?: string
  salesNotes?: string
  items?: DraftItemInput[]
  notes?: string
  updatedAt?: string
  priceAccepted: boolean
}

type RequestWithCustomer = PortalRequestGetPayload<{
  include: {
    customer: {
      select: typeof customerSelect
    }
  }
}>

type ValidationResult = { ok: true; body: UpdateRequestBody } | { ok: false; message: string }


const invalid = (message: string): ValidationResult => ({
  ok: false,
  message,
})

const parseItems = (value: unknown): DraftItemInput[] | null => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) {
    return null
  }

  const items: DraftItemInput[] = []

  for (const entry of value) {
    if (!isRecord(entry)) return null

    const productId = parseProductId(entry.productId)
    const qty = parseQuantity(entry.qty)

    if (!productId || qty === null) return null

    items.push({ productId, qty })
  }

  return hasDuplicateProductIds(items) ? null : items
}


const isInvalidText = (value: unknown): boolean =>
  value !== undefined && (typeof value !== 'string' || value.length > 5000)

const isInvalidDate = (value: unknown): boolean =>
  value !== undefined &&
  (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value)))

const validateBody = (value: unknown): ValidationResult => {
  if (!isRecord(value)) {
    return invalid('Body request tidak valid.')
  }

  const { status, salesNotes, items, notes, updatedAt, priceAccepted = false } = value

  if (isInvalidText(salesNotes)) {
    return invalid('Catatan sales tidak valid.')
  }

  if (isInvalidText(notes)) {
    return invalid('Catatan tidak valid.')
  }

  if (isInvalidDate(updatedAt)) {
    return invalid('Versi draft tidak valid.')
  }

  if (typeof priceAccepted !== 'boolean') {
    return invalid('Konfirmasi harga tidak valid.')
  }

  if (status !== undefined && typeof status !== 'string') {
    return invalid('Status tidak valid.')
  }

  const parsedItems = items === undefined ? undefined : parseItems(items)

  if (items !== undefined && parsedItems === null) {
    return invalid('Item pesanan tidak valid atau duplikat.')
  }

  return {
    ok: true,
    body: {
      status: status as string | undefined,
      salesNotes: salesNotes as string | undefined,
      notes: notes as string | undefined,
      updatedAt: updatedAt as string | undefined,
      priceAccepted,
      items: parsedItems ?? undefined,
    },
  }
}

const canAccessRequest = (
  req: AuthenticatedRequest,
  actor: Actor,
  row: {
    customerId: bigint
    kind: string
    status: string
    customer: { SlpCode: number | null }
  },
): string | null => {
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user?.customerId)) {
    return 'Akses ditolak.'
  }

  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode)) {
    return 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.'
  }

  if (row.kind === 'order' && actor.role !== 'admin' && row.status !== 'draft') {
    return 'Hanya admin yang dapat memperbarui pesanan.'
  }

  return null
}

const validateUpdateAccess = async (
  req: AuthenticatedRequest,
  actor: NonNullable<ReturnType<typeof actorOf>>,
  row: RequestWithCustomer,
  hasDraftChanges: boolean,
): Promise<string | null> => {
  if (actor.role === 'customer' && !(await currentCustomer(req))) {
    return 'Akun pelanggan tidak aktif.'
  }

  const accessError = canAccessRequest(req, actor, row)

  if (accessError) return accessError

  if (hasDraftChanges && row.status !== 'draft') {
    return 'Hanya draft yang dapat diedit.'
  }

  if (actor.role === 'customer' && row.status !== 'draft') {
    return 'Customer hanya dapat mengubah draft.'
  }

  return null
}

const validateStatusTransition = (
  row: { kind: string; status: string },
  effectiveStatus: string,
  actor: NonNullable<ReturnType<typeof actorOf>>,
): string | null => {
  const flow = FLOW[row.kind]?.[row.status]

  if (!flow) {
    return 'Status saat ini tidak valid.'
  }

  if (effectiveStatus === row.status) {
    return null
  }

  const allowedRoles: readonly string[] = flow.next[effectiveStatus] ?? []

  if (!allowedRoles.includes(actorRoleName(actor))) {
    return (
      `Status ${row.status} tidak dapat diubah menjadi ` + `${effectiveStatus} oleh peran Anda.`
    )
  }

  return null
}

const buildUpdateData = (
  body: Extract<ValidationResult, { ok: true }>['body'],
  actor: NonNullable<ReturnType<typeof actorOf>>,
  currentStatus: string,
): PortalRequestUpdateManyMutationInput => {
  const data: PortalRequestUpdateManyMutationInput = {}

  if (body.salesNotes !== undefined && actor.role !== 'customer') {
    data.salesNotes = body.salesNotes
  }

  if (body.notes !== undefined) {
    data.notes = body.notes
  }

  if (body.status !== undefined && body.status !== currentStatus) {
    data.status = body.status
  }

  return data
}

const saveRequestUpdate = async (
  row: { id: string; status: string },
  updatedAt: string | undefined,
  data: PortalRequestUpdateManyMutationInput,
): Promise<boolean> => {
  const result = await prisma.portalRequest.updateMany({
    where: {
      id: row.id,
      status: row.status,
      ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
    },
    data,
  })

  return result.count === 1
}

export const updateRequest = async (req: AuthenticatedRequest, res: Response) => {
  const validation = validateBody(req.body)

  if (!validation.ok) {
    return res.status(400).json({
      message: validation.message,
    })
  }

  const actor = actorOf(req)

  if (!actor) {
    return res.status(403).json({
      message: deniedMessage(req),
    })
  }

  const body = validation.body

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: {
      customer: { select: customerSelect },
    },
  })

  if (!row) {
    return res.status(404).json({
      message: 'Permintaan tidak ditemukan.',
    })
  }

  const accessError = await validateUpdateAccess(
    req,
    actor,
    row,
    body.items !== undefined || body.notes !== undefined,
  )

  if (accessError) {
    return res.status(403).json({
      message: accessError,
    })
  }

  const effectiveStatus = body.status ?? row.status

  const statusError = validateStatusTransition(row, effectiveStatus, actor)

  if (statusError) {
    return res.status(400).json({
      message: statusError,
    })
  }

  const data = buildUpdateData(body, actor, row.status)

  const draftResult = await prepareDraftItems(row, body.items, data, res)

  if (!draftResult.ok) return

  const canSubmit = await prepareDraftSubmission(
    req,
    res,
    row,
    actor,
    effectiveStatus,
    draftResult.items,
    body.priceAccepted,
    data,
  )

  if (!canSubmit) return

  const saved = await saveRequestUpdate(row, body.updatedAt, data)

  if (!saved) {
    return res.status(409).json({
      message: 'Draft telah berubah. Muat ulang sebelum menyimpan.',
    })
  }

  if (effectiveStatus !== row.status) {
    await publishRequestStatusChange(
      req,
      row,
      effectiveStatus,
      actor.role === 'customer' ? undefined : body.salesNotes,
    )
  }

  return res.json({ success: true })
}
