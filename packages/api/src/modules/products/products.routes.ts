import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import * as ProductController from './products.controller'

const router = Router()

router.get('/public/:slug', ProductController.listPublic)

router.use(authenticate)
router.get('/stats', ProductController.stats)
router.get('/', ProductController.list)
router.get('/:id', ProductController.getOne)
router.post('/', ProductController.create)
router.patch('/:id', ProductController.update)
router.delete('/:id', ProductController.remove)

export default router
