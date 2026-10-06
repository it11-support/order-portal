import { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@utils'
import { Request, Response } from 'express'
import { AuthenticatedRequest } from '@auth'
import {
  currentCustomer,
  customerItemCodes,
  customerProductFilter,
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
  // ============================================================
  // SEARCH
  // ============================================================

  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : ''

  // ============================================================
  // SEARCH SELALU GLOBAL
  //
  // Category hanya digunakan untuk browsing.
  //
  // Jika search aktif, category sengaja diabaikan agar pencarian
  // dilakukan terhadap seluruh katalog.
  // ============================================================

  const category =
    search
      ? ''
      : typeof req.query.category === 'string'
        ? req.query.category.trim()
        : ''

  const isCustomer =
    req.user?.role.name === 'customer'

  // ============================================================
  // PAGINATION
  // ============================================================

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

  const page = Math.max(
    Number(pageParam) || 1,
    1,
  )

  const pageSize = Math.min(
    Math.max(
      Number(pageSizeParam) || 40,
      1,
    ),
    100,
  )

  // ============================================================
  // SEARCH FILTER
  // ============================================================

  const searchFilter: ProductWhereInput =
    search
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

  // ============================================================
  // PRODUCT IDENTITY
  //
  // Digunakan hanya untuk deduplication.
  // ============================================================

  const identityCode = normalizeItemCode

  let products: any[] = []
  let total = 0

  // ============================================================
  // CUSTOMER CATALOG
  // ============================================================

  if (isCustomer) {
    // ==========================================================
    // CATEGORY TERTENTU
    //
    // Jika customer memilih category, langsung ambil semua
    // produk aktif di category tersebut.
    //
    // Tidak bergantung pada histori pembelian.
    // ==========================================================

    if (category) {
      products =
        await prisma.product.findMany({
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
    }

    // ==========================================================
    // ALL PRODUCTS / GLOBAL SEARCH
    //
    // PRIORITAS:
    //
    // 1. PURCHASED
    // 2. OTHER ACTIVE
    //
    // Search juga masuk ke branch ini karena ketika search aktif,
    // category sudah dipaksa menjadi '' di atas.
    // ==========================================================

    else {
      const customer =
        await currentCustomer(req)

      if (!customer?.CardCode) {
        products = []
        total = 0
      } else {
        // ======================================================
        // PURCHASED ITEM CODES
        // ======================================================

        const purchasedCodesRaw =
          await customerItemCodes(
            customer.CardCode,
            customer.IndustryC ?? null,
          )

        // ======================================================
        // PURCHASED PRODUCTS
        // ======================================================

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

        // ======================================================
        // OTHER PRODUCTS
        //
        // Produk yang sudah masuk purchased tidak diambil lagi.
        // ======================================================

        const claimedCodes =
          purchasedProducts.map(
            (product) =>
              product.itemCode,
          )

        const otherProducts =
          await prisma.product.findMany({
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

        // ======================================================
        // MERGE + DISTINCT
        // ======================================================

        const seen =
          new Set<string>()

        const mergedProducts:
          typeof otherProducts = []

        const appendDistinct = (
          items: typeof otherProducts,
        ) => {
          for (const product of items) {
            const code =
              identityCode(
                product.itemCode,
              )

            if (seen.has(code)) {
              continue
            }

            seen.add(code)

            mergedProducts.push(
              product,
            )
          }
        }

        // Purchased selalu di depan.
        appendDistinct(
          purchasedProducts,
        )

        appendDistinct(
          otherProducts,
        )

        products = mergedProducts
        total = mergedProducts.length
      }
    }
  }

  // ============================================================
  // NON-CUSTOMER
  //
  // Admin / sales tetap dapat mengambil katalog.
  //
  // Category digunakan jika ada.
  // Search tetap global karena category otomatis kosong ketika
  // search aktif.
  // ============================================================

  else {
    products =
      await prisma.product.findMany({
        where: {
          isActive: true,

          ...(category
            ? {
              productCategory:
                category,
            }
            : {}),

          ...searchFilter,
        },

        orderBy: {
          itemName: 'asc',
        },
      })

    total = products.length
  }

  // ============================================================
  // CUSTOMER PRICE TARGET
  // ============================================================

  let prices = new Map()
  let priceCustomerId:
    string | null = null

  // ============================================================
  // CUSTOMER LOGIN
  // ============================================================

  if (isCustomer) {
    if (
      req.user?.customerId != null
    ) {
      priceCustomerId =
        String(
          req.user.customerId,
        )
    }
  }

  // ============================================================
  // ADMIN / SALES VIEWING CUSTOMER
  // ============================================================

  else if (
    typeof req.query.customerId ===
    'string' &&
    /^\d+$/.test(
      req.query.customerId,
    )
  ) {
    const target =
      await prisma.customers.findUnique({
        where: {
          id: BigInt(
            req.query.customerId,
          ),
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
        req.user?.role.name ===
        'admin' ||
        (
          req.user?.slpCode != null &&
          String(
            target.SlpCode,
          ) ===
          String(
            req.user.slpCode,
          )
        )
      )

    if (allowed) {
      priceCustomerId =
        String(target.id)
    }
  }

  // ============================================================
  // RESOLVE PRICES
  // ============================================================

  if (
    priceCustomerId &&
    products.length > 0
  ) {
    prices =
      await pricesForCatalog(
        BigInt(
          priceCustomerId,
        ),

        products.map(
          (product) =>
            product.itemCode,
        ),
      )
  }

  // ============================================================
  // FILTER PRODUCTS WITHOUT PRICE
  //
  // Jika ada customer price context, hanya produk yang benar-benar
  // memiliki harga yang boleh tampil.
  //
  // Penting:
  // jangan cek `prices.size > 0` di sini.
  //
  // Kalau map harga kosong, hasil katalog memang harus menjadi
  // kosong, bukan malah menampilkan semua produk tanpa harga.
  // ============================================================

  if (priceCustomerId) {
    products = products.filter((product) => {
      const resolvedPrice = prices.get(product.itemCode)

      if (!resolvedPrice) {
        return false
      }

      if (
        resolvedPrice.price === null ||
        resolvedPrice.price === undefined
      ) {
        return false
      }

      const numericPrice = Number(resolvedPrice.price)

      if (
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0
      ) {
        return false
      }

      return true
    })

    total = products.length
  }

  //  Ini lebih kuat daripada kode sekarang ya
  // ============================================================
  // PAGINATION
  //
  // Pagination dilakukan SETELAH:
  //
  // - category filter
  // - search
  // - dedup
  // - price filter
  //
  // Dengan begitu metadata pagination sesuai dengan produk yang
  // benar-benar dapat ditampilkan.
  // ============================================================

  if (shouldPaginate) {
    const start =
      (page - 1) * pageSize

    const end =
      start + pageSize

    products =
      products.slice(
        start,
        end,
      )
  }

  // ============================================================
  // RESPONSE DATA + PRICE
  // ============================================================

  const data =
    products.map(
      (product) => {
        const price =
          prices.get(
            product.itemCode,
          )

        return {
          ...product,

          price:
            price
              ? round6(
                price.price,
              )
              : null,

          currency:
            price?.currency ??
            null,

          priceSource:
            price?.source ??
            null,
        }
      },
    )

  // ============================================================
  // RESPONSE
  // ============================================================

  res.setHeader(
    'Cache-Control',
    'no-store',
  )

  res.status(200).json({
    data,

    meta: {
      current_page: page,

      total_pages:
        shouldPaginate
          ? (
            Math.ceil(
              total /
              pageSize,
            ) || 0
          )
          : total > 0
            ? 1
            : 0,

      total_records:
        total,

      limit:
        shouldPaginate
          ? pageSize
          : products.length,
    },
  })
}