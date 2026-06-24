import { CustomerList } from '@components'
import { Shell } from '@layouts'

const CustomersPage = () => {
  return (
    <Shell title={'Customers'} showBack>
      <CustomerList />
    </Shell>
  )
}

export default CustomersPage
