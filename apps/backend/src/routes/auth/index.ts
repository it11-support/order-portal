import { login, customerLogin } from '@controllers'
import { Router } from 'express'
const router = Router()

router.post('/login', login)
router.post('/customer-login', customerLogin)

export default router
