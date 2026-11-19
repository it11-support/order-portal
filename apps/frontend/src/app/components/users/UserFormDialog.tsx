import { useUsers } from './hooks'
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
type UserFormDialogProps = {
  user: ReturnType<typeof useUsers>
}
const UserFormDialog = (props: UserFormDialogProps) => {
  const {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    updateForm,
    handleSave,
    saving,
    availableRoles,
    isSalesRole,
    salesPersons,
  } = props.user
  return (
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
              <Label htmlFor="username" className="text-sm text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => updateForm({ ...form, username: e.target.value })}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-muted-foreground">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => updateForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
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
                onChange={(e) => updateForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Kosongkan jika tidak diubah' : 'Password'}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Role</Label>
              <Select
                value={String(form.roleId)}
                onValueChange={(val) => updateForm({ ...form, roleId: parseInt(val) })}
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
                  onValueChange={(val) => updateForm({ ...form, slpCode: parseInt(val) })}
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
                onCheckedChange={(checked) => updateForm({ ...form, isActive: checked })}
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
  )
}

export default UserFormDialog
