import { Router } from 'express'
import { loginHandler, refreshHandler, logoutHandler, meHandler, registerHandler } from './auth.controller'
import { authenticate } from '../../shared/middleware/auth'
import { authLimiter } from '../../shared/middleware/rateLimit'

const router = Router()

router.post('/login', authLimiter, loginHandler)
router.post('/refresh', refreshHandler)
router.post('/logout', logoutHandler)
router.get('/me', authenticate, meHandler)
router.post('/register', authLimiter, registerHandler)

export default router
