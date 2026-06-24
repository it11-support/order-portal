import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { ScrollToTopButton } from '@components'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <ScrollToTopButton />
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
