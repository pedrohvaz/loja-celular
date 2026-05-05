import bcrypt from 'bcryptjs'
import { prisma } from '../../shared/utils/prisma'
import { AppError } from '../../shared/utils/errors'
import { sendWelcome } from '../../shared/utils/email'
import { addDays, differenceInDays } from 'date-fns'
import { TransactionType } from '@prisma/client'

const TRIAL_DAYS = 14

const DEFAULT_CATEGORIES = [
  { name: 'Serviços de manutenção', type: TransactionType.INCOME, icon: 'wrench', isDefault: true },
  { name: 'Venda de produtos', type: TransactionType.INCOME, icon: 'smartphone', isDefault: true },
  { name: 'Venda de acessórios', type: TransactionType.INCOME, icon: 'package', isDefault: true },
  { name: 'Outros (receita)', type: TransactionType.INCOME, icon: 'plus-circle', isDefault: true },
  { name: 'Compra de peças', type: TransactionType.EXPENSE, icon: 'cpu', isDefault: true },
  { name: 'Compra de estoque', type: TransactionType.EXPENSE, icon: 'shopping-cart', isDefault: true },
  { name: 'Aluguel', type: TransactionType.EXPENSE, icon: 'home', isDefault: true },
  { name: 'Energia elétrica', type: TransactionType.EXPENSE, icon: 'zap', isDefault: true },
  { name: 'Salários', type: TransactionType.EXPENSE, icon: 'users', isDefault: true },
  { name: 'Outros (despesa)', type: TransactionType.EXPENSE, icon: 'minus-circle', isDefault: true },
]

export async function registerTenant(data: {
  tenantName: string
  slug: string
  planId?: string
  adminName: string
  adminEmail: string
  adminPassword: string
  phone?: string
}) {
  const slugExists = await prisma.tenant.findUnique({ where: { slug: data.slug } })
  if (slugExists) throw new AppError('Este slug já está em uso. Escolha outro.', 409)

  const plan = data.planId ? await prisma.plan.findUnique({ where: { id: data.planId } }) : null
  const modules = plan?.modules ?? ['store', 'service_orders', 'finance', 'sales']

  const tenant = await prisma.tenant.create({
    data: {
      name: data.tenantName,
      slug: data.slug,
      status: 'TRIAL',
      trialEndsAt: addDays(new Date(), TRIAL_DAYS),
      planId: plan?.id ?? null,
      phone: data.phone ?? null,
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

  await prisma.financeCategory.createMany({
    data: DEFAULT_CATEGORIES.map(c => ({ ...c, tenantId: tenant.id })),
  })

  sendWelcome(data.adminEmail, data.adminName, data.tenantName, data.slug, TRIAL_DAYS).catch(() => {})

  return { tenantName: tenant.name, slug: tenant.slug, trialEndsAt: tenant.trialEndsAt }
}

export function getTrialStatus(trialEndsAt: Date | null, status: string) {
  if (status !== 'TRIAL' || !trialEndsAt) return null
  const daysLeft = differenceInDays(trialEndsAt, new Date())
  return { daysLeft: Math.max(0, daysLeft), expired: daysLeft < 0 }
}
