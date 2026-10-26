import { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@utils'
import { Request, Response } from 'express'
import { AuthenticatedRequest } from '@auth'
import {
  currentCustomer,
  customerItemCodes,
  customerPurchasedItemCodes,
  normalizeItemCode,
} from '@/services/customer-catalog'
import { pricesForCatalog, round6 } from '@/services/pricing'

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


export const getProductsByCategory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  // SEARCH
  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : ''

  // Search selalu global, tanpa filter category
  const category = search
    ? ''
    : typeof req.query.category === 'string'
      ? req.query.category.trim()
      : ''

  // PRICE SOURCE
  const priceSource =
    typeof req.query.priceSource === 'string'
      ? req.query.priceSource.trim().toLowerCase()
      : ''

  if (
    priceSource &&
    priceSource !== 'actual' &&
    priceSource !== 'pricelist'
  ) {
    res.status(400).json({
      message: 'Invalid priceSource. Use actual or pricelist.',
    })
    return
  }

  const isCustomer = req.user?.role.name === 'customer'

  const hasCustomerId =
    typeof req.query.customerId === 'string' &&
    /^\d+$/.test(req.query.customerId)

  // PAGINATION PARAMS
  const pageParam =
    typeof req.query.page === 'string'
      ? req.query.page
      : ''

  const pageSizeParam =
    typeof req.query.pageSize === 'string'
      ? req.query.pageSize
      : ''

  const shouldPaginate = Boolean(
    pageParam || pageSizeParam,
  )

  const page = Math.max(Number(pageParam) || 1, 1)

  const pageSize = Math.min(
    Math.max(Number(pageSizeParam) || 40, 1),
    100,
  )

  // SEARCH FILTER
  const searchFilter: ProductWhereInput = search
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
    : {}

  const identityCode = normalizeItemCode

  let products: any[] = []
  let total = 0

  // CUSTOMER CATALOG
  if (isCustomer) {
    if (category) {
      products = await prisma.product.findMany({
        where: {
          isActive: true,
          productCategory: category,
          ...searchFilter,
        },
        orderBy: {
          itemName: 'asc',
        },
      })

      total = products.length
    } else {
      const customer = await currentCustomer(req)

      if (!customer?.CardCode) {
        products = []
        total = 0
      } else {
        const purchasedCodesRaw = await customerItemCodes(
          customer.CardCode,
          customer.IndustryC ?? null,
        )

        const purchasedProducts =
          purchasedCodesRaw.length > 0
            ? await prisma.product.findMany({
              where: {
                isActive: true,
                itemCode: {
                  in: purchasedCodesRaw,
                },
                ...searchFilter,
              },
              orderBy: {
                itemName: 'asc',
              },
            })
            : []

        const claimedCodes = purchasedProducts.map(
          (product) => product.itemCode,
        )

        const otherProducts = await prisma.product.findMany({
          where: {
            isActive: true,
            ...(claimedCodes.length > 0
              ? {
                itemCode: {
                  notIn: claimedCodes,
                },
              }
              : {}),
            ...searchFilter,
          },
          orderBy: {
            itemName: 'asc',
          },
        })

        // MERGE + DISTINCT
        const seen = new Set<string>()
        const mergedProducts: typeof otherProducts = []

        const appendDistinct = (
          items: typeof otherProducts,
        ) => {
          for (const product of items) {
            const code = identityCode(product.itemCode)

            if (seen.has(code)) continue

            seen.add(code)
            mergedProducts.push(product)
          }
        }

        appendDistinct(purchasedProducts)
        appendDistinct(otherProducts)

        products = mergedProducts
        total = mergedProducts.length
      }
    }
  } else {
    // ADMIN / SALES
    if (hasCustomerId) {
      const target = await prisma.customers.findUnique({
        where: {
          id: BigInt(req.query.customerId as string),
        },
        select: {
          CardCode: true,
          IndustryC: true,
          SlpCode: true,
          NonActive: true,
        },
      })

      const allowed =
        target &&
        target.CardCode &&
        target.NonActive !== 'Y' &&
        (
          req.user?.role.name === 'admin' ||
          (
            req.user?.slpCode != null &&
            String(target.SlpCode) ===
            String(req.user.slpCode)
          )
        )

      if (!allowed || !target?.CardCode) {
        res.status(403).json({
          message: 'Customer not found or access denied.',
        })
        return
      }

      const purchasedCodesRaw = await customerPurchasedItemCodes(
        target.CardCode,
      )

      const purchasedCodes = [
        ...new Set(purchasedCodesRaw),
      ]

      const purchasedProducts =
        purchasedCodes.length > 0
          ? await prisma.product.findMany({
            where: {
              isActive: true,
              itemCode: {
                in: purchasedCodes,
              },
              ...(category
                ? { productCategory: category }
                : {}),
              ...searchFilter,
            },
            orderBy: {
              itemName: 'asc',
            },
          })
          : []

      const claimedCodes = purchasedProducts.map(
        (product) => product.itemCode,
      )

      const otherProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(claimedCodes.length > 0
            ? {
              itemCode: {
                notIn: claimedCodes,
              },
            }
            : {}),
          ...(category
            ? { productCategory: category }
            : {}),
          ...searchFilter,
        },
        orderBy: {
          itemName: 'asc',
        },
      })

      const seen = new Set<string>()
      const mergedProducts: typeof otherProducts = []

      const appendDistinct = (
        items: typeof otherProducts,
      ) => {
        for (const product of items) {
          const code = normalizeItemCode(product.itemCode)

          if (seen.has(code)) continue

          seen.add(code)
          mergedProducts.push(product)
        }
      }

      appendDistinct(purchasedProducts)
      appendDistinct(otherProducts)

      products = mergedProducts
    } else {
      // Tanpa customerId: katalog normal
      products = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(category
            ? { productCategory: category }
            : {}),
          ...searchFilter,
        },
        orderBy: {
          itemName: 'asc',
        },
      })
    }

    total = products.length
  }

  // CUSTOMER PRICE TARGET
  let prices = new Map()
  let priceCustomerId: string | null = null

  if (isCustomer) {
    if (req.user?.customerId != null) {
      priceCustomerId = String(req.user.customerId)
    }
  } else if (
    typeof req.query.customerId === 'string' &&
    /^\d+$/.test(req.query.customerId)
  ) {
    const target = await prisma.customers.findUnique({
      where: {
        id: BigInt(req.query.customerId),
      },
      select: {
        id: true,
        SlpCode: true,
        NonActive: true,
        CardCode: true,
      },
    })

    const allowed =
      target &&
      target.CardCode &&
      target.NonActive !== 'Y' &&
      (
        req.user?.role.name === 'admin' ||
        (
          req.user?.slpCode != null &&
          String(target.SlpCode) ===
          String(req.user.slpCode)
        )
      )

    if (allowed) {
      priceCustomerId = String(target.id)
    }
  }

  // RESOLVE PRICES
  if (priceCustomerId && products.length > 0) {
    prices = await pricesForCatalog(
      BigInt(priceCustomerId),
      products.map((product) => product.itemCode),
    )
  }

  // FILTER PRODUCTS WITHOUT VALID PRICE
  if (priceCustomerId) {
    products = products.filter((product) => {
      const resolvedPrice = prices.get(product.itemCode)

      if (!resolvedPrice) return false

      if (
        resolvedPrice.price === null ||
        resolvedPrice.price === undefined
      ) {
        return false
      }

      const numericPrice = Number(resolvedPrice.price)

      return (
        Number.isFinite(numericPrice) &&
        numericPrice > 0
      )
    })

    total = products.length
  }

  // FILTER PRICE SOURCE
  // Dijalankan sebelum pagination agar setiap source
  // memiliki total_records dan total_pages sendiri.
  if (priceSource) {
    products = products.filter((product) => {
      const resolvedPrice = prices.get(product.itemCode)

      return resolvedPrice?.source === priceSource
    })

    total = products.length
  }

  // PAGINATION
  if (shouldPaginate) {
    const start = (page - 1) * pageSize
    const end = start + pageSize

    products = products.slice(start, end)
  }

  // PRICE CHANGE DETAILS: diskon hanya metadata, tidak dipakai menghitung harga.
  // Harga pembanding berasal dari master customer_item_prices.price.
  // Harga katalog dari pricesForCatalog tetap terpisah.
  type PriceChangeRow = {
    item_code: string
    last_invoice_num: string | null
    last_invoice_date: Date | null
    last_invoice_price: unknown
    last_invoice_base_price: unknown
    current_price: unknown
    discount_applied: unknown
    discount_source: string | null
  }

  const priceChanges = new Map<string, {
    lastInvoice: string | null
    lastInvoiceDate: string | null
    lastInvoicePrice: number | null
    lastInvoiceBasePrice: number | null
    currentPrice: number | null
    discountApplied: number | null
    discountSource: string | null
    priceDifference: number | null
    priceIncreasePercent: number | null
    priceIncreased: boolean
  }>()

  const asFiniteNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  const round2 = (number: number): number => Math.round(number * 100) / 100

  if (priceCustomerId && products.length > 0) {
    const itemCodes = [...new Set(products.map((product) => product.itemCode))]
    const rows = await prisma.$queryRaw<PriceChangeRow[]>`
      SELECT
        cip.item_code,
        cip.last_invoice_num,
        cip.last_invoice_date,
        cip.last_invoice_price,
        cip.last_invoice_base_price,
        cip.price AS current_price,
        cip.discount_applied,
        cip.discount_source
      FROM customer_item_prices cip
      WHERE cip.customer_id = ${BigInt(priceCustomerId)}
        AND cip.item_code = ANY(${itemCodes}::text[])
    `

    for (const row of rows) {
      const currentPrice = asFiniteNumber(row.current_price)
      const lastInvoicePrice = asFiniteNumber(row.last_invoice_price)
      const lastInvoiceBasePrice = asFiniteNumber(row.last_invoice_base_price)

      const priceIncreased =
        currentPrice !== null &&
        lastInvoiceBasePrice !== null &&
        lastInvoiceBasePrice > 0 &&
        currentPrice > lastInvoiceBasePrice

      const priceDifference = priceIncreased
        ? round2(currentPrice! - lastInvoiceBasePrice!)
        : null

      const priceIncreasePercent = priceIncreased
        ? round2((priceDifference! / lastInvoiceBasePrice!) * 100)
        : null

      priceChanges.set(normalizeItemCode(row.item_code), {
        lastInvoice: row.last_invoice_num == null ? null : String(row.last_invoice_num),
        lastInvoiceDate: row.last_invoice_date
          ? new Date(row.last_invoice_date).toISOString().slice(0, 10)
          : null,
        lastInvoicePrice,
        lastInvoiceBasePrice,
        currentPrice,
        discountApplied: asFiniteNumber(row.discount_applied),
        discountSource: row.discount_source ?? 'none',
        priceDifference,
        priceIncreasePercent,
        priceIncreased: priceDifference !== null && priceDifference > 0,
      })
    }
  }

  // RESPONSE DATA + PRICE
  const data = products.map((product) => {
    const resolved = prices.get(product.itemCode)
    const change = priceChanges.get(normalizeItemCode(product.itemCode))
    const catalogPrice = asFiniteNumber(resolved?.price)

    return {
      ...product,
      price: catalogPrice === null ? null : round6(catalogPrice),
      currency: resolved?.currency ?? null,
      priceSource: resolved?.source ?? null,
      lastInvoice: change?.lastInvoice ?? null,
      lastInvoiceDate: change?.lastInvoiceDate ?? null,
      lastInvoicePrice: change?.lastInvoicePrice ?? null,
      lastInvoiceBasePrice: change?.lastInvoiceBasePrice ?? null,
      currentPrice: change?.currentPrice ?? null,
      discountApplied: change?.discountApplied ?? null,
      discountSource: change?.discountSource ?? null,
      priceDifference: change?.priceDifference ?? null,
      priceIncreasePercent: change?.priceIncreasePercent ?? null,
      priceIncreased: change?.priceIncreased ?? false,
    }
  })

  res.setHeader('Cache-Control', 'no-store')

  res.status(200).json({
    data,
    meta: {
      current_page: page,
      total_pages: shouldPaginate
        ? Math.ceil(total / pageSize) || 0
        : total > 0
          ? 1
          : 0,
      total_records: total,
      limit: shouldPaginate
        ? pageSize
        : products.length,
    },
  })
}