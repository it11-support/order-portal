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
  AdminCategoriesPage,
  AdminProductListPage,
  UsersPage,
  CustomerDashboardPage,
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
      <ProtectedRoute allowedRoles={['admin', 'customer', 'sales_admin']}>
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
        element: (
          <ProtectedRoute allowedRoles={['customer']}>
            <CartPage />
          </ProtectedRoute>
        ),
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
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/orders/:orderId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminOrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/customers',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <CustomersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/products',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminProductListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/categories',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminCategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer-dashboard',
        element: (
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])
