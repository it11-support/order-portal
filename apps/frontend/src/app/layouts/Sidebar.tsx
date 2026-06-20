import {
  ClipboardList,
  Home,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  User,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'

type NavItem = {
  id: string
  label: string
  icon: JSX.Element
  path: string
  badge?: number
}

const Sidebar = () => {
  const { user: currentUser, logout } = useAuth()
  const { cartCount } = useCart()
  const location = useLocation()
  const isAdmin = currentUser?.role.name === 'admin'

  const customerNav: NavItem[] = [
    {
      id: 'catalog',
      label: 'Home',
      icon: <Home size={18} />,
      path: '/',
    },
    {
      id: 'search',
      label: 'Cari',
      icon: <Search size={18} />,
      path: '/search',
    },
    {
      id: 'cart',
      label: 'Keranjang',
      icon: <ShoppingCart size={18} />,
      path: '/cart',
      badge: cartCount,
    },
    {
      id: 'orders',
      label: 'My Orders',
      icon: <ClipboardList size={18} />,
      path: '/orders',
    },
  ]
  const adminNav: NavItem[] = [
    {
      id: 'admin-orders',
      label: 'Semua Order',
      icon: <ClipboardList size={18} />,
      path: '/admin/orders',
    },
    {
      id: 'admin-products',
      label: 'Products',
      icon: <Package size={18} />,
      path: '/admin/products',
    },
    {
      id: 'admin-customers',
      label: 'Customers',
      icon: <Users size={18} />,
      path: '/admin/customers',
    },
  ]
  const navItems = isAdmin ? adminNav : customerNav

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:z-30 lg:w-64 flex-col bg-white border-r border-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border shrink-0">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <Package size={17} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-[15px] text-foreground">TSM</p>
          <p className="text-[10px] text-muted-foreground font-medium">Order Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.id === 'catalog' && location.pathname.startsWith('/category')) ||
            (item.id === 'admin-orders' && location.pathname.startsWith('/admin/orders'))
          const badge = item.badge ?? 0
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span
                  className={`w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center ${
                    active ? 'bg-white/25 text-white' : 'bg-accent text-white'
                  }`}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 shrink-0 border-t border-border pt-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
            <User size={14} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {currentUser?.customer?.CardName}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <LogOut size={15} />
          Keluar
        </button>
      </div>
    </aside>
  )
}

export default Sidebar