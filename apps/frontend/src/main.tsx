import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import './styles/index.css'
import { router } from './app/routes/router'
import AuthProvider, {
  CartProvider,
  OrderProvider,
  CategoriesProvider,
  ProductsProvider,
} from '@contexts'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <CategoriesProvider>
      <ProductsProvider>
        <OrderProvider>
          <CartProvider>
            <RouterProvider router={router} />
          </CartProvider>
        </OrderProvider>
      </ProductsProvider>
    </CategoriesProvider>
  </AuthProvider>,
)
