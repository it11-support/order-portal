import { createBrowserRouter } from 'react-router-dom'

import {
  Login,
  SearchPage,
  CatalogPage,
  CategoryPage,
  CartPage,
  OrdersPage,
  OrderDetailPage,
  AdminOrdersPage,
  AdminOrderDetailPage,
  CustomersPage,
} from '@pages'

import { AppLayout } from '@layouts'
import { ProtectedRoute } from '@contexts'

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
      },
    ],
  },
])
