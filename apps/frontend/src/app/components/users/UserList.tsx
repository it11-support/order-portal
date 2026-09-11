import React, { useEffect, useState, useMemo } from 'react'
import { api } from '@lib'
import { User, Role, RoleType } from '@repo/shared'
import { Plus, Pencil, Trash2, Search, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { toast } from 'sonner'

interface UserForm {
  username: string
  name: string
  email: string
  password: string
  roleId: number
  isActive: boolean
}

const EMPTY_FORM: UserForm = {
  username: '',
  name: '',
  email: '',
  password: '',
  roleId: 0,
  isActive: true,
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await api.get(`/users?${params.toString()}`)
      setUsers(res.data.data ?? [])
    } catch (e) {
      console.error(e)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await api.get('/users/roles')
      setRoles(res.data.data ?? [])
    } catch (e) {
      console.error(e)
      setRoles([])
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [debouncedSearch])

  useEffect(() => {
    fetchRoles()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setForm({
      username: user.username,
      name: user.name,
      email: user.email ?? '',
      password: '',
      roleId: Number(user.roleId ?? 0),
      isActive: user.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.username || !form.name || !form.roleId || (!editing && !form.password)) return
    setSaving(true)
    try {
      const payload: any = {
        username: form.username,
        name: form.name,
        email: form.email || null,
        roleId: form.roleId,
        isActive: form.isActive,
      }
      if (form.password) payload.password = form.password

      if (editing) {
        await api.put(`/users/${editing.id}`, payload)
      } else {
        await api.post('/users', payload)
      }
      setDialogOpen(false)
      fetchUsers()
    } catch (e: any) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus user ini?')) return
    try {
      await toast.promise(api.delete(`/users/${id}`), {
        loading: 'Menghapus user...',
        success: 'User berhasil dihapus',
        error: 'Gagal menghapus user',
      })
      fetchUsers()
    } catch (e) {
      console.error(e)
    }
  }

  const roleLabel = (roleId: number) => {
    const role = roles.find((r) => r.id === roleId)
    return role ? role.name : roleId
  }

  const availableRoles = useMemo(() => roles.filter((r) => r.name !== 'customer'), [roles])

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-xs text-gray-500">Kelola akun admin dan sales admin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            Tambah User
          </Button>
        </div>
      </div>

      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Username</th>
                <th className="p-4">Nama</th>
                <th className="p-4">Email</th>
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
                    <td className="p-4 text-gray-500">{user.email ?? '-'}</td>
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

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-sm text-gray-400">
                    Tidak ada user ditemukan.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-sm text-gray-400">
                    Memuat...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Tambah User'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Ubah data user.' : 'Buat akun pengguna baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@contoh.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{editing ? 'Password Baru (opsional)' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Kosongkan jika tidak diubah' : 'Password'}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={String(form.roleId)}
                onValueChange={(val) => setForm({ ...form, roleId: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Aktif
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.username ||
                !form.name ||
                !form.roleId ||
                (!editing && !form.password)
              }
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserList
