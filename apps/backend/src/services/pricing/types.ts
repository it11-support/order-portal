

/**
 * Two prices exist for every item, and which one applies depends on whether the
 * customer has ever bought it.
 *
 *   * "harga aktual" — the net unit price on their most recent invoice line.
 *     It already carries whatever discount was negotiated, so a repeat order is
 *     simply ordered at this price and needs no gate.
 *   * "harga price list" — ITM1 price for the customer's price list after
 *     OCRD.Discount. This is what a customer who has never bought the item
 *     sees, and what an inquiry is quoted at.
 *
 * The two meet in CustomerItemPrice: a row exists only for an item the customer
 * has actually purchased, so its presence is what makes an item a repeat item.
 * Price movement is therefore observed against the actual price, and the
 * price-list figure is always computed live because nothing is committed to it.
 */

export const PRICE_INCREASE_ALERT_PERCENT = 3

export type PriceSource = 'actual' | 'pricelist'

export interface EffectivePrice {
  itemCode: string
  price: number
  currency: string | null
  source: PriceSource
  discountApplied: number
}

export interface InvoicePriceRow {
  item_code: string
  line_total: string | null
  price_bef_disc: string | null
  disc_line: string | null
  quantity: string | null
  currency: string | null
  doc_date: Date | null
  doc_entry: number | null
  line_num: number | null
}

export interface PriceableCustomer {
  id: bigint
  CardCode: string | null
  priceListNum: number | null
  discountLevel: unknown
}

/**
 * One row per observed price movement. Rows are the audit trail behind the
 * customer-facing "harga naik" notification, the order confirmation gate, and
 * the notice dropped into open inquiries.
 */
export interface PriceMovement {
  itemCode: string
  itemName?: string
  oldPrice: number | null
  newPrice: number
  changePct: number
  direction: 'up' | 'down'
  currency: string | null
  sourceDoc: string | null
}

export interface PendingPriceIncrease {
  productId: string
  itemCode: string
  itemName: string
  oldPrice: number
  newPrice: number
  changePct: number
  currency: string | null
}
