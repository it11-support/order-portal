import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Package,
  Search,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth, useCart } from '@contexts'

type BottomNavTab = {
  label: string
  icon: LucideIcon
  path: string
  badge?: number
}

const BottomNav = () => {
  const { cartCount } = useCart()
  const { isAdmin, isSalesAdmin } = useAuth()

  const customerTabs: BottomNavTab[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/customer-dashboard',
    },
    {
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      label: 'Cari',
      icon: Search,
      path: '/search',
    },
    {
      label: 'Keranjang',
      icon: ShoppingCart,
      path: '/cart',
      badge: cartCount,
    },
    {
      label: 'Order',
      icon: ClipboardList,
      path: '/orders',
    },
  ]

  const salesAdminTabs: BottomNavTab[] = [
    { label: 'Permintaan', icon: ClipboardList, path: '/admin/orders' },
    {
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      label: 'Cari',
      icon: Search,
      path: '/search',
    },
    {
      label: 'Customers',
      icon: Users,
      path: '/admin/customers',
    },
  ]

  const adminTabs: BottomNavTab[] = [
    { label: 'Permintaan', icon: ClipboardList, path: '/admin/orders' },
    {
      label: 'Users',
      icon: Users,
      path: '/users',
    },
    {
      label: 'Kategori',
      icon: Package,
      path: '/admin/categories',
    },
    {
      label: 'Customers',
      icon: Users,
      path: '/admin/customers',
    },
  ]

  const tabs = isAdmin ? adminTabs : isSalesAdmin ? salesAdminTabs : customerTabs
  return (
    <nav
      data-bottom-nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border"
    >
      <div className="flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center min-w-0 py-2.5 gap-0.5 transition-colors ${
                isActive ? 'text-accent' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <tab.icon size={20} />

                  {(tab.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>

                <span
                  className={`text-[10px] font-semibold truncate ${isActive ? 'text-accent' : ''}`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
