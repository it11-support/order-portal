import { createBrowserRouter } from 'react-router-dom'

import {
  Login,
  SearchPage,
  CatalogPage,
  CategoryPage,
  CartPage,
  OrdersPage,
  InquiriesPage,
  OrderDetailPage,
  AdminOrdersPage,
  AdminInquiriesPage,
  AdminOrderDetailPage,
  CustomersPage,
  AdminCategoriesPage,
  AdminProductListPage,
  UsersPage,
  CustomerDashboardPage,
  DashboardPage,
  NotificationsPage,
  SalesOrderEntryPage,
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
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <DashboardPage />
          </ProtectedRoute>
        ),
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
        element: <OrdersPage kind="order" />,
      },
      {
        path: 'inquiries',
        element: <InquiriesPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailPage kind="order" />,
      },
      {
        path: 'inquiries/:orderId',
        element: <OrderDetailPage kind="quote" />,
      },
      {
        path: 'admin/orders',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminOrdersPage kind="order" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/inquiries',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminInquiriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/orders/:orderId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminOrderDetailPage kind="order" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/inquiries/:orderId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <AdminOrderDetailPage kind="quote" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/sales-order',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'sales_admin']}>
            <SalesOrderEntryPage />
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
      {
        path: 'notifications',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'customer', 'sales_admin']}>
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])
