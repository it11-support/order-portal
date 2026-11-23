import { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@/utils'
import type { AuthenticatedRequest } from '@auth'

/**
 * Normalisasi item code dari SAP/database.
 *
 * Mencegah item yang sama dianggap berbeda karena:
 * - whitespace
 * - trailing space
 * - perbedaan uppercase/lowercase
 *
 * Dipakai sebagai identitas produk, BUKAN sebagai nilai untuk query.
 * Nilai yang dikembalikan ke Prisma harus tetap nilai persis seperti
 * tersimpan di products.item_code, karena `in`/`notIn` membandingkan
 * kolom mentah dan tidak tahan trailing space.
 */
export const normalizeItemCode = (value: string): string => value.trim().toUpperCase()

const emptyProductFilter = (): ProductWhereInput => ({
  isActive: true,
  itemCode: { in: [] },
})

const itemCodeFilter = (itemCodes: string[]): ProductWhereInput => ({
  isActive: true,
  itemCode: { in: itemCodes },
})

/**
 * Mengambil customer yang sedang login.
 */
export const currentCustomer = async (req: AuthenticatedRequest) => {
  if (req.user?.role.name !== 'customer' || req.user.customerId == null) {
    return null
  }

  const id = String(req.user.customerId)

  if (!/^\d+$/.test(id)) {
    return null
  }

  const customer = await prisma.customers.findUnique({
    where: {
      id: BigInt(id),
    },

    select: {
      id: true,
      CardCode: true,
      CardName: true,
      IndustryC: true,
      NonActive: true,
    },
  })

  if (!customer?.CardCode || customer.NonActive === 'Y') {
    return null
  }

  return customer
}

/**
 * Mengambil item code katalog berdasarkan histori customer.
 *
 * -----------------
 * Produk yang pernah dibeli customer sendiri.
 *
 * ----------------
 * Produk yang pernah dibeli customer lain
 * dengan industry yang sama,
 * tetapi BELUM pernah dibeli customer ini.
 *
 * Historical purchase:
 * - invoice tidak cancelled
 * - quantity > 0
 * - credit note tidak menghapus historical purchase
 *
 * Yang dikembalikan adalah `products.item_code` apa adanya, hasil join ke
 * tabel produk. sales_invoices.item_code disinkronkan dari SAP dan sering
 * berbeda dari products.item_code pada whitespace atau kapitalisasi, jadi
 * histori dicocokkan dengan UPPER(TRIM(...)) di kedua sisi.
 *
 * Penting: jangan menguppercase hasil sebelum memakainya di query Prisma.
 * `in`/`notIn` membandingkan kolom mentah, sehingga kode yang sudah
 * dinormalisasi tidak akan cocok dengan baris produk dan produk yang sama bisa
 * muncul di Purchased sekaligus Other.
 */
export const customerItemCodes = async (
  cardCode: string,
  industryCode: number | null,
): Promise<string[]> => {
  // =========================================================
  // SUGGESTED: purchased by other customers in the same industry
  // =========================================================

  if (industryCode == null) {
    return []
  }

  const rows = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT DISTINCT p.item_code
    FROM products p
    INNER JOIN sales_invoices si
      ON UPPER(TRIM(si.item_code)) = UPPER(TRIM(p.item_code))
    INNER JOIN customers c
      ON TRIM(c.card_code) = TRIM(si.card_code)
    WHERE c.industry_c = ${industryCode}
      AND TRIM(c.card_code) <> TRIM(${cardCode})
      AND si.canceled = 'N'
      AND si.quantity > 0
      AND NOT EXISTS (
        SELECT 1
        FROM sales_invoices own
        WHERE TRIM(own.card_code) = TRIM(${cardCode})
          AND UPPER(TRIM(own.item_code)) = UPPER(TRIM(p.item_code))
          AND own.canceled = 'N'
          AND own.quantity > 0
      )
  `

  return rows
    .map((row) => row.item_code)
    .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
}

/**
 * Membuat Prisma ProductWhereInput untuk customer.
 *
 *   hanya produk yang pernah dibeli.
 *
 * Filter ini mewakili histori pembelian customer, BUKAN filter kategori
 * katalog. Jangan dipakai untuk productCategory biasa seperti
 * CHEMICAL/SAUCE/TISSUE/OTHER.
 */
/**
 * Item codes yang pernah dibeli customer sendiri (repeat order).
 *
 * Historical purchase:
 * - invoice tidak cancelled
 * - quantity > 0
 *
 * Dicocokkan dengan UPPER(TRIM(...)) di kedua sisi karena
 * sales_invoices.item_code sering berbeda dari products.item_code pada
 * whitespace atau kapitalisasi.
 */
export const customerPurchasedItemCodes = async (cardCode: string): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT DISTINCT p.item_code
    FROM products p
    INNER JOIN sales_invoices si
      ON UPPER(TRIM(si.item_code)) = UPPER(TRIM(p.item_code))
    WHERE TRIM(si.card_code) = TRIM(${cardCode})
      AND si.canceled = 'N'
      AND si.quantity > 0
      AND p.item_code IS NOT NULL
  `

  return rows
    .map((row) => row.item_code)
    .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
}

/**
 * Membuat Prisma ProductWhereInput untuk repeat order customer.
 *
 * Hanya produk yang pernah dibeli customer sendiri (histori pembelian
 * actual). Filter ini mewakli histori pembelian customer, BUKAN filter
 * kategori katalog. Jangan dipakai untuk productCategory biasa seperti
 * CHEMICAL/SAUCE/TISSUE/OTHER.
 */
export const customerPurchasedProductFilter = async (
  req: AuthenticatedRequest,
): Promise<ProductWhereInput> => {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) return emptyProductFilter()

  const itemCodes = await customerPurchasedItemCodes(customer.CardCode)

  return itemCodeFilter(itemCodes)
}

/**
 * Membuat Prisma ProductWhereInput untuk saran (quote) customer.
 *
 * Hanya produk dari customer lain dengan industry yang sama yang BELUM
 * pernah dibeli customer ini. Filter ini mewakli histori pembelian
 * customer, BUKAN filter kategori katalog. Jangan dipakai untuk
 * productCategory biasa seperti CHEMICAL/SAUCE/TISSUE/OTHER.
 */
export const customerSuggestedProductFilter = async (
  req: AuthenticatedRequest,
): Promise<ProductWhereInput> => {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) return emptyProductFilter()

  const itemCodes = await customerItemCodes(
    customer.CardCode,
    customer.IndustryC ?? null,
  )

  return itemCodeFilter(itemCodes)
}

/**
 * Membuat Prisma ProductWhereInput untuk customer.
 *
 * @deprecated Gunakan customerPurchasedProductFilter untuk repeat order
 * atau customerSuggestedProductFilter untuk saran (quote).
 */
export const customerProductFilter = async (
  req: AuthenticatedRequest,
): Promise<ProductWhereInput> => {
  return customerSuggestedProductFilter(req)
}

export const customerUnpurchasedProductFilter = async (
  req: AuthenticatedRequest,
): Promise<ProductWhereInput> => {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) return emptyProductFilter()

  const purchasedCodes = await customerPurchasedItemCodes(customer.CardCode)

  if (!purchasedCodes.length) return { isActive: true }

  return {
    isActive: true,
    itemCode: { notIn: purchasedCodes },
  }
}