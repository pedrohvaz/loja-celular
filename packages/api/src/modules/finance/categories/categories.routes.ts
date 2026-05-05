import { Router } from 'express'
import { authenticate, requireAdmin } from '../../../shared/middleware/auth'
import { prisma } from '../../../shared/utils/prisma'
import { z } from 'zod'

const router = Router()
router.use(authenticate, requireAdmin)

const schema = z.object({ name: z.string().min(1), type: z.enum(['INCOME', 'EXPENSE']), icon: z.string().optional() })

router.get('/', async (req, res, next) => {
  try {
    const data = await prisma.financeCategory.findMany({ where: { tenantId: req.user.tenantId }, orderBy: [{ type: 'asc' }, { name: 'asc' }] })
    return res.json(data)
  } catch (e) { return next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    return res.status(201).json(await prisma.financeCategory.create({ data: { ...data, tenantId: req.user.tenantId } }))
  } catch (e) { return next(e) }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body)
    return res.json(await prisma.financeCategory.update({ where: { id: req.params.id }, data }))
  } catch (e) { return next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.financeCategory.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (e) { return next(e) }
})

export default router
