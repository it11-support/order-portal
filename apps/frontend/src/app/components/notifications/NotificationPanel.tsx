import { Bell, X, CheckCheck, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { Loader } from '@components'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, useAuth } from '@contexts'
import { notificationTarget } from '@repo/shared'
import { toast } from 'sonner'

const fmtDate = (value: string) => {
  const date = new Date(value)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const NotificationPanel = () => {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, markRead, dismiss } = useNotifications()
  const { isCustomer } = useAuth()

  const [open, setOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const visible = notifications.slice(0, 8)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifikasi"
        aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 md:w-96 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-foreground">Notifikasi</p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup notifikasi"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-105 overflow-y-auto">
            {loading && visible.length === 0 ? (
              <Loader label="Memuat notifikasi..." className="py-8" />
            ) : visible.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Belum ada notifikasi.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {visible.map((notification) => {
                  const id = String(notification.id)
                  const expanded = expandedIds.includes(id)

                  const hasLongMessage =
                    notification.message.length > 140 || notification.message.includes('\n')

                  const target = notificationTarget(
                    notification.type,
                    notification.relatedId,
                    notification.kind,
                    isCustomer,
                  )

                  return (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-secondary/50 transition-colors ${
                        !notification.read ? 'bg-accent/10 border-l-2 border-accent' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground wrap-break-word">
                            {notification.title}
                          </p>

                          <div className="mt-1">
                            <p
                              className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap wrap-break-word ${
                                expanded ? '' : 'line-clamp-2'
                              }`}
                            >
                              {notification.message}
                            </p>

                            {hasLongMessage && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(id)}
                                aria-expanded={expanded}
                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                              >
                                {expanded ? (
                                  <>
                                    Lebih sedikit
                                    <ChevronUp size={12} />
                                  </>
                                ) : (
                                  <>
                                    Selengkapnya
                                    <ChevronDown size={12} />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <p className="text-[10px] text-muted-foreground mt-2">
                            {fmtDate(notification.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={async () => {
                                await markRead(notification.id)
                                toast.success('Notifikasi ditandai dibaca')
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                              title="Tandai dibaca"
                              aria-label="Tandai dibaca"
                            >
                              <CheckCheck size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              await dismiss(notification.id)
                              toast.success('Notifikasi diabaikan')
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                            title="Abaikan"
                            aria-label="Abaikan notifikasi"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {target && (
                        <button
                          type="button"
                          onClick={() => {
                            void markRead(notification.id)
                            navigate(target)
                            setOpen(false)
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                        >
                          Lihat detail
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/notifications')
                  setOpen(false)
                }}
                className="w-full text-center text-xs font-semibold text-foreground hover:text-accent transition-colors py-2 rounded-lg hover:bg-secondary"
              >
                Lihat semua notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationPanel
