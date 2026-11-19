import React from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'

import type { QtyControlProps } from './types'
import { useQtyControl } from './hooks/useQtyControl'
import CreditWarningDialog from './dialogs/CreditWarningDialog'
import PriceConfirmDialog from './dialogs/PriceConfirmDialog'
import QuantityDialog from './dialogs/QuantityDialog'
import AddToCartButton from './controls/AddToCartButton'
import QuantityControls from './controls/QuantityControls'

const QtyControlComponent = (props: QtyControlProps) => {
  const state = useQtyControl(props)

  const {
    product,
    listMode,
    disabled,
    qty,
    inputValue,
    editing,
    setLocalIsEditing,
    handleQtyChange,
    handleBlur,
    handleIncrease,
    handleDecrease,
    onRemove,
    creditLimit,
    balance,
    remainingCredit,
    showCreditModal,
    setShowCreditModal,
    showPriceConfirm,
    closeDialog,
    handleAcceptPrice,
    handleContactSales,
    hasPrice,
  } = state

  const creditModal = (
    <CreditWarningDialog
      product={product}
      showCreditModal={showCreditModal}
      setShowCreditModal={setShowCreditModal}
      remainingCredit={remainingCredit}
      balance={balance}
      creditLimit={creditLimit}
    />
  )

  const qtyDialog = <QuantityDialog {...state} />

  const priceConfirmDialog = (
    <PriceConfirmDialog
      showPriceConfirm={showPriceConfirm}
      closeDialog={closeDialog}
      product={product}
      hasPrice={hasPrice}
      handleAcceptPrice={handleAcceptPrice}
      handleContactSales={handleContactSales}
    />
  )
  const dialogs = (
    <>
      {creditModal}
      {qtyDialog}
      {priceConfirmDialog}
    </>
  )

  const baseButton =
    'cursor-pointer w-7 h-7 flex items-center justify-center rounded-full active:scale-95 transition-transform hover:bg-secondary'

  const plusButton =
    'cursor-pointer w-7 h-7 flex items-center justify-center rounded-full active:scale-95 transition-transform bg-accent text-accent-foreground hover:bg-accent/80'

  const showAddButton = listMode || (qty === 0 && !editing && !disabled)

  if (listMode || (qty === 0 && !editing && !disabled)) {
    return (
      <>
        {dialogs}

        {showAddButton ? (
          <AddToCartButton {...state} cardcode={props.cardcode} />
        ) : (
          <QuantityControls {...state} />
        )}
      </>
    )
  }

  return (
    <>
      {dialogs}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Kurangi jumlah"
          disabled={disabled}
          onClick={handleDecrease}
          className={`${baseButton} bg-secondary ${
            disabled ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Minus size={13} />
        </button>

        <input
          type="number"
          min={0}
          value={inputValue}
          aria-label={`Jumlah ${product.itemName}`}
          onFocus={() => setLocalIsEditing(true)}
          onChange={handleQtyChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="h-8 w-12 rounded-lg border border-border bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          aria-label="Tambah jumlah"
          disabled={disabled}
          onClick={handleIncrease}
          className={`${plusButton} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Plus size={13} />
        </button>

        <button
          type="button"
          aria-label="Hapus dari keranjang"
          disabled={disabled}
          onClick={() => onRemove(product.id)}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-destructive/30 text-destructive transition-transform hover:bg-destructive/5 active:scale-95 ${
            disabled ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </>
  )
}

export const QtyControl = React.memo(QtyControlComponent)
