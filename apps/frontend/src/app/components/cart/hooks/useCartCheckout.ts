import { useState } from 'react'
import type { PriceChange } from '@repo/shared'
import { toast } from 'sonner'
import { useCart, useOrders } from '@contexts'
import { PriceIncreasedError } from '@/app/contexts/OrderContext'
import { useCartDraft } from './useCartDraft'

export const useCartCheckout = () => {
  const { cart, setCart, inquiryId, setInquiryId } = useCart()
  const { placeOrder } = useOrders()
  const [orderNotes, setOrderNotes] = useState('')
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const clearPriceChanges = () => setPriceChanges([])
  const draft = useCartDraft(clearPriceChanges)

  const submit = async (priceAccepted: boolean): Promise<boolean> => {
    try {
      await placeOrder(cart, orderNotes, setOrderNotes, () => setCart([]), {
        priceAccepted,
        inquiryId,
      })
      setInquiryId(null)
      setPriceChanges([])
      return true
    } catch (e) {
      if (e instanceof PriceIncreasedError) setPriceChanges(e.changes)
      return false
    }
  }

  const handlePlaceOrder = async () => {
    if (draft.activeDraftId) {
      await draft.saveActiveDraft(true)
      return
    }
    const success = await submit(false)
    if (success) toast.success('Order berhasil dikirim')
    else if (!priceChanges.length)
      toast.error('Order belum terkirim. Periksa pesan atau konfirmasi harga.')
  }

  const handleAcceptNewPrice = async () => {
    const success = await submit(true)
    if (success) toast.success('Order dikirim dengan harga terbaru')
    else toast.error('Order belum terkirim')
  }

  return {
    ...draft, orderNotes, setOrderNotes, priceChanges, setPriceChanges,
    handlePlaceOrder, handleAcceptNewPrice,
  }
}
