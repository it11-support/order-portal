import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'

type TargetCustomerResult =
  | { id: bigint; CardCode: string | null }
  | { error: string }

export const customerSelect = {
  id: true,
  CardCode: true,
  CardName: true,
  CntctPrsn: true,
  Phone1: true,
  Cellular: true,
  SalesName: true,
  SlpCode: true,
}


/**
 * Who is asking, and what are they allowed to reach.
 *
 * A sales_admin without an SLP assignment has no territory: seeing everything
 * would expose every customer in the company, so those accounts are refused
 * instead of silently widened.
 */
export type Actor =
  | { role: 'admin' }
  | { role: 'sales_admin'; slpCode: number }
  | { role: 'customer' }

export const actorOf = (req: AuthenticatedRequest): Actor | null => {
  const role = req.user?.role.name
  if (role === 'admin') return { role: 'admin' }
  if (role === 'sales_admin') {
    if (req.user?.slpCode == null) return null
    return { role: 'sales_admin', slpCode: req.user.slpCode }
  }
  if (role === 'customer') return { role: 'customer' }
  return null
}

const TERRITORY_ERROR = 'Akun sales belum memiliki SlpCode. Hubungi admin.'


export const deniedMessage = (req: AuthenticatedRequest) => {
  return req.user?.role.name === 'sales_admin'
    ? TERRITORY_ERROR
    : 'Akun pelanggan tidak aktif.'
}


/**
 * The customer a request is being written for.
 *
 * Staff name the customer explicitly; a sales_admin may only do so inside their
 * own territory. Customers simply resolve to themselves.
 */
export const targetCustomer = async (
  req: AuthenticatedRequest,
  actor: Actor,
  body: unknown,
): Promise<TargetCustomerResult> => {
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)

    if (!customer) {
      return {
        error: 'Hanya pelanggan aktif dapat mengirim permintaan.',
      }
    }

    return {
      id: BigInt(String(customer.id)),
      CardCode: customer.CardCode,
    }
  }

  const raw =
    body !== null &&
      typeof body === 'object' &&
      'customerId' in body
      ? body.customerId
      : undefined

  if (
    (typeof raw !== 'string' && typeof raw !== 'number') ||
    (typeof raw === 'number' && !Number.isSafeInteger(raw)) ||
    !/^[1-9]\d*$/.test(String(raw))
  ) {
    return { error: 'Pelanggan tujuan wajib dipilih.' }
  }

  const customer = await prisma.customers.findUnique({
    where: { id: BigInt(String(raw)) },
    select: {
      id: true,
      CardCode: true,
      NonActive: true,
      SlpCode: true,
    },
  })

  if (!customer) {
    return { error: 'Pelanggan tidak ditemukan.' }
  }

  if (!customer.CardCode || customer.NonActive === 'Y') {
    return {
      error: 'Pelanggan tidak aktif atau tidak memiliki CardCode.',
    }
  }

  if (
    actor.role === 'sales_admin' &&
    customer.SlpCode !== actor.slpCode
  ) {
    return {
      error: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.',
    }
  }

  return {
    id: BigInt(String(customer.id)),
    CardCode: customer.CardCode,
  }
}
