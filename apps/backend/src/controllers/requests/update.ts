import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import {
  actorOf,
  deniedMessage,
  customerSelect,
} from '@/services/requests/access'
import type { Actor } from '@/services/requests/access'
import {
  FLOW,
  actorRoleName,
} from '@/services/requests/status-flow'
import {
  prepareDraftItems,
  prepareDraftSubmission,
} from '@/services/requests/draft'
import { publishRequestStatusChange } from '@/services/requests/notifications'
import type { PortalRequestUpdateManyMutationInput } from '@/generated/prisma/models'

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

type ValidationResult =
  | { ok: true; body: UpdateRequestBody }
  | { ok: false; message: string }

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

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

    const rawId = entry.productId

    if (
      typeof rawId !== 'string' &&
      typeof rawId !== 'number'
    ) {
      return null
    }

    if (
      typeof rawId === 'number' &&
      !Number.isSafeInteger(rawId)
    ) {
      return null
    }

    const productId = String(rawId)

    if (!/^[1-9]\d*$/.test(productId)) return null

    if (
      typeof entry.qty !== 'number' ||
      !Number.isSafeInteger(entry.qty) ||
      entry.qty < 1 ||
      entry.qty > 100000
    ) {
      return null
    }

    items.push({ productId, qty: entry.qty })
  }

  const ids = new Set(items.map((item) => item.productId))

  return ids.size === items.length ? items : null
}

const validateBody = (value: unknown): ValidationResult => {
  if (!isRecord(value)) {
    return invalid('Body request tidak valid.')
  }

  const {
    status,
    salesNotes,
    items,
    notes,
    updatedAt,
    priceAccepted = false,
  } = value

  if (
    salesNotes !== undefined &&
    (typeof salesNotes !== 'string' || salesNotes.length > 5000)
  ) {
    return invalid('Catatan sales tidak valid.')
  }

  if (
    notes !== undefined &&
    (typeof notes !== 'string' || notes.length > 5000)
  ) {
    return invalid('Catatan tidak valid.')
  }

  if (
    updatedAt !== undefined &&
    (
      typeof updatedAt !== 'string' ||
      !updatedAt.trim() ||
      Number.isNaN(Date.parse(updatedAt))
    )
  ) {
    return invalid('Versi draft tidak valid.')
  }

  if (typeof priceAccepted !== 'boolean') {
    return invalid('Konfirmasi harga tidak valid.')
  }

  if (status !== undefined && typeof status !== 'string') {
    return invalid('Status tidak valid.')
  }

  const parsedItems =
    items === undefined ? undefined : parseItems(items)

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
  if (
    actor.role === 'customer' &&
    String(row.customerId) !== String(req.user?.customerId)
  ) {
    return 'Akses ditolak.'
  }

  if (
    actor.role === 'sales_admin' &&
    String(row.customer.SlpCode) !== String(actor.slpCode)
  ) {
    return 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.'
  }

  if (
    row.kind === 'order' &&
    actor.role !== 'admin' &&
    row.status !== 'draft'
  ) {
    return 'Hanya admin yang dapat memperbarui pesanan.'
  }

  return null
}

export const updateRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const validation = validateBody(req.body)

  if (!validation.ok) {
    return res.status(400).json({
      message: validation.message,
    })
  }

  const {
    status,
    salesNotes,
    items,
    notes,
    updatedAt,
    priceAccepted,
  } = validation.body

  const actor = actorOf(req)

  if (!actor) {
    return res.status(403).json({
      message: deniedMessage(req),
    })
  }

  if (
    actor.role === 'customer' &&
    !(await currentCustomer(req))
  ) {
    return res.status(403).json({
      message: 'Akun pelanggan tidak aktif.',
    })
  }

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

  const accessError = canAccessRequest(req, actor, row)

  if (accessError) {
    return res.status(403).json({
      message: accessError,
    })
  }

  if (
    (items !== undefined || notes !== undefined) &&
    row.status !== 'draft'
  ) {
    return res.status(409).json({
      message: 'Hanya draft yang dapat diedit.',
    })
  }

  if (actor.role === 'customer' && row.status !== 'draft') {
    return res.status(403).json({
      message: 'Customer hanya dapat mengubah draft.',
    })
  }

  const effectiveStatus = status ?? row.status
  const flow = FLOW[row.kind]?.[row.status]

  if (!flow) {
    return res.status(400).json({
      message: 'Status saat ini tidak valid.',
    })
  }

  const sameStatus = effectiveStatus === row.status

  if (!sameStatus) {
    const allowedRoles: readonly string[] =
      flow.next[effectiveStatus] ?? []

    if (!allowedRoles.includes(actorRoleName(actor))) {
      return res.status(400).json({
        message:
          `Status ${row.status} tidak dapat diubah menjadi ` +
          `${effectiveStatus} oleh peran Anda.`,
      })
    }
  }

  const data: PortalRequestUpdateManyMutationInput = {}

  if (salesNotes !== undefined && actor.role !== 'customer') {
    data.salesNotes = salesNotes
  }

  if (notes !== undefined) {
    data.notes = notes
  }

  if (!sameStatus) {
    data.status = effectiveStatus
  }

  const draftResult = await prepareDraftItems(
    row,
    items,
    data,
    res,
  )

  if (!draftResult.ok) return

  const canSubmit = await prepareDraftSubmission(
    req,
    res,
    row,
    actor,
    effectiveStatus,
    draftResult.items,
    priceAccepted,
    data,
  )

  if (!canSubmit) return

  const updated = await prisma.portalRequest.updateMany({
    where: {
      id: row.id,
      status: row.status,
      ...(updatedAt
        ? { updatedAt: new Date(updatedAt) }
        : {}),
    },
    data,
  })

  if (updated.count !== 1) {
    return res.status(409).json({
      message: 'Draft telah berubah. Muat ulang sebelum menyimpan.',
    })
  }

  if (!sameStatus) {
    await publishRequestStatusChange(
      req,
      row,
      effectiveStatus,
      status,
      actor.role === 'customer' ? undefined : salesNotes,
    )
  }

  return res.json({ success: true })
}
