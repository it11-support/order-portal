import { Shell } from '@layouts'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCategories } from '@contexts'

import ActiveCartList from '@components/cart/ActiveCartList'

import CatalogHeader from '@components/catalog/CatalogHeader'
import SavedDrafts from '@components/catalog/SavedDrafts'
import CatalogProducts from '@components/catalog/CatalogProducts'
import InquiryActionBar from '@components/catalog/InquiryActionBar'
import CartActionBar from '@components/catalog/CartActionBar'
import { useCatalogDrafts } from '@components/catalog/hooks/useCatalogDrafts'
import { useCatalogInquiry } from '@components/catalog/hooks/useCatalogInquiry'

const CatalogPage = () => {
  const { user: currentUser, isAdmin, isSalesAdmin, isCustomer } = useAuth()

  const navigate = useNavigate()
  const isNonCustomer = isAdmin || isSalesAdmin

  const { search, setSearch, error: categoriesError } = useCategories()

  const {
    cart,
    savedDrafts,
    savingDraft,
    draftActionId,
    expandedDraftId,
    setExpandedDraftId,
    editingDraftId,
    catalogRef,
    continueDraft,
    saveEditedDraft,
    cancelSavedDraft,
    saveCustomerDraft,
    confirmExitDraft,
  } = useCatalogDrafts(isCustomer)

  const {
    catalogMode,
    setCatalogMode,
    inquiryItems,
    sendingInquiry,
    catalogProducts,
    catalogLoading,
    catalogFetching,
    catalogReachingEnd,
    loadMoreCatalog,
    catalogTotal,
    catalogError,
    addInquiryProduct,
    submitInquiry,
  } = useCatalogInquiry(isNonCustomer)

  const error = categoriesError || catalogError

  return (
    <Shell title="TSM Order Portal" showBack={false}>
      <div className="space-y-6 pb-36">
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <CatalogHeader
          name={currentUser?.name}
          cardCode={currentUser?.customer?.CardCode}
          search={search}
          onSearch={() => navigate('/search')}
          onClearSearch={() => setSearch('')}
        />

        {isCustomer && (
          <SavedDrafts
            drafts={savedDrafts.filter((draft) => draft.id !== editingDraftId)}
            expandedDraftId={expandedDraftId}
            editingDraftId={editingDraftId}
            draftActionId={draftActionId}
            savingDraft={savingDraft}
            onExpand={setExpandedDraftId}
            onContinue={continueDraft}
            onCancel={(id) => void cancelSavedDraft(id)}
          />
        )}

        <CatalogProducts
          isCustomer={isCustomer}
          isNonCustomer={isNonCustomer}
          catalogMode={catalogMode}
          setCatalogMode={setCatalogMode}
          products={catalogProducts}
          loading={catalogLoading}
          fetching={catalogFetching}
          reachingEnd={catalogReachingEnd}
          total={catalogTotal}
          loadMore={loadMoreCatalog}
          inquiryItems={inquiryItems}
          onToggleInquiry={addInquiryProduct}
          cart={cart}
          catalogRef={catalogRef}
        />

        {isCustomer && catalogMode === 'history' && <ActiveCartList />}
      </div>

      {isCustomer && catalogMode === 'inquiry' && (
        <InquiryActionBar
          count={inquiryItems.length}
          sending={sendingInquiry}
          onSubmit={submitInquiry}
        />
      )}

      {isCustomer && catalogMode === 'history' && (
        <CartActionBar
          cart={cart}
          editingDraftId={editingDraftId}
          savingDraft={savingDraft}
          onSave={saveCustomerDraft}
          onSubmit={() => (editingDraftId ? saveEditedDraft(true) : navigate('/cart'))}
          onExitDraft={confirmExitDraft}
          onCancelDraft={(id) => void cancelSavedDraft(id)}
        />
      )}
    </Shell>
  )
}

export default CatalogPage
