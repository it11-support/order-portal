import { User } from '@repo/shared'
import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'

export type AuthContextType = {
  user: User | null
  accessToken: string | null
  login: (username: string, password: string) => Promise<void>
  loginError: {
    username?: string
    password?: string
    general?: string
  }
  isAdmin: boolean
  isSalesAdmin: boolean
  isCustomer: boolean
  setLoginError: Dispatch<SetStateAction<{
    username?: string
    password?: string
    general?: string
  }>>
  logout: () => void
  loading: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within a <AuthProvider />')
  }

  return ctx
}
