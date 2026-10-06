import { Router } from 'express'
import { requireAuth } from '@auth'
import {
  listRequests,
  createRequest,
  getRequest,
  updateRequest,
  listFollowUps,
  createFollowUp,
  linkRequestToSap,
} from '@/controllers/requests'
const router = Router()
router.use(requireAuth)
router.get('/', listRequests)
router.get('/:id', getRequest)
router.post('/', createRequest)
router.patch('/:id', updateRequest)
router.get('/:id/follow-ups', listFollowUps)
router.post('/:id/follow-ups', createFollowUp)
router.post('/:id/sap-link', linkRequestToSap)
export default router
