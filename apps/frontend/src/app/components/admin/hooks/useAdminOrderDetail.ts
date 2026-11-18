
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth, useOrders } from '@contexts'
import type { Order, RequestKind } from '@repo/shared'

export const useAdminOrderDetail = (kind: RequestKind = 'order') => {
  const { orderId } = useParams<{ orderId: string }>()
  const { user } = useAuth()

  const {
    orders,
    addFollowUp,
    fetchFollowUps,
    fetchOrder,
    linkSapDocument,
    followUps,
    error,
    loading,
  } = useOrders()

  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [docEntry, setDocEntry] = useState('')
  const [posting, setPosting] = useState(false)
  const [threadOpen, setThreadOpen] = useState(false)

  const threadRef = useRef<HTMLDivElement>(null)

  const notes = followUps[orderId ?? ''] ?? []
  const isQuote = order?.kind === 'quote'
  const isAdmin = user?.role.name === 'admin'

  useEffect(() => {
    let cancelled = false

    const loadOrder = async () => {
      if (!orderId) {
        setOrder(null)
        setOrderLoading(false)
        return
      }

      setOrderLoading(true)
      setOrder(null)

      try {
        const existingOrder = orders.find((item) => item.id === orderId)
        const result = existingOrder ?? await fetchOrder(orderId)

        if (!cancelled) {
          setOrder(result ?? null)
        }

        await fetchFollowUps(orderId)
      } catch (error) {
        if (!cancelled) {
          console.error('Gagal memuat detail order:', error)
          toast.error('Gagal memuat detail permintaan')
        }
      } finally {
        if (!cancelled) {
          setOrderLoading(false)
        }
      }
    }

    void loadOrder()

    return () => {
      cancelled = true
    }
  }, [orderId, orders, fetchOrder, fetchFollowUps])

  const toggleThread = () => {
    setThreadOpen((open) => !open)

    if (threadOpen) return

    requestAnimationFrame(() => {
      threadRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }

  const handleSendNote = async () => {
    if (!order || !noteInput.trim() || posting) return

    setPosting(true)

    try {
      await toast.promise(
        addFollowUp(
          order.id,
          noteInput,
          internalNote ? 'internal' : 'customer',
        ),
        {
          loading: 'Mengirim pesan...',
          success: internalNote
            ? 'Pesan internal terkirim'
            : 'Pesan terkirim',
          error: 'Gagal mengirim pesan',
        },
      )

      setNoteInput('')
      setThreadOpen(true)
    } finally {
      setPosting(false)
    }
  }

  const handleSapLink = async () => {
    if (!order || posting) return

    const value = Number(docEntry)

    if (!Number.isSafeInteger(value) || value < 1) {
      toast.error('Masukkan nomor dokumen (angka).')
      return
    }

    setPosting(true)

    try {
      await toast.promise(linkSapDocument(order.id, value), {
        loading: 'Menyinkronkan dengan sistem...',
        success: 'Dokumen diproses',
        error: 'Gagal menautkan dokumen',
      })

      setDocEntry('')

      const refreshed = await fetchOrder(order.id)
      if (refreshed) {
        setOrder(refreshed)
      }
    } finally {
      setPosting(false)
    }
  }

  return {
    order,
    orderLoading,
    loading,
    error,
    user,
    notes,
    isQuote,
    isAdmin,
    kind,

    noteInput,
    setNoteInput,
    internalNote,
    setInternalNote,
    docEntry,
    setDocEntry,
    posting,
    threadOpen,
    threadRef,

    toggleThread,
    handleSendNote,
    handleSapLink,
  }
}
