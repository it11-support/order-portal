import { prisma } from '@/utils'

/**
 * Who is allowed to see a customer's requests, in one place.
 *
 * The read scope is identical everywhere: admins see every customer, a sales
 * person sees only the customers carrying their own SLP code. Any audience
 * built differently from this would either notify someone who cannot open the
 * request or silently skip someone who can.
 */

export const adminRecipients = (): Promise<Array<{ id: number }>> => {
  return prisma.user.findMany({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true },
  })
}

export const staffRecipientsFor = async (customer: {
  SlpCode: number | null
}): Promise<Array<{ id: number }>> => {
  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: { name: 'admin' } },
        ...(customer.SlpCode === null
          ? []
          : [{ role: { name: 'sales_admin' as const }, slpCode: customer.SlpCode }]),
      ],
    },
    select: { id: true },
  })
}

export const customerRecipientFor = async (customerId: bigint | string): Promise<{ id: number } | null> => {
  return prisma.user.findFirst({
    where: { customerId: BigInt(String(customerId)), isActive: true },
    select: { id: true },
  })
}