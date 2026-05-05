import { Router } from 'express'
import { authenticate, requireAdmin } from '../../../shared/middleware/auth'
import { prisma } from '../../../shared/utils/prisma'
import { AppError } from '../../../shared/utils/errors'
import { z } from 'zod'

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/current', async (req, res, next) => {
  try {
    const current = await prisma.cashRegister.findFirst({ where: { tenantId: req.user.tenantId, status: 'OPEN' } })
    return res.json(current)
  } catch (e) { return next(e) }
})

router.get('/', async (req, res, next) => {
  try {
    const data = await prisma.cashRegister.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { openedAt: 'desc' } })
    return res.json(data)
  } catch (e) { return next(e) }
})

router.post('/open', async (req, res, next) => {
  try {
    const { openingBalance, notes } = z.object({ openingBalance: z.number().min(0), notes: z.string().optional() }).parse(req.body)
    const existing = await prisma.cashRegister.findFirst({ where: { tenantId: req.user.tenantId, status: 'OPEN' } })
    if (existing) throw new AppError('Já existe um caixa aberto', 400)
    const cash = await prisma.cashRegister.create({
      data: { tenantId: req.user.tenantId, date: new Date(), openedAt: new Date(), openingBalance, notes },
    })
    return res.status(201).json(cash)
  } catch (e) { return next(e) }
})

router.post('/close', async (req, res, next) => {
  try {
    const { countedBalance, notes } = z.object({ countedBalance: z.number().min(0), notes: z.string().optional() }).parse(req.body)
    const cash = await prisma.cashRegister.findFirst({ where: { tenantId: req.user.tenantId, status: 'OPEN' } })
    if (!cash) throw new AppError('Nenhum caixa aberto', 400)

    const cashTxs = await prisma.transaction.findMany({
      where: { tenantId: req.user.tenantId, paymentMethod: 'dinheiro', status: 'PAID', transactionDate: { gte: cash.openedAt } },
    })
    const cashIn = cashTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
    const cashOut = cashTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
    const expectedBalance = Number(cash.openingBalance) + cashIn - cashOut

    return res.json(await prisma.cashRegister.update({
      where: { id: cash.id },
      data: { status: 'CLOSED', closedAt: new Date(), countedBalance, expectedBalance, cashIn, cashOut, difference: countedBalance - expectedBalance, notes: notes ?? cash.notes },
    }))
  } catch (e) { return next(e) }
})

export default router
