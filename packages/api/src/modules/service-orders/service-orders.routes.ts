import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import { sensitiveLookupLimiter } from '../../shared/middleware/rateLimit'
import * as C from './service-orders.controller'

const router = Router()

router.get('/public/:slug/:query', sensitiveLookupLimiter, C.getPublic)

router.use(authenticate)
router.get('/stats', C.stats)
router.get('/', C.list)
router.get('/:id', C.getOne)
router.post('/', C.create)
router.patch('/:id', C.update)
router.patch('/:id/status', C.setStatus)
router.delete('/:id', C.remove)

export default router
