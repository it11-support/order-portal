import { getCustomers, enableCustomerLogin, disableCustomerLogin, resetCustomerPassword, getCustomerStats } from '@controllers'
import { requireAuth, requireAdmin } from '@auth'
import { Router } from 'express'

const router = Router()

router.get('/', requireAuth, getCustomers)
router.get('/stats', requireAuth, getCustomerStats)
router.post('/:id/login', requireAuth, requireAdmin, enableCustomerLogin)
router.delete('/:id/login', requireAuth, requireAdmin, disableCustomerLogin)
router.post('/:id/login/reset', requireAuth, requireAdmin, resetCustomerPassword)

export default router
