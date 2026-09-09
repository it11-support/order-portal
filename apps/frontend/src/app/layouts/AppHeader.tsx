import { ArrowLeft, LogOut, Package, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCart } from '@contexts'

type AppHeaderProps = {
  title: React.ReactNode
  showBack?: boolean
  backTo?: string | number
}

const AppHeader = ({ title, showBack = false, backTo }: AppHeaderProps) => {
  const navigate = useNavigate()
  const { user: currentUser, logout } = useAuth()
  const { cartCount } = useCart()

  const goBack = () => {
    if (typeof backTo === 'number') {
      navigate(backTo)
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate('/')
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-3 px-4 h-14 lg:h-14">
      {showBack && (
        <button
          onClick={goBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      {!showBack && (
        <div className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-primary shrink-0">
          <Package size={17} className="text-white" />
        </div>
      )}
      <h1 className="flex-1 text-[15px] font-bold text-foreground truncate">{title}</h1>
      {/* Cart icon — mobile only, in sidebar on desktop */}
      {currentUser?.role.name === 'customer' && !showBack && (
        <button
          onClick={() => navigate('/cart')}
          className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <ShoppingCart size={19} />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      )}
      {/* Logout — mobile only, in sidebar on desktop */}
      <button
        onClick={logout}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
      >
        <LogOut size={17} />
      </button>
    </header>
  )
}
export default AppHeader
