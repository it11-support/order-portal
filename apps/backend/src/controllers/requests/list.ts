import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import type { PortalRequestWhereInput } from '@/generated/prisma/models'

import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import { reconcileRequests } from '@/services/sap-sync'
import {
  actorOf,
  deniedMessage,
  customerSelect,
} from '@/services/requests/access'
import type { Actor } from '@/services/requests/access'
import { serialize } from '@/services/requests/serializer'
import { settleInquiryOrderability } from '@/services/price-alerts'

// Import dari lokasi implementasi sebenarnya.
// import { settleInquiryOrderability } from '@/services/...'

const VALID_STATUSES = new Set([
  'draft',
  'pending',
  'confirmed',
  'processing',
  'delivered',
  'cancelled',
])

const requestInclude = {
  customer: { select: customerSelect },
  createdBy: { select: { name: true } },
} as const

const deny = (res: Response, message: string, status = 403) =>
  res.status(status).json({ message })

const validateStatus = (value: unknown): value is string =>
  typeof value === 'string' && VALID_STATUSES.has(value)

const validateCustomerId = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+$/.test(value)

const buildAccessFilter = async (
  req: AuthenticatedRequest,
  actor: Actor,
): Promise<PortalRequestWhereInput | null> => {
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)

    if (!customer) return null

    return {
      customerId: BigInt(String(customer.id)),
    }
  }

  if (actor.role === 'sales_admin') {
    return {
      customer: {
        SlpCode: actor.slpCode,
      },
    }
  }

  return {}
}

const checkRowAccess = (
  req: AuthenticatedRequest,
  actor: Actor,
  row: {
    customerId: bigint
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
    row.customer.SlpCode !== actor.slpCode
  ) {
    return 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.'
  }

  return null
}

export const listRequests = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorOf(req)

  if (!actor) {
    return deny(res, deniedMessage(req))
  }

  const where = await buildAccessFilter(req, actor)

  if (!where) {
    return deny(res, 'Akun pelanggan tidak aktif.')
  }

  const statusFilter = req.query.status

  if (statusFilter !== undefined) {
    if (!validateStatus(statusFilter)) {
      return deny(res, 'Filter status tidak valid.', 400)
    }

    where.status = statusFilter
  }

  const customerFilter = req.query.customerId

  if (customerFilter !== undefined) {
    if (!validateCustomerId(customerFilter)) {
      return deny(res, 'Customer ID tidak valid.', 400)
    }

    const customerId = BigInt(customerFilter)

    if (
      actor.role === 'customer' &&
      where.customerId !== customerId
    ) {
      return deny(res, 'Akses ditolak.')
    }

    if (actor.role !== 'customer') {
      where.customerId = customerId
    }
  }

  const rows = await prisma.portalRequest.findMany({
    where,
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  })

  // Sinkronkan status SAP sebelum response.
  const views = await reconcileRequests(rows)

  res.setHeader('Cache-Control', 'no-store')

  return res.json({
    data: rows.map((row) => serialize(row, views, actor)),
  })
}

export const getRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorOf(req)

  if (!actor) {
    return deny(res, deniedMessage(req))
  }

  const accessFilter = await buildAccessFilter(req, actor)

  if (!accessFilter) {
    return deny(res, 'Akun pelanggan tidak aktif.')
  }

  const id = String(req.params.id)

  const row = await prisma.portalRequest.findFirst({
    where: {
      id,
      ...accessFilter,
    },
    include: requestInclude,
  })

  if (!row) {
    return deny(res, 'Permintaan tidak ditemukan.', 404)
  }

  const accessError = checkRowAccess(req, actor, row)

  if (accessError) {
    return deny(res, accessError)
  }

  res.setHeader('Cache-Control', 'no-store')

  // Periksa apakah inquiry sudah dapat dikonversi menjadi order.
  const settled = await settleInquiryOrderability(row.id)

  if (settled) {
    const updatedRow = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: row.id },
      include: requestInclude,
    })

    return res.json({
      data: serialize(updatedRow, undefined, actor),
    })
  }

  const views = await reconcileRequests([row])

  return res.json({
    data: serialize(row, views, actor),
  })
}
