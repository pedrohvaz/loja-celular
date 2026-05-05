import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../../shared/utils/prisma'
import { authenticate, requireAdmin } from '../../shared/middleware/auth'
import { checkTenantActive } from '../../shared/middleware/tenantGuard'
import { AppError } from '../../shared/utils/errors'

const router = Router()

router.use(authenticate, checkTenantActive, requireAdmin)

// Listar usuários do tenant
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return res.json(users)
  } catch (err) { return next(err) }
})

// Criar usuário no tenant (com verificação de limite do plano)
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) throw new AppError('Nome, e-mail e senha são obrigatórios', 400)

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: { plan: true, _count: { select: { users: true } } },
    })
    if (!tenant) throw new AppError('Empresa não encontrada', 404)

    const maxUsers = tenant.plan?.maxUsers ?? 999
    if (tenant._count.users >= maxUsers) {
      throw new AppError(`Limite de ${maxUsers} usuário(s) do seu plano atingido. Faça upgrade para adicionar mais.`, 403)
    }

    const exists = await prisma.user.findUnique({
      where: { email_tenantId: { email, tenantId: req.user.tenantId } },
    })
    if (exists) throw new AppError('E-mail já cadastrado nesta empresa', 409)

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        email,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return res.status(201).json(user)
  } catch (err) { return next(err) }
})

// Atualizar usuário
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, role } = req.body
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) throw new AppError('Usuário não encontrado', 404)
    if (user.id === req.user.userId && role && role !== 'ADMIN') {
      throw new AppError('Você não pode rebaixar sua própria conta', 400)
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(role && { role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE' }),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return res.json(updated)
  } catch (err) { return next(err) }
})

// Deletar usuário
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) throw new AppError('Você não pode excluir sua própria conta', 400)
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (!user) throw new AppError('Usuário não encontrado', 404)
    await prisma.user.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (err) { return next(err) }
})

export default router
