import { Request, Response } from 'express'
import { generateToken, prisma } from '@utils'
import * as bcrypt from 'bcrypt'

import { LoginRequest, LoginResponse, ApiError, RoleType, User, Customer } from '@repo/shared'
import { AuthenticatedRequest } from '@auth'

const buildCustomerPayload = async (customer: any): Promise<User> => {
  const { password: _password, loginPasswordEncrypted: _encrypted, ...safeCustomer } = customer
  const customerRole = await prisma.role.findUnique({
    where: { name: 'customer' },
  })

  return {
    id: customer.id as unknown as number,
    username: customer.CardCode ?? '',
    email: undefined,
    name: customer.CardName ?? customer.CardCode ?? '',
    roleId: customerRole?.id ?? 0,
    isActive: customer.NonActive !== 'Y',
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    role: customerRole
      ? {
          id: customerRole.id,
          name: customerRole.name as RoleType,
          createdAt: customerRole.createdAt,
        }
      : { id: 0, name: 'customer', createdAt: customer.createdAt },
    customerId: customer.id as unknown as number,
    customer: safeCustomer as Customer,
  }
}

export const login = async (
  req: Request<{}, LoginResponse | ApiError, LoginRequest>,
  res: Response<LoginResponse | ApiError>,
): Promise<void> => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({
      message: 'Validasi gagal',
      errors: {
        username: !username ? 'Username / Kode pelanggan wajib diisi' : undefined,
        password: !password ? 'Password wajib diisi' : undefined,
      },
    })
    return
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: true,
      customer: { omit: { password: true, loginPasswordEncrypted: true } },
    },
  })

  if (user) {
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
    return
  }

  const customer = await prisma.customers.findUnique({
    where: { CardCode: username },
    include: {
      Subgroup: true,
    },
  })

  if (customer) {
    if (customer.NonActive === 'Y') {
      res.status(403).json({
        message: 'Login gagal',
        errors: {
          username: 'Akun pelanggan tidak aktif',
        },
      })
      return
    }

    if (!customer.password) {
      res.status(403).json({
        message: 'Login gagal',
        errors: {
          username: 'Akun belum memiliki password. Hubungi admin.',
        },
      })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password)

    if (!isPasswordValid) {
      res.status(401).json({
        message: 'Login gagal',
        errors: {
          password: 'Password salah',
        },
      })
      return
    }

    const customerPayload: User = await buildCustomerPayload(customer)

    const token = generateToken(customerPayload)

    res.status(200).json({
      user: { ...customerPayload },
      token,
    })
    return
  }

  res.status(401).json({
    message: 'Login gagal',
    errors: {
      username: 'Username / Kode pelanggan tidak ditemukan',
    },
  })
}

export const customerLogin = async (
  req: Request<{}, LoginResponse | ApiError, LoginRequest>,
  res: Response<LoginResponse | ApiError>,
): Promise<void> => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({
      message: 'Validasi gagal',
      errors: {
        username: !username ? 'Kode pelanggan wajib diisi' : undefined,
        password: !password ? 'Password wajib diisi' : undefined,
      },
    })
    return
  }

  const customer = await prisma.customers.findUnique({
    where: { CardCode: username },
    include: {
      Subgroup: true,
    },
  })

  if (!customer) {
    res.status(401).json({
      message: 'Login gagal',
      errors: {
        username: 'Kode pelanggan tidak ditemukan',
      },
    })
    return
  }

  if (customer.NonActive === 'Y') {
    res.status(403).json({
      message: 'Login gagal',
      errors: {
        username: 'Akun pelanggan tidak aktif',
      },
    })
    return
  }

  if (!customer.password) {
    res.status(403).json({
      message: 'Login gagal',
      errors: {
        username: 'Akun belum memiliki password. Hubungi admin.',
      },
    })
    return
  }

  const isPasswordValid = await bcrypt.compare(password, customer.password)

  if (!isPasswordValid) {
    res.status(401).json({
      message: 'Login gagal',
      errors: {
        password: 'Password salah',
      },
    })
    return
  }

  const customerPayload = await buildCustomerPayload(customer)

  const token = generateToken(customerPayload)

  res.status(200).json({
    user: { ...customerPayload },
    token,
  })
}

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const role = typeof req.user?.role === 'string' ? req.user.role : req.user?.role?.name

    if (role === 'customer') {
      const customerId = req.user?.customerId ?? req.user?.id
      if (!customerId) {
        res.status(401).json({ message: 'Token tidak valid.' })
        return
      }
      const customer = await prisma.customers.findUnique({
        where: {
          id: BigInt(String(customerId)),
        },
        include: {
          Subgroup: true,
        },
      })

      if (!customer) {
        res.status(404).json({
          message: 'Pelanggan tidak ditemuan',
        })
        return
      }

      const customerPayload = await buildCustomerPayload(customer)

      res.status(200).json(customerPayload)
      return
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(req.user?.id),
      },
      include: {
        role: true,
        customer: { omit: { password: true, loginPasswordEncrypted: true } },
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
