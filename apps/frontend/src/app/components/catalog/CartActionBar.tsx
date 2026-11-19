import { Save, Send } from 'lucide-react'
import { CartActionBarProps } from './types'

const CartActionBar = ({
  cart,
  editingDraftId,
  savingDraft,
  onSave,
  onSubmit,
}: CartActionBarProps) => {
  if (cart.length === 0 && !editingDraftId) {
    return null
  }

  const totalQty = cart.reduce((sum, item) => sum + (item.qty ?? 0), 0)

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:bottom-6">
      {editingDraftId && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-2 text-xs text-amber-900">
          <span className="font-semibold">Cart Aktif: Draft Tersimpan</span>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{cart.length} jenis produk</span>
        <span>{totalQty} unit</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={savingDraft}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent px-3 py-3 text-sm font-semibold text-accent disabled:opacity-50"
        >
          <Save size={16} />
          {savingDraft ? 'Menyimpan...' : 'Simpan Draft'}
        </button>

        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={savingDraft}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Send size={16} />
          Kirim Order
        </button>
      </div>
    </div>
  )
}

export default CartActionBar
