import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'
import { Shell } from '@layouts'
import { useOrders } from '@contexts'
import type { Order } from '@repo/shared'
import ReviewOrder from './ReviewOrder'
import ProductSelection from './ProductSelection'
import CustomerSelection from './CustomerSelection'
import { OrderDraft } from './OrderDraft'
import Stepper from './Stepper'
import { useCustomerSearch, useOrderForm, useProductCatalog, useOrderLines, useOrderDraft } from './hooks'

const SalesOrderEntryPage = () => {
  const location = useLocation()
  const incomingDraft = (location.state as { resumeDraft?: Order } | null)?.resumeDraft
  const { submitForCustomer, orders, refreshOrders } = useOrders()
  const form = useOrderForm()
  const customerSearch = useCustomerSearch(form.step)
  const catalog = useProductCatalog(form.customerId, form.debouncedProductSearch,
    form.historyPage, form.pricelistPage, form.step === 'product')
  const products = useMemo(() => [...catalog.historyProducts, ...catalog.pricelistProducts],
    [catalog.historyProducts, catalog.pricelistProducts])
  const cart = useOrderLines(products, form.step, form.setStep)
  const draft = useOrderDraft({ orders, customers: customerSearch.customers, incomingDraft,
    refreshOrders, submitForCustomer, form, cart, customerSearch })
  const { step, setStep, selectedCustomer, customerId, productSearch, productSuggestionsOpen,
    setProductSuggestionsOpen, activeSuggestionIndex, setActiveSuggestionIndex,
    suggestionRefs, productSearchRef, cartDialogProduct, setCartDialogProduct,
    cartOpenRequest, productTab, setProductTab, historyPage, setHistoryPage,
    pricelistPage, setPricelistPage, notes, setNotes, activeDraftId, posting,
    searchingProducts, onProductSearch, openProductCart, resetProductSearch } = form
  const { search, onCustomerSearch, customerSuggestionsOpen, setCustomerSuggestionsOpen,
    activeCustomerIndex, setActiveCustomerIndex, customerResultsReady, customerSuggestions,
    customers } = customerSearch
  const { historyProducts, historyMeta, historyLoading, historyError,
    pricelistProducts, pricelistMeta, pricelistLoading, pricelistError,
    productSuggestions, suggestionsLoading } = catalog
  const { lines, addLine, setLineQty, removeLine, total, totalQty } = cart
  const { allDrafts, resumeDraft, saveDraft, cancelDraft, submit } = draft
  const selectCustomer = (customer: Parameters<typeof form.selectCustomer>[0]) => {
    form.selectCustomer(customer)
    cart.setLines([])
    customerSearch.setSearch('')
    customerSearch.setActiveCustomerIndex(-1)
    customerSearch.setCustomerSuggestionsOpen(false)
  }
  return (
    <Shell
      title="Input Order Customer"
      showBack={false}
      actionBar={
        step === 'confirm' ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={submit}
              disabled={posting || !customerId || !lines.length}
              className="flex items-center gap-2 bg-accent text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              <Send size={12} />
              {posting ? 'Mengirim...' : 'Kirim Order'}
            </button>
          </div>
        ) : null
      }
    >
      <div className="max-w-3xl space-y-4">
        <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          Order yang dibuat di sini masuk ke daftar order customer dengan status menunggu
          konfirmasi, dan customer menerima notifikasi. Harga dihitung dari harga aktual customer
          untuk produk yang pernah dibeli, price list untuk produk baru.
        </p>

        {/* Enterprise order progress */}
        <nav
          aria-label="Tahapan order"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Stepper */}
          <Stepper step={step} />
        </nav>

        {step === 'customer' && (
          <OrderDraft
            drafts={allDrafts}
            onResume={resumeDraft}
            onCancel={cancelDraft}
            disabled={posting}
          />
        )}

        {/* Step 1: Customer - Enterprise directory */}
        {step === 'customer' && (
          <CustomerSelection
            search={search}
            onCustomerSearch={onCustomerSearch}
            customerSuggestionsOpen={customerSuggestionsOpen}
            setCustomerSuggestionsOpen={setCustomerSuggestionsOpen}
            activeCustomerIndex={activeCustomerIndex}
            setActiveCustomerIndex={setActiveCustomerIndex}
            customerResultsReady={customerResultsReady}
            customerSuggestions={customerSuggestions}
            customers={customers}
            selectCustomer={selectCustomer}
          />
        )}
        {/* Step 2: Product - Enterprise workspace */}
        {step === 'product' && selectedCustomer && (
          <ProductSelection
            selectedCustomer={selectedCustomer}
            activeDraftId={activeDraftId}
            onBack={() => setStep('customer')}
            onCancelDraft={cancelDraft}
            posting={posting}
            lines={lines}
            onSaveDraft={saveDraft}
            totalQty={totalQty}
            total={total}
            onRemoveLine={removeLine}
            onSetLineQty={setLineQty}
            onConfirm={() => setStep('confirm')}
            addLine={addLine}
            resetProductSearch={resetProductSearch}

            productSearchRef={(element) => {
              productSearchRef.current = element
            }}
            productSearch={productSearch}
            onProductSearch={onProductSearch}
            productSuggestionsOpen={productSuggestionsOpen}
            setProductSuggestionsOpen={setProductSuggestionsOpen}
            activeSuggestionIndex={activeSuggestionIndex}
            setActiveSuggestionIndex={setActiveSuggestionIndex}
            suggestionsLoading={suggestionsLoading}
            productSuggestions={productSuggestions}
            suggestionRefs={suggestionRefs}
            openProductCart={openProductCart}
            searchingProducts={searchingProducts}

            // Autocomplete cart
            cartDialogProduct={cartDialogProduct}
            setCartDialogProduct={setCartDialogProduct}
            cartOpenRequest={cartOpenRequest}

            // Product tabs
            productTab={productTab}
            setProductTab={setProductTab}

            // History Pembelian
            historyProducts={historyProducts}
            historyMeta={historyMeta}
            historyPage={historyPage}
            setHistoryPage={setHistoryPage}
            historyLoading={historyLoading}
            historyError={historyError}

            // Produk Lainnya
            pricelistProducts={pricelistProducts}
            pricelistMeta={pricelistMeta}
            pricelistPage={pricelistPage}
            setPricelistPage={setPricelistPage}
            pricelistLoading={pricelistLoading}
            pricelistError={pricelistError}
          />
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && lines.length > 0 && (
          <ReviewOrder
            selectedCustomer={selectedCustomer}
            lines={lines}
            totalQty={totalQty}
            total={total}
            notes={notes}
            posting={posting}
            activeDraftId={activeDraftId}
            onBack={() => setStep('product')}
            onCancelDraft={cancelDraft}
            onSaveDraft={saveDraft}
            onRemoveLine={removeLine}
            onSetLineQty={setLineQty}
            onNotesChange={setNotes}
          />
        )}
      </div>
    </Shell>
  )
}

export default SalesOrderEntryPage
