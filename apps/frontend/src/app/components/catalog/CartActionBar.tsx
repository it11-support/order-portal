import { useCart } from '@/app/contexts/CartContext'
import { CartActionBarProps } from './types'
import ActiveDraftSummary from './ActiveDraftSummary'

const CartActionBar = ({
  cart,
  editingDraftId,
  savingDraft,
  onSave,
  onSubmit,
  onCancelDraft,
}: CartActionBarProps) => {
  const { setCart } = useCart()

  if (cart.length === 0 && !editingDraftId) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:bottom-6">
      <ActiveDraftSummary
        cart={cart}
        isSavedDraft={Boolean(editingDraftId)}
        disabled={savingDraft}
        onCancel={() => {
          if (editingDraftId) {
            void onCancelDraft(editingDraftId)
          } else {
            setCart([])
          }
        }}
        onSave={onSave}
        onSubmit={onSubmit}
      />
    </div>
  )
}

export default CartActionBar
