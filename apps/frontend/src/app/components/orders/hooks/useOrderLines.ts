import { useMemo, useState } from 'react'
import type { Product } from '@repo/shared'
import type { OrderLine, Step } from './types'
export const useOrderLines = (products: Product[], step: Step, setStep: (step: Step) => void) => {
  const [lines, setLines] = useState<OrderLine[]>([])
  const addLine = (product: Product, qty = 1) => setLines(previous => {
    const existing = previous.find(line => String(line.product.id) === String(product.id))
    if (existing) return previous.map(line => String(line.product.id) === String(product.id)
      ? { product, qty: line.qty + qty } : line)
    return [...previous, { product, qty }]
  })

  const setLineQty = (productId: string, qty: number) => setLines(previous => {
    const exists = previous.some(line => String(line.product.id) === productId)
    if (exists) return previous.map(line => String(line.product.id) === productId
      ? { ...line, qty: Math.max(1, qty) } : line)
    const product = products.find(item => String(item.id) === productId)
    return product ? [...previous, { product, qty: Math.max(1, qty) }] : previous
  })
  const removeLine = (productId: string) => {
    setLines(previous => previous.filter(line => String(line.product.id) !== productId))
    if (step === 'confirm' && lines.length === 1) setStep('product')
  }

  const { total, totalQty } = useMemo(() => lines.reduce((result, line) => ({
    total: result.total + Number(line.product.price ?? 0) * line.qty,
    totalQty: result.totalQty + line.qty,
  }), { total: 0, totalQty: 0 }), [lines])

  return {
    lines,
    setLines,
    addLine,
    setLineQty,
    removeLine,
    total,
    totalQty
  }
}
