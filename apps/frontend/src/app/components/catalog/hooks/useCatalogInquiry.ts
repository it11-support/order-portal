
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@lib'
import { useCatalogProducts, useOrders } from '@contexts'

type CatalogMode = 'history' | 'inquiry'

type InquiryItem = {
  productId: string
  name: string
}

export const useCatalogInquiry = (isNonCustomer: boolean) => {
  const [catalogMode, setCatalogMode] =
    useState<CatalogMode>('history')

  const [inquiryItems, setInquiryItems] =
    useState<InquiryItem[]>([])

  const [sendingInquiry, setSendingInquiry] = useState(false)

  const { refreshOrders } = useOrders()

  const {
    products: catalogProducts,
    loading: catalogLoading,
    isFetching: catalogFetching,
    isReachingEnd: catalogReachingEnd,
    loadMore: loadMoreCatalog,
    total: catalogTotal,
    error: catalogError,
  } = useCatalogProducts(
    isNonCustomer
      ? undefined
      : catalogMode === 'history'
        ? 'actual'
        : 'pricelist',
  )

  type CatalogProduct = (typeof catalogProducts)[number]

  const addInquiryProduct = (product: CatalogProduct) => {
    const productId = String(product.id)

    setInquiryItems((items) =>
      items.some((item) => item.productId === productId)
        ? items.filter(
          (item) => item.productId !== productId,
        )
        : [
          ...items,
          {
            productId,
            name:
              product.itemName ??
              product.itemCode ??
              'Produk',
          },
        ],
    )
  }

  const submitInquiry = async () => {
    if (sendingInquiry || inquiryItems.length === 0) return

    setSendingInquiry(true)

    try {
      await api.post('/requests', {
        kind: 'quote',
        status: 'pending',
        items: inquiryItems.map(({ productId }) => ({
          productId,
          qty: 1,
        })),
      })

      setInquiryItems([])
      toast.success('Inquiry berhasil dikirim')

      await refreshOrders()
    } catch (error) {
      console.error('Gagal mengirim inquiry', error)

      toast.error(
        'Inquiry gagal dikirim. Pilihan produk tetap tersimpan.',
      )
    } finally {
      setSendingInquiry(false)
    }
  }

  return {
    catalogMode,
    setCatalogMode,
    inquiryItems,
    sendingInquiry,
    catalogProducts,
    catalogLoading,
    catalogFetching,
    catalogReachingEnd,
    loadMoreCatalog,
    catalogTotal,
    catalogError,
    addInquiryProduct,
    submitInquiry,
  }
}
