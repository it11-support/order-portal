import { Router } from 'express'
import { getProducts } from '@controllers'
import { requireAuth, requireSalesAdmin } from '@auth'

const router = Router()

router.get('/', requireAuth, requireSalesAdmin, getProducts)

export default router
