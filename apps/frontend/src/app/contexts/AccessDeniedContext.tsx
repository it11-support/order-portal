import { createContext, useContext, useState, type ReactNode } from 'react'

type AccessDeniedContextType = {
  deniedMessage: string | null
  setDeniedMessage: (message: string | null) => void
}

const AccessDeniedContext = createContext<AccessDeniedContextType | null>(null)

export function AccessDeniedProvider({ children }: { children: ReactNode }) {
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null)

  return (
    <AccessDeniedContext.Provider value={{ deniedMessage, setDeniedMessage }}>
      {children}
    </AccessDeniedContext.Provider>
  )
}

export function useAccessDenied() {
  const context = useContext(AccessDeniedContext)

  if (!context) throw new Error('useAccessDenied must be used within AccessDeniedProvider')

  return context
}
