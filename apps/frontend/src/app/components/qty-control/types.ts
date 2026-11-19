import { Product } from "@repo/shared"
import { useQtyControl } from "./hooks/useQtyControl"

export type QtyControlProps = {
  product: Product
  cardcode?: string
  onContactSales?: (product: Product) => void
  qty?: number
  onQtyChange?: (productId: number, qty: number) => void
  onIncrease?: (product: Product) => void
  onDecrease?: (product: Product) => void
  onRemove?: (productId: number) => void
  onAdd?: (product: Product, qty?: number) => void
  listMode?: boolean
  disabled?: boolean
  openRequest?: number
  onDialogClose?: () => void
}

export type SapPayload = Record<string, unknown>

export type QtyState = ReturnType<typeof useQtyControl>

export type CreditWarningDialogProps = Pick<
  QtyState,
  | 'product'
  | 'showCreditModal'
  | 'setShowCreditModal'
  | 'creditLimit'
  | 'balance'
  | 'remainingCredit'
>

export type PriceConfirmDialogProps = Pick<
  QtyState,
  | 'product'
  | 'showPriceConfirm'
  | 'hasPrice'
  | 'closeDialog'
  | 'handleAcceptPrice'
  | 'handleContactSales'
>

export type QuantityDialogProps = Pick<
  QtyState,
  | 'product'
  | 'qty'
  | 'disabled'
  | 'showQtyDialog'
  | 'closeDialog'
  | 'handleConfirmQty'
  | 'salesUnit'
  | 'purchaseUnit'
  | 'purchasePackSize'
  | 'selectedUnit'
  | 'dialogQty'
  | 'dialogQuantity'
  | 'dialogUnitRef'
  | 'canConvert'
  | 'convertedQty'
  | 'validConvertedQty'
  | 'handleDialogQtyChange'
  | 'handleDialogUnitChange'
  | 'decreaseDialogQty'
  | 'increaseDialogQty'
  | 'sapPrice'
  | 'sapChecking'
  | 'sapCheckError'
  | 'stockChecked'
  | 'priceChecked'
>