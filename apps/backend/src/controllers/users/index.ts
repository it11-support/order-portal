import { prisma } from '@utils'
import { Request, Response } from 'express'
import * as bcrypt from 'bcrypt'
import { RoleType, User } from '@repo/shared'
import { UserWhereInput } from '@/generated/prisma/models'

function serializeUser<T extends {
  password: string
  encryptedPassword: string | null
}>(user: T): Omit<T, 'password' | 'encryptedPassword'> {
  const {
    password: _password,
    encryptedPassword: _encryptedPassword,
    ...rest
  } = user

  return rest
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

  const where: UserWhereInput = {
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
    where.role = {
      name: roleFilter as RoleType,
    }
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
  slpCode?: number | null
}

/**
 * A sales_admin without an SLP code has no territory, so it can neither see a
 * customer nor receive their inquiries. Refusing the account is better than
 * creating one that silently sees nothing.
 */
const resolveSlpCode = async (
  roleName: string,
  slpCode: number | null | undefined,
): Promise<{ slpCode?: number | null; error?: string }> => {
  if (roleName !== 'sales_admin') {
    return slpCode === undefined ? {} : { slpCode: null }
  }
  if (slpCode === null || slpCode === undefined || !Number.isInteger(slpCode)) {
    return { error: 'Role sales wajib memilih SLP Code' }
  }
  const salesPerson = await prisma.salesPerson.findUnique({
    where: { slpCode },
    select: { slpCode: true },
  })
  if (!salesPerson) return { error: 'SLP Code tidak ditemukan' }
  return { slpCode }
}

const resolveUpdateSlpCode = async (
  currentRole: { id: number; name: string },
  roleId?: number,
  slpCode?: number | null,
) => {
  if (slpCode === undefined && (roleId === undefined || roleId === currentRole.id)) {
    return {}
  }

  const role = roleId !== undefined && roleId !== currentRole.id
    ? await prisma.role.findUnique({ where: { id: roleId } })
    : currentRole

  if (!role) return { error: 'Role tidak valid' }

  if (role.name === 'customer') {
    return { error: 'Tidak dapat mengubah user ke role customer melalui modul ini' }
  }

  return resolveSlpCode(role.name, slpCode)
}


export const createUser = async (
  req: Request<{}, {}, CreateUserRequest>,
  res: Response,
): Promise<void> => {
  const { username, password, name, email, roleId, isActive = true, slpCode } = req.body

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

  const slp = await resolveSlpCode(role.name, slpCode)
  if (slp.error) {
    res.status(400).json({ message: slp.error })
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
      ...(slp.slpCode !== undefined ? { slpCode: slp.slpCode } : {}),
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
  slpCode?: number | null
}

export const updateUser = async (
  req: Request<{ id: string }, {}, UpdateUserRequest>,
  res: Response,
): Promise<void> => {
  const id = Number(req.params.id)
  const { password, slpCode, roleId, ...fields } = req.body

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ message: 'ID tidak valid' })
    return
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  })

  if (!existing) {
    res.status(404).json({ message: 'User tidak ditemukan' })
    return
  }

  const slp = await resolveUpdateSlpCode(
    { id: existing.roleId, name: existing.role.name },
    roleId,
    slpCode,
  )

  if (slp.error) {
    res.status(400).json({ message: slp.error })
    return
  }

  const data = {
    ...(fields.username && { username: fields.username }),
    ...(fields.name && { name: fields.name }),
    ...(fields.email !== undefined && { email: fields.email || null }),
    ...(fields.isActive !== undefined && { isActive: fields.isActive }),
    ...(roleId !== undefined && { roleId }),
    ...(slp.slpCode !== undefined && { slpCode: slp.slpCode }),
    ...(password && {
      password: await bcrypt.hash(password, 10),
    }),
  }

  const user = await prisma.user.update({
    where: { id },
    data,
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

/**
 * Sales persons available for assignment.
 *
 * A sales_admin can only see and act on customers with a matching SlpCode, so
 * assigning one is a prerequisite for the account to work at all. The list is
 * offered on the user form so the territory is chosen deliberately rather than
 * left empty and discovered later.
 */
export const getSalesPersons = async (req: Request, res: Response): Promise<void> => {
  const salesPersons = await prisma.salesPerson.findMany({
    orderBy: { slpName: 'asc' },
    select: { slpCode: true, slpName: true },
  })

  res.status(200).json({ data: salesPersons })
}
