import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import { useCart } from '@contexts'
import QuantityInput from '../QuantityInput'

const money = (n: number) => `Rp ${n.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

function ActiveCartList() {
  const { cart, setCart } = useCart()
  if (!cart.length) return null
  const complete = cart.every(
    (line) =>
      line.product.price != null &&
      Number.isFinite(Number(line.product.price)) &&
      Number(line.product.price) > 0,
  )
  const total = cart.reduce(
    (sum, line) => sum + Number(line.product.price ?? 0) * (line.qty ?? 0),
    0,
  )
  return (
    <section
      className="space-y-3 rounded-2xl border border-border bg-white p-4"
      aria-label="Daftar Pembelian"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Daftar Pembelian</h2>
        <span className="text-xs text-muted-foreground">
          {cart.length} produk · {cart.reduce((n, line) => n + (line.qty ?? 0), 0)} unit
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-xs">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-2">Produk</th>
              <th className="px-2 text-center">Jumlah</th>
              <th className="px-2 text-right">Subtotal</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cart.map((line) => {
              const price = Number(line.product.price)
              const hasPrice =
                line.product.price != null &&
                Number.isFinite(Number(line.product.price)) &&
                Number(line.product.price) > 0

              return (
                <tr key={line.product.id}>
                  <td className="py-3 pr-2 align-middle">
                    <div className="font-semibold">{line.product.itemName}</div>
                    <div className="mt-1 text-muted-foreground">
                      {hasPrice ? money(price) : 'Harga belum tersedia'}
                    </div>
                  </td>
                  <td className="px-2 text-center align-middle">
                    <QuantityInput
                      quantity={line.qty ?? 1}
                      name={line.product.itemName}
                      onCommit={(qty) =>
                        setCart((prev) =>
                          prev.map((item) =>
                            String(item.product.id) === String(line.product.id)
                              ? { ...item, qty }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 text-right align-middle whitespace-nowrap">
                    {hasPrice ? money(price * (line.qty ?? 0)) : '—'}
                  </td>
                  <td className="align-middle text-right">
                    <button
                      type="button"
                      aria-label={`Hapus ${line.product.itemName}`}
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter(
                            (item) => String(item.product.id) !== String(line.product.id),
                          ),
                        )
                      }
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-sm font-semibold">
        <span>Perkiraan Total</span>
        <span>{complete ? money(total) : 'Ada harga belum tersedia'}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Perkiraan berdasarkan harga riwayat pembelian. Nilai akhir dapat berubah karena diskon,
        pajak, dan ketentuan lainnya.
      </p>
    </section>
  )
}

export default memo(ActiveCartList)
