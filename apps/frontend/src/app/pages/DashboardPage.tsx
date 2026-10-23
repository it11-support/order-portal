import { Users, UserCheck, UserX, LockIcon } from 'lucide-react'
import { Loader } from '@components'
import { Shell } from '@layouts'
import { useAuth } from '@contexts'
import { swrFetcher } from '@lib'
import { Customer, ApiResponse } from '@repo/shared'
import useSWR from 'swr'
import { useMemo } from 'react'

const DashboardPage = () => {
  const { user: currentUser, isAdmin, isSalesAdmin } = useAuth()

  const {
    data: customerData,
    isLoading,
    error,
  } = useSWR<ApiResponse<Customer>>('/customers/stats', swrFetcher)

  const allCustomers: Customer[] = customerData?.data ?? []

  const customers = useMemo(() => {
    if (isAdmin) return allCustomers
    if (isSalesAdmin && currentUser?.slpCode) {
      return allCustomers.filter((c) => c.SlpCode !== null && c.SlpCode === currentUser.slpCode)
    }
    return allCustomers
  }, [allCustomers, isAdmin, isSalesAdmin, currentUser?.slpCode])

  const customersWithLogin = useMemo(() => {
    if (isAdmin) return allCustomers.filter((c) => c.user !== null && c.user?.encryptedPassword)
    if (isSalesAdmin && currentUser?.slpCode) {
      return allCustomers.filter(
        (c) =>
          c.SlpCode !== null &&
          c.SlpCode === currentUser.slpCode &&
          c.user !== null &&
          c.user?.encryptedPassword,
      )
    }
    return allCustomers
  }, [allCustomers, isAdmin, isSalesAdmin, currentUser?.slpCode])

  const total = customers.length
  const active = customers.filter((c) => c.NonActive !== 'Y').length
  const inactive = total - active

  const stats = [
    {
      label: 'Total Customer',
      value: String(total),
      icon: Users,
    },
    {
      label: 'Customer Dengan Login Aktif',
      value: String(customersWithLogin.length),
      icon: LockIcon,
    },

    {
      label: 'Aktif',
      value: String(active),
      icon: UserCheck,
    },
    {
      label: 'Non-Aktif',
      value: String(inactive),
      icon: UserX,
    },
  ]

  return (
    <Shell title="Dashboard" showBack={false}>
      <div className="space-y-6">
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error.message}
          </p>
        )}

        <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
            <Users size={64} />
          </div>

          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
            Selamat datang
          </p>

          <p className="font-bold text-xl lg:text-2xl mt-0.5">{currentUser?.name ?? '-'}</p>

          <p className="text-white/60 text-sm mt-1">
            {isAdmin ? 'Semua pelanggan' : 'Pelanggan di bawah tanggung jawab Anda'}
          </p>
        </div>

        {isLoading ? <Loader label="Memuat dashboard..." className="py-20" /> : (
          <>
            <h3 className="text-lg font-bold text-foreground mb-2">Customer</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-xl border border-border p-4 text-center"
                >
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                    <s.icon size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}

export default DashboardPage
