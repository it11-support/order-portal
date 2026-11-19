import React from 'react'

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
    editing,
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

  const showAddButton = listMode || (qty === 0 && !editing && !disabled)

  return (
    <>
      <CreditWarningDialog
        product={product}
        showCreditModal={showCreditModal}
        setShowCreditModal={setShowCreditModal}
        remainingCredit={remainingCredit}
        balance={balance}
        creditLimit={creditLimit}
      />

      <PriceConfirmDialog
        showPriceConfirm={showPriceConfirm}
        closeDialog={closeDialog}
        product={product}
        hasPrice={hasPrice}
        handleAcceptPrice={handleAcceptPrice}
        handleContactSales={handleContactSales}
      />

      <QuantityDialog {...state} />

      {showAddButton ? (
        <AddToCartButton {...state} cardcode={props.cardcode} />
      ) : (
        <QuantityControls {...state} />
      )}
    </>
  )
}

export const QtyControl = React.memo(QtyControlComponent)
