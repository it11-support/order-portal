export const formatRupiah = (
  value: number | string | null | undefined,
): string => {
  if (value === null || value === undefined || value === '') {
    return 'Harga belum tersedia'
  }

  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return 'Harga belum tersedia'
  }

  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  return `Rp. ${formatted}`
}