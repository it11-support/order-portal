import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@layouts'
import { ProtectedRoute } from '@contexts'
import { lazy } from 'react'

const Login = lazy(() => import('@pages/auth/Login'))
const CatalogPage = lazy(() => import('@pages/CatalogPage'))
const SearchPage = lazy(() => import('@pages/SearchPage'))
const CustomersPage = lazy(() => import('@pages/CustomersPage'))
const DashboardPage = lazy(() => import('@pages/DashboardPage'))
const UsersPage = lazy(() => import('@pages/UsersPage'))
const CustomerDashboardPage = lazy(() => import('@pages/CustomerDashboardPage'))
const InquiriesPage = lazy(() => import('@pages/InquiriesPage'))

const OrdersPage = lazy(() => import('@components/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('@components/orders/OrderDetailPage'))
const SalesOrderEntryPage = lazy(() => import('@components/orders/SalesOrderEntryPage'))

const AdminOrdersPage = lazy(() => import('@components/admin/AdminOrdersPage'))
const AdminInquiriesPage = lazy(() => import('@components/admin/AdminInquiriesPage'))
const AdminOrderDetailPage = lazy(() => import('@components/admin/AdminOrderDetailPage'))
const AdminCategoriesPage = lazy(() => import('@components/admin/AdminCategoriesPage'))
const AdminProductListPage = lazy(() => import('@components/admin/AdminProductListPage'))

const CartPage = lazy(() => import('@components/cart/CartPage'))
const CategoryPage = lazy(() => import('@components/categories/CategoryPage'))
const NotificationsPage = lazy(() => import('@components/notifications/NotificationsPage'))

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
