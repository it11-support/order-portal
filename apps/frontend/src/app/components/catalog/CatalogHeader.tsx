import { Search, X } from 'lucide-react'
import { CategoryIcon } from '@components'
import { CatalogHeaderProps } from './types'

const CatalogHeader = ({ name, cardCode, search, onSearch, onClearSearch }: CatalogHeaderProps) => {
  return (
    <>
      {/* Greeting banner */}
      <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
          <CategoryIcon name="mdi:chef-hat" width={64} height={64} className="text-white" />
        </div>

        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
          Selamat datang
        </p>

        <p className="font-bold text-xl lg:text-2xl mt-0.5">{name}</p>

        <p className="text-white/60 text-sm mt-1">{cardCode}</p>
      </div>

      {/* Product search */}
      <div className="w-full flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 text-muted-foreground text-sm hover:border-accent/40 transition-colors">
        <button
          type="button"
          onClick={onSearch}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <Search size={15} className="shrink-0" />

          <span>{search || 'Cari semua produk ...'}</span>
        </button>

        {search && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onClearSearch()
            }}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </>
  )
}

export default CatalogHeader
