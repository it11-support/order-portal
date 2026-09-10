import { Router } from 'express'
import { requireAuth } from '@auth'
import {
  listNotifications,
  listAllNotifications,
  markNotificationRead,
  dismissNotification,
  unreadCount,
} from '@/controllers/notifications'

const router = Router()
router.use(requireAuth)
router.get('/', listNotifications)
router.get('/all', listAllNotifications)
router.get('/unread-count', unreadCount)
router.patch('/:id/read', markNotificationRead)
router.patch('/:id/dismiss', dismissNotification)

export default router
