import { Router } from 'express'
import { prisma } from '../../shared/utils/prisma'
import { authenticate, requireAdmin } from '../../shared/middleware/auth'
import { checkTenantActive } from '../../shared/middleware/tenantGuard'
import { publicLookupLimiter } from '../../shared/middleware/rateLimit'

const router = Router()

// Rota pública — lista planos disponíveis (usada na landing page)
router.get('/plans', publicLookupLimiter, async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    })
    return res.json(plans)
  } catch (err) { return next(err) }
})

// Rota pública — dados básicos do tenant (nome/telefone/e-mail/whatsapp) para a loja/checkout
router.get('/public/:slug', publicLookupLimiter, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: { name: true, phone: true, email: true, settings: true },
    })
    if (!tenant) return res.status(404).json({ error: 'Loja não encontrada' })
    const settings = (tenant.settings as { whatsapp?: string } | null) ?? {}
    return res.json({ name: tenant.name, phone: tenant.phone, email: tenant.email, whatsapp: settings.whatsapp ?? null })
  } catch (err) { return next(err) }
})

router.use(authenticate, checkTenantActive)

// GET tenant info + plan + trial
router.get('/', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: { plan: true, _count: { select: { users: true } } },
    })
    return res.json(tenant)
  } catch (err) { return next(err) }
})

// PATCH tenant settings (admin only)
router.patch('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, phone, email, document, settings } = req.body
    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(document !== undefined && { document }),
        ...(settings !== undefined && { settings }),
      },
      include: { plan: true },
    })
    return res.json(tenant)
  } catch (err) { return next(err) }
})


export default router
