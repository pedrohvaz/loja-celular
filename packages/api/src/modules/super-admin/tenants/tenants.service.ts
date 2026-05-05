import bcrypt from 'bcryptjs'
import { Prisma, TransactionType } from '@prisma/client'
import { prisma } from '../../../shared/utils/prisma'
import { AppError } from '../../../shared/utils/errors'
import { addDays } from 'date-fns'

export async function listTenants(search?: string, status?: string, page = 1, limit = 20) {
  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        _count: { select: { users: true, serviceOrders: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tenant.count({ where }),
  ])

  return { tenants, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      _count: { select: { serviceOrders: true, orders: true, products: true, customers: true, transactions: true } },
    },
  })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)
  return tenant
}

export async function createTenantWithAdmin(data: {
  name: string
  slug: string
  planId?: string
  phone?: string
  email?: string
  document?: string
  adminName: string
  adminEmail: string
  adminPassword: string
  trialDays?: number
}) {
  const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } })
  if (existing) throw new AppError('Slug já está em uso', 409)

  const plan = data.planId ? await prisma.plan.findUnique({ where: { id: data.planId } }) : null
  const modules = plan?.modules ?? ['store', 'service_orders', 'finance', 'sales']
  const trialDays = data.trialDays ?? 14

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      planId: data.planId ?? null,
      status: 'TRIAL',
      trialEndsAt: addDays(new Date(), trialDays),
      phone: data.phone,
      email: data.email,
      document: data.document,
      modules,
    },
  })

  const passwordHash = await bcrypt.hash(data.adminPassword, 10)
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: data.adminName,
      email: data.adminEmail,
      passwordHash,
      role: 'ADMIN',
    },
  })

  const defaultCategories = [
    { name: 'Serviços de manutenção', type: TransactionType.INCOME, icon: 'wrench', isDefault: true },
    { name: 'Venda de produtos', type: TransactionType.INCOME, icon: 'smartphone', isDefault: true },
    { name: 'Outros (receita)', type: TransactionType.INCOME, icon: 'plus-circle', isDefault: true },
    { name: 'Compra de peças', type: TransactionType.EXPENSE, icon: 'cpu', isDefault: true },
    { name: 'Aluguel', type: TransactionType.EXPENSE, icon: 'home', isDefault: true },
    { name: 'Salários', type: TransactionType.EXPENSE, icon: 'users', isDefault: true },
    { name: 'Outros (despesa)', type: TransactionType.EXPENSE, icon: 'minus-circle', isDefault: true },
  ]
  await prisma.financeCategory.createMany({
    data: defaultCategories.map(c => ({ ...c, tenantId: tenant.id })),
  })

  return tenant
}

export async function updateTenant(id: string, data: {
  name?: string
  status?: string
  planId?: string | null
  phone?: string
  email?: string
  document?: string
  trialEndsAt?: string
  modules?: string[]
  settings?: Record<string, unknown>
}) {
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)

  const updateData: Prisma.TenantUpdateInput = {}
  if (data.name) updateData.name = data.name
  if (data.status) updateData.status = data.status as any
  if (data.planId !== undefined) {
    updateData.plan = data.planId ? { connect: { id: data.planId } } : { disconnect: true }
  }
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.email !== undefined) updateData.email = data.email
  if (data.document !== undefined) updateData.document = data.document
  if (data.trialEndsAt) updateData.trialEndsAt = new Date(data.trialEndsAt)
  if (data.modules) updateData.modules = data.modules
  if (data.settings) updateData.settings = data.settings as Prisma.InputJsonValue

  return prisma.tenant.update({ where: { id }, data: updateData, include: { plan: true } })
}

export async function deleteTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)
  await prisma.tenant.delete({ where: { id } })
}

export async function getGlobalStats() {
  const [
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalUsers,
    totalServiceOrders,
    totalOrders,
    recentTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.tenant.count({ where: { status: 'TRIAL' } }),
    prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.serviceOrder.count(),
    prisma.order.count(),
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { plan: { select: { name: true } }, _count: { select: { users: true } } },
    }),
  ])

  return {
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    cancelledTenants: totalTenants - activeTenants - trialTenants - suspendedTenants,
    totalUsers,
    totalServiceOrders,
    totalOrders,
    recentTenants,
  }
}
