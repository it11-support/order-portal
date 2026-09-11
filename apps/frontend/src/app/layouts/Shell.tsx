import AppHeader from './AppHeader'
import BottomNav from './BottomNav'
import { useAuth } from '@contexts'

const Shell = ({
  children,
  title,
  showBack = false,
  backTo,
  actionBar,
}: {
  children: React.ReactNode
  title: React.ReactNode
  showBack?: boolean
  backTo?: string | number
  actionBar?: React.ReactNode
}) => {
  const { user: currentUser } = useAuth()
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        <AppHeader title={title} showBack={showBack} backTo={backTo} />
        <main
          className={`flex-1 overflow-y-auto ${actionBar ? 'pb-32 lg:pb-24' : 'pb-20 lg:pb-8'}`}
        >
          <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8">{children}</div>
        </main>
        {actionBar && (
          <div className="fixed bottom-[58px] lg:bottom-0 left-0 lg:left-64 right-0 z-10 bg-white border-t border-border px-4 py-3">
            {actionBar}
          </div>
        )}
        {currentUser?.role.name === 'customer' && <BottomNav />}
      </div>
    </div>
  )
}

export default Shell
