import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import { publicLookupLimiter } from '../../shared/middleware/rateLimit'
import * as C from './orders.controller'

const router = Router()
// POST público para e-commerce (cliente sem login)
router.post('/public', publicLookupLimiter, C.createPublic)
router.use(authenticate)
router.get('/', C.list)
router.get('/:id', C.getOne)
router.post('/', C.create)
router.patch('/:id/status', C.updateStatus)
router.delete('/:id', C.remove)

export default router
