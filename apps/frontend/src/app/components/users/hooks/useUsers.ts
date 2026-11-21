import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, swrFetcher } from '@lib'
import type { User, Role, ApiResponse, SalesPersonOption } from '@repo/shared'

export interface UserForm {
  username: string
  name: string
  password: string
  roleId: number
  isActive: boolean
  slpCode: number | null
}

const EMPTY_FORM: UserForm = {
  username: '',
  name: '',
  password: '',
  roleId: 0,
  isActive: true,
  slpCode: null,
}

type UserPayload = Omit<UserForm, 'password'> & {
  password?: string
}

export const useUsers = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [visiblePw, setVisiblePw] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const usersKey = useMemo(() => {
    const params = new URLSearchParams()

    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    }

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

  const users = useMemo(() => userData?.data ?? [], [userData])

  const roles = useMemo(() => roleData?.data ?? [], [roleData])

  const salesPersons = useMemo(() => salesPersonData?.data ?? [], [salesPersonData])

  const availableRoles = useMemo(
    () =>
      roles
        .filter((role) => role.name !== 'customer')
        .map((role) => ({
          id: role.id,
          name: role.name.replaceAll('_', ' ').toUpperCase(),
        })),
    [roles],
  )

  const isSalesRole = useMemo(
    () => roles.find((role) => role.id === form.roleId)?.name === 'sales_admin',
    [roles, form.roleId],
  )

  const roleLabel = useCallback(
    (roleId: number) => {
      const role = roles.find((item) => item.id === roleId)

      return role ? role.name.replaceAll('_', ' ').toUpperCase() : String(roleId)
    },
    [roles],
  )

  const updateForm = useCallback((values: Partial<UserForm>) => {
    setForm((prev) => ({ ...prev, ...values }))
  }, [])

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((user: User) => {
    setEditing(user)
    setForm({
      username: user.username,
      name: user.name,
      password: '',
      roleId: Number(user.roleId ?? 0),
      isActive: user.isActive,
      slpCode: user.slpCode ?? null,
    })
    setDialogOpen(true)
  }, [])

  const canSave = useMemo(
    () =>
      Boolean(
        form.username.trim() &&
        form.name.trim() &&
        form.roleId &&
        (editing || form.password) &&
        (!isSalesRole || form.slpCode !== null),
      ),
    [form, editing, isSalesRole],
  )

  const handleSave = useCallback(async () => {
    if (saving) return

    if (isSalesRole && form.slpCode === null) {
      toast.error('Role sales wajib memilih SLP Code')
      return
    }

    if (!canSave) return

    setSaving(true)

    try {
      const payload: UserPayload = {
        username: form.username.trim(),
        name: form.name.trim(),
        roleId: form.roleId,
        isActive: form.isActive,
        slpCode: isSalesRole ? form.slpCode : null,
      }

      if (form.password) {
        payload.password = form.password
      }

      if (editing) {
        await api.put(`/users/${editing.id}`, payload)
      } else {
        await api.post('/users', payload)
      }

      await mutateUser()
      setDialogOpen(false)

      toast.success(editing ? 'User berhasil diperbarui' : 'User berhasil ditambahkan')
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan user')
    } finally {
      setSaving(false)
    }
  }, [saving, isSalesRole, form, canSave, editing, mutateUser])

  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm('Hapus user ini?')) return

      try {
        await toast.promise(api.delete(`/users/${id}`), {
          loading: 'Menghapus user...',
          success: 'User berhasil dihapus',
          error: 'Gagal menghapus user',
        })

        await mutateUser()
      } catch (error) {
        console.error(error)
      }
    },
    [mutateUser],
  )

  const togglePassword = useCallback((id: number) => {
    setVisiblePw((prev) => (prev === id ? null : id))
  }, [])

  const copyPassword = useCallback(async (id: number, password: string) => {
    try {
      await navigator.clipboard.writeText(password)
      setCopiedId(id)
      toast.success('Password berhasil disalin')
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyalin password')
    }
  }, [])

  useEffect(() => {
    if (copiedId === null) return

    const timer = setTimeout(() => setCopiedId(null), 1500)
    return () => clearTimeout(timer)
  }, [copiedId])

  return {
    // Data
    users,
    roles,
    availableRoles,
    salesPersons,
    userLoading,

    // Search
    search,
    setSearch,

    // Dialog
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    updateForm,
    saving,
    canSave,
    isSalesRole,

    // CRUD
    openCreate,
    openEdit,
    handleSave,
    handleDelete,

    // Helpers
    roleLabel,
    visiblePw,
    copiedId,
    togglePassword,
    copyPassword,
    debouncedSearch,
    setDebouncedSearch,
  }
}

export type UseUsersReturn = ReturnType<typeof useUsers>
