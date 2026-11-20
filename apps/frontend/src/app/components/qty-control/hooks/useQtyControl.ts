
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Product } from '@repo/shared'
import useSWR from 'swr'

import { useAuth, useCart } from '@contexts'
import { useContactSales } from '@contexts/ContactSalesContext'
import { swrFetcher } from '@lib'
import { QtyControlProps, SapPayload } from '../types'



const getSapPayload = (response: unknown): SapPayload => {
  if (
    !response ||
    typeof response !== 'object' ||
    Array.isArray(response)
  ) {
    return {}
  }

  const result = response as SapPayload
  const data = result.data

  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as SapPayload)
    : result
}

export const useQtyControl = ({
  product,
  cardcode,
  onContactSales,
  qty: propsQty,
  onQtyChange: propsOnQtyChange,
  onIncrease: propsOnIncrease,
  onDecrease: propsOnDecrease,
  onRemove: propsOnRemove,
  onAdd: propsOnAdd,
  listMode = false,
  disabled = false,
  openRequest = 0,
  onDialogClose,
}: QtyControlProps) => {
  const { user: currentUser, isCustomer } = useAuth()
  const { open: openContactSales } = useContactSales()

  const {
    onQtyChange: ctxOnQtyChange,
    increase: ctxIncrease,
    decrease: ctxDecrease,
    getQty: ctxGetQty,
    remove: ctxRemove,
  } = useCart()

  const customer = currentUser?.customer

  const creditLimit = Number(customer?.creditLimit ?? 0)
  const balance = Number(customer?.balance ?? 0)
  const remainingCredit = creditLimit - balance

  const isOverCredit =
    creditLimit > 0 && remainingCredit < 0

  const salesUnit = product.salesUnit || 'PCS'
  const purchaseUnit = product.purchaseUnit
  const purchasePackSize = Number(
    product.purchasePackSize ?? 1,
  )

  const qty = propsQty ?? ctxGetQty(product.id)

  const onQtyChange =
    propsOnQtyChange ??
    ((_id: number, value: number) =>
      ctxOnQtyChange(product, value))

  const onIncrease = propsOnIncrease ?? ctxIncrease
  const onDecrease = propsOnDecrease ?? ctxDecrease
  const onRemove = propsOnRemove ?? ctxRemove

  const isActualPrice = product.priceSource === 'actual'
  const hasPrice =
    product.price != null && Number(product.price) > 0

  const customerCardCode =
    customer?.CardCode ?? null

  const targetCardCode = cardcode || customerCardCode

  const [showCreditModal, setShowCreditModal] =
    useState(false)

  const [showPriceConfirm, setShowPriceConfirm] =
    useState(false)

  const [showQtyDialog, setShowQtyDialog] =
    useState(false)

  const [selectedUnit, setSelectedUnit] =
    useState<'salesUnit' | 'purchaseUnit'>('salesUnit')

  const [dialogQty, setDialogQty] = useState('1')

  const [localIsEditing, setLocalIsEditing] =
    useState(false)

  const editing =
    propsQty != null ? false : localIsEditing

  const [inputValue, setInputValue] = useState(
    String(qty),
  )

  const dialogUnitRef = useRef<HTMLSelectElement>(null)
  const handledOpenRequest = useRef(0)

  const canConvert =
    Boolean(purchaseUnit) &&
    purchaseUnit !== salesUnit &&
    Number.isFinite(purchasePackSize) &&
    purchasePackSize > 0

  const dialogQuantity = Number(dialogQty)

  const validDialogQty =
    /^\d+$/.test(dialogQty) &&
    Number.isSafeInteger(dialogQuantity) &&
    dialogQuantity > 0

  const conversionFactor =
    selectedUnit === 'purchaseUnit' && canConvert
      ? purchasePackSize
      : 1

  const convertedQty = validDialogQty
    ? dialogQuantity * conversionFactor
    : 0

  const validConvertedQty =
    validDialogQty &&
    Number.isSafeInteger(convertedQty) &&
    convertedQty > 0

  const sapEnabled =
    showQtyDialog &&
    Boolean(targetCardCode) &&
    Boolean(product.itemCode)

  const {
    data: stockData,
    error: stockError,
    isLoading: stockLoading,
  } = useSWR<unknown>(
    sapEnabled
      ? `/sap/stock?itemcode=${encodeURIComponent(product.itemCode)}`
      : null,
    swrFetcher,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      keepPreviousData: false,
      dedupingInterval: 0,
    },
  )

  const {
    data: priceData,
    error: priceError,
    isLoading: priceLoading,
  } = useSWR<unknown>(
    sapEnabled && targetCardCode
      ? `/sap/price?cardcode=${encodeURIComponent(targetCardCode)}&itemcode=${encodeURIComponent(product.itemCode)}`
      : null,
    swrFetcher,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      keepPreviousData: false,
      dedupingInterval: 0,
    },
  )

  const stockPayload = getSapPayload(stockData)
  const pricePayload = getSapPayload(priceData)

  const rawStock =
    stockPayload.Available ?? stockPayload.available

  const parsedStock =
    rawStock == null || rawStock === ''
      ? NaN
      : Number(rawStock)

  const rawPrice =
    pricePayload.price ??
    pricePayload.Price ??
    pricePayload.actualPrice ??
    pricePayload.ActualPrice

  const parsedPrice =
    rawPrice == null || rawPrice === ''
      ? NaN
      : Number(rawPrice)

  const stockChecked =
    sapEnabled &&
    Boolean(stockData) &&
    Number.isFinite(parsedStock)

  const priceChecked =
    sapEnabled &&
    Boolean(priceData) &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0

  const sapPrice = priceChecked ? parsedPrice : null

  const sapChecking =
    sapEnabled && (stockLoading || priceLoading)

  const sapCheckError = !showQtyDialog
    ? ''
    : !targetCardCode
      ? 'CardCode customer tidak tersedia.'
      : stockError
        ? 'Gagal memeriksa stok SAP.'
        : priceError
          ? 'Gagal memeriksa harga SAP.'
          : stockData && !stockChecked
            ? 'Respons stok SAP tidak valid.'
            : priceData && !priceChecked
              ? 'Respons harga SAP tidak memuat harga yang valid.'
              : ''

  const closeDialog = useCallback(() => {
    setShowQtyDialog(false)
    setShowPriceConfirm(false)
    onDialogClose?.()
  }, [onDialogClose])

  const resetDialog = () => {
    setDialogQty('1')
    setSelectedUnit('salesUnit')
  }

  const handleAdd = useCallback(() => {
    if (isOverCredit) {
      setShowCreditModal(true)
      return
    }

    if (isActualPrice && hasPrice) {
      setDialogQty('1')
      setSelectedUnit('salesUnit')
      setShowQtyDialog(true)
      return
    }

    setShowPriceConfirm(true)
  }, [isOverCredit, isActualPrice, hasPrice])

  const handleAcceptPrice = () => {
    if (isOverCredit) {
      setShowPriceConfirm(false)
      setShowCreditModal(true)
      return
    }

    if (!hasPrice && !targetCardCode) return

    setShowPriceConfirm(false)
    resetDialog()
    setShowQtyDialog(true)
  }

  const handleConfirmQty = () => {
    if (
      !validConvertedQty ||
      disabled ||
      sapChecking ||
      !stockChecked ||
      !priceChecked ||
      sapPrice === null
    ) {
      return
    }

    if (isOverCredit) {
      closeDialog()
      setShowCreditModal(true)
      return
    }

    const pricedProduct = {
      ...product,
      price: sapPrice,
    } as Product

    if (propsOnAdd) {
      propsOnAdd(pricedProduct, convertedQty)
    } else {
      onQtyChange(product.id, qty + convertedQty)
    }

    closeDialog()
    resetDialog()
  }

  const handleContactSales = () => {
    setShowPriceConfirm(false)
      ; (onContactSales ?? openContactSales)(product)
  }

  const handleQtyChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value
    setInputValue(value)

    if (value === '') return

    const newQty = Number(value)

    if (!Number.isNaN(newQty) && newQty >= 0) {
      onQtyChange(product.id, newQty)
    }
  }

  const handleBlur = () => {
    if (isOverCredit) {
      setLocalIsEditing(false)
      setInputValue(String(qty))
      return
    }

    setLocalIsEditing(false)

    const newQty = Number(inputValue)

    if (
      inputValue === '' ||
      Number.isNaN(newQty) ||
      newQty <= 0
    ) {
      onRemove(product.id)
      return
    }

    onQtyChange(product.id, newQty)
  }

  const handleDecrease = () => {
    if (isOverCredit) {
      setShowCreditModal(true)
      return
    }

    onDecrease(product)
  }

  const handleIncrease = () => {
    if (isOverCredit) {
      setShowCreditModal(true)
      return
    }

    onIncrease(product)
  }

  const handleDialogQtyChange = (value: string) => {
    if (/^\d*$/.test(value)) {
      setDialogQty(value)
    }
  }

  const handleDialogUnitChange = (value: string) => {
    if (value !== 'salesUnit' && value !== 'purchaseUnit') {
      return
    }

    setSelectedUnit(value)
    setDialogQty('1')
  }

  const decreaseDialogQty = () => {
    setDialogQty(
      String(
        Math.max(
          1,
          (validDialogQty ? dialogQuantity : 1) - 1,
        ),
      ),
    )
  }

  const increaseDialogQty = () => {
    setDialogQty(
      String(
        (validDialogQty ? dialogQuantity : 0) + 1,
      ),
    )
  }

  useEffect(() => {
    if (!showQtyDialog) return

    dialogUnitRef.current?.focus()
  }, [showQtyDialog])

  useEffect(() => {
    if (!editing) {
      setInputValue(String(qty))
    }
  }, [qty, editing])

  useEffect(() => {
    if (
      openRequest <= 0 ||
      handledOpenRequest.current === openRequest
    ) {
      return
    }

    handledOpenRequest.current = openRequest
    handleAdd()
  }, [openRequest, handleAdd])

  return {
    // Product
    product,
    listMode,
    disabled,
    isCustomer,

    // Quantity
    qty,
    inputValue,
    editing,
    setLocalIsEditing,
    handleQtyChange,
    handleBlur,
    handleIncrease,
    handleDecrease,
    onRemove,

    // Credit
    creditLimit,
    balance,
    remainingCredit,
    isOverCredit,
    showCreditModal,
    setShowCreditModal,

    // Dialogs
    showPriceConfirm,
    showQtyDialog,
    closeDialog,
    handleAdd,
    handleAcceptPrice,
    handleConfirmQty,
    handleContactSales,

    // Units
    salesUnit,
    purchaseUnit,
    purchasePackSize,
    selectedUnit,
    dialogQty,
    dialogQuantity,
    dialogUnitRef,
    canConvert,
    convertedQty,
    validDialogQty,
    validConvertedQty,
    handleDialogQtyChange,
    handleDialogUnitChange,
    decreaseDialogQty,
    increaseDialogQty,

    // Pricing
    isActualPrice,
    hasPrice,
    sapPrice,

    // SAP
    sapChecking,
    sapCheckError,
    stockChecked,
    priceChecked,
  }
}
