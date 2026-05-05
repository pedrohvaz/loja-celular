import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import { prisma } from '../../shared/utils/prisma'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['WHATSAPP', 'INSTAGRAM', 'EMAIL', 'SMS']),
  status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'ENDED']).default('PLANNED'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  audience: z.string().optional(),
  message: z.string().optional(),
})

router.get('/', async (req, res, next) => {
  try {
    const { search, type, status } = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId: req.user.tenantId }
    if (type) where.type = type
    if (status) where.status = status
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { message: { contains: search, mode: 'insensitive' } }]
    return res.json(await prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' } }))
  } catch (e) { return next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    return res.status(201).json(await prisma.campaign.create({ data: { ...data, tenantId: req.user.tenantId, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined } }))
  } catch (e) { return next(e) }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body)
    return res.json(await prisma.campaign.update({ where: { id: req.params.id }, data: { ...data, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined } }))
  } catch (e) { return next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try { await prisma.campaign.delete({ where: { id: req.params.id } }); return res.status(204).send() } catch (e) { return next(e) }
})

export default router
