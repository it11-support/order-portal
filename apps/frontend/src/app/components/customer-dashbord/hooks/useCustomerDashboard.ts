
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  ShoppingCart,
  ClipboardList,
  Clock,
  MessageSquareQuote,
  Snowflake,
} from 'lucide-react'

import { useAuth, useCart, useOrders } from '@contexts'
import { Alert, DashboardStat, QuickAction } from '../types'



const formatDate = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date)
}

export const useCustomerDashboard = () => {
  const { user: currentUser } = useAuth()
  const { cartCount, cartQty } = useCart()
  const { orders } = useOrders()
  const navigate = useNavigate()

  const customer = currentUser?.customer

  const creditLimit = Number(customer?.creditLimit ?? 0)
  const balance = Number(customer?.balance ?? 0)
  const remainingCredit = creditLimit - balance

  const isOverCredit = remainingCredit < 0
  const hasCreditLimit = creditLimit > 0

  const isFrozen =
    customer?.frozenFor?.trim().toUpperCase() === 'Y'

  const frozenFrom = formatDate(customer?.frozenFrom)
  const frozenTo = formatDate(customer?.frozenTo)

  const frozenWindow =
    frozenFrom && frozenTo
      ? `${frozenFrom} sampai ${frozenTo}`
      : (frozenFrom ?? frozenTo) === null
        ? null
        : `${frozenFrom ?? 'sekarang'} sampai ${frozenTo ?? 'selamanya'
        }`

  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = []

    if (isFrozen) {
      result.push({
        key: 'frozen',
        tone: 'danger',
        icon: Snowflake,
        title: 'Akun Anda sedang dibekukan',
        body: `Pesanan baru tidak dapat diproses selama akun dibekukan.${frozenWindow
          ? ` Periode pembekuan: ${frozenWindow}.`
          : ''
          } Hubungi sales Anda untuk informasi lebih lanjut.`,
      })
    }

    return result
  }, [isFrozen, frozenWindow])

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        label: 'Belanja',
        description: 'Lihat katalog produk',
        icon: Package,
        onClick: () => navigate('/'),
        color: 'bg-blue-50 text-blue-600',
      },
      {
        label: 'Keranjang',
        description: `${cartCount} item · ${cartQty} qty`,
        icon: ShoppingCart,
        onClick: () => navigate('/cart'),
        color: 'bg-green-50 text-green-600',
      },
      {
        label: 'Order Saya',
        description: 'Riwayat order',
        icon: ClipboardList,
        onClick: () => navigate('/orders'),
        color: 'bg-purple-50 text-purple-600',
      },
      {
        label: 'Penawaran Harga',
        description: 'Permintaan penawaran',
        icon: MessageSquareQuote,
        onClick: () => navigate('/inquiries'),
        color: 'bg-amber-50 text-amber-600',
      },
    ],
    [navigate, cartCount, cartQty],
  )

  const stats = useMemo<DashboardStat[]>(
    () => [
      {
        label: 'Pesanan Portal',
        value: String(
          orders.filter((order) => order.kind !== 'quote')
            .length,
        ),
        icon: Clock,
      },
      {
        label: 'Permintaan Penawaran',
        value: String(
          orders.filter((order) => order.kind === 'quote')
            .length,
        ),
        icon: Package,
      },
    ],
    [orders],
  )

  return {
    currentUser,
    customer,

    // Credit
    creditLimit,
    balance,
    remainingCredit,
    isOverCredit,
    hasCreditLimit,

    // Frozen
    isFrozen,
    frozenFrom,
    frozenTo,
    frozenWindow,

    // Dashboard
    alerts,
    quickActions,
    stats,
  }
}
