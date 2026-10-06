import { User } from '@repo/shared'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@lib'
import { AuthContext, type AuthContextType } from './authHook'

type MeRequest = {
  token: string
  promise: Promise<User>
}

let meRequest: MeRequest | null = null

const getMe = (token: string): Promise<User> => {
  if (!meRequest || meRequest.token !== token) {
    const promise = api.get<User>('/me').then((response) => response.data)

    meRequest = { token, promise }
    void promise.catch(() => {
      if (meRequest?.promise === promise) meRequest = null
    })
  }

  return meRequest.promise
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState<AuthContextType['loginError']>({})
  const authVersionRef = useRef(0)
  const initPromiseRef = useRef<Promise<void> | null>(null)

  const isAdmin = user?.role.name === 'admin'
  const isSalesAdmin = user?.role.name === 'sales_admin'
  const isCustomer = user?.role.name === 'customer'
  const accessToken = localStorage.getItem('token')

  useEffect(() => {
    if (initPromiseRef.current) return

    const token = localStorage.getItem('token')

    if (!token) {
      setLoading(false)
      return
    }

    const init = async () => {
      const version = authVersionRef.current

      try {
        const res = await getMe(token)

        if (version === authVersionRef.current && localStorage.getItem('token') === token) {
          setUser(res)
        }
      } catch {
        if (version === authVersionRef.current) {
          if (localStorage.getItem('token') === token) {
            localStorage.removeItem('token')
          }
          setUser(null)
          setLoading(false)
        }
      } finally {
        if (version === authVersionRef.current) {
          setLoading(false)
        }
      }
    }

    initPromiseRef.current = init()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      setLoginError({})

      const res = await api.post('/auth/login', { username, password })

      authVersionRef.current += 1
      meRequest = null
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
      setLoading(false)
    } catch (err: any) {
      setLoginError(err.response?.data?.errors ?? {})
      throw err
    }
  }

  const logout = () => {
    authVersionRef.current += 1
    meRequest = null
    localStorage.removeItem('token')
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        loading,
        loginError,
        setLoginError,
        isAdmin,
        isSalesAdmin,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
