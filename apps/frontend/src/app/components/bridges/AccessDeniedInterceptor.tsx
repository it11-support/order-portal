import { useEffect } from 'react'
import { api } from '@/lib/api'
import { useAccessDenied } from '@/app/contexts'

export const AccessDeniedInterceptor = () => {
  const { setDeniedMessage } = useAccessDenied()

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const message = error.response.data?.message
          setDeniedMessage(message ?? 'Akses ditolak. Silakan hubungi admin untuk bantuan.')
        }

        return Promise.reject(error)
      },
    )

    return () => api.interceptors.response.eject(interceptor)
  }, [setDeniedMessage])

  return null
}
