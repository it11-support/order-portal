import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import { reconcileRequests } from '@/services/sap-sync'
import { actorOf, deniedMessage, customerSelect } from '@/services/requests/access'
import { serialize } from '@/services/requests/serializer'

export const listRequests = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })

  let whereClause: any = {}
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)
    if (!customer) return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })
    whereClause = { customerId: BigInt(String(customer.id)) }
  } else if (actor.role === 'sales_admin') {
    whereClause = { customer: { SlpCode: actor.slpCode } }
  }

  const statusFilter = req.query.status
  if (statusFilter !== undefined) {
    if (typeof statusFilter !== 'string' || !['draft', 'pending', 'confirmed', 'processing', 'delivered', 'cancelled'].includes(statusFilter))
      return res.status(400).json({ message: 'Filter status tidak valid.' })
    whereClause = { ...whereClause, status: statusFilter }
  }
  const customerFilter = req.query.customerId
  if (customerFilter !== undefined) {
    if (typeof customerFilter !== 'string' || !/^\d+$/.test(customerFilter))
      return res.status(400).json({ message: 'Customer ID tidak valid.' })
    if (actor.role === 'customer') {
      if (String(whereClause.customerId) !== customerFilter)
        return res.status(403).json({ message: 'Akses ditolak.' })
    } else {
      whereClause = { ...whereClause, customerId: BigInt(customerFilter) }
    }
  }
  const rows = await prisma.portalRequest.findMany({
    where: whereClause,
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  // Reading the list is also when SAP is consulted, so a delivery that closed
  // in SAP shows up without anyone waiting for the next manual status change.
  const views = await reconcileRequests(rows)
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map((row) => serialize(row, views, actor)) })
}

export const getRequest = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)
    if (!customer) return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })
  }
  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (
    actor.role === 'sales_admin' &&
    String(row.customer.SlpCode) !== String(actor.slpCode)
  )
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })
  res.setHeader('Cache-Control', 'no-store')
  // Opening an inquiry is also when the portal asks whether the price has
  // landed, so an inquiry whose price was written in the system is already
  // orderable by the time anybody is looking at it.
  if (await settleInquiryOrderability(row.id)) {
    const settled = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: row.id },
      include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
    })
    return res.json({ data: serialize(settled, undefined, actor) })
  }
  const views = await reconcileRequests([row])
  return res.json({ data: serialize(row, views, actor) })
}
