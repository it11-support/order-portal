import { Request, Response } from 'express'
import { generateToken, prisma } from '@utils'
import * as bcrypt from 'bcrypt'

import { LoginRequest, LoginResponse, ApiError, RoleType, User } from '@repo/shared'
import { AuthenticatedRequest } from '@auth'

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

  const userPayload: User = {
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
    customer: user.customer,
  }

  const token = generateToken(userPayload)

  res.status(200).json({
    user: { ...userPayload },
    token,
  })
}

export const me = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {

    const user = await prisma.user.findUnique({
      where: {
        id: Number(req.user?.id),
      },
      include: {
        role: true,
        customer: true,
      },
    })

    if (!user) {
      res.status(404).json({
        message: 'User tidak ditemukan',
      })
      return
    }
    const { password, ...userWithoutPassword } = user

    res.status(200).json(userWithoutPassword)
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error',
    })
  }
}
