import {
  Package,
  ShoppingCart,
  ClipboardList,
  Clock,
  MessageSquareQuote,
  Snowflake,
} from 'lucide-react'
import { Shell } from '@layouts'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCart, useOrders } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { formatRupiah } from '@/lib/formatCurrency'

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

type Alert = {
  key: string
  tone: 'danger' | 'warning'
  icon: typeof Snowflake
  title: string
  body: string
}

const CustomerDashboard = () => {
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
  const isFrozen = customer?.frozenFor?.trim().toUpperCase() === 'Y'
  const frozenFrom = formatDate(customer?.frozenFrom)
  const frozenTo = formatDate(customer?.frozenTo)
  const frozenWindow =
    frozenFrom && frozenTo
      ? `${frozenFrom} sampai ${frozenTo}`
      : (frozenFrom ?? frozenTo) === null
        ? null
        : `${frozenFrom ?? 'sekarang'} sampai ${frozenTo ?? 'selamanya'}`

  const alerts: Alert[] = []

  if (isFrozen) {
    alerts.push({
      key: 'frozen',
      tone: 'danger',
      icon: Snowflake,
      title: 'Akun Anda sedang dibekukan',
      body: `Pesanan baru tidak dapat diproses selama akun dibekukan.${
        frozenWindow ? ` Periode pembekuan: ${frozenWindow}.` : ''
      } Hubungi sales Anda untuk informasi lebih lanjut.`,
    })
  }

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
    {
      label: 'Penawaran Harga',
      description: 'Permintaan penawaran',
      icon: MessageSquareQuote,
      onClick: () => navigate('/inquiries'),
      color: 'bg-amber-50 text-amber-600',
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
    <Shell title="Dashboard" showBack={false}>
      <div className="space-y-6">
        {hasCreditLimit ? (
          <div>
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Limit Kredit
            </h2>
            <div
              className={`rounded-xl border p-4 ${
                isOverCredit ? 'bg-red-50 border-red-200' : 'bg-white border-border'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Credit Limit</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatRupiah(creditLimit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Outstanding</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatRupiah(balance)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Available Credit</span>
                  {isOverCredit ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 rounded px-1.5 py-0.5">
                      Over Credit
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatRupiah(creditLimit)} &minus; {formatRupiah(balance)}
                </p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    isOverCredit ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {formatRupiah(remainingCredit)}
                </p>
              </div>

              {isOverCredit ? (
                <p className="text-xs text-red-700 mt-2">
                  Saldo outstanding {formatRupiah(balance)} melampaui credit limit{' '}
                  {formatRupiah(creditLimit)}. Available credit Anda {formatRupiah(remainingCredit)}
                  . Pesanan menunggu persetujuan sales sebelum dapat diproses.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

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

        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.key}
                role="alert"
                className={`rounded-xl border p-4 flex items-start gap-3 ${
                  alert.tone === 'danger'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    alert.tone === 'danger'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <alert.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      alert.tone === 'danger' ? 'text-red-800' : 'text-amber-800'
                    }`}
                  >
                    {alert.title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      alert.tone === 'danger' ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {alert.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

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
              <span className="text-sm text-muted-foreground">Payment Term</span>
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
