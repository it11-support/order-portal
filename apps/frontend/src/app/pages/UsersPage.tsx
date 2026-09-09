import { UserList } from '@components'
import { Shell } from '@layouts'

const UsersPage = () => {
  return (
    <Shell title={'User Management'} showBack>
      <UserList />
    </Shell>
  )
}

export default UsersPage
