import { Pencil, Trash2 } from 'lucide-react'
import { Loader } from '../common'
import { useUsers } from './hooks'

type UserMobileViewProps = {
  user: ReturnType<typeof useUsers>
}

const UserMobileView = (props: UserMobileViewProps) => {
  const user = props.user

  const { userLoading, users, roleLabel, openEdit, handleDelete } = user
  return (
    <div className="md:hidden space-y-3">
      {userLoading ? (
        <Loader label="Memuat..." className="py-12" />
      ) : !userLoading && users.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">Tidak ada user ditemukan.</p>
      ) : (
        users.map((user) => (
          <div
            key={user.id as number}
            className="bg-white rounded-xl border border-border p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                {user.username}
              </span>
              {user.isActive ? (
                <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">
                  Aktif
                </span>
              ) : (
                <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                  Non-Aktif
                </span>
              )}
            </div>
            <p className="font-medium text-sm">{user.name}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
              {roleLabel(Number(user.roleId ?? 0))}
            </span>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => openEdit(user)}
                className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(user.id as number)}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default UserMobileView
