import { CustomerAccountSummaryProps } from './types'

const CustomerAccountSummary = ({ currentUser }: CustomerAccountSummaryProps) => {
  const customer = currentUser?.customer

  const rows = [
    {
      label: 'Nama',
      value: customer?.CardName ?? currentUser?.name,
    },
    {
      label: 'Kode Pelanggan',
      value: customer?.CardCode ?? '-',
    },
    {
      label: 'Kota',
      value: customer?.City ?? '-',
    },
    {
      label: 'Payment Term',
      value: customer?.PaymentTerm ?? '-',
    },
  ]

  return (
    <div>
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Ringkasan Akun
      </h2>

      <div className="bg-white rounded-xl border border-border p-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>

            <span className="text-sm font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CustomerAccountSummary
