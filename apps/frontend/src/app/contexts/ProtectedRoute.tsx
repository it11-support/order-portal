import { Navigate } from 'react-router-dom'
import { useAuth } from './authHook'
import type { RoleType } from '@repo/shared'

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: RoleType[]
}) => {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role.name)) {
    if (user.role.name === 'customer') {
      return <Navigate to="/customer-dashboard" replace />
    }
    if (user.role.name === 'admin' || user.role.name === 'sales_admin') {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
