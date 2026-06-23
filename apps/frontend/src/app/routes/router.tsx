import { createBrowserRouter } from 'react-router-dom'

import Login from '../pages/auth/Login'
import ProtectedRoute from '../contexts/ProtectedRoute'
import CatalogPage from '../pages/CatalogPage'
import SearchPage from '../pages/SearchPage'
import CategoryPage from '../pages/CategoryPage'
import CartPage from '../pages/CartPage'
import OrdersPage from '../pages/OrdersPage'
import OrderDetailPage from '../pages/OrderDetailPage'
import AdminOrdersPage from '../pages/AdminOrdersPage'
import AdminOrderDetailPage from '../pages/AdminOrderDetailPage'
import AppLayout from '../layouts/AppLayout'
import CustomersPage from '../pages/CustomersPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CatalogPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'category/:categoryId',
        element: <CategoryPage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailPage />,
      },
      {
        path: 'admin/orders',
        element: <AdminOrdersPage />,
      },
      {
        path: 'admin/orders/:orderId',
        element: <AdminOrderDetailPage />,
      },
      {
        path: 'admin/customers',
        element: <CustomersPage />,

      }
    ],
  },
])