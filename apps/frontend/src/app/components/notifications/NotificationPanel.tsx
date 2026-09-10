import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@contexts'

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
  const { notifications, unreadCount, loading, markRead, dismiss, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
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

  const visible = notifications.slice(0, 8)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
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
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-foreground">Notifikasi</p>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && visible.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Memuat notifikasi...</p>
            ) : visible.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Belum ada notifikasi.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {visible.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-secondary/50 transition-colors ${
                      !notification.read ? 'bg-accent/10 border-l-2 border-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {fmtDate(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => markRead(notification.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                            title="Tandai dibaca"
                          >
                            <CheckCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(notification.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                          title="Abaikan"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {notification.relatedId && (
                      <button
                        onClick={() => {
                          const kind = notification.type === 'new_quote' ? 'quote' : 'order'
                          if (
                            notification.type === 'new_order' ||
                            notification.type === 'new_quote'
                          ) {
                            navigate(`/admin/orders/${notification.relatedId}`)
                          } else if (notification.type === 'status_update') {
                            navigate(`/orders/${notification.relatedId}`)
                          } else {
                            navigate(`/admin/orders/${notification.relatedId}`)
                          }
                          setOpen(false)
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        Lihat detail <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border p-2">
              <button
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
