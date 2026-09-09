import { User } from '@repo/shared'
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import { api } from '@lib'

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  loginError: {
    username?: string
    password?: string
    general?: string
  }
  isAdmin: boolean
  isCustomer: boolean
  setLoginError: Dispatch<
    SetStateAction<{ username?: string; password?: string; general?: string }>
  >
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState<{
    username?: string
    password?: string
    general?: string
  }>({})
  const isAdmin = user?.role.name === 'admin'
  const isCustomer = user?.role.name === 'customer'

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await api.get('/me')
        setUser(res.data)
      } catch (error) {
        localStorage.removeItem('token')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Login
  const login = async (username: string, password: string) => {
    try {
      setLoginError({})

      const res = await api.post('/auth/login', { username, password })

      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
    } catch (err: any) {
      setLoginError(err.response?.data?.errors ?? {})
      throw err
    }
  }

  // Logout
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, loginError, setLoginError, isAdmin, isCustomer }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within a <AuthProvider />')
  }

  return ctx
}

export default AuthProvider
