import { CustomersWhereInput } from '@/generated/prisma/models'
import { prisma } from '@utils'
import { Request, Response } from 'express'
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@repo/shared'
import { AuthenticatedRequest } from '@auth'
import {
  decryptCustomerPassword,
  encryptCustomerPassword,
  generateCustomerPassword,
  hashCustomerPassword,
} from '@/utils/customer-password'
import {
  getCustomerAccount,
  getCustomerRole,
  getEligibleCustomer,
  prepareCustomerCredentials,
  saveCustomerLogin,
} from '@/services/customer-login'
import { CustomerLoginError } from '@/services/customer-login/validation'

export const disableCustomerLogin = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ message: 'ID pelanggan tidak valid.' })
    return
  }

  const customer = await prisma.customers.findUnique({
    where: { id: BigInt(id) },
    select: { id: true },
  })
  if (!customer) {
    res.status(404).json({ message: 'Pelanggan tidak ditemukan.' })
    return
  }

  await prisma.user.updateMany({
    where: { customerId: BigInt(id) },
    data: { isActive: false },
  })
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ data: { hasLogin: false } })
}

export const enableCustomerLogin = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)

  if (!/^\d+$/.test(id)) {
    res.status(400).json({
      message: 'ID pelanggan tidak valid.',
    })
    return
  }

  try {
    const customer = await getEligibleCustomer(BigInt(id))
    const account = await getCustomerAccount(customer)
    const role = await getCustomerRole()

    const credentials = prepareCustomerCredentials(account.existingUser)

    await saveCustomerLogin({
      customer,
      roleId: role.id,
      existingUser: account.existingUser,
      credentials,
    })

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      data: {
        username: customer.CardCode,
        password: credentials.password,
      },
    })
  } catch (error) {
    if (error instanceof CustomerLoginError) {
      res.status(error.statusCode).json({
        message: error.message,
      })
      return
    }

    throw error
  }
}

export const resetCustomerPassword = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ message: 'ID pelanggan tidak valid.' })
    return
  }

  const customer = await prisma.customers.findUnique({
    where: { id: BigInt(id) },
    select: { id: true, CardCode: true, NonActive: true },
  })
  if (!customer) {
    res.status(404).json({ message: 'Pelanggan tidak ditemukan.' })
    return
  }
  if (customer.NonActive === 'Y' || !customer.CardCode) {
    res.status(400).json({ message: 'Login pelanggan harus aktif dan memiliki CardCode.' })
    return
  }

  const user = await prisma.user.findFirst({
    where: { customerId: BigInt(id), isActive: true },
    select: { id: true, username: true },
  })
  if (!user) {
    res.status(409).json({ message: 'Login pelanggan belum diaktifkan.' })
    return
  }

  const password = generateCustomerPassword()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashCustomerPassword(password),
      encryptedPassword: encryptCustomerPassword(password),
    },
  })

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ data: { username: user.username, password } })
}


