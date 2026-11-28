import { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@/utils'
import { Request, Response } from 'express'

const ALLOWED_SORT_FIELDS = {
  itemCode: 'itemCode',
  itemName: 'itemName',
  productCategory: 'productCategory',
  salesUnit: 'salesUnit',
  launchDate: 'launchDate',
} as const

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(
      Math.trunc(Number(req.query.page) || 1),
      1,
    )

    const pageSize = Math.min(
      Math.max(Math.trunc(Number(req.query.pageSize) || 20), 1),
      100,
    )

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : ''

    const category =
      typeof req.query.category === 'string'
        ? req.query.category.trim()
        : ''

    const isActiveParam = req.query.isActive

    const sortByParam =
      typeof req.query.sortBy === 'string'
        ? req.query.sortBy
        : 'itemName'

    const sortDirection =
      req.query.sortDirection === 'desc' ? 'desc' : 'asc'

    const sortBy =
      ALLOWED_SORT_FIELDS[
      sortByParam as keyof typeof ALLOWED_SORT_FIELDS
      ] || 'itemName'

    const where: ProductWhereInput = {}

    if (search) {
      const searchFilter = {
        contains: search,
        mode: 'insensitive' as const,
      }

      where.OR = [
        { itemName: searchFilter },
        { itemCode: searchFilter },
        { foreignName: searchFilter },
      ]
    }

    if (category) {
      where.productCategory = {
        equals: category.toUpperCase(),
        mode: 'insensitive',
      }
    }

    if (isActiveParam === 'true' || isActiveParam === 'false') {
      where.isActive = isActiveParam === 'true'
    }

    const skip = (page - 1) * pageSize

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [
          { [sortBy]: sortDirection },
          { id: 'asc' },
        ],
        skip,
        take: pageSize,
      }),

      prisma.product.count({ where }),
    ])

    res.setHeader('Cache-Control', 'no-store')

    return res.json({
      data: products,
      meta: {
        current_page: page,
        total_pages: Math.ceil(total / pageSize),
        total_records: total,
        limit: pageSize,
      },
    })
  } catch (error) {
    console.error('Failed to get products:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    })
  }
}
