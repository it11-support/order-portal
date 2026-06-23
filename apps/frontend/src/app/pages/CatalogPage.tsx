import { Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Shell from '../layouts/Shell'
import { useNavigate } from 'react-router-dom'
import { ProductList } from '../components/products/ProductList'
import { CATEGORIES, PRODUCTS } from '../lib/mock-data'
import { useCart } from '../contexts/CartContext'

const CatalogPage = () => {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const { cart, increase, decrease, remove } = useCart()

  const popularProducts = PRODUCTS.slice(0, 12)

  return (
    <Shell title="TSM Order Portal" showBack={false}>
      <div className="space-y-6">
        {/* Greeting banner */}
        <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
            🏨
          </div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
            Selamat datang
          </p>
          <p className="font-bold text-xl lg:text-2xl mt-0.5">{currentUser?.name}</p>
          <p className="text-white/60 text-sm mt-1">{currentUser?.customer?.CardCode}</p>
        </div>

        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 text-muted-foreground text-sm hover:border-accent/40 transition-colors text-left"
        >
          <Search size={15} className="shrink-0" />
          <span>Cari produk...</span>
        </button>

        {/* Categories */}
        <section>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Kategori
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.id}`)}
                className="flex flex-col items-center gap-1.5 bg-white border border-border rounded-xl py-3 px-1 hover:border-accent hover:bg-accent/5 active:scale-95 transition-all"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[10px] font-semibold text-center text-foreground leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Popular products */}
        <section>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Produk Populer
          </h2>
          <ProductList
            products={popularProducts}
            cart={cart}
            increase={increase}
            decrease={decrease}
            remove={remove}
          />
        </section>
      </div>
    </Shell>
  )
}

export default CatalogPage
