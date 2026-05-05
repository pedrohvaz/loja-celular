import { Router } from 'express'
import { login, refresh, logout, me } from './super-admin-auth.controller'
import { authenticateSuperAdmin } from '../../../shared/middleware/superAdminAuth'

const router = Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', authenticateSuperAdmin, me)

export default router
