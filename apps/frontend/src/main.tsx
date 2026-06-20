import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import "./styles/index.css"
import { router } from "./app/routes/router"
import AuthProvider from "./app/contexts/AuthContext"
import { CartProvider } from "./app/contexts/CartContext"
import { OrderProvider } from "./app/contexts/OrderContext"

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <OrderProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </OrderProvider>
  </AuthProvider>
)