import { useEffect } from 'react'
import { useCart, useOrders, useCategories } from '@contexts'
import { useCartSummary } from './useCartSummary'
import { useCartCheckout } from './useCartCheckout'

export const useCartPage = () => {
  const { cart, cartQty, inquiryId } = useCart()
  const { refreshOrders, orderPlaced, setOrderPlaced, submitting, error } = useOrders()
  const { getCategoryIcon } = useCategories()
  const { total } = useCartSummary()
  const checkout = useCartCheckout()

  useEffect(() => {
    setOrderPlaced(false)
    void refreshOrders()
  }, [setOrderPlaced, refreshOrders])

  return {
    cart, cartQty, inquiryId, orderPlaced, submitting, error,
    getCategoryIcon, total, ...checkout,
  }
}
