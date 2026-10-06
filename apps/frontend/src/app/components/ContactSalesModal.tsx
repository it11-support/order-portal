import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Icon } from '@iconify/react'
import { useContactSales } from '@/app/contexts/ContactSalesContext'
import { useOrders } from '@/app/contexts/OrderContext'
import { useCategories } from '@/app/contexts/CategoriesContext'

/**
 * The "Hubungi Sales" modal, owned by the provider so any product card in the
 * catalog can open it without threading a callback through three levels of
 * presentational components.
 *
 * It is a request for a price, not a chat: it builds the inquiry message and
 * hands it to the same sendQuote the suggested-items card uses.
 */
export const ContactSalesModal = () => {
  const { product, close } = useContactSales()
  const { sendQuote, submitting, error } = useOrders()
  const { getCategoryIcon } = useCategories()

  const [notes, setNotes] = useState(
    product
      ? `Halo, saya ingin menanyakan harga untuk ${product.itemName} (${product.itemCode}).`
      : '',
  )

  if (!product) return null

  const icon = getCategoryIcon(product.productCategory)

  const handleSend = async () => {
    if (!notes.trim() || submitting) return
    try {
      await sendQuote([{ product }], notes.trim())
      close()
    } catch {
      // error is surfaced by useOrders
    }
  }

  return (
    <div
      className="
        fixed inset-0 z-60
        flex items-center justify-center
        bg-black/40
        p-4
      "
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-sales-title"
        className="
          relative
          w-full max-w-md
          rounded-2xl
          border border-border
          bg-background
          p-5
          shadow-xl
        "
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Tutup"
          disabled={submitting}
          onClick={close}
          className="
            absolute right-3 top-3
            flex h-8 w-8
            items-center justify-center
            rounded-full
            text-muted-foreground
            transition-colors
            hover:bg-secondary
            hover:text-foreground
            disabled:opacity-50
          "
        >
          <X size={16} />
        </button>

        <div className="pr-10">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-accent" />
            <h3 id="contact-sales-title" className="text-base font-semibold">
              Hubungi Sales
            </h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tanyakan harga atau informasi produk kepada salesperson Anda.
          </p>
        </div>

        <div
          className="
            mt-4
            rounded-xl
            border border-border
            bg-secondary/30
            p-4
          "
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              {icon ? (
                <Icon icon={icon} width={24} height={24} className="text-emerald-600" />
              ) : (
                '-'
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{product.itemName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {product.itemCode}
                {product.salesUnit ? ` · ${product.salesUnit}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="sales-message" className="text-sm font-medium">
            Pesan
          </label>
          <textarea
            id="sales-message"
            value={notes}
            disabled={submitting}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Tulis pesan untuk sales..."
            className="
              mt-2
              w-full
              resize-none
              rounded-xl
              border border-border
              bg-background
              px-3 py-2.5
              text-sm
              text-foreground
              outline-none
              transition-all
              placeholder:text-muted-foreground
              focus:border-primary
              focus:ring-2
              focus:ring-primary/20
              disabled:opacity-60
            "
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">
            {typeof error === 'string' ? error : 'Gagal mengirim permintaan ke sales.'}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={close}
            className="
              flex-1
              rounded-xl
              border border-border
              px-4 py-2.5
              text-sm font-semibold
              transition-colors
              hover:bg-secondary
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Batal
          </button>
          <button
            type="button"
            disabled={submitting || !notes.trim()}
            onClick={handleSend}
            className="
              flex-1
              rounded-xl
              bg-accent
              px-4 py-2.5
              text-sm font-semibold
              text-accent-foreground
              transition-opacity
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {submitting ? 'Mengirim...' : 'Kirim ke Sales'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContactSalesModal
