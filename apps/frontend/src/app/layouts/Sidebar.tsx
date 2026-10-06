import {
  ClipboardList,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  Package,
  PlusSquare,
  ShoppingCart,
  User,
  Users,
  Bell,
} from 'lucide-react'
import { useAuth, useCart, useNotifications } from '@contexts'
import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import NotificationPanel from '@/app/components/notifications/NotificationPanel'

type NavItem = {
  id: string
  label: string
  icon?: JSX.Element
  path?: string
  badge?: number
  children?: NavItem[]
}

const Sidebar = () => {
  const { user: currentUser, logout, isAdmin } = useAuth()
  const { cartCount } = useCart()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState<string[]>([])

  const toggleMenu = (id: string) => {
    setOpenMenus((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  const customerNav: NavItem[] = [
    {
      id: 'customer-dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      path: '/customer-dashboard',
    },
    {
      id: 'catalog',
      label: 'Home',
      icon: <Home size={18} />,
      path: '/',
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
      label: 'Order Saya',
      icon: <ClipboardList size={18} />,
      path: '/orders',
    },
    {
      id: 'inquiries',
      label: 'Penawaran Harga',
      icon: <MessageSquareQuote size={18} />,
      path: '/inquiries',
    },
  ]
  const adminNav: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      path: '/dashboard',
    },
    {
      id: 'admin-orders',
      label: 'Pesanan',
      icon: <ClipboardList size={18} />,
      path: '/admin/orders',
    },
    {
      id: 'admin-inquiries',
      label: 'Permintaan Penawaran',
      icon: <MessageSquareQuote size={18} />,
      path: '/admin/inquiries',
    },
    {
      id: 'admin-sales-order',
      label: 'Input Order',
      icon: <PlusSquare size={18} />,
      path: '/admin/sales-order',
    },
    {
      id: 'admin-users',
      label: 'Users',
      icon: <Users size={18} />,
      path: '/users',
    },
    {
      id: 'admin-products',
      label: 'Products',
      icon: <Package size={18} />,
      children: [
        {
          id: 'admin-product-list',
          label: 'Product List',
          path: '/admin/products',
        },
        {
          id: 'admin-categories',
          label: 'Category',
          path: '/admin/categories',
        },
      ],
    },
    {
      id: 'admin-customers',
      label: 'Customers',
      icon: <Users size={18} />,
      path: '/admin/customers',
    },
  ]
  const navItems = isAdmin || currentUser?.role.name === 'sales_admin' ? adminNav : customerNav

  const isActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path
    }
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path)
    }
    return false
  }

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
          const hasChildren = item.children && item.children.length > 0
          const expanded = openMenus.includes(item.id)
          const active = isActive(item)

          if (hasChildren) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-accent text-white'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                </button>
                {expanded && item.children && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const childActive = location.pathname === child.path
                      if (!child.path) return null
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent/10 text-accent'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`
                          }
                        >
                          <span className="flex-1 text-left">{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const itemActive = item.path ? location.pathname === item.path : false
          const badge = item.badge ?? 0
          if (!item.path) return null
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
                    itemActive ? 'bg-white/25 text-white' : 'bg-accent text-white'
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
              {currentUser?.customer?.CardCode}
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
