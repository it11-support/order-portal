import type { User } from '@repo/shared'
import { useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { api } from '@lib'
import { AuthContext, type AuthContextType } from './authHook'

const fetchMe = async (): Promise<User> => {
  const response = await api.get<User>('/me')
  return response.data
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const [loginError, setLoginError] = useState<AuthContextType['loginError']>({})

  const {
    data: user,
    isLoading,
    mutate,
  } = useSWR<User>(token ? ['/me', token] : null, fetchMe, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    keepPreviousData: false,
  })

  const login = async (username: string, password: string) => {
    try {
      setLoginError({})

      const response = await api.post<{
        token: string
        user: User
      }>('/auth/login', {
        username,
        password,
      })

      const { token: newToken, user: loggedInUser } = response.data

      localStorage.setItem('token', newToken)
      setToken(newToken)

      // Isi cache langsung dari respons login.
      // Tidak perlu memanggil /me lagi.
      await mutate(loggedInUser, { revalidate: false })
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            errors?: AuthContextType['loginError']
          }
        }
      }

      setLoginError(error.response?.data?.errors ?? {})
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setLoginError({})
  }

  const currentUser = token ? (user ?? null) : null

  const isAdmin = currentUser?.role?.name === 'admin'
  const isSalesAdmin = currentUser?.role?.name === 'sales_admin'
  const isCustomer = currentUser?.role?.name === 'customer'

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        accessToken: token,
        login,
        logout,
        loading: Boolean(token && isLoading),
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
