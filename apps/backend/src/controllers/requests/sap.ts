import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { linkSapDocument } from '@/services/sap-sync'
import { actorOf, deniedMessage, customerSelect } from '@/services/requests/access'
import { serialize } from '@/services/requests/serializer'

/**
 * Links a portal order to the SAP document it became.
 *
 * Admin owns this step: it is the moment the order is asserted to exist in SAP.
 * The document may not have reached the sync yet, in which case the link is
 * remembered and picked up automatically on the next read.
 */
export const linkRequestToSap = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role !== 'admin')
    return res.status(403).json({ message: 'Hanya admin yang dapat menautkan dokumen sistem.' })

  const { docEntry, companyId } = req.body ?? {}
  if (
    !Number.isInteger(docEntry) ||
    docEntry < 1 ||
    (companyId !== undefined && companyId !== null && typeof companyId !== 'string')
  ) {
    return res.status(400).json({ message: 'Nomor dokumen tidak valid.' })
  }

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (row.kind !== 'order')
    return res.status(400).json({ message: 'Hanya pesanan yang memiliki dokumen sistem.' })

  const result = await linkSapDocument(
    {
      id: row.id,
      kind: row.kind,
      status: row.status,
      customerId: BigInt(String(row.customerId)),
      sapCompanyId: row.sapCompanyId,
      sapDocEntry: row.sapDocEntry,
      customer: row.customer,
    },
    { docEntry: docEntry as number, companyId: companyId ?? null },
  )

  const refreshed = await prisma.portalRequest.findUniqueOrThrow({
    where: { id: row.id },
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
  })

  return res.json({
    success: result.linked,
    message: result.message ?? null,
    data: serialize(
      refreshed,
      result.view ? new Map([[row.id, result.view]]) : undefined,
    ),
  })
}
