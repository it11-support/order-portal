import { Bell, CheckCheck, X, ExternalLink } from 'lucide-react'
import { Shell } from '@layouts'
import { useNotifications, useAuth } from '@contexts'
import { useNavigate } from 'react-router-dom'
import { notificationTarget } from '@repo/shared'

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

const NotificationsPage = () => {
  const navigate = useNavigate()
  const { notifications, loading, markRead, dismiss, markAllRead } = useNotifications()
  const { isCustomer } = useAuth()

  return (
    <Shell title="Notifikasi" showBack>
      <div className="space-y-4">
        {notifications.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {notifications.filter((n) => !n.read && !n.dismissed).length} notifikasi belum dibaca
            </p>
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <CheckCheck size={14} />
              Tandai semua dibaca
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Memuat notifikasi...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell size={44} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold text-foreground">Belum ada notifikasi</p>
            <p className="text-xs mt-1">Notifikasi akan muncul di sini saat ada update.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl border border-border p-4 ${
                  !notification.read && !notification.dismissed ? 'border-accent/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {fmtDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!notification.read && !notification.dismissed && (
                      <button
                        onClick={() => markRead(notification.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                        title="Tandai dibaca"
                      >
                        <CheckCheck size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(notification.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      title="Abaikan"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
{(() => {
                  const target = notificationTarget(
                    notification.type,
                    notification.relatedId,
                    notification.kind,
                    isCustomer,
                  )
                  if (!target) return null
                  return (
                    <button
                      onClick={() => {
                        void markRead(notification.id)
                        navigate(target)
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      Lihat detail <ExternalLink size={12} />
                    </button>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

export default NotificationsPage
