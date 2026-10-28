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
import { getCustomerAccount, getCustomerRole, getEligibleCustomer, prepareCustomerCredentials, saveCustomerLogin } from '@/services/customer-login'
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

export const enableCustomerLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
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

    const credentials = prepareCustomerCredentials(
      account.existingUser,
    )

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

export const resetCustomerPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
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

export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = Math.max(parseInt(req.query.page as string) || DEFAULT_PAGE, DEFAULT_PAGE)
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    DEFAULT_LIMIT,
  )
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const showInactive = req.query.showInactive === 'true'
  const role = req.user?.role.name
  const slpCode = req.user?.slpCode
  const isAdmin = role === 'admin'

  // A sales person only ever sees their own book of business. Without an SLP
  // assignment there is no book, so the list is refused rather than opened up
  // to the whole customer master.
  if (role === 'sales_admin' && slpCode == null) {
    res.status(403).json({
      message: 'Akun sales belum memiliki SlpCode. Hubungi admin.',
    })
    return
  }

  const where: CustomersWhereInput = {
    ...(role === 'sales_admin' ? { SlpCode: slpCode as number } : {}),
    // The customer master is a staff view. A customer account reaches nothing
    // beyond its own record: outside its own conversation there is nothing for
    // it to browse, let alone another customer's contact details and pricing.
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

  const [customers, total] = await Promise.all([
    prisma.customers.findMany({
      where,
      include: {
        Subgroup: true,
        user: { select: { isActive: true, username: true, encryptedPassword: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { CardName: 'asc' },
    }),
    prisma.customers.count({ where }),
  ])

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    data: customers.map(({ user, ...customer }) => ({
      ...customer,
      hasLogin: Boolean(user?.isActive && user.encryptedPassword),
      ...(isAdmin
        ? {
          loginUsername: user?.username ?? null,
          loginPassword: user?.isActive ? decryptCustomerPassword(user.encryptedPassword) : null,
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

export const getCustomerStats = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
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