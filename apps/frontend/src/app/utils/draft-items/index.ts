type DraftProduct = {
  id: number | string
  price?: number | null
  currency?: string | null
  priceSource?: string | null
}

type DraftItem<T extends DraftProduct> = {
  product?: T | null
  qty?: number | null
  price?: number | null
  currency?: string | null
  priceSource?: string | null
}

export const mapDraftItemsToCart = <T extends DraftProduct>(
  items: DraftItem<T>[],
): Array<{ product: T; qty: number }> =>
  items.flatMap((item) => {
    if (item.product?.id == null) return []

    return [
      {
        product: {
          ...item.product,
          id: Number(item.product.id),
          price: item.price ?? item.product.price ?? null,
          currency: item.currency ?? item.product.currency ?? null,
          priceSource: item.priceSource ?? item.product.priceSource ?? null,
        },
        qty: Math.max(1, item.qty ?? 1),
      },
    ]
  })
