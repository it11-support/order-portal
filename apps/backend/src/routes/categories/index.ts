import { Router } from 'express'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getProductsByCategory,
} from '@controllers'
import { requireAuth, requireAdmin } from '@auth'

const router = Router()

router.get('/', requireAuth, getCategories)
router.post('/', requireAuth, requireAdmin, createCategory)
router.put('/:id', requireAuth, requireAdmin, updateCategory)
router.delete('/:id', requireAuth, requireAdmin, deleteCategory)
router.put('/reorder/batch', requireAuth, requireAdmin, reorderCategories)
router.get('/products', requireAuth, getProductsByCategory)

export default router
