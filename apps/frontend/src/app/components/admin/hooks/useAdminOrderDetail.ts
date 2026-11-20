import { useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import useSWR from 'swr'

import { useAuth, useOrders } from '@contexts'
import { swrFetcher } from '@lib'
import type { Order, FollowUpNote, RequestKind } from '@repo/shared'

type OrderResponse = { data: Order }

export const useAdminOrderDetail = (kind: RequestKind = 'order') => {
  const { orderId } = useParams<{ orderId: string }>()
  const { user } = useAuth()

  const {
    addFollowUp,
    linkSapDocument,
    error,
    loading,
  } = useOrders()

  const {
    data: orderResponse,
    isLoading: orderLoading,
    mutate: mutateOrder,
  } = useSWR<OrderResponse>(
    orderId ? `/requests/${encodeURIComponent(orderId)}` : null,
    (url: string) => swrFetcher<OrderResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 15_000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      dedupingInterval: 2_000,
      keepPreviousData: false,
    },
  )

  const followUpKey = orderId
    ? `/requests/${encodeURIComponent(orderId)}/follow-ups`
    : null

  const { data: followUpResponse, mutate: mutateFollowUps } = useSWR<{
    data: FollowUpNote[]
  }>(followUpKey, (url: string) => swrFetcher<{ data: FollowUpNote[] }>(url), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: false,
  })

  const order = orderResponse?.data ?? null
  const [noteInput, setNoteInput] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [docEntry, setDocEntry] = useState('')
  const [posting, setPosting] = useState(false)
  const [threadOpen, setThreadOpen] = useState(false)

  const threadRef = useRef<HTMLDivElement>(null)

  const notes = followUpResponse?.data ?? []
  const isQuote = order?.kind === 'quote'
  const isAdmin = user?.role.name === 'admin'

  const toggleThread = useCallback(() => {
    setThreadOpen((open) => !open)
    if (threadOpen) return

    requestAnimationFrame(() => {
      threadRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }, [threadOpen])

  const handleSendNote = async () => {
    if (!order || !noteInput.trim() || posting) return

    setPosting(true)
    try {
      await toast.promise(
        addFollowUp(order.id, noteInput, internalNote ? 'internal' : 'customer'),
        {
          loading: 'Mengirim pesan...',
          success: internalNote ? 'Pesan internal terkirim' : 'Pesan terkirim',
          error: 'Gagal mengirim pesan',
        },
      )
      setNoteInput('')
      setThreadOpen(true)
      await Promise.all([mutateOrder(), mutateFollowUps()])
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
      await mutateOrder()
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