export const getCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const page = Math.max(
    parseInt(req.query.page as string) || DEFAULT_PAGE,
    DEFAULT_PAGE,
  )

  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    DEFAULT_LIMIT,
  )

  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : ''

  const showInactive = req.query.showInactive === 'true'
  const role = req.user?.role.name
  const slpCode = req.user?.slpCode
  const isAdmin = role === 'admin'

  if (role === 'sales_admin' && slpCode == null) {
    res.status(403).json({
      message: 'Akun sales belum memiliki SlpCode. Hubungi admin.',
    })
    return
  }

  const where: CustomersWhereInput = {
    ...(role === 'sales_admin'
      ? { SlpCode: slpCode as number }
      : {}),

    ...(role === 'customer'
      ? req.user?.customerId != null
        ? { id: BigInt(String(req.user.customerId)) }
        : { id: BigInt(-1) }
      : {}),

    ...(search
      ? {
        OR: [
          { CardCode: { contains: search, mode: 'insensitive' } },
          { CardName: { contains: search, mode: 'insensitive' } },
          { CntctPrsn: { contains: search, mode: 'insensitive' } },
          { Phone1: { contains: search, mode: 'insensitive' } },
          { Cellular: { contains: search, mode: 'insensitive' } },
          { Address: { contains: search, mode: 'insensitive' } },
          { City: { contains: search, mode: 'insensitive' } },
        ],
      }
      : {}),

    ...(showInactive ? {} : { NonActive: { not: 'Y' } }),
  }

  // Periode aktivitas: 3 bulan terakhir
  const since = new Date()
  since.setMonth(since.getMonth() - 3)

  // Ambil semua customer yang sesuai dengan filter akses.
  const [customerKeys, total] = await Promise.all([
    prisma.customers.findMany({
      where,
      select: {
        id: true,
        CardCode: true,
        CardName: true,
      },
    }),
    prisma.customers.count({ where }),
  ])

  // Hitung jumlah transaksi untuk customer yang boleh diakses.
  const invoiceCounts = customerKeys.length
    ? await prisma.salesInvoice.groupBy({
      by: ['cardCode'],
      where: {
        cardCode: {
          in: customerKeys
            .map((customer) => customer.CardCode)
            .filter((code): code is string => code !== null),
        },
        docDate: {
          gte: since,
        },
      },
      _count: {
        _all: true,
      },
      _max: {
        docDate: true,
      },
    })
    : []

  const activityMap = new Map(
    invoiceCounts.map((invoice) => [
      invoice.cardCode,
      {
        count: invoice._count._all,
        lastDate: invoice._max.docDate?.getTime() ?? 0,
      },
    ]),
  )

  // Urutkan berdasarkan jumlah transaksi dan tanggal terakhir.
  const sortedCustomers = customerKeys.sort((a, b) => {
    const activityA = a.CardCode
      ? activityMap.get(a.CardCode)
      : undefined

    const activityB = b.CardCode
      ? activityMap.get(b.CardCode)
      : undefined

    const countDiff =
      (activityB?.count ?? 0) - (activityA?.count ?? 0)

    if (countDiff !== 0) return countDiff

    const dateDiff =
      (activityB?.lastDate ?? 0) - (activityA?.lastDate ?? 0)

    if (dateDiff !== 0) return dateDiff

    return (a.CardName ?? '').localeCompare(b.CardName ?? '')
  })

  // Pagination dilakukan setelah sorting.
  const paginatedIds = sortedCustomers
    .slice((page - 1) * limit, page * limit)
    .map((customer) => customer.id)

  const customers = paginatedIds.length
    ? await prisma.customers.findMany({
      where: {
        id: {
          in: paginatedIds,
        },
      },
      include: {
        Subgroup: true,
        user: {
          select: {
            isActive: true,
            username: true,
            encryptedPassword: true,
          },
        },
      },
    })
    : []

  // findMany dengan IN tidak menjamin urutan.
  const orderMap = new Map(
    paginatedIds.map((id, index) => [String(id), index]),
  )

  customers.sort(
    (a, b) =>
      (orderMap.get(String(a.id)) ?? 0) -
      (orderMap.get(String(b.id)) ?? 0),
  )

  res.setHeader('Cache-Control', 'no-store')

  res.status(200).json({
    data: customers.map(({ user, ...customer }) => ({
      ...customer,
      hasLogin: Boolean(
        user?.isActive && user.encryptedPassword,
      ),
      ...(isAdmin
        ? {
          loginUsername: user?.username ?? null,
          loginPassword: user?.isActive
            ? decryptCustomerPassword(user.encryptedPassword)
            : null,
        }
        : {}),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export const getCustomerStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const role = req.user?.role.name
  const slpCode = req.user?.slpCode

  const salesAdmin = role === 'sales_admin'

  const where: CustomersWhereInput = {}

  if (salesAdmin) {
    // Sales admin tanpa SalesPerson tidak boleh melihat semua customer
    if (slpCode == null) {
      res.status(200).json({
        data: {
          total: 0,
        },
      })
      return
    }

    where.SlpCode = slpCode
  }

  // A customer account counts nothing but itself, and gets no login relation:
  // the login row carries the customer's own credential material.
  if (role === 'customer') {
    const ownId = req.user?.customerId
    const own =
      ownId != null
        ? await prisma.customers.findUnique({ where: { id: BigInt(String(ownId)) } })
        : null
    res.status(200).json({ data: own ? [own] : [] })
    return
  }

  const customers = await prisma.customers.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          encryptedPassword: true,
        },
      },
    },
  })

  res.status(200).json({
    data: customers,
  })
}
