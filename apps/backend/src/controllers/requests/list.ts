import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import type { PortalRequestWhereInput } from '@/generated/prisma/models'

import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import { reconcileRequests } from '@/services/sap-sync'
import { actorOf, deniedMessage, customerSelect } from '@/services/requests/access'
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
  'converted',
  'ready',
  'cancelled',
])

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const parsePositiveInt = (
  value: unknown,
  fallback: number,
): number => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isSafeInteger(parsed) ? parsed : fallback
}

const requestInclude = {
  customer: { select: customerSelect },
  createdBy: { select: { name: true } },
} as const

const deny = (res: Response, message: string, status = 403) => res.status(status).json({ message })

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
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user?.customerId)) {
    return 'Akses ditolak.'
  }

  if (actor.role === 'sales_admin' && row.customer.SlpCode !== actor.slpCode) {
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

  // Filter jenis permintaan
  const kind = req.query.kind

  if (kind !== undefined) {
    if (kind !== 'order' && kind !== 'quote') {
      return deny(res, 'Jenis permintaan tidak valid.', 400)
    }

    where.kind = kind
  }

  // Filter customer (logika asli)
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

  // Statistik tanpa filter status
  const statsWhere: PortalRequestWhereInput = { ...where }

  // Filter status (validasi asli)
  const statusFilter = req.query.status

  if (statusFilter !== undefined) {
    if (!validateStatus(statusFilter)) {
      return deny(res, 'Filter status tidak valid.', 400)
    }

    where.status = statusFilter
  }

  // Pagination
  const page = parsePositiveInt(req.query.page, 1)

  const limit = Math.min(
    parsePositiveInt(req.query.limit, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  )

  const skip = (page - 1) * limit

  if (!Number.isSafeInteger(skip)) {
    return deny(res, 'Pagination tidak valid.', 400)
  }

  const [rows, total, statusCounts] = await prisma.$transaction([
    prisma.portalRequest.findMany({
      where,
      include: requestInclude,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      skip,
      take: limit,
    }),

    prisma.portalRequest.count({
      where,
    }),

    prisma.portalRequest.groupBy({
      by: ['status'],
      where: statsWhere,
      _count: {
        _all: true,
      },
    }),
  ])

  // Tetap gunakan sinkronisasi SAP asli
  const views = await reconcileRequests(rows)

  const stats = Object.fromEntries(
    statusCounts.map((item) => [
      item.status,
      item._count._all,
    ]),
  )

  res.setHeader('Cache-Control', 'no-store')

  return res.json({
    data: rows.map((row) => serialize(row, views, actor)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    stats,
  })
}


export const getRequest = async (req: AuthenticatedRequest, res: Response) => {
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
