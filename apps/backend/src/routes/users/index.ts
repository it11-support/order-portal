import { Router } from 'express'
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getSalesPersons,
} from '@controllers'
import { requireAuth, requireAdmin } from '@auth'

const router = Router()

router.get('/', requireAuth, requireAdmin, getUsers)
router.get('/roles', requireAuth, requireAdmin, getRoles)
router.get('/sales-persons', requireAuth, requireAdmin, getSalesPersons)
router.get('/:id', requireAuth, requireAdmin, getUserById)
router.post('/', requireAuth, requireAdmin, createUser)
router.put('/:id', requireAuth, requireAdmin, updateUser)
router.delete('/:id', requireAuth, requireAdmin, deleteUser)

export default router
