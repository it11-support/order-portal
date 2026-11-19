import { AlertTriangle } from 'lucide-react'
import { formatRupiah } from '@/lib/formatCurrency'
import { CreditWarningDialogProps } from '../types'

const CreditWarningDialog = (props: CreditWarningDialogProps) => {
  const { showCreditModal, setShowCreditModal, product, remainingCredit, balance, creditLimit } =
    props
  if (!showCreditModal) return null

  const close = () => setShowCreditModal(false)

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`credit-warning-${product.id}`}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle size={24} className="text-destructive" />
        </div>

        <h3 id={`credit-warning-${product.id}`} className="text-base font-bold text-foreground">
          Transaksi Tidak Dapat Dilanjutkan
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Limit kredit Anda telah terlampaui. Silakan hubungi sales untuk informasi lebih lanjut.
        </p>

        <div className="m-2 space-y-3 rounded-xl bg-secondary/50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Limit Kredit</span>
            <span className="font-semibold">{formatRupiah(creditLimit)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Tagihan</span>
            <span className="font-semibold">{formatRupiah(balance)}</span>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">Sisa Kredit</span>
            <span className="text-lg font-bold text-destructive">
              {formatRupiah(remainingCredit)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={close}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Mengerti
        </button>
      </div>
    </div>
  )
}

export default CreditWarningDialog
