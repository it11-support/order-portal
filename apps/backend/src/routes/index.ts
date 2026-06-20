import { Router } from 'express'
import authRoute from './auth'
import { me } from '@/controllers/auth'
import { requireAuth } from '@/auth/middleware'

const router = Router()

router.use('/auth', authRoute)
router.get('/me', requireAuth, me)

export default router
