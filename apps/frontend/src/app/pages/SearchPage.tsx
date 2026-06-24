import { Search, X, Package, ArrowLeft } from 'lucide-react'
import { ProductList } from '@components'
import { PRODUCTS } from '@lib'

import { BottomNav } from '@layouts'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCart } from '@contexts'

const SearchPage = () => {
  const { cart, increase, decrease, remove } = useCart()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 700)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  const searchResults = useMemo(() => {
    if (!debouncedSearch) return []

    const q = debouncedSearch.toLowerCase()

    return PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q),
    )
  }, [debouncedSearch])

  return (
    <div className="min-h-screen bg-background">
      {/* Custom search header */}
      <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-2 px-4 h-14">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex items-center bg-input-background border border-border rounded-xl px-3 gap-2">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari produk..."
            className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
              }}
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8">
          {!debouncedSearch ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search size={44} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Ketik nama produk untuk mencari</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package size={44} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">Produk tidak ditemukan</p>
              <p className="text-xs mt-1">Coba kata kunci lain</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                {searchResults.length} produk ditemukan
              </p>
              <ProductList
                products={searchResults}
                cart={cart}
                increase={increase}
                decrease={decrease}
                remove={remove}
              />
            </div>
          )}
        </div>
      </main>

      {currentUser?.role.name === 'customer' && <BottomNav />}
    </div>
  )
}

export default SearchPage
