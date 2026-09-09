import { Router } from 'express'
import { requireAuth, requireSalesAdmin } from '@auth'
import { listRequests, createRequest, updateRequest } from '@/controllers/requests'
const router = Router()
router.use(requireAuth)
router.get('/', listRequests)
router.post('/', createRequest)
router.patch('/:id', requireSalesAdmin, updateRequest)
export default router
