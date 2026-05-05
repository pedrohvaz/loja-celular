import { Router } from 'express'
import { list, get, create, update, remove, stats } from './tenants.controller'

const router = Router()

router.get('/stats', stats)
router.get('/', list)
router.post('/', create)
router.get('/:id', get)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router
