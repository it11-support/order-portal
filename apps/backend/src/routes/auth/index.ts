import { login } from '@controllers'
import { Router } from 'express'
const router = Router()

router.post('/login', login)

export default router
