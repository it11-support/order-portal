import { Package, ShoppingCart, ClipboardList, Clock } from 'lucide-react'
import { Shell } from '@layouts'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCart, useOrders } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

const CustomerDashboard = () => {
  const { user: currentUser } = useAuth()
  const { cartCount, cartQty } = useCart()
  const { orders } = useOrders()
  const navigate = useNavigate()

  const quickActions = [
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
  ]

  const stats = [
    {
      label: 'Pesanan Portal',
      value: String(orders.filter((o) => o.kind !== 'quote').length),
      icon: Clock,
    },
    {
      label: 'Permintaan Penawaran',
      value: String(orders.filter((o) => o.kind === 'quote').length),
      icon: Package,
    },
  ]

  return (
    <Shell title="Dashboard Pelanggan" showBack={false}>
      <div className="space-y-6">
        <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
            <CategoryIcon name="mdi:chef-hat" width={64} height={64} className="text-white" />
          </div>

          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
            Selamat datang
          </p>

          <p className="font-bold text-xl lg:text-2xl mt-0.5">
            {currentUser?.customer?.CardName ?? currentUser?.name}
          </p>

          <p className="text-white/60 text-sm mt-1">
            Kode Pelanggan: {currentUser?.customer?.CardCode ?? '-'}
          </p>

          <p className="text-white/60 text-xs mt-2">
            {currentUser?.customer?.GroupName ?? 'Pelanggan'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-3 text-center">
              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-1">
                <s.icon size={16} className="text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground font-semibold">{s.label}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="bg-white rounded-xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${action.color}`}
                >
                  <action.icon size={20} />
                </div>
                <p className="text-sm font-bold text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Ringkasan Akun
          </h2>
          <div className="bg-white rounded-xl border border-border p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nama</span>
              <span className="text-sm font-medium text-foreground">
                {currentUser?.customer?.CardName ?? currentUser?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Kode Pelanggan</span>
              <span className="text-sm font-medium text-foreground">
                {currentUser?.customer?.CardCode ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Kota</span>
              <span className="text-sm font-medium text-foreground">
                {currentUser?.customer?.City ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Syarat Pembayaran</span>
              <span className="text-sm font-medium text-foreground">
                {currentUser?.customer?.PaymentTerm ?? '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default CustomerDashboard
