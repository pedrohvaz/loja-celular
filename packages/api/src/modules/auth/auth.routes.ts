import { Router } from 'express'
import { loginHandler, refreshHandler, logoutHandler, meHandler, registerHandler } from './auth.controller'
import { authenticate } from '../../shared/middleware/auth'

const router = Router()

router.post('/login', loginHandler)
router.post('/refresh', refreshHandler)
router.post('/logout', logoutHandler)
router.get('/me', authenticate, meHandler)
router.post('/register', registerHandler)

export default router
