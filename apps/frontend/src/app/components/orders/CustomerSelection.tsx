import type { Customer } from '@repo/shared'
import { Building2, ChevronRight, Search, Users, X } from 'lucide-react'
import { useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Loader } from '../common'

type CustomerSelectionProps = {
  search: string
  onCustomerSearch: (value: string) => void
  customerSuggestionsOpen: boolean
  setCustomerSuggestionsOpen: Dispatch<SetStateAction<boolean>>
  activeCustomerIndex: number
  setActiveCustomerIndex: Dispatch<SetStateAction<number>>
  customerResultsReady: boolean
  customerSuggestions: Customer[]
  customers: Customer[]
  selectCustomer: (customer: Customer) => void
}

const CustomerSelection = (props: CustomerSelectionProps) => {
  const {
    search,
    onCustomerSearch,
    customerSuggestionsOpen,
    setCustomerSuggestionsOpen,
    activeCustomerIndex,
    setActiveCustomerIndex,
    customerResultsReady,
    customerSuggestions,
    customers,
    selectCustomer,
  } = props

  const customerSearchRef = useRef<HTMLInputElement | null>(null)
  const customerOptionRefs = useRef<(HTMLButtonElement | null)[]>([])

  return (
    <section
      className={`relative overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm ${
        customerSuggestionsOpen ? 'z-50' : 'z-0'
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
            <Users size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Direktori Customer</h2>
            <p className="text-[11px] text-slate-500">Pilih akun untuk membuat sales order</p>
          </div>
        </div>
      </header>
      <div className="border-b border-slate-200 p-3 sm:p-4">
        <label
          htmlFor="sales-customer-search"
          className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
        >
          Cari customer
        </label>
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={customerSearchRef}
            id="sales-customer-search"
            value={search}
            onChange={(e) => {
              onCustomerSearch(e.target.value)
              setActiveCustomerIndex(-1)
              setCustomerSuggestionsOpen(Boolean(e.target.value.trim()))
            }}
            onFocus={() => setCustomerSuggestionsOpen(Boolean(search.trim()))}
            onBlur={() => setCustomerSuggestionsOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setCustomerSuggestionsOpen(false)
                setActiveCustomerIndex(-1)
                return
              }
              if (!search.trim()) return
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                setCustomerSuggestionsOpen(true)
                if (!customerResultsReady || customerSuggestions.length === 0) return
                setActiveCustomerIndex((index) =>
                  event.key === 'ArrowDown'
                    ? (index + 1) % customerSuggestions.length
                    : index <= 0
                      ? customerSuggestions.length - 1
                      : index - 1,
                )
              } else if (event.key === 'Enter' && customerSuggestionsOpen) {
                event.preventDefault()
                if (!customerResultsReady) return
                const customer =
                  customerSuggestions[activeCustomerIndex >= 0 ? activeCustomerIndex : 0]
                if (customer) selectCustomer(customer)
              }
            }}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={customerSuggestionsOpen && Boolean(search.trim())}
            aria-controls="customer-suggestions"
            aria-activedescendant={
              customerSuggestionsOpen && activeCustomerIndex >= 0
                ? `customer-option-${activeCustomerIndex}`
                : undefined
            }
            placeholder="Nama perusahaan atau CardCode"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                onCustomerSearch('')
                setActiveCustomerIndex(-1)
                setCustomerSuggestionsOpen(false)
                customerSearchRef.current?.focus()
              }}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          )}
          {customerSuggestionsOpen && Boolean(search.trim()) && (
            <div
              id="customer-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
            >
              {!customerResultsReady ? (
                <div className="px-4 py-3 text-xs text-slate-500">Mencari customer...</div>
              ) : customerSuggestions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500">Customer tidak ditemukan.</div>
              ) : (
                customerSuggestions.map((customer, index) => (
                  <button
                    key={String(customer.id)}
                    id={`customer-option-${index}`}
                    ref={(element) => {
                      customerOptionRefs.current[index] = element
                    }}
                    type="button"
                    role="option"
                    aria-selected={activeCustomerIndex === index}
                    onMouseEnter={() => setActiveCustomerIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCustomer(customer)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-sky-50 ${activeCustomerIndex === index ? 'bg-sky-50' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {customer.CardName}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {customer.CardCode}
                        {customer.SalesName ? ` · ${customer.SalesName}` : ''}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {!customerSuggestionsOpen && (
        <>
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Nama / Kode customer</span>
            <span>Pilih</span>
          </div>
          <div className="max-h-130 overflow-y-auto">
            {!customerResultsReady && <Loader label="Memuat customer..." className="p-4" />}
            {customerResultsReady && customers.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Users size={25} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Tidak ada customer ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">Coba nama atau kode yang berbeda.</p>
              </div>
            )}
            {customerResultsReady &&
              customers.map((customer, index) => (
                <button
                  key={String(customer.id)}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCustomer(customer)}
                  className={`group flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3.5 text-left transition-colors last:border-b-0 focus-visible:outline-none ${
                    activeCustomerIndex === index
                      ? 'bg-sky-100 ring-1 ring-inset ring-sky-300'
                      : 'hover:bg-sky-50'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 group-hover:border-sky-200 group-hover:bg-white group-hover:text-sky-700">
                    <Building2 size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug text-slate-900">
                      {customer.CardName}
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                      <span className="font-mono font-semibold text-slate-600">
                        {customer.CardCode}
                      </span>
                      {customer.SalesName ? ` · ${customer.SalesName}` : ''}
                    </span>
                  </span>
                  <ChevronRight
                    size={17}
                    className="shrink-0 text-slate-400 group-hover:text-sky-700"
                  />
                </button>
              ))}
          </div>
          <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
            Pilih customer untuk melanjutkan ke katalog produk.
          </footer>
        </>
      )}
    </section>
  )
}

export default CustomerSelection
