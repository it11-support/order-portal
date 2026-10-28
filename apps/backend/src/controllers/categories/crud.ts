import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@utils'

export const getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isCustomer = req.user?.role.name === 'customer'

  // Kategori normal adalah filter katalog yang berdiri sendiri, bukan turunan
  // dari histori pembelian. Memakai customerProductFilter di sini membuat
  // kategori yang belum pernah dibeli customer hilang dari UI padahal produknya
  // ada dan harus bisa dibuka. Syaratnya hanya: kategori aktif dan punya
  // minimal satu produk aktif.
  const availableCodes = isCustomer
    ? (
      await prisma.product.findMany({
        where: { isActive: true },
        select: { productCategory: true },
        distinct: ['productCategory'],
      })
    ).map((product) => product.productCategory)
    : []

  const categories = await prisma.category.findMany({
    where: isCustomer
      ? { isActive: true, code: { in: availableCodes } }
      : {},
    orderBy: { sortOrder: 'asc' },
  })

  res.status(200).json({ data: categories })
}

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { code, name, icon, sortOrder } = req.body as {
    code: string
    name: string
    icon?: string
    sortOrder?: number
  }

  const category = await prisma.category.create({
    data: {
      code: code.toUpperCase(),
      name,
      icon: icon || null,
      sortOrder: sortOrder ?? 0,
    },
  })

  res.status(201).json({ data: category })
}

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { name, icon, sortOrder, isActive } = req.body as {
    name?: string
    icon?: string
    sortOrder?: number
    isActive?: boolean
  }

  const category = await prisma.category.update({
    where: { id: parseInt(id as string) },
    data: {
      name,
      icon: icon !== undefined ? icon : undefined,
      sortOrder: sortOrder ?? undefined,
      isActive: isActive ?? undefined,
    },
  })

  res.status(200).json({ data: category })
}

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  await prisma.category.delete({
    where: { id: parseInt(id as string) },
  })

  res.status(204).send()
}

export const reorderCategories = async (req: Request, res: Response): Promise<void> => {
  const { orders } = req.body as { orders: { id: number; sortOrder: number }[] }

  if (!Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ message: 'orders array is required' })
    return
  }

  await prisma.$transaction(
    orders.map((o) =>
      prisma.category.update({
        where: { id: o.id },
        data: { sortOrder: o.sortOrder },
      }),
    ),
  )

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  res.status(200).json({ data: categories })
}


