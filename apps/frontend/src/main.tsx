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
            </CartProvider>
          </OrderProvider>
        </ProductsProvider>
      </CategoriesProvider>
    </WebSocketProvider>
  </AuthProvider>,
)
