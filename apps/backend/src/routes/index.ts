import { Router } from 'express'
import authRoute from './auth'
import { me } from '@controllers'
import { requireAuth } from '@auth'
import customerRoutes from './customers'
import categoryRoutes from './categories'
import productRoutes from './products'
import userRoutes from './users'
import requestRoutes from './requests'
import notificationRoutes from './notifications'
const router = Router()

router.use('/auth', authRoute)
router.get('/me', requireAuth, me)
router.use('/customers', customerRoutes)
router.use('/categories', categoryRoutes)
router.use('/products', productRoutes)
router.use('/users', userRoutes)
router.use('/requests', requestRoutes)
router.use('/notifications', notificationRoutes)

export default router
