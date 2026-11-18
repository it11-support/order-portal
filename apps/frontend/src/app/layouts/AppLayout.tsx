import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { ScrollToTopButton } from '@components'
import { Suspense } from 'react'

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <ScrollToTopButton />
        <Suspense fallback={<div className="p-6">Memuat halaman...</div>}>
          <Outlet />
        </Suspense>
      </div>
      <BottomNav />
    </div>
  )
}

export default AppLayout
