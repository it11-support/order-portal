import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import './styles/index.css'
import { router } from './app/routes/router'
import AuthProvider, {
  CartProvider,
  OrderProvider,
  CategoriesProvider,
  ProductsProvider,
  NotificationsProvider,
  WebSocketProvider,
} from '@contexts'
import { Toaster } from '@/app/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <WebSocketProvider>
      <CategoriesProvider>
        <ProductsProvider>
          <OrderProvider>
            <CartProvider>
              <NotificationsProvider>
                <RouterProvider router={router} />
              </NotificationsProvider>
              <Toaster />
            </CartProvider>
          </OrderProvider>
        </ProductsProvider>
      </CategoriesProvider>
    </WebSocketProvider>
  </AuthProvider>,
)