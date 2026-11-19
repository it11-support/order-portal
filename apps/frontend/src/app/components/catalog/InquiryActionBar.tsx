import { Send } from 'lucide-react'
import { InquiryActionBarProps } from './types'

const InquiryActionBar = ({ count, sending, onSubmit }: InquiryActionBarProps) => {
  if (count === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:bottom-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{count} produk dipilih</span>

        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? 'Mengirim...' : 'Kirim Inquiry'}
        </button>
      </div>
    </div>
  )
}

export default InquiryActionBar
