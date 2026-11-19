import { formatRupiah } from '@/lib/formatCurrency'
import { CreditLimitCardProps } from './types'

const CreditLimitCard = ({
  creditLimit,
  balance,
  remainingCredit,
  isOverCredit,
  hasCreditLimit,
}: CreditLimitCardProps) => {
  if (!hasCreditLimit) return null

  return (
    <div>
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Limit Kredit
      </h2>

      <div
        className={`rounded-xl border p-4 ${
          isOverCredit ? 'bg-red-50 border-red-200' : 'bg-white border-border'
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Credit Limit</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatRupiah(creditLimit)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Outstanding</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatRupiah(balance)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Available Credit</span>

            {isOverCredit && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 rounded px-1.5 py-0.5">
                Over Credit
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground tabular-nums">
            {formatRupiah(creditLimit)} &minus; {formatRupiah(balance)}
          </p>

          <p
            className={`text-lg font-bold tabular-nums ${
              isOverCredit ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {formatRupiah(remainingCredit)}
          </p>
        </div>

        {isOverCredit && (
          <p className="text-xs text-red-700 mt-2">
            Saldo outstanding {formatRupiah(balance)} melampaui credit limit{' '}
            {formatRupiah(creditLimit)}. Available credit Anda {formatRupiah(remainingCredit)}.
            Pesanan menunggu persetujuan sales sebelum dapat diproses.
          </p>
        )}
      </div>
    </div>
  )
}

export default CreditLimitCard
