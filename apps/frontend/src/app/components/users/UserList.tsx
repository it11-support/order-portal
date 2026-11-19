import React, { useEffect } from 'react'
import UserFormDialog from './UserFormDialog'
import { useUsers } from './hooks'
import UserTable from './UserTable'
import UserMobileView from './UserMobileView'
import UserSearch from './UserSearch'

const UserList: React.FC = () => {
  const user = useUsers()

  const { search, setDebouncedSearch } = user

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-xs text-gray-500">Kelola akun admin dan sales admin</p>
        </div>
        <UserSearch user={user} />
      </div>

      {/* CARD VIEW — mobile only */}
      <UserMobileView user={user} />

      {/* TABLE VIEW — desktop only */}
      <UserTable user={user} />

      <UserFormDialog user={user} />
    </div>
  )
}

export default UserList
