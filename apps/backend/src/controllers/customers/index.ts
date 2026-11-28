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
    parseInt(req.query.page as string, 10) || DEFAULT_PAGE,
    DEFAULT_PAGE,
  )

  const limit = Math.min(
    Math.max(
      parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT,
      1,
    ),
    DEFAULT_LIMIT,
  )

  const skip = (page - 1) * limit

  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : ''

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
    NonActive: { not: 'Y' },

    ...(role === 'sales_admin'
      ? { SlpCode: slpCode as number }
      : {}),

    ...(role === 'customer'
      ? {
        id: BigInt(String(req.user?.customerId ?? -1)),
      }
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
  }

  const customerKeys = await prisma.customers.findMany({
    where,
    select: {
      id: true,
      CardCode: true,
      CardName: true,
    },
  })

  const total = customerKeys.length

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  res.setHeader('Cache-Control', 'no-store')

  // Tidak perlu query invoice jika halaman tidak tersedia.
  if (skip >= total) {
    res.status(200).json({
      data: [],
      pagination,
    })
    return
  }

  const since = new Date()
  since.setMonth(since.getMonth() - 3)

  const cardCodes = [
    ...new Set(
      customerKeys
        .map(({ CardCode }) => CardCode)
        .filter((code): code is string => code !== null),
    ),
  ]

  const invoiceCounts = cardCodes.length
    ? await prisma.salesInvoice.groupBy({
      by: ['cardCode'],
      where: {
        cardCode: { in: cardCodes },
        docDate: { gte: since },
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
    invoiceCounts.map(({ cardCode, _count, _max }) => [
      cardCode,
      {
        count: _count._all,
        lastDate: _max.docDate?.getTime() ?? 0,
      },
    ]),
  )

  // Hitung aktivitas sekali untuk setiap customer.
  const rankedCustomers = customerKeys.map((customer) => {
    const activity = customer.CardCode
      ? activityMap.get(customer.CardCode)
      : undefined

    return {
      id: customer.id,
      name: customer.CardName ?? '',
      count: activity?.count ?? 0,
      lastDate: activity?.lastDate ?? 0,
    }
  })

  rankedCustomers.sort(
    (a, b) =>
      b.count - a.count ||
      b.lastDate - a.lastDate ||
      a.name.localeCompare(b.name) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )

  const paginatedIds = rankedCustomers
    .slice(skip, skip + limit)
    .map(({ id }) => id)

  const customers = await prisma.customers.findMany({
    where: {
      AND: [
        where,
        {
          id: { in: paginatedIds },
        },
      ],
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

  const customerMap = new Map(
    customers.map((customer) => [customer.id, customer]),
  )

  // Susun response sesuai urutan pagination tanpa sorting ulang.
  const data = paginatedIds.flatMap((id) => {
    const record = customerMap.get(id)

    if (!record) return []

    const { user, ...customer } = record

    return [
      {
        ...customer,
        hasLogin: Boolean(
          user?.isActive && user.encryptedPassword,
        ),

        ...(isAdmin
          ? {
            loginUsername: user?.username ?? null,
            loginPassword:
              user?.isActive && user.encryptedPassword
                ? decryptCustomerPassword(user.encryptedPassword)
                : null,
          }
          : {}),
      },
    ]
  })

  res.status(200).json({
    data,
    pagination,
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
