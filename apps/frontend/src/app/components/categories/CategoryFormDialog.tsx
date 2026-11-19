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
import { useCategories } from './hooks'
import IconPicker from './IconPicker'

type CategoryFormDialogProps = {
  cat: ReturnType<typeof useCategories>
}
const CategoryFormDialog = (props: CategoryFormDialogProps) => {
  const { dialogOpen, setDialogOpen, editing, form, updateForm, handleSave, saving } = props.cat
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Ubah data kategori.' : 'Buat kategori baru.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Kode</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => updateForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="CONTOH: DAIRY"
              disabled={!!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateForm({ ...form, name: e.target.value })}
              placeholder="Nama kategori"
            />
          </div>
          <div className="space-y-2">
            <Label>Ikon</Label>
            <IconPicker value={form.icon} onChange={(icon) => updateForm({ ...form, icon })} />
          </div>
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
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.code || !form.name}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CategoryFormDialog
