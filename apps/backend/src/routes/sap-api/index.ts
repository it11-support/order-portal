import { Router } from 'express'
import { requireAuth } from '@auth'
import { checkPrice, checkStock } from '@/controllers/sap-api'

const router = Router()

router.use(requireAuth)

router.get('/price', checkPrice)
router.get('/stock', checkStock)

export default router