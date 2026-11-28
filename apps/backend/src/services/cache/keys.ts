const PREFIX = 'order-portal:v1'

export const CACHE_TTL = {
  // Customer
  CUSTOMER_ACTIVITY: 30 * 60,
  CUSTOMER_PURCHASED: 15 * 60,
  CUSTOMER_SUGGESTED: 15 * 60,

  // Product
  PRODUCT_CATALOG: 10 * 60,
  PRODUCT_CATEGORY: 60 * 60,
  PRODUCT_COUNT: 5 * 60,

  // Salesperson
  SALESPERSON: 60 * 60,

  // Pricing
  CUSTOMER_PRICING: 5 * 60,
  PRICE_LIST: 10 * 60,

  // Dashboard
  DASHBOARD: 5 * 60,
} as const

export const CACHE_KEYS = {
  customer: {
    activity: `${PREFIX}:customer:activity:3months`,

    purchased: (cardCode: string) =>
      `${PREFIX}:customer:purchased:${encodeURIComponent(cardCode.trim())}`,

    suggested: (cardCode: string, industryCode: number) =>
      `${PREFIX}:customer:suggested:${industryCode}:${encodeURIComponent(cardCode.trim())}`,
  },

  product: {
    catalog: `${PREFIX}:product:catalog`,

    catalogByCategory: (category: string) =>
      `${PREFIX}:product:catalog:category:${encodeURIComponent(category)}`,

    categories: `${PREFIX}:product:categories`,

    customerCategories: `${PREFIX}:product:categories:customer`,

    count: (category: string, isActive?: boolean) =>
      `${PREFIX}:product:count:${encodeURIComponent(category.toUpperCase())}:${isActive ?? 'all'}`,
  },

  salesperson: {
    list: `${PREFIX}:salesperson:list`,
  },

  pricing: {
    customer: (customerId: bigint | string) =>
      `${PREFIX}:pricing:customer:${customerId}`,

    priceList: (priceListId: number) =>
      `${PREFIX}:pricing:pricelist:${priceListId}`,
  },
} as const