import { Package, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

const Login = () => {
  const { login, user, loginError, setLoginError } = useAuth()
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(loginForm.username, loginForm.password)

      if (user?.role.name === 'customer') {
        navigate('/customer-dashboard', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickLogin = async (
    username: string,
    password: string,
    role: 'customer' | 'admin',
  ) => {
    setLoginForm({ username, password })
    setLoginError({})
    setSubmitting(true)
    try {
      await login(username, password)

      if (role === 'customer') {
        navigate('/customer-dashboard', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  if (user) {
    return <Navigate to={user.role.name === 'customer' ? '/customer-dashboard' : '/'} replace />
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col lg:flex-row">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Package size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">TSM</h1>
          <p className="text-white/50 text-lg font-medium">Order Portal</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-6 lg:p-12 lg:bg-white lg:shadow-2xl">
        {/* Mobile header */}
        <div className="text-center mb-8 lg:mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg lg:hidden">
            <Package size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white lg:text-foreground">TSM</h1>
          <p className="text-white/50 lg:text-muted-foreground text-[11px] mt-1 font-semibold uppercase tracking-wider">
            Order Portal
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="w-full bg-white rounded-2xl p-6 shadow-2xl lg:shadow-none lg:p-0 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Username / Kode Pelanggan
            </label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => {
                setLoginForm((f) => ({ ...f, username: e.target.value }))
                setLoginError({})
              }}
              placeholder="Masukkan username atau kode pelanggan"
              className={`w-full rounded-xl px-4 py-3 text-sm bg-input-background border focus:outline-none focus:ring-2 ${
                loginError?.username
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-border focus:ring-accent'
              }`}
            />
            {loginError?.username && (
              <p className="text-xs text-destructive font-semibold">{loginError.username}</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => {
                setLoginForm((f) => ({ ...f, password: e.target.value }))
                setLoginError({})
              }}
              placeholder="••••••••"
              className={`w-full rounded-xl px-4 py-3 text-sm bg-input-background border focus:outline-none focus:ring-2 ${
                loginError?.password
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-border focus:ring-accent'
              }`}
            />
            {loginError?.password && (
              <p className="text-xs text-destructive font-semibold">{loginError.password}</p>
            )}
            {loginError?.general && (
              <p className="text-xs text-destructive font-semibold mt-1">{loginError.general}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white font-bold py-3.5 rounded-xl hover:bg-accent/90 active:scale-[0.98] transition-all text-sm disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>

          {/* Admin demo */}
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Login Admin (Satu Klik)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'AdminPortal2026!', 'admin')}
                className="flex-1 text-xs bg-secondary hover:bg-border text-foreground px-3 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-1"
              >
                <User size={14} />
                Admin Portal
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
