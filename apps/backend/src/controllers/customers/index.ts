import { CustomersWhereInput } from '@/generated/prisma/models'
import { prisma } from '@utils'
import { Request, Response } from 'express'
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@repo/shared'
import { randomInt } from 'node:crypto'
import * as bcrypt from 'bcrypt'
import { AuthenticatedRequest } from '@auth'
import { encryptCustomerPassword, decryptCustomerPassword } from '@/utils/customer-password'

export const disableCustomerLogin = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ message: 'ID pelanggan tidak valid.' })
    return
  }
  const result = await prisma.customers.updateMany({
    where: { id: BigInt(id) },
    data: { password: null, loginPasswordEncrypted: null },
  })
  if (!result.count) {
    res.status(404).json({ message: 'Pelanggan tidak ditemukan.' })
    return
  }
  await prisma.user.updateMany({
    where: { customerId: BigInt(id) },
    data: { isActive: false },
  })
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ data: { hasLogin: false, loginPassword: null } })
}

export const enableCustomerLogin = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ message: 'ID pelanggan tidak valid.' })
    return
  }
  const customer = await prisma.customers.findUnique({ where: { id: BigInt(id) } })
  if (!customer) {
    res.status(404).json({ message: 'Pelanggan tidak ditemukan.' })
    return
  }
  if (!customer.CardCode || customer.NonActive === 'Y') {
    res.status(400).json({ message: 'Pelanggan harus aktif dan memiliki CardCode.' })
    return
  }
  if (customer.password) {
    res.status(409).json({ message: 'Login pelanggan sudah diaktifkan.' })
    return
  }
  const existingUser = await prisma.user.findUnique({
    where: { username: customer.CardCode },
    select: { id: true },
  })
  if (existingUser) {
    res.status(409).json({ message: 'CardCode sudah digunakan sebagai username akun lain.' })
    return
  }
  const existingLinkedUser = await prisma.user.findFirst({
    where: { customerId: BigInt(id) },
    select: { id: true },
  })
  if (existingLinkedUser) {
    res.status(409).json({ message: 'Pelanggan ini sudah memiliki akun user.' })
    return
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password: string
  do {
    password = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')
  } while (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
  const hash = await bcrypt.hash(password, 10)
  const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } })
  if (!customerRole) {
    res.status(500).json({ message: 'Role customer tidak ditemukan.' })
    return
  }
  await prisma.$transaction([
    prisma.customers.update({
      where: { id: BigInt(id) },
      data: { password: hash, loginPasswordEncrypted: encryptCustomerPassword(password) },
    }),
    prisma.user.create({
      data: {
        username: customer.CardCode,
        password: hash,
        name: customer.CardName || customer.CntctPrsn || customer.CardCode,
        roleId: customerRole.id,
        customerId: BigInt(id),
        isActive: true,
      },
    }),
  ])
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ data: { username: customer.CardCode, password } })
}

export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // 1. Parsing parameter query dari SWR Frontend
  const page = parseInt(req.query.page as string) || DEFAULT_PAGE
  const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT
  const search = (req.query.search as string) || ''
  const showInactive = req.query.showInactive === 'true'

  const skip = (page - 1) * limit

  const whereCondition: CustomersWhereInput =
    search.trim() !== ''
      ? {
          OR: [
            { CardCode: { contains: search, mode: 'insensitive' as const } },
            { CardName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

  // Cek parameter showInactive
  if (!showInactive) {
    whereCondition.NonActive = 'N'
  }

  const [totalRecords, customers] = await prisma.$transaction([
    prisma.customers.count({ where: whereCondition }),
    prisma.customers.findMany({
      where: whereCondition,
      include: {
        Subgroup: true,
      },
      skip: skip,
      take: limit,
      orderBy: {
        CardCode: 'asc',
      },
    }),
  ])

  const totalPages = Math.ceil(totalRecords / limit)

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    data: customers.map(({ password, loginPasswordEncrypted, ...customer }) => ({
      ...customer,
      hasLogin: Boolean(password),
      ...(req.user?.role.name === 'admin'
        ? {
            loginPassword: password ? decryptCustomerPassword(loginPasswordEncrypted) : null,
          }
        : {}),
    })),
    meta: {
      current_page: page,
      total_pages: totalPages,
      total_records: totalRecords,
      limit: limit,
    },
  })
}
