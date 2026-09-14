import { prisma } from '@utils'
import { Request, Response } from 'express'
import * as bcrypt from 'bcrypt'
import { RoleType, User } from '@repo/shared'
import { AuthenticatedRequest } from '@auth'

const serializeUser = (user: any) => {
  const { password: _password, encryptedPassword, ...rest } = user
  return { ...rest, password: encryptedPassword ?? null }
}

export interface UserListResponse {
  data: User[]
  total: number
  page: number
  totalPages: number
}

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
  const search = typeof req.query.search === 'string' ? req.query.search : ''
  const roleFilter = Array.isArray(req.query.role)
    ? req.query.role[0] || ''
    : (req.query.role as string) || ''

  const skip = (page - 1) * limit

  const where: any = {
    role: {
      name: { not: 'customer' as const },
    },
  }

  if (search.trim()) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' as const } },
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  if (roleFilter && roleFilter !== 'all') {
    where.role.name = roleFilter as RoleType
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { role: true, customer: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  const safeUsers = users.map((u) => serializeUser(u))

  res.status(200).json({
    data: safeUsers,
    total,
    page,
    totalPages,
  })
}

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const user = await prisma.user.findUnique({
    where: { id: parseInt(String(id)) },
    include: { role: true, customer: true },
  })

  if (!user) {
    res.status(404).json({ message: 'User tidak ditemukan' })
    return
  }

  res.status(200).json({ data: serializeUser(user) })
}

export interface CreateUserRequest {
  username: string
  password: string
  name: string
  email?: string
  roleId: number
  isActive?: boolean
}

export const createUser = async (
  req: Request<{}, {}, CreateUserRequest>,
  res: Response,
): Promise<void> => {
  const { username, password, name, email, roleId, isActive = true } = req.body

  if (!username || !password || !name || !roleId) {
    res.status(400).json({
      message: 'Validasi gagal',
      errors: {
        username: !username ? 'Username wajib diisi' : undefined,
        password: !password ? 'Password wajib diisi' : undefined,
        name: !name ? 'Nama wajib diisi' : undefined,
        roleId: !roleId ? 'Role wajib dipilih' : undefined,
      },
    })
    return
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } })

  if (!role) {
    res.status(400).json({ message: 'Role tidak valid' })
    return
  }

  if (role.name === 'customer') {
    res
      .status(400)
      .json({ message: 'Tidak dapat membuat user dengan role customer melalui modul ini' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    res.status(409).json({
      message: 'Username sudah digunakan',
      errors: { username: 'Username sudah digunakan' },
    })
    return
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      res.status(409).json({
        message: 'Email sudah digunakan',
        errors: { email: 'Email sudah digunakan' },
      })
      return
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      encryptedPassword: password,
      name,
      email: email || null,
      roleId,
      isActive,
    },
    include: { role: true, customer: true },
  })

  res.status(201).json({ data: serializeUser(user) })
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  name?: string
  email?: string | null
  roleId?: number
  isActive?: boolean
}

export const updateUser = async (
  req: Request<{ id: string }, {}, UpdateUserRequest>,
  res: Response,
): Promise<void> => {
  const { id } = req.params
  const { username, password, name, email, roleId, isActive } = req.body

  const existing = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    include: { role: true },
  })
  if (!existing) {
    res.status(404).json({ message: 'User tidak ditemukan' })
    return
  }

  const updateData: any = {}
  if (username) updateData.username = username
  if (password) {
    updateData.password = await bcrypt.hash(password, 10)
    updateData.encryptedPassword = password
  }
  if (name) updateData.name = name
  if (email !== undefined) updateData.email = email || null
  if (roleId) updateData.roleId = roleId
  if (isActive !== undefined) updateData.isActive = isActive

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { role: true, customer: true },
  })

  res.status(200).json({ data: serializeUser(user) })
}

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const userId = typeof id === 'string' ? parseInt(id) : parseInt(id[0])

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(404).json({ message: 'User tidak ditemukan' })
    return
  }

  await prisma.user.delete({ where: { id: userId } })
  res.status(204).send()
}

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  res.status(200).json({ data: roles })
}
