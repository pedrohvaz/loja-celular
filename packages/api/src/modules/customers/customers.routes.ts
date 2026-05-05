import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import * as C from './customers.controller'

const router = Router()
router.use(authenticate)
router.get('/stats', C.stats)
router.get('/', C.list)
router.get('/:id', C.getOne)
router.post('/', C.create)
router.post('/import-from-orders', C.importFromOrders)
router.patch('/:id', C.update)
router.delete('/:id', C.remove)

export default router
