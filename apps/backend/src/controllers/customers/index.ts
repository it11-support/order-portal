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
    res.status(400).json({ message: 'ID pelanggan tidak valid.' })
    return
  }

  const customer = await prisma.customers.findUnique({
    where: { id: BigInt(id) },
    select: { id: true, CardCode: true, CardName: true, CntctPrsn: true, NonActive: true },
  })
  if (!customer) {
    res.status(404).json({ message: 'Pelanggan tidak ditemukan.' })
    return
  }
  if (!customer.CardCode || customer.NonActive === 'Y') {
    res.status(400).json({ message: 'Pelanggan tidak aktif atau tidak memiliki CardCode.' })
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { username: customer.CardCode },
    select: { id: true, customerId: true, isActive: true, encryptedPassword: true },
  })
  if (existingUser && String(existingUser.customerId) !== id) {
    res.status(409).json({ message: 'CardCode sudah digunakan sebagai username akun lain.' })
    return
  }

  if (existingUser?.isActive) {
    res.status(409).json({ message: 'Login pelanggan sudah diaktifkan.' })
    return
  }

  const existingLinkedUser = await prisma.user.findFirst({
    where: { customerId: BigInt(id) },
    select: { id: true, encryptedPassword: true },
  })
  if (existingLinkedUser && (!existingUser || existingLinkedUser.id !== existingUser.id)) {
    res.status(409).json({ message: 'Pelanggan ini sudah memiliki akun user.' })
    return
  }

  const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } })
  if (!customerRole) {
    res.status(500).json({ message: 'Role customer tidak ditemukan.' })
    return
  }

  let password = existingUser ? decryptCustomerPassword(existingUser.encryptedPassword) : null
  let encryptedPassword = existingUser?.encryptedPassword ?? null

  if (!password) {
    password = generateCustomerPassword()
    encryptedPassword = encryptCustomerPassword(password)
  }

  const userData = {
    username: customer.CardCode,
    name: customer.CardName || customer.CntctPrsn || customer.CardCode,
    roleId: customerRole.id,
    customerId: BigInt(id),
    isActive: true,
  }

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...userData,
        ...(password && encryptedPassword
          ? {
              password: await hashCustomerPassword(password),
              encryptedPassword,
            }
          : {}),
      },
    })
  } else {
    await prisma.user.create({
      data: {
        ...userData,
        password: await hashCustomerPassword(password),
        encryptedPassword,
      },
    })
  }

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ data: { username: customer.CardCode, password } })
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
  const isAdmin = req.user?.role.name === 'admin'

  const where: CustomersWhereInput = {
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
