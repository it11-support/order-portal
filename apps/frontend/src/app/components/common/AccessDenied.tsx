import { memo } from 'react'
import { ShieldX, LogOut } from 'lucide-react'

type AccessDeniedProps = {
  title?: string
  message?: string
  onLogout: () => void
}

const AccessDenied = ({
  title = 'Akses Ditolak',
  message = 'Anda tidak memiliki izin untuk mengakses aplikasi.',
  onLogout,
}: AccessDeniedProps) => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section
        role="alert"
        className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center"
      >
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldX size={32} strokeWidth={1.5} />
        </div>

        <h1 className="mb-3 text-xl font-bold text-foreground">{title}</h1>

        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <p className="mb-6 text-xs text-muted-foreground/70">
          Hubungi administrator untuk bantuan.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </section>
    </main>
  )
}

export default memo(AccessDenied)
