import CustomerList from '../components/customers/CustomerList'
import Shell from '../layouts/Shell'

const CustomersPage = () => {
  return (
    <Shell title={'Customers'} showBack>
      <CustomerList />
    </Shell>
  )
}

export default CustomersPage
