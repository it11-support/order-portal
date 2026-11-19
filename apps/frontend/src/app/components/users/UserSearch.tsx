import { Plus, Search, X } from 'lucide-react'
import { useUsers } from './hooks'
import { Button } from '@/app/components/ui/button'

type UserSearchProps = {
  user: ReturnType<typeof useUsers>
}

const UserSearch = (props: UserSearchProps) => {
  const user = props.user

  const { search, setSearch, openCreate } = user

  return (
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
  )
}

export default UserSearch
