import { Request, Response } from 'express'
import { generateToken, prisma } from '../../utils'
import * as bcrypt from 'bcrypt'

import { LoginRequest, LoginResponse, ApiError, RoleType, User } from '@repo/shared'

export const login = async (
  req: Request<{}, LoginResponse | ApiError, LoginRequest>,
  res: Response<LoginResponse | ApiError>,
): Promise<void> => {
  const { username, password } = req.body

  // 1. Validasi awal jika input data kosong
  if (!username || !password) {
    res.status(400).json({ message: 'Username dan password wajib diisi' })
    return
  }

  // 2. Cari user berdasarkan username di database PostgreSQL portal beserta relasinya
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: true,
      customer: true,
    },
  })

  // 3. Validasi keberadaan user dan status keaktifan akun
  if (!user || !user.isActive) {
    res.status(401).json({ message: 'Username tidak ditemukan atau status non-aktif' })
    return
  }

  // 4. Validasi kecocokan password menggunakan bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    res.status(401).json({ message: 'Password salah' })
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
    user: {
      id: user.id,
      username: user.username,
      email: user.email ?? '',
      name: user.name,
      roleId: user.roleId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      customerId: user.customerId,
      customer: user.customer,
      role: {
        id: user.role.id,
        name: user.role.name as RoleType,
        createdAt: user.role.createdAt,
      },
    },
    token,
  })
}
