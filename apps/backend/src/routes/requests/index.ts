import { Router } from 'express'
import { requireAuth, requireSalesAdmin } from '@auth'
import { listRequests, createRequest, getRequest, updateRequest } from '@/controllers/requests'
const router = Router()
router.use(requireAuth)
router.get('/', listRequests)
router.get('/:id', getRequest)
router.post('/', createRequest)
router.patch('/:id', requireSalesAdmin, updateRequest)
export default router
