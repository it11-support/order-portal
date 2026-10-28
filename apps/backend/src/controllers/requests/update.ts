import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import { actorOf, deniedMessage, customerSelect } from '@/services/requests/access'
import { FLOW, actorRoleName } from '@/services/requests/status-flow'
import { prepareDraftItems, prepareDraftSubmission } from '@/services/requests/draft'
import { publishRequestStatusChange } from '@/services/requests/notifications'

export const updateRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { status, salesNotes, items, notes, updatedAt, priceAccepted = false } = req.body ?? {}
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role === 'customer' && !(await currentCustomer(req))) return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode))
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })
  // Sales negotiates inquiries; admin runs orders. A draft is the sales person's
  // own work-in-progress, so they may edit and submit their own drafts.
  if (row.kind === 'order' && actor.role !== 'admin' && row.status !== 'draft')
    return res.status(403).json({ message: 'Hanya admin yang dapat memperbarui pesanan.' })

  if (salesNotes !== undefined && (typeof salesNotes !== 'string' || salesNotes.length > 5000)) {
    return res.status(400).json({ message: 'Catatan sales tidak valid.' })
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 5000)) return res.status(400).json({ message: 'Catatan tidak valid.' })
  if (updatedAt !== undefined && (typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt)))) return res.status(400).json({ message: 'Versi draft tidak valid.' })
  if (typeof priceAccepted !== 'boolean') return res.status(400).json({ message: 'Konfirmasi harga tidak valid.' })
  if (status !== undefined && typeof status !== 'string') {
    return res.status(400).json({ message: 'Status tidak valid.' })
  }
  if (items !== undefined && (!Array.isArray(items) || items.length === 0 || items.length > 200)) {
    return res.status(400).json({ message: 'Item pesanan tidak valid.' })
  }
  if (items) {
    for (const item of items) {
      if (!item || !/^\d+$/.test(String(item.productId))) {
        return res.status(400).json({ message: 'Produk tidak valid.' })
      }
      if (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 100000) {
        return res.status(400).json({ message: 'Jumlah tidak valid.' })
      }
    }
    const ids = new Set(items.map((i: any) => String(i.productId)))
    if (ids.size !== items.length) return res.status(400).json({ message: 'Produk duplikat.' })
  }

  if ((items !== undefined || notes !== undefined) && row.status !== 'draft')
    return res.status(409).json({ message: 'Hanya draft yang dapat diedit.' })
  if (actor.role === 'customer' && row.status !== 'draft')
    return res.status(403).json({ message: 'Customer hanya dapat mengubah draft.' })
  const effectiveStatus = status ?? row.status
  if (!FLOW[row.kind]?.[row.status]) {
    return res.status(400).json({ message: 'Status saat ini tidak valid.' })
  }

  const sameStatus = effectiveStatus === row.status

  const allowedRoles = sameStatus ? [] : (FLOW[row.kind][row.status].next[effectiveStatus] ?? [])
  if (!sameStatus && !allowedRoles.includes(actorRoleName(actor) as any)) {
    return res.status(400).json({
      message: `Status ${row.status} tidak dapat diubah menjadi ${effectiveStatus} oleh peran Anda.`,
    })
  }

  const data: any = {}
  if (salesNotes !== undefined && actor.role !== 'customer') data.salesNotes = salesNotes
  if (notes !== undefined) data.notes = notes
  if (!sameStatus) data.status = effectiveStatus
  // Never persist untrusted {productId, qty} directly.
  let nextItems: any[] | null = null
  if (items !== undefined) {
    nextItems = await prepareDraftItems(row, items, data, res)
    if (nextItems === null) return
  }
  if (!(await prepareDraftSubmission(req, res, row, actor, effectiveStatus, nextItems, priceAccepted, data))) return

  const updated = await prisma.portalRequest.updateMany({
    where: { id: row.id, status: row.status, ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}) },
    data,
  })
  if (updated.count !== 1)
    return res.status(409).json({ message: 'Draft telah berubah. Muat ulang sebelum menyimpan.' })

  if (!sameStatus) {
    await publishRequestStatusChange(req, row, effectiveStatus, status, salesNotes)
  }
  return res.json({ success: true })
}
