import { Pencil, Trash2 } from 'lucide-react'
import { useUsers } from './hooks'
import { Loader } from '../common'

type UserTableProps = {
  user: ReturnType<typeof useUsers>
}
const UserTable = (props: UserTableProps) => {
  const user = props.user
  const { users, roleLabel, openEdit, handleDelete, userLoading } = user
  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-4 w-32">Username</th>
              <th className="p-4 w-32">Nama</th>
              <th className="p-4 w-32">Role</th>
              <th className="p-4 w-24 text-center">Status</th>
              <th className="p-4 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {users.length > 0 &&
              users.map((user) => (
                <tr key={user.id as number} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4">
                    <span className="font-medium text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                      {user.username}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
                      {roleLabel(Number(user.roleId ?? 0))}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {user.isActive ? (
                      <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                        Non-Aktif
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                  </td>
                </tr>
              ))}

            {!userLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm text-gray-400">
                  Tidak ada user ditemukan.
                </td>
              </tr>
            )}
            {userLoading && (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <Loader label="Memuat..." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserTable
