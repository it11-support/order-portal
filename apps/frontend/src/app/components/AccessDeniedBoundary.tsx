import type { ReactNode } from 'react'
import { useAccessDenied } from '@contexts/AccessDeniedContext'
import AccessDenied from './common/AccessDenied'
import { AccessDeniedInterceptor } from './bridges/AccessDeniedInterceptor'
import { useAuth } from '../contexts'

type Props = {
  children: ReactNode
}

export default function AccessDeniedBoundary({ children }: Props) {
  const { deniedMessage, setDeniedMessage } = useAccessDenied()
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      setDeniedMessage(null)
      window.location.replace('/login')
    }
  }

  return (
    <>
      <AccessDeniedInterceptor />

      {deniedMessage ? <AccessDenied message={deniedMessage} onLogout={handleLogout} /> : children}
    </>
  )
}
