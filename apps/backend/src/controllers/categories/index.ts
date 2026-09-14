import { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@utils'
import { Request, Response } from 'express'
import { AuthenticatedRequest } from '@auth'
import { customerProductFilter } from '@/services/customer-catalog'

export const getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isCustomer = req.user?.role.name === 'customer'
  const products = isCustomer
    ? await prisma.product.findMany({
      where: await customerProductFilter(req),
      select: { productCategory: true },
      distinct: ['productCategory'],
    })
    : []
  const categories = await prisma.category.findMany({
    where: isCustomer
      ? { isActive: true, code: { in: products.map((p) => p.productCategory) } }
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

export const getProductsByCategory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const category =
    typeof req.query.category === 'string'
      ? req.query.category
      : ''

  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : ''

  const isCustomer = req.user?.role.name === 'customer'
  const isSuggested = category === 'SUGGESTED'

  // Suggested hanya relevan untuk customer
  if (isSuggested && !isCustomer) {
    res.status(200).json({ data: [] })
    return
  }

  const customerFilter = isCustomer
    ? await customerProductFilter(req, isSuggested)
    : { isActive: true }

  const where: ProductWhereInput = {
    ...customerFilter,

    // SUGGESTED adalah virtual category,
    // jangan diteruskan ke productCategory.
    ...(category && !isSuggested
      ? {
        productCategory: category,
      }
      : {}),

    ...(search
      ? {
        OR: [
          {
            itemName: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            itemCode: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }
      : {}),
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: {
      itemName: 'asc',
    },
  })

  res.status(200).json({
    data: products,
  })
}