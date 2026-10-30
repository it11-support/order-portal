import AdminOrdersPage from './AdminOrdersPage'

/** Staff quote/inquiry list, kept separate from the order list. */
const AdminInquiriesPage = () => <AdminOrdersPage kind="quote" />

export default AdminInquiriesPage
