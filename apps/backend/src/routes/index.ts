import { Router } from 'express'
import authRoute from './auth'
import { me } from '@/controllers/auth'
import { requireAuth } from '@/auth/middleware'
import customerRoutes from './customers'

const router = Router()

router.use('/auth', authRoute)
router.get('/me', requireAuth, me)
router.use('/customers', customerRoutes)

export default router
