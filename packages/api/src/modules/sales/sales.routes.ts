import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import { z } from 'zod'
import { createOrder } from '../orders/orders.service'
import { prisma } from '../../shared/utils/prisma'
import { AppError } from '../../shared/utils/errors'

const router = Router()
router.use(authenticate)

const saleSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string(), price: z.number(), qty: z.number(), category: z.string(), image: z.string().optional() })),
  discount: z.number().min(0).default(0),
  payment: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
})

router.post('/', async (req, res, next) => {
  try {
    const { items, discount, payment, customerName, customerPhone } = saleSchema.parse(req.body)

    const cash = await prisma.cashRegister.findFirst({ where: { tenantId: req.user.tenantId, status: 'OPEN' } })
    if (!cash) throw new AppError('Abra o caixa antes de realizar uma venda', 400)

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const total = Math.max(0, subtotal - discount)

    const order = await createOrder(req.user.tenantId, {
      customer: { name: customerName ?? 'Venda Balcão', phone: customerPhone ?? '' },
      items,
      subtotal,
      discount,
      total,
      payment,
      source: 'pos',
    })

    return res.status(201).json(order)
  } catch (e) { return next(e) }
})

export default router
