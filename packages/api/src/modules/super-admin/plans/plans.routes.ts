import { Router } from 'express'
import * as service from './plans.service'
import { AppError } from '../../../shared/utils/errors'

const router = Router()

router.get('/', async (_req, res, next) => {
  try { return res.json(await service.listPlans()) } catch (err) { return next(err) }
})

router.post('/', async (req, res, next) => {
  try { return res.status(201).json(await service.createPlan(req.body)) } catch (err) { return next(err) }
})

router.get('/:id', async (req, res, next) => {
  try { return res.json(await service.getPlan(req.params.id)) } catch (err) { return next(err) }
})

router.patch('/:id', async (req, res, next) => {
  try { return res.json(await service.updatePlan(req.params.id, req.body)) } catch (err) { return next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await service.deletePlan(req.params.id)
    return res.status(204).send()
  } catch (err) { return next(err) }
})

export default router
