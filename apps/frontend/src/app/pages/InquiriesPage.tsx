import OrdersPage from './OrdersPage'

/** Customer-facing quote/inquiry list, kept separate from the order list. */
const InquiriesPage = () => <OrdersPage kind="quote" />

export default InquiriesPage
