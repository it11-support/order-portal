import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import "./styles/index.css"
import { router } from "./app/routes/router"
import AuthProvider, { CartProvider, OrderProvider } from "@contexts"

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <OrderProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </OrderProvider>
  </AuthProvider>
)