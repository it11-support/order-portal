import React, { useEffect, useState, useMemo } from 'react'
import { api, swrFetcher } from '@lib'
import { User, Role, ApiResponse, SalesPersonOption } from '@repo/shared'
import { Plus, Pencil, Trash2, Search, Check, X, Copy, Eye, EyeOff } from 'lucide-react'
import useSWR from 'swr'

import { Loader } from '@components'
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
  slpCode: number | null
}

const EMPTY_FORM: UserForm = {
  username: '',
  name: '',
  email: '',
  password: '',
  roleId: 0,
  isActive: true,
  slpCode: null,
}

const UserList: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [visiblePw, setVisiblePw] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const usersKey = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    const query = params.toString()
    return query ? `/users?${query}` : '/users'
  }, [debouncedSearch])

  const {
    data: userData,
    isLoading: userLoading,
    mutate: mutateUser,
  } = useSWR<ApiResponse<User>>(usersKey, swrFetcher)

  const { data: roleData } = useSWR<ApiResponse<Role>>('/users/roles', swrFetcher)
  const { data: salesPersonData } = useSWR<ApiResponse<SalesPersonOption>>(
    '/users/sales-persons',
    swrFetcher,
  )

  const salesPersons = useMemo(() => salesPersonData?.data ?? [], [salesPersonData])

  const users = useMemo(() => {
    if (!userData) return []
    return userData.data
  }, [userData])

  const roles = useMemo(() => {
    if (!roleData) return []
    return roleData.data
  }, [roleData])

  // A sales account without a territory sees nothing at all, so the assignment
  // is part of the form rather than a later cleanup.
  const isSalesRole = useMemo(
    () => roles.find((role) => role.id === form.roleId)?.name === 'sales_admin',
    [roles, form.roleId],
  )

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
      slpCode: user.slpCode ?? null,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.username || !form.name || !form.roleId || (!editing && !form.password)) return
    if (isSalesRole && !form.slpCode) {
      toast.error('Role sales wajib memilih SLP Code')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        username: form.username,
        name: form.name,
        email: form.email || null,
        roleId: form.roleId,
        isActive: form.isActive,
        slpCode: isSalesRole ? form.slpCode : null,
      }
      if (form.password) payload.password = form.password

      if (editing) {
        await api.put(`/users/${editing.id}`, payload)
      } else {
        await api.post('/users', payload)
      }
      setDialogOpen(false)
      await mutateUser()
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
      await mutateUser()
    } catch (e) {
      console.error(e)
    }
  }

  const roleLabel = (roleId: number) => {
    const role = roles.find((r) => r.id === roleId)
    return role ? role.name.replaceAll('_', ' ').toUpperCase() : roleId
  }

  const availableRoles = useMemo(() => {
    return roles
      .filter((r) => r.name !== 'customer')
      .map((r) => ({ id: r.id, name: r.name.replaceAll('_', ' ').toUpperCase() }))
  }, [roles])

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-xs text-gray-500">Kelola akun admin dan sales admin</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="
            flex-1
            min-w-0
            flex items-center
            bg-input-background
            border border-border
            rounded-xl
            px-3 gap-2
          "
          >
            <Search size={14} className="text-muted-foreground shrink-0" />

            <input
              autoFocus
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
              }}
              placeholder="Cari user ..."
              className="
              flex-1
              bg-transparent
              py-2.5
              text-sm
              focus:outline-none
            "
            />

            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            Tambah User
          </Button>
        </div>
      </div>

      {/* CARD VIEW — mobile only */}
      <div className="md:hidden space-y-3">
        {userLoading ? (
          <Loader label="Memuat..." className="py-12" />
        ) : !userLoading && users.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            Tidak ada user ditemukan.
          </p>
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
              <p className="text-xs text-muted-foreground">{user.email ?? '-'}</p>
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

      {/* TABLE VIEW — desktop only */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Username</th>
                <th className="p-4">Nama</th>
                <th className="p-4">Email</th>
                <th className="p-4 w-40">Password</th>
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
                    <td className="p-4 w-40">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm text-gray-800 break-all">
                          {user.password
                            ? visiblePw === Number(user.id)
                              ? user.password
                              : '•'.repeat(Math.max((user.password as string).length, 6))
                            : '-'}
                        </span>
                        {user.password && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setVisiblePw(visiblePw === Number(user.id) ? null : Number(user.id))
                              }
                              aria-label={visiblePw === Number(user.id) ? 'Sembunyikan' : 'Lihat'}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              {visiblePw === Number(user.id) ? (
                                <EyeOff size={14} />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(user.password as string)
                                setCopiedId(Number(user.id))
                                setTimeout(() => setCopiedId(null), 1500)
                              }}
                              aria-label="Salin password"
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              {copiedId === Number(user.id) ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Tambah User'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Ubah data user.' : 'Buat akun pengguna baru.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm text-muted-foreground">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-muted-foreground">Nama Lengkap</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@contoh.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">
                  {editing ? 'Password Baru (opsional)' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? 'Kosongkan jika tidak diubah' : 'Password'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Role</Label>
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
                {isSalesRole && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">SLP Code</Label>
                    <Select
                      value={form.slpCode === null ? '' : String(form.slpCode)}
                      onValueChange={(val) => setForm({ ...form, slpCode: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih sales person" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesPersons.map((sp) => (
                          <SelectItem key={sp.slpCode} value={String(sp.slpCode)}>
                            {sp.slpCode} — {sp.slpName ?? 'Tanpa nama'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Sales hanya melihat pelanggan dengan SLP Code ini.
                    </p>
                  </div>
                )}
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
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
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
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserList
