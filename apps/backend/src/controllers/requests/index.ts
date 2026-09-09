import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer, customerProductFilter } from '@/services/customer-catalog'

const customerSelect = {
  id: true,
  CardCode: true,
  CardName: true,
  CntctPrsn: true,
  Phone1: true,
  Cellular: true,
  SalesName: true,
}
const serialize = (row: any) => ({
  id: row.id,
  kind: row.kind,
  userId: String(row.customerId),
  userName: row.customer.CntctPrsn || row.customer.CardName,
  company: row.customer.CardName,
  cardCode: row.customer.CardCode,
  phone: row.customer.Cellular || row.customer.Phone1,
  salesName: row.customer.SalesName,
  items: row.items,
  status: row.status,
  createdAt: row.createdAt,
  notes: row.notes,
  salesNotes: row.salesNotes,
})

export async function listRequests(req: AuthenticatedRequest, res: Response) {
  const staff = ['admin', 'sales_admin'].includes(req.user?.role.name ?? '')
  const customer = staff ? null : await currentCustomer(req)
  if (!staff && !customer) return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })
  const rows = await prisma.portalRequest.findMany({
    where: staff ? {} : { customerId: BigInt(String(customer!.id)) },
    include: { customer: { select: customerSelect } },
    orderBy: { createdAt: 'desc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map(serialize) })
}

export async function createRequest(req: AuthenticatedRequest, res: Response) {
  const customer = await currentCustomer(req)
  if (!customer)
    return res.status(403).json({ message: 'Hanya pelanggan aktif dapat mengirim permintaan.' })
  const { kind, items, notes = '', requestId } = req.body ?? {}
  if (
    !['order', 'quote'].includes(kind) ||
    !Array.isArray(items) ||
    !items.length ||
    items.length > 200 ||
    typeof notes !== 'string' ||
    notes.length > 5000 ||
    typeof requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
  ) {
    return res.status(400).json({ message: 'Permintaan tidak valid.' })
  }
  const ids: bigint[] = []
  for (const item of items) {
    const quote = kind === 'quote'
    if (
      !item ||
      !/^\d+$/.test(String(item.productId)) ||
      (!quote && (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 100000))
    ) {
      return res.status(400).json({ message: 'Produk atau jumlah tidak valid.' })
    }
    ids.push(BigInt(String(item.productId)))
  }
  if (new Set(ids.map(String)).size !== ids.length)
    return res.status(400).json({ message: 'Produk duplikat.' })
  const id = `${kind === 'order' ? 'ORD' : 'RFQ'}-${requestId}`
  const existing = await prisma.portalRequest.findUnique({
    where: { id },
    include: { customer: { select: customerSelect } },
  })
  if (existing) {
    if (String(existing.customerId) !== String(customer.id))
      return res.status(409).json({ message: 'ID permintaan sudah digunakan.' })
    return res.json({ data: serialize(existing) })
  }
  const products = await prisma.product.findMany({
    where: { ...(await customerProductFilter(req, kind === 'quote')), id: { in: ids } },
  })
  if (products.length !== ids.length)
    return res.status(400).json({
      message:
        kind === 'order'
          ? 'Pesanan hanya untuk produk aktif yang pernah Anda beli.'
          : 'Penawaran hanya untuk produk saran aktif yang belum pernah Anda beli.',
    })
  const snapshot = items.map((item: any) => {
    const product = products.find((p) => String(p.id) === String(item.productId))
    return kind === 'quote' ? { product } : { product, qty: item.qty }
  })
  // Product snapshots use server data, never client-provided names, pricing or identity.
  const row = await prisma.portalRequest.upsert({
    where: { id },
    update: {},
    create: {
      id,
      customerId: BigInt(String(customer.id)),
      kind,
      notes,
      items: JSON.parse(JSON.stringify(snapshot)),
      status: 'pending',
    },
    include: { customer: { select: customerSelect } },
  })
  if (String(row.customerId) !== String(customer.id))
    return res.status(409).json({ message: 'ID permintaan sudah digunakan.' })
  return res.status(201).json({ data: serialize(row) })
}

export async function updateRequest(req: AuthenticatedRequest, res: Response) {
  const { status, salesNotes } = req.body ?? {}
  const row = await prisma.portalRequest.findUnique({ where: { id: String(req.params.id) } })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  const transitions: Record<string, string[]> =
    row.kind === 'quote'
      ? {
          pending: ['processing', 'cancelled'],
          processing: ['confirmed', 'cancelled'],
          confirmed: ['delivered', 'cancelled'],
          delivered: [],
          cancelled: [],
        }
      : {
          pending: ['confirmed', 'cancelled'],
          confirmed: ['processing', 'cancelled'],
          processing: ['delivered', 'cancelled'],
          delivered: [],
          cancelled: [],
        }
  if (
    typeof status !== 'string' ||
    (status !== row.status && !transitions[row.status]?.includes(status)) ||
    typeof salesNotes !== 'string' ||
    salesNotes.length > 5000
  ) {
    return res.status(400).json({ message: 'Status atau catatan sales tidak valid.' })
  }
  const updated = await prisma.portalRequest.updateMany({
    where: { id: row.id, status: row.status },
    data: { status, salesNotes },
  })
  if (updated.count !== 1)
    return res.status(409).json({ message: 'Status berubah. Muat ulang daftar.' })
  return res.json({ success: true })
}
