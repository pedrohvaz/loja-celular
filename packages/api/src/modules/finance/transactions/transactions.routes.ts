import { Router } from 'express'
import { authenticate, requireAdmin } from '../../../shared/middleware/auth'
import * as C from './transactions.controller'

const router = Router()
router.use(authenticate, requireAdmin)
router.get('/dashboard', C.dashboard)
router.get('/', C.list)
router.get('/:id', C.getOne)
router.post('/', C.create)
router.patch('/:id', C.update)
router.patch('/:id/pay', C.pay)
router.delete('/:id', C.remove)

export default router
