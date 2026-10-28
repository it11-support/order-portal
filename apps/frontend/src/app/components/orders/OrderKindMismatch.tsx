import { useNavigate } from 'react-router-dom'
import { Shell } from '@layouts'
import type { RequestKind } from '@repo/shared'

type Props = {
  orderId: string
  actualKind: RequestKind
  expectedKind: RequestKind
  admin?: boolean
}

const kindLabel = (kind: RequestKind) => (kind === 'quote' ? 'permintaan penawaran' : 'pesanan')

export default function OrderKindMismatch({
  orderId,
  actualKind,
  expectedKind,
  admin = false,
}: Props) {
  const navigate = useNavigate()

  const basePath = admin ? '/admin' : ''
  const listPath = `${basePath}/${actualKind === 'quote' ? 'inquiries' : 'orders'}`

  return (
    <Shell
      title={actualKind === 'quote' ? 'Permintaan penawaran' : 'Pesanan'}
      showBack
      backTo={listPath}
    >
      <div className="space-y-3 py-12 text-center text-muted-foreground">
        <p className="text-sm">
          {orderId} adalah {kindLabel(actualKind)}, bukan {kindLabel(expectedKind)}.
        </p>

        <button
          type="button"
          onClick={() => navigate(`${listPath}/${orderId}`)}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white"
        >
          Buka {actualKind === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'}
        </button>
      </div>
    </Shell>
  )
}
