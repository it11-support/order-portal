import { Bell, CheckCheck, X, ExternalLink } from 'lucide-react'
import { Loader } from '@components'
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

  const unreadCount = notifications.filter(
    (notification) => !notification.read && !notification.dismissed,
  ).length

  return (
    <Shell title="Notifikasi" showBack>
      <div className="space-y-4">
        {notifications.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{unreadCount} notifikasi belum dibaca</p>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>
        )}

        {loading ? (
          <Loader label="Memuat notifikasi..." className="py-12" />
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell size={44} className="mx-auto mb-3 opacity-20" />

            <p className="text-sm font-semibold text-foreground">Belum ada notifikasi</p>

            <p className="text-xs mt-1">Notifikasi akan muncul di sini saat ada update.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isUnread = !notification.read && !notification.dismissed

              const target = notificationTarget(
                notification.type,
                notification.relatedId,
                notification.kind,
                isCustomer,
              )

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-2xl border p-4 transition-colors ${
                    isUnread ? 'border-accent/40' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground wrap-break-word">
                        {notification.title}
                      </p>

                      <div className="mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap wrap-break-word">
                        {notification.message}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-2">
                        {fmtDate(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => void markRead(notification.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                          title="Tandai dibaca"
                          aria-label="Tandai dibaca"
                        >
                          <CheckCheck size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void dismiss(notification.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                        title="Abaikan"
                        aria-label="Abaikan notifikasi"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {target && (
                    <button
                      type="button"
                      onClick={() => {
                        void markRead(notification.id)
                        navigate(target)
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
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
    </Shell>
  )
}

export default NotificationsPage
