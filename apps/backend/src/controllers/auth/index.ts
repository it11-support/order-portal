import { Request, Response } from 'express'
import { generateToken, prisma } from '@utils'
import * as bcrypt from 'bcrypt'
import { LoginRequest, LoginResponse, ApiError, RoleType, User } from '@repo/shared'
import { AuthenticatedRequest } from '@auth'
import { UserGetPayload } from '@/generated/prisma/models'
import { Decimal } from '@prisma/client/runtime/client'

type UserWithRelations = UserGetPayload<{
  include: {
    role: true
    customer: true
  }
}>

const serializeDecimal = (value: Decimal | null) =>
  value?.toString() ?? null

const toUserPayload = (user: UserWithRelations): User => ({
  id: user.id,
  username: user.username,
  email: user.email ?? undefined,
  name: user.name,
  roleId: user.roleId,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  role: {
    id: user.role.id,
    name: user.role.name as RoleType,
    createdAt: user.role.createdAt,
  },
  customerId: user.customerId,
  customer: user.customer
    ? {
      ...user.customer,
      creditLimit: serializeDecimal(user.customer.creditLimit),
      balance: serializeDecimal(user.customer.balance),
    }
    : null,
  slpCode: user.slpCode ?? null,
})

export const login = async (
  req: Request<{}, LoginResponse | ApiError, LoginRequest>,
  res: Response<LoginResponse | ApiError>,
): Promise<void> => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({
      message: 'Validasi gagal',
      errors: {
        username: !username ? 'Username wajib diisi' : undefined,
        password: !password ? 'Password wajib diisi' : undefined,
      },
    })
    return
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: true,
      customer: true,
    },
  })

  if (!user) {
    res.status(401).json({
      message: 'Login gagal',
      errors: {
        username: 'Username tidak ditemukan',
      },
    })
    return
  }

  if (!user.isActive) {
    res.status(403).json({
      message: 'Login gagal',
      errors: {
        username: 'Akun tidak aktif',
      },
    })
    return
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    res.status(401).json({
      message: 'Login gagal',
      errors: {
        password: 'Password salah',
      },
    })
    return
  }

  const userPayload = toUserPayload(user)
  const token = generateToken(userPayload)

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    user: userPayload,
    token,
  })
}

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.user?.id)
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(401).json({ message: 'Token tidak valid.' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        customer: true,
      },
    })

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User tidak ditemukan atau tidak aktif.' })
      return
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(toUserPayload(user))
  } catch {
    res.status(500).json({
      message: 'Internal server error',
    })
  }
}
