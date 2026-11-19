import { CategoryIcon } from '@components'
import type { useAuth } from '@contexts'

type CurrentUser = ReturnType<typeof useAuth>['user']

type CustomerWelcomeProps = {
  currentUser: CurrentUser
}

const CustomerWelcome = ({ currentUser }: CustomerWelcomeProps) => {
  const customer = currentUser?.customer

  return (
    <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
        <CategoryIcon name="mdi:chef-hat" width={64} height={64} className="text-white" />
      </div>

      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Selamat datang</p>

      <p className="font-bold text-xl lg:text-2xl mt-0.5">
        {customer?.CardName ?? currentUser?.name}
      </p>

      <p className="text-white/60 text-sm mt-1">Kode Pelanggan: {customer?.CardCode ?? '-'}</p>

      <p className="text-white/60 text-xs mt-2">{customer?.GroupName ?? 'Pelanggan'}</p>
    </div>
  )
}

export default CustomerWelcome
